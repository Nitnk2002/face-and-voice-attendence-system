from infrastructure.database import engine
from sqlalchemy import text

def inspect():
    with engine.connect() as conn:
        tables = conn.execute(text("""
            SELECT table_name 
            FROM information_schema.tables 
            WHERE table_schema = 'public' AND table_type = 'BASE TABLE'
            ORDER BY table_name;
        """)).fetchall()
        
        print("=== ALL TABLES IN PUBLIC SCHEMA ===")
        for t in tables:
            tname = t[0]
            cnt = conn.execute(text(f'SELECT count(*) FROM "{tname}"')).scalar()
            print(f"\nTable: {tname} (rows: {cnt})")
            cols = conn.execute(text(f"""
                SELECT column_name, data_type, is_nullable, column_default
                FROM information_schema.columns
                WHERE table_schema = 'public' AND table_name = '{tname}'
                ORDER BY ordinal_position;
            """)).fetchall()
            for c in cols:
                print(f"    {c[0]} : {c[1]} (nullable={c[2]}, default={c[3]})")

            constraints = conn.execute(text(f"""
                SELECT conname, contype, pg_get_constraintdef(oid)
                FROM pg_constraint
                WHERE conrelid = '{tname}'::regclass;
            """)).fetchall()
            for con in constraints:
                print(f"    [Constraint] {con[0]} ({con[1]}): {con[2]}")

if __name__ == "__main__":
    inspect()
