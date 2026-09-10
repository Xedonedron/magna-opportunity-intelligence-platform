"""CLI benchmark script to test and compare multiple AI models on KYC Opportunity generation.

Evaluates:
- Quality and structural completeness (13 standard sections, valid JSON)
- Speed and latency (End-to-end runtime, LLM inference latency)
- Token economics and bias (Prompt/input tokens from Tavily, output tokens, tokens/sec, cost in USD & IDR)
- Dual output: Rich terminal logs + Timestamped Markdown & JSON report files in backend/data/
"""

import argparse
import asyncio
import json
import logging
import os
import sys
import time
import uuid
from datetime import datetime, timezone
from pathlib import Path
from typing import Any, Dict, List, Optional

# Ensure backend directory is in sys.path
backend_dir = Path(__file__).resolve().parent.parent
if str(backend_dir) not in sys.path:
    sys.path.insert(0, str(backend_dir))

from app.core.database import SessionLocal
from app.models.opportunity import Opportunity, TimelineEvent
from app.models.kyc_report import KYCReport
from app.models.system_setting import SystemSetting
from app.models.ai_token_usage import AITokenUsage
from app.services.kyc_pipeline import run_kyc_pipeline
from app.services.ai_usage_service import calculate_cost, get_model_rate, get_current_usd_to_idr_rate
from app.tasks import run_kyc_pipeline_task

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] %(message)s",
    datefmt="%Y-%m-%d %H:%M:%S",
)
logger = logging.getLogger("benchmark")

DEFAULT_MODELS = [
    "gemini-3.8-flash",
    "deepseek-v4-pro",
    "deepseek-v4-flash",
    "qwen-3.8-max",
    "claude-opus-4.7",
    "glm-5.1",
]


def parse_args():
    parser = argparse.ArgumentParser(
        description="Benchmark and compare AI models for Opportunity KYC generation."
    )
    parser.add_argument(
        "--models",
        type=str,
        default=",".join(DEFAULT_MODELS),
        help=f"Comma-separated list of models to test (default: {','.join(DEFAULT_MODELS)})",
    )
    parser.add_argument(
        "--oppty-ids",
        type=str,
        default=None,
        help="Comma-separated Opportunity UUIDs to test (maps 1:1 with models)",
    )
    parser.add_argument(
        "--single-oppty",
        type=str,
        default=None,
        help="Run ALL models against this single Opportunity UUID (eliminates Tavily/input token bias)",
    )
    parser.add_argument(
        "--limit",
        type=int,
        default=None,
        help="Limit number of opportunities to fetch (default: matches number of models)",
    )
    parser.add_argument(
        "--include-closed",
        action="store_true",
        help="Include Won/Lost opportunities (default: False)",
    )
    parser.add_argument(
        "--mode",
        choices=["direct", "celery"],
        default="direct",
        help="Execution mode: 'direct' (in-process sequential, high-precision timing) or 'celery' (via Celery task sequential wait)",
    )
    parser.add_argument(
        "--delay",
        type=float,
        default=3.0,
        help="Delay seconds between model tests (default: 3.0)",
    )
    parser.add_argument(
        "--from-bottom",
        action="store_true",
        default=False,
        help="Pick opportunities from the bottom (latest created) instead of the top",
    )
    parser.add_argument(
        "--reverse",
        action="store_true",
        default=False,
        help="Reverse order of selected opportunities",
    )
    parser.add_argument(
        "--output-dir",
        type=str,
        default=None,
        help="Directory to save JSON and Markdown benchmark reports (default: backend/data)",
    )
    parser.add_argument(
        "--dry-run",
        action="store_true",
        help="Simulate run without writing to DB or invoking LLMs",
    )
    return parser.parse_args()


