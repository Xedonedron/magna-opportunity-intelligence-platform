"""CLI script to batch regenerate KYC for all opportunities and companies in MOIP.

Supports:
- Clean Company Foundation regeneration (--scope full) to eliminate context contamination.
- Filtering by specific company (--company-id <UUID>).
- Safe pacing via Celery dispatch delay (--delay seconds) to avoid LLM rate limits.
- In-place synchronous execution (--sync) for direct live terminal monitoring.
- Dry-run simulation mode (--dry-run).
"""

from __future__ import annotations

import argparse
import sys
import time
import uuid
from pathlib import Path

backend_dir = Path(__file__).resolve().parent.parent
if str(backend_dir) not in sys.path:
    sys.path.insert(0, str(backend_dir))

from app.core.database import SessionLocal
from app.models.company import Company
from app.models.opportunity import Opportunity, TimelineEvent
from app.models.kyc_report import KYCReport
from app.models.system_setting import SystemSetting
from app.tasks import run_kyc_pipeline_task


def parse_args():
    parser = argparse.ArgumentParser(
        description="Regenerate KYC for all opportunities and companies with decoupled foundation."
    )
    parser.add_argument(
        "--scope",
        type=str,
        choices=["full", "deal_only"],
        default="full",
        help="Regeneration scope: 'full' generates fresh clean Company Foundation (M1-2), 'deal_only' reuses cached company profile (default: 'full')",
    )
    parser.add_argument(
        "--company-id",
        type=str,
        default=None,
        help="Optional: filter opportunities belonging to a specific company UUID",
    )
    parser.add_argument(
        "--label",
        type=str,
        default="Pembersihan KYC (Decoupled Foundation)",
        help="KYC version title label (default: 'Pembersihan KYC (Decoupled Foundation)')",
    )
    parser.add_argument(
        "--model",
        type=str,
        default=None,
        help="Optional: update active ai_model in system_settings before running",
    )
    parser.add_argument(
        "--delay",
        type=float,
        default=7.0,
        help="Delay seconds between Celery task dispatches to prevent LLM rate limits (default: 7.0)",
    )
    parser.add_argument(
        "--limit",
        type=int,
        default=None,
        help="Limit number of opportunities to process",
    )
    parser.add_argument(
        "--include-closed",
        action="store_true",
        help="Include Won/Lost opportunities (default: false)",
    )
    parser.add_argument(
        "--sync",
        action="store_true",
        help="Run synchronously in-place instead of queueing Celery tasks (useful for live interactive debugging)",
    )
    parser.add_argument(
        "--dry-run",
        action="store_true",
        help="Simulate run without writing to DB or queueing tasks",
    )
    return parser.parse_args()


