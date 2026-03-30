import os
from dotenv import load_dotenv
from sqlalchemy import create_engine, text

load_dotenv()
DATABASE_URL = os.getenv("DATABASE_URL")
if DATABASE_URL.startswith("postgres://"):
    DATABASE_URL = DATABASE_URL.replace("postgres://", "postgresql+psycopg2://", 1)

engine = create_engine(DATABASE_URL)

def drop_tables():
    with engine.begin() as conn:
        print("Dropping audit_logs...")
        conn.execute(text("DROP TABLE IF EXISTS audit_logs CASCADE;"))
        print("Dropping users...")
        conn.execute(text("DROP TABLE IF EXISTS users CASCADE;"))
        print("Dropping roles...")
        conn.execute(text("DROP TABLE IF EXISTS roles CASCADE;"))
        print("Done dropping tables.")

if __name__ == "__main__":
    drop_tables()
