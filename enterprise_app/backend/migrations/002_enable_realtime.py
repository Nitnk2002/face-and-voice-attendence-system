"""
Migration: 002_enable_realtime.py
Adds attendance_records, attendance_sessions, and enrollments to the supabase_realtime publication
and sets REPLICA IDENTITY FULL to ensure real-time change events are broadcast to all clients.
"""
import sys
import os
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
import logging
from sqlalchemy import text
from infrastructure.database import engine

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger("migration_002")

def run_migration():
    logger.info("Starting migration: 002_enable_realtime...")
    with engine.connect() as conn:
        # Check existing publication tables
        existing = conn.execute(text("SELECT tablename FROM pg_publication_tables WHERE pubname = 'supabase_realtime';")).fetchall()
        existing_tables = {row[0] for row in existing}
        logger.info("Currently published tables: %s", existing_tables)

        for table in ["attendance_records", "attendance_sessions", "enrollments"]:
            if table not in existing_tables:
                logger.info("Adding %s to supabase_realtime publication...", table)
                try:
                    conn.execute(text(f"ALTER PUBLICATION supabase_realtime ADD TABLE {table};"))
                    conn.commit()
                    logger.info("Successfully added %s to publication.", table)
                except Exception as e:
                    logger.error("Failed to add %s to publication: %s", table, e)
            else:
                logger.info("Table %s is already in supabase_realtime.", table)

            # Set REPLICA IDENTITY FULL for complete payload delivery
            try:
                conn.execute(text(f"ALTER TABLE {table} REPLICA IDENTITY FULL;"))
                conn.commit()
                logger.info("Set REPLICA IDENTITY FULL on %s.", table)
            except Exception as e:
                logger.error("Failed to set replica identity on %s: %s", table, e)

        # Verify
        updated = conn.execute(text("SELECT tablename FROM pg_publication_tables WHERE pubname = 'supabase_realtime';")).fetchall()
        logger.info("Updated published tables: %s", [row[0] for row in updated])

if __name__ == "__main__":
    run_migration()
