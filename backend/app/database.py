from sqlalchemy import create_engine, text
from sqlalchemy.orm import sessionmaker

DATABASE_URL = "postgresql+psycopg2://mili@localhost:5432/enterprise_warehouse"

engine = create_engine(DATABASE_URL, echo=False)
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

def test_connection():
    with engine.connect() as connection:
        result = connection.execute(
            text("SELECT current_database(), current_user;")
        )
        return result.fetchone()