"""
Database Migration: 003_biometric_retention_and_pruning.py
Implements automated biometric data retention policy:
- Purges only soft-deactivated biometrics (is_active = false) older than configurable retention window (default: 90 days).
- Never deletes active biometric templates (is_active = true).
- Preserves all historical attendance records and audit logs.
- Can be executed standalone or scheduled as a pg_cron / background worker task.
"""
import sys
import os
import argparse
import logging
from datetime import datetime, timezone

sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from sqlalchemy import text
from infrastructure.database import engine

logging.basicConfig(level=logging.INFO, format="%(asctime)s [%(levelname)s] %(message)s")
logger = logging.getLogger("biometric_retention")

def install_retention_functions():
    """Installs SQL stored procedure for automated biometric retention cleanup."""
    logger.info("Installing database retention function 'purge_inactive_biometrics'...")
    with engine.connect() as conn:
        conn.execute(text("""
            CREATE OR REPLACE FUNCTION purge_inactive_biometrics(p_retention_days INTEGER DEFAULT 90)
            RETURNS TABLE(purged_count BIGINT) AS $$
            DECLARE
                v_deleted BIGINT;
            BEGIN
                -- Safety assertion: Only purge inactive profiles updated before retention horizon
                WITH deleted AS (
                    DELETE FROM student_biometrics
                    WHERE is_active = false
                      AND updated_at < (NOW() - (p_retention_days || ' days')::INTERVAL)
                    RETURNING id
                )
                SELECT COUNT(*) INTO v_deleted FROM deleted;
                
                RETURN QUERY SELECT v_deleted;
            END;
            $$ LANGUAGE plpgsql SECURITY DEFINER;
        """))
        conn.commit()
    logger.info("Stored procedure 'purge_inactive_biometrics' installed successfully.")


def run_pruning(retention_days: int = 90, dry_run: bool = False) -> int:
    """
    Executes biometric pruning for inactive records older than retention_days.
    If dry_run=True, reports eligible records without deleting.
    """
    logger.info(f"Running biometric retention audit (policy horizon: {retention_days} days, dry_run={dry_run})...")
    with engine.connect() as conn:
        # 1. Audit count of eligible records
        count_query = text("""
            SELECT COUNT(*), biometric_type
            FROM student_biometrics
            WHERE is_active = false
              AND updated_at < (NOW() - (:days || ' days')::INTERVAL)
            GROUP BY biometric_type
        """)
        breakdown = conn.execute(count_query, {"days": retention_days}).fetchall()
        total_eligible = sum(row[0] for row in breakdown)

        logger.info(f"Identified {total_eligible} inactive biometric record(s) exceeding {retention_days}-day horizon.")
        for row in breakdown:
            logger.info(f"  - {row[1]}: {row[0]} record(s)")

        if dry_run or total_eligible == 0:
            logger.info("Dry-run complete. No records modified.")
            return total_eligible

        # 2. Execute deletion
        delete_query = text("""
            DELETE FROM student_biometrics
            WHERE is_active = false
              AND updated_at < (NOW() - (:days || ' days')::INTERVAL)
        """)
        result = conn.execute(delete_query, {"days": retention_days})
        conn.commit()
        deleted_count = result.rowcount
        logger.info(f"Successfully purged {deleted_count} stale inactive biometric record(s). Active biometrics remain untouched.")
        return deleted_count


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description="Apni Kaksha Biometric Retention Pruning Tool")
    parser.add_argument("--days", type=int, default=90, help="Retention period in days (default: 90)")
    parser.add_argument("--dry-run", action="store_true", help="Audit without deleting")
    parser.add_argument("--install-function", action="store_true", help="Install PostgreSQL stored procedure")
    args = parser.parse_args()

    if args.install_function:
        install_retention_functions()
    else:
        run_pruning(retention_days=args.days, dry_run=args.dry_run)