def main():
    args = parse_args()
    db = SessionLocal()

    try:
        print("=" * 70)
        print(" MOIP Batch KYC Regeneration & Context Decoupling Tool")
        print("=" * 70)

        if args.model:
            print(f"[*] Setting system_settings.ai_model to: {args.model}")
            if not args.dry_run:
                setting = db.query(SystemSetting).filter(SystemSetting.key == "ai_model").first()
                if not setting:
                    db.add(SystemSetting(key="ai_model", value=args.model, description="Active AI model"))
                else:
                    setting.value = args.model
                db.commit()

        active_model_row = db.query(SystemSetting).filter(SystemSetting.key == "ai_model").first()
        active_model = active_model_row.value if active_model_row else "default"

        print(f"[*] Active Model     : {active_model}")
        print(f"[*] Version Label    : {args.label}")
        print(f"[*] Scope            : {args.scope} ({'Fresh M1-2 Company Foundation + M3-6 Deal' if args.scope == 'full' else 'M3-6 Deal Only (reuses M1-2 cache)'})")
        print(f"[*] Execution Mode   : {'Synchronous In-Place (--sync)' if args.sync else 'Asynchronous Celery Queue'}")
        print(f"[*] Dispatch Delay   : {args.delay}s")
        print(f"[*] Dry-Run Mode     : {'YES (No changes will be saved)' if args.dry_run else 'NO (Live Production Run)'}")

        # Build query
        query = db.query(Opportunity).order_by(Opportunity.created_at.asc())

        if args.company_id:
            try:
                comp_uuid = uuid.UUID(args.company_id)
                query = query.filter(Opportunity.company_id == comp_uuid)
                print(f"[*] Filter Company ID: {comp_uuid}")
            except ValueError:
                print(f"[!] Invalid company-id UUID: {args.company_id}", file=sys.stderr)
                return

        if not args.include_closed:
            query = query.filter(~Opportunity.status.in_(["Won", "Lost"]))

        if args.limit:
            query = query.limit(args.limit)

        oppties = query.all()
        total = len(oppties)

        # Calculate unique companies represented
        unique_companies = set()
        for opp in oppties:
            if opp.company_id:
                unique_companies.add(str(opp.company_id))
            elif opp.company_name:
                unique_companies.add(opp.company_name.strip().lower())

        print(f"[*] Matched Opportunities: {total}")
        print(f"[*] Unique Companies     : {len(unique_companies)}")
        print("-" * 70)

        if total == 0:
            print("[-] No opportunities matched the criteria.")
            return

        success_count = 0
        error_count = 0

        for idx, opp in enumerate(oppties, start=1):
            comp_display = opp.company.name if opp.company else (opp.company_name or "Unknown Company")
            deal_product = opp.product or "General Opportunity"

            max_v = (
                db.query(KYCReport.version)
                .filter(KYCReport.opportunity_id == opp.id)
                .order_by(KYCReport.version.desc())
                .first()
            )
            next_version = (max_v[0] + 1) if max_v else 1

            print(
                f"[{idx}/{total}] Perusahaan: '{comp_display}' | Deal: '{deal_product}' (ID: {opp.id})"
                f"\n       -> Rencana: v{next_version} ('{args.label}') [scope={args.scope}]"
            )

            if args.dry_run:
                continue

            # Record placeholder KYCReport in DB
            report = KYCReport(
                id=uuid.uuid4(),
                opportunity_id=opp.id,
                version=next_version,
                title=args.label,
                focus_notes=None,
                status="running",
                source_type="manual_regenerate",
            )
            db.add(report)
            opp.status = "KYC Running"

            timeline_event = TimelineEvent(
                opportunity_id=opp.id,
                actor_id=opp.created_by,
                actor_name="Batch Script",
                action=f"KYC Regeneration Started (v{next_version} - '{args.label}')",
                description=f"Batch regeneration triggered with scope '{args.scope}' and model '{active_model}'.",
                event_type="system",
            )
            db.add(timeline_event)
            db.commit()

            try:
                if args.sync:
                    print("       -> Menjalankan pipeline secara langsung (synchronous)...")
                    t0 = time.time()
                    res = run_kyc_pipeline_task(
                        str(opp.id),
                        source_type="manual_regenerate",
                        regenerate_scope=args.scope,
                    )
                    elapsed = time.time() - t0
                    print(f"       -> Selesai dalam {elapsed:.1f}s | Status: {res.get('status', 'done')}")
                else:
                    run_kyc_pipeline_task.delay(
                        str(opp.id),
                        source_type="manual_regenerate",
                        regenerate_scope=args.scope,
                    )
                    print("       -> Celery task berhasil dikirim ke antrian.")
                success_count += 1
            except Exception as exc:
                print(f"       -> [ERROR] Gagal memproses: {exc}", file=sys.stderr)
                error_count += 1

            if idx < total and not args.sync and args.delay > 0:
                time.sleep(args.delay)

        print("=" * 70)
        if args.dry_run:
            print("[*] Simulasi Dry-Run selesai. Tidak ada data yang diubah.")
        else:
            print(f"[*] Batch selesai. Berhasil: {success_count}, Gagal: {error_count}")
        print("=" * 70)

    except Exception as e:
        db.rollback()
        print(f"[!] Fatal Error: {e}", file=sys.stderr)
        raise
    finally:
        db.close()


if __name__ == "__main__":
    main()
