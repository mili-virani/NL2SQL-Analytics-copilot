from sqlalchemy import text
from app.database import engine


def execute_sql(query: str):
    cleaned_query = query.strip().lower()

    if not (cleaned_query.startswith("select") or cleaned_query.startswith("with")):
        raise ValueError("Only SELECT and WITH queries are allowed.")

    with engine.connect() as connection:
        result = connection.execute(text(query))
        rows = [dict(row._mapping) for row in result]
        return rows