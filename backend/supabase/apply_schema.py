"""Apply schema.sql to the Supabase database. Re-runnable.

    python supabase/apply_schema.py
"""
import os
import sys
from pathlib import Path

import psycopg
from dotenv import load_dotenv

load_dotenv(Path(__file__).resolve().parent.parent / ".env")


def main():
    url = os.environ.get("DATABASE_URL")
    if not url:
        sys.exit("DATABASE_URL is not set in .env")
    sql = Path(__file__).with_name("schema.sql").read_text(encoding="utf-8")
    with psycopg.connect(url, connect_timeout=15) as conn:
        conn.execute(sql)
        conn.execute("notify pgrst, 'reload schema'")  # let the REST API see new tables immediately
        tables = conn.execute(
            "select table_name from information_schema.tables where table_schema = 'public' order by 1"
        ).fetchall()
    print("Schema applied. Public tables/views:", ", ".join(t[0] for t in tables))


if __name__ == "__main__":
    main()