def validate_kyc_sections(report_data: Dict[str, Any]) -> Dict[str, Any]:
    """Validate completeness and quality of generated KYC sections."""
    validation = {
        "is_valid_json": bool(report_data and isinstance(report_data, dict)),
        "sections_present": {},
        "missing_sections": [],
        "use_cases_count": 0,
        "use_cases_ordered": False,
        "pain_points_count": 0,
        "competitors_count": 0,
        "references_count": 0,
        "executive_summary_chars": 0,
        "total_content_chars": 0,
        "completeness_score_pct": 0.0,
    }

    if not report_data or not isinstance(report_data, dict):
        return validation

    expected_sections = [
        "executive_summary",
        "company_overview",
        "industry_analysis",
        "competitor_analysis",
        "business_model",
        "company_location",
        "customer_need_summary",
        "potential_pain_points",
        "use_cases",
        "meeting_objectives",
        "recommended_questions",
        "preparation_checklist",
        "references",
    ]

    present_count = 0
    total_chars = 0

    for section in expected_sections:
        val = report_data.get(section)
        is_present = False
        if isinstance(val, str) and val.strip():
            is_present = True
            total_chars += len(val)
        elif isinstance(val, (list, dict)) and len(val) > 0:
            is_present = True
            total_chars += len(json.dumps(val))

        validation["sections_present"][section] = is_present
        if is_present:
            present_count += 1
        else:
            validation["missing_sections"].append(section)

    validation["total_content_chars"] = total_chars
    validation["completeness_score_pct"] = round((present_count / len(expected_sections)) * 100, 1)

    # Specific section validations
    exec_sum = report_data.get("executive_summary") or ""
    validation["executive_summary_chars"] = len(exec_sum) if isinstance(exec_sum, str) else 0

    use_cases = report_data.get("use_cases") or []
    if isinstance(use_cases, list):
        validation["use_cases_count"] = len(use_cases)
        # Check impact level ordering (High -> Medium -> Low)
        levels = [str(uc.get("impact_level", "")).strip().capitalize() for uc in use_cases if isinstance(uc, dict)]
        level_values = {"High": 3, "Medium": 2, "Low": 1}
        numeric_levels = [level_values.get(lvl, 0) for lvl in levels]
        validation["use_cases_ordered"] = (
            numeric_levels == sorted(numeric_levels, reverse=True) if len(numeric_levels) > 1 else True
        )

    pain_points = report_data.get("potential_pain_points") or []
    if isinstance(pain_points, list):
        validation["pain_points_count"] = len(pain_points)

    competitors = report_data.get("competitor_analysis") or []
    if isinstance(competitors, list):
        validation["competitors_count"] = len(competitors)

    refs = report_data.get("references") or []
    if isinstance(refs, list):
        validation["references_count"] = len(refs)

    return validation


