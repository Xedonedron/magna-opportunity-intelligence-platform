"""CLI script to batch regenerate KYC for all opportunities with a custom label."""

import argparse
import sys
import time
import uuid
from pathlib import Path

backend_dir = Path(__file__).resolve().parent.parent
if str(backend_dir) not in sys.path:
    sys.path.insert(0, str(backend_dir))

from app.core.database import SessionLocal
from app.models.opportunity import Opportunity, TimelineEvent
from app.models.kyc_report import KYCReport
from app.models.system_setting import SystemSetting
from app.tasks import run_kyc_pipeline_task


def parse_args():
    parser = argparse.ArgumentParser(description="Regenerate KYC for all opportunities.")
    parser.add_argument(
        "--label",
        type=str,
        default="Regenerate with qwen-3.8-max",
        help="KYC version title label (default: 'Regenerate with qwen-3.8-max')",
    )
    parser.add_argument(
        "--model",
        type=str,
        default=None,
        help="Optional: update ai_model in system_settings before running",
    )
    parser.add_argument(
        "--delay",
        type=float,
        default=5.0,
        help="Delay seconds between Celery task dispatches (default: 5.0)",
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
        "--dry-run",
        action="store_true",
        help="Simulate run without writing to DB or queueing Celery tasks",
    )
    return parser.parse_args()


def main():
    args = parse_args()
    db = SessionLocal()

    try:
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
        print(f"[*] Active Model: {active_model}")
        print(f"[*] Version Label: {args.label}")

        query = db.query(Opportunity).order_by(Opportunity.created_at.asc())
        if not args.include_closed:
            query = query.filter(~Opportunity.status.in_(["Won", "Lost"]))

        if args.limit:
            query = query.limit(args.limit)

        oppties = query.all()
        total = len(oppties)
        print(f"[*] Found {total} opportunities to process.")

        if total == 0:
            print("[-] No opportunities matched.")
            return

        for idx, opp in enumerate(oppties, start=1):
            max_v = (
                db.query(KYCReport.version)
                .filter(KYCReport.opportunity_id == opp.id)
                .order_by(KYCReport.version.desc())
                .first()
            )
            next_version = (max_v[0] + 1) if max_v else 1

            print(f"[{idx}/{total}] {opp.company_name} ({opp.id}) -> v{next_version} ('{args.label}')")

            if args.dry_run:
                continue

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
                description=f"Batch regeneration triggered with model '{active_model}'.",
                event_type="system",
            )
            db.add(timeline_event)
            db.commit()

            try:
                run_kyc_pipeline_task.delay(str(opp.id), source_type="manual_regenerate")
                print("    -> Celery task dispatched.")
            except Exception as exc:
                print(f"    -> Celery dispatch error: {exc}")

            if idx < total and args.delay > 0:
                time.sleep(args.delay)

        print("[*] Batch process completed.")
    except Exception as e:
        db.rollback()
        print(f"[!] Error: {e}", file=sys.stderr)
        raise
    finally:
        db.close()


if __name__ == "__main__":
    main()