def generate_markdown_report(benchmark_results: List[Dict[str, Any]], timestamp: str) -> str:
    """Generate a readable GitHub-flavored Markdown benchmark report."""
    md = []
    md.append(f"# Model Comparison Benchmark Report: Opportunity AI KYC Generation")
    md.append(f"\n- **Execution Timestamp**: `{timestamp}`")
    tested_models_str = ", ".join([f"`{r['model']}`" for r in benchmark_results])
    md.append(f"- **Evaluated Models**: {tested_models_str}\n")

    # 1. Summary Comparison Table
    md.append("## 1. Summary Performance & Economics Table\n")
    md.append(
        "| Model | Opportunity | Total Time | LLM Latency | Prompt Tokens | Output Tokens | Output Speed | Cost (USD) | Cost (IDR) | Quality | Status |"
    )
    md.append(
        "| :--- | :--- | :---: | :---: | :---: | :---: | :---: | :---: | :---: | :---: | :---: |"
    )

    for r in benchmark_results:
        model = r["model"]
        opp = r["company_name"]
        total_time = f"{r.get('total_duration_s', 0):.1f}s"
        llm_lat = f"{r.get('llm_duration_s', 0):.1f}s" if r.get("llm_duration_s") is not None else "N/A"
        p_tokens = f"{r.get('prompt_tokens', 0):,}"
        c_tokens = f"{r.get('completion_tokens', 0):,}"
        speed = f"{r.get('tokens_per_sec', 0):.1f} tok/s" if r.get("tokens_per_sec") else "N/A"
        cost_usd = f"${r.get('cost_usd', 0):.4f}"
        cost_idr = f"Rp{r.get('cost_idr', 0):,.0f}"
        quality = f"{r.get('validation', {}).get('completeness_score_pct', 0)}%"
        status = "✅ Success" if r.get("status") == "completed" else f"❌ {r.get('status')}"
        md.append(
            f"| **{model}** | {opp} | {total_time} | {llm_lat} | {p_tokens} | {c_tokens} | {speed} | {cost_usd} | {cost_idr} | {quality} | {status} |"
        )

    # 2. Speed & Latency Analysis
    md.append("\n## 2. Speed & Latency Breakdown\n")
    md.append("| Model | Web Search & Crawl | LLM Synthesis | Total Pipeline | % Time in LLM |")
    md.append("| :--- | :---: | :---: | :---: | :---: |")
    for r in benchmark_results:
        search_time = f"{r.get('search_duration_s', 0):.1f}s"
        llm_time = f"{r.get('llm_duration_s', 0):.1f}s" if r.get("llm_duration_s") is not None else "N/A"
        total_time = f"{r.get('total_duration_s', 0):.1f}s"
        pct_llm = (
            f"{(r.get('llm_duration_s', 0) / r.get('total_duration_s', 1)) * 100:.1f}%"
            if r.get("llm_duration_s") and r.get("total_duration_s")
            else "N/A"
        )
        md.append(f"| `{r['model']}` | {search_time} | {llm_time} | {total_time} | {pct_llm} |")

    # 3. Quality & Structural Completeness Breakdown
    md.append("\n## 3. Quality & Structural Completeness (13 Standard Sections)\n")
    md.append(
        "| Model | Exec Summary Chars | Use Cases Count | UC Priority Ordered | Competitors | Pain Points | References | Missing Sections |"
    )
    md.append("| :--- | :---: | :---: | :---: | :---: | :---: | :---: | :--- |")
    for r in benchmark_results:
        val = r.get("validation", {})
        exec_chars = f"{val.get('executive_summary_chars', 0):,} chars"
        uc_count = val.get("use_cases_count", 0)
        uc_ord = "✅ Yes (H→M→L)" if val.get("use_cases_ordered") else "⚠️ No"
        comp_count = val.get("competitors_count", 0)
        pp_count = val.get("pain_points_count", 0)
        ref_count = val.get("references_count", 0)
        missing = ", ".join(val.get("missing_sections", [])) if val.get("missing_sections") else "None (100%)"
        md.append(
            f"| `{r['model']}` | {exec_chars} | {uc_count} | {uc_ord} | {comp_count} | {pp_count} | {ref_count} | {missing} |"
        )

    # 4. Token Bias & Economic Analysis
    md.append("\n## 4. Token Economics & Input Bias Analysis\n")
    md.append(
        "> [!NOTE]\n"
        "> **Input Token Bias Note**: Jumlah input token dipengaruhi oleh hasil pencarian web Tavily dan konten website klien yang berhasil di-crawl. Perbedaan efisiensi model dapat dinilai dari rasio *Completion Tokens vs Prompt Tokens* dan kecepatan generasi (*tokens/sec*).\n"
    )
    md.append("| Model | Input Tokens | Output Tokens | Total Tokens | Rate In/Out (per 1M) | Est. Cost USD |")
    md.append("| :--- | :---: | :---: | :---: | :---: | :---: |")
    for r in benchmark_results:
        rate = get_model_rate(r["model"])
        rate_str = f"${rate[0]:.2f} / ${rate[1]:.2f}"
        md.append(
            f"| `{r['model']}` | {r.get('prompt_tokens', 0):,} | {r.get('completion_tokens', 0):,} | {r.get('total_tokens', 0):,} | {rate_str} | ${r.get('cost_usd', 0):.4f} |"
        )

    # 5. Key Highlights & Observations
    completed_items = [r for r in benchmark_results if r.get("status") == "completed"]
    if completed_items:
        fastest_llm = min(completed_items, key=lambda x: x.get("llm_duration_s") or 99999)
        highest_tok_sec = max(completed_items, key=lambda x: x.get("tokens_per_sec") or 0)
        cheapest = min(completed_items, key=lambda x: x.get("cost_usd", 99999))
        most_thorough = max(completed_items, key=lambda x: x.get("completion_tokens") or 0)

        md.append("\n## 5. Key Benchmark Takeaways\n")
        md.append(
            f"- ⚡ **Fastest Inference Latency**: `{fastest_llm['model']}` ({fastest_llm.get('llm_duration_s', 0):.1f}s)"
        )
        md.append(
            f"- 🚀 **Highest Generation Throughput**: `{highest_tok_sec['model']}` ({highest_tok_sec.get('tokens_per_sec', 0):.1f} tokens/sec)"
        )
        md.append(
            f"- 💰 **Most Cost-Effective**: `{cheapest['model']}` (${cheapest.get('cost_usd', 0):.4f} / Rp{cheapest.get('cost_idr', 0):,.0f})"
        )
        md.append(
            f"- 📝 **Most Detailed / Verbose Output**: `{most_thorough['model']}` ({most_thorough.get('completion_tokens', 0):,} output tokens)"
        )

    md.append("\n---\n*Report generated automatically by MOIP AI Benchmark Suite.*")
    return "\n".join(md)


def main():
    args = parse_args()
    models = [m.strip() for m in args.models.split(",") if m.strip()]
    if not models:
        print("[!] No models specified.", file=sys.stderr)
        return

    timestamp = datetime.now(timezone.utc).strftime("%Y%m%d_%H%M%S")

    # Output directory setup
    output_dir = Path(args.output_dir) if args.output_dir else backend_dir / "data"
    output_dir.mkdir(parents=True, exist_ok=True)

    db = SessionLocal()
    try:
        print("=" * 80)
        print("  MOIP AI MODEL BENCHMARK TEST SUITE (OPPORTUNITY KYC)")
        print(f"  Execution Mode : {args.mode.upper()}")
        print(f"  Models to Test : {len(models)} -> {', '.join(models)}")
        print(f"  Timestamp      : {timestamp}")
        print("=" * 80)

        # 1. Resolve target opportunities
        test_pairs = []  # List of tuples: (model, opportunity)

        if args.single_oppty:
            # Single opportunity tested against all models
            opp = db.query(Opportunity).filter(Opportunity.id == uuid.UUID(args.single_oppty.strip())).first()
            if not opp:
                print(f"[!] Opportunity ID '{args.single_oppty}' not found in database.", file=sys.stderr)
                return
            print(f"[*] Single Opportunity Mode: Testing ALL {len(models)} models on '{opp.company_name}' ({opp.id})")
            for m in models:
                test_pairs.append((m, opp))
        elif args.oppty_ids:
            # Explicit opportunity IDs mapped 1:1 to models
            opp_ids = [uuid.UUID(i.strip()) for i in args.oppty_ids.split(",") if i.strip()]
            opps = db.query(Opportunity).filter(Opportunity.id.in_(opp_ids)).all()
            opp_dict = {o.id: o for o in opps}
            for idx, m in enumerate(models):
                if idx < len(opp_ids):
                    o = opp_dict.get(opp_ids[idx])
                    if o:
                        test_pairs.append((m, o))
        else:
            # Query active opportunities
            limit = args.limit or len(models)
            query = db.query(Opportunity).order_by(Opportunity.created_at.asc())
            if not args.include_closed:
                query = query.filter(~Opportunity.status.in_(["Won", "Lost"]))
            all_oppties = query.all()

            if not all_oppties:
                print("[-] No opportunities available for testing.", file=sys.stderr)
                return

            print(f"[*] Found {len(all_oppties)} total active opportunities in database.")

            if args.from_bottom:
                oppties = all_oppties[-limit:]
                start_idx = len(all_oppties) - len(oppties) + 1
                end_idx = len(all_oppties)
                print(f"[*] Selected bottom {len(oppties)} opportunities (from end: [{start_idx}/{end_idx}] to [{end_idx}/{end_idx}]).")
            else:
                # Default: Ambil dari paling atas (top N opportunities, [1/26] to [6/26])
                oppties = all_oppties[:limit]
                print(f"[*] Selected top {len(oppties)} opportunities (from start: [1/{len(all_oppties)}] to [{len(oppties)}/{len(all_oppties)}]).")

            if args.reverse:
                oppties = list(reversed(oppties))
                print(f"[*] Reversed order of selected opportunities.")

            for idx, m in enumerate(models):
                opp = oppties[idx % len(oppties)]
                test_pairs.append((m, opp))

        print(f"[*] Prepared {len(test_pairs)} test iterations:")
        for idx, (m, opp) in enumerate(test_pairs, start=1):
            print(f"    [{idx}/{len(test_pairs)}] Model '{m}' -> Opportunity: '{opp.company_name}' ({opp.id})")

        if args.dry_run:
            print("\n[DRY RUN] Finished without executing LLM pipeline or writing DB records.")
            return

        print("\n" + "-" * 80)
        print("  STARTING BENCHMARK RUNS")
        print("-" * 80)

        benchmark_results = []

        for idx, (model_name, opp) in enumerate(test_pairs, start=1):
            print(f"\n[BENCHMARK] >>> Starting Test [{idx}/{len(test_pairs)}]")
            print(f"[BENCHMARK] Target Model      : {model_name}")
            print(f"[BENCHMARK] Client Company    : {opp.company_name}")
            print(f"[BENCHMARK] Opportunity ID    : {opp.id}")
            print(f"[BENCHMARK] Customer Needs    : {opp.customer_needs[:80]}..." if opp.customer_needs else "N/A")

            # Get next KYC version
            max_v = (
                db.query(KYCReport.version)
                .filter(KYCReport.opportunity_id == opp.id)
                .order_by(KYCReport.version.desc())
                .first()
            )
            next_version = (max_v[0] + 1) if max_v else 1
            version_label = f"Benchmark: {model_name}"

            # Create KYCReport record
            report = KYCReport(
                id=uuid.uuid4(),
                opportunity_id=opp.id,
                version=next_version,
                title=version_label,
                status="running",
                source_type="benchmark",
            )
            db.add(report)
            opp.status = "KYC Running"

            timeline_event = TimelineEvent(
                opportunity_id=opp.id,
                actor_id=opp.created_by,
                actor_name="Benchmark Script",
                action=f"KYC Benchmark Started (v{next_version} - '{model_name}')",
                description=f"Model evaluation test for '{model_name}'.",
                event_type="system",
            )
            db.add(timeline_event)
            db.commit()

            start_total = time.time()
            res_dict: Dict[str, Any] = {}
            error_msg: Optional[str] = None

            if args.mode == "direct":
                # In-process execution with real-time callbacks
                def progress_cb(step: str, percent: int):
                    print(f"    [PROGRESS] {percent}% - Step: {step}")

                try:
                    pipeline_coro = run_kyc_pipeline(
                        company_name=opp.company_name,
                        customer_needs=opp.customer_needs or "",
                        website=opp.website,
                        industry=opp.industry,
                        product=opp.product,
                        additional_notes=opp.additional_notes,
                        on_progress=progress_cb,
                        opportunity_id=str(opp.id),
                        user_id=str(opp.created_by) if opp.created_by else None,
                        kyc_version=next_version,
                        source_type="benchmark",
                        model_name=model_name,
                    )
                    res_dict = asyncio.run(pipeline_coro)
                except Exception as exc:
                    logger.error(f"[BENCHMARK] Pipeline execution failed: {exc}", exc_info=True)
                    error_msg = str(exc)
                    res_dict = {"status": "failed", "error": error_msg}

            else:
                # Celery execution mode with polling
                print("    [CELERY] Dispatching Celery task...")
                try:
                    task = run_kyc_pipeline_task.delay(
                        str(opp.id),
                        source_type="benchmark",
                        model_name=model_name,
                    )
                    print(f"    [CELERY] Task ID: {task.id}. Polling for completion...")

                    # Poll DB until report status changes from running
                    max_poll = 300  # 5 minutes timeout
                    poll_interval = 5.0
                    elapsed = 0.0
                    while elapsed < max_poll:
                        time.sleep(poll_interval)
                        elapsed += poll_interval
                        db.refresh(report)
                        if report.status in ["completed", "failed"]:
                            break
                        print(f"    [CELERY] Waiting... ({int(elapsed)}s elapsed, progress={report.progress_percent}%)")

                    if report.status == "completed":
                        res_dict = {
                            "status": "completed",
                            "executive_summary": report.executive_summary,
                            "company_overview": report.company_overview,
                            "industry_analysis": report.industry_analysis,
                            "competitor_analysis": report.competitor_analysis,
                            "business_model": report.business_model,
                            "company_location": report.company_location,
                            "customer_need_summary": report.customer_need_summary,
                            "potential_pain_points": report.potential_pain_points,
                            "use_cases": report.use_cases,
                            "meeting_objectives": report.meeting_objectives,
                            "recommended_questions": report.recommended_questions,
                            "preparation_checklist": report.preparation_checklist,
                            "references": report.references,
                        }
                    else:
                        error_msg = report.error_message or "Celery task timeout or failure"
                        res_dict = {"status": "failed", "error": error_msg}
                except Exception as exc:
                    logger.error(f"[CELERY] Celery execution failed: {exc}")
                    error_msg = str(exc)
                    res_dict = {"status": "failed", "error": error_msg}

            total_duration = time.time() - start_total

            # Update DB with results if completed in direct mode
            if args.mode == "direct" and res_dict.get("status") == "completed":
                report.status = "completed"
                report.executive_summary = res_dict.get("executive_summary")
                report.company_overview = res_dict.get("company_overview")
                report.industry_analysis = res_dict.get("industry_analysis")
                report.competitor_analysis = res_dict.get("competitor_analysis")
                report.business_model = res_dict.get("business_model")
                report.company_location = res_dict.get("company_location")
                report.customer_need_summary = res_dict.get("customer_need_summary")
                report.potential_pain_points = res_dict.get("potential_pain_points")
                report.use_cases = res_dict.get("use_cases")
                report.meeting_objectives = res_dict.get("meeting_objectives")
                report.recommended_questions = res_dict.get("recommended_questions")
                report.preparation_checklist = res_dict.get("preparation_checklist")
                report.references = res_dict.get("references")
                report.completed_at = datetime.now(timezone.utc)
                opp.status = "Ready Meeting"
                db.commit()
            elif res_dict.get("status") == "failed":
                report.status = "failed"
                report.error_message = error_msg or res_dict.get("error")
                db.commit()

            # Query the exact AITokenUsage record saved for this run
            usage_rec = (
                db.query(AITokenUsage)
                .filter(
                    AITokenUsage.opportunity_id == opp.id,
                    AITokenUsage.feature == "kyc_generation",
                )
                .order_by(AITokenUsage.created_at.desc())
                .first()
            )

            prompt_tokens = usage_rec.prompt_tokens if usage_rec else 0
            completion_tokens = usage_rec.completion_tokens if usage_rec else 0
            total_tokens = usage_rec.total_tokens if usage_rec else (prompt_tokens + completion_tokens)
            llm_duration_ms = usage_rec.duration_ms if usage_rec else None
            llm_duration_s = (llm_duration_ms / 1000.0) if llm_duration_ms else None

            # Calculate cost
            usd_rate = get_current_usd_to_idr_rate(db)
            cost_usd, cost_idr = calculate_cost(
                model_name=model_name,
                prompt_tokens=prompt_tokens,
                completion_tokens=completion_tokens,
                usd_to_idr_rate=usd_rate,
            )

            # Measure tokens per second
            eval_llm_time = llm_duration_s if (llm_duration_s and llm_duration_s > 0) else total_duration
            tokens_per_sec = (completion_tokens / eval_llm_time) if eval_llm_time > 0 else 0.0

            # Validate quality and completeness
            validation = validate_kyc_sections(res_dict if res_dict.get("status") == "completed" else {})

            test_result = {
                "model": model_name,
                "opportunity_id": str(opp.id),
                "company_name": opp.company_name,
                "kyc_version": next_version,
                "status": res_dict.get("status", "unknown"),
                "error": res_dict.get("error") or error_msg,
                "total_duration_s": round(total_duration, 2),
                "llm_duration_s": round(llm_duration_s, 2) if llm_duration_s else None,
                "llm_duration_ms": llm_duration_ms,
                "search_duration_s": round(total_duration - (llm_duration_s or 0), 2),
                "prompt_tokens": prompt_tokens,
                "completion_tokens": completion_tokens,
                "total_tokens": total_tokens,
                "tokens_per_sec": round(tokens_per_sec, 1),
                "cost_usd": cost_usd,
                "cost_idr": cost_idr,
                "validation": validation,
            }
            benchmark_results.append(test_result)

            # Print concise result line
            status_symbol = "✅ OK" if test_result["status"] == "completed" else "❌ FAILED"
            print(
                f"[BENCHMARK] Result: {status_symbol} | Total: {total_duration:.1f}s | "
                f"LLM: {llm_duration_s or 0:.1f}s | Out: {completion_tokens:,} tok ({tokens_per_sec:.1f} tok/s) | "
                f"Cost: ${cost_usd:.4f} (Rp{cost_idr:,.0f}) | Quality: {validation['completeness_score_pct']}%"
            )

            if idx < len(test_pairs) and args.delay > 0:
                print(f"[BENCHMARK] Cooling down for {args.delay}s...")
                time.sleep(args.delay)

        # 4. Save JSON Report
        json_filename = f"benchmark_results_{timestamp}.json"
        json_path = output_dir / json_filename
        with open(json_path, "w", encoding="utf-8") as f:
            json.dump(
                {
                    "benchmark_timestamp": timestamp,
                    "execution_mode": args.mode,
                    "models_tested": models,
                    "results": benchmark_results,
                },
                f,
                indent=2,
                ensure_ascii=False,
            )
        print(f"\n[+] Raw JSON report saved to: {json_path}")

        # 5. Save Markdown Report
        md_content = generate_markdown_report(benchmark_results, timestamp)
        md_filename = f"benchmark_report_{timestamp}.md"
        md_path = output_dir / md_filename
        with open(md_path, "w", encoding="utf-8") as f:
            f.write(md_content)
        print(f"[+] Markdown summary report saved to: {md_path}")

        # Print Markdown content to stdout for immediate log inspection
        print("\n" + "=" * 80)
        print(md_content)
        print("=" * 80)

    except Exception as e:
        db.rollback()
        logger.error(f"[!] Benchmark suite error: {e}", exc_info=True)
        raise
    finally:
        db.close()


if __name__ == "__main__":
    main()
