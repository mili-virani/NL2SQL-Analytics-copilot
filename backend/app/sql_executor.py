from sqlalchemy import text
from app.database import engine


def execute_sql(query: str):
    cleaned_query = query.strip().lower()

    if not (cleaned_query.startswith("select") or cleaned_query.startswith("with")):
        raise ValueError("Only SELECT and WITH queries are allowed.")

    with engine.connect() as connection:
        result = connection.execute(text(query))
        rows = []
        for row in result:
            row_dict = dict(row._mapping)
            for k, v in row_dict.items():
                if type(v) not in (int, float, str, bool, type(None)):
                    row_dict[k] = str(v)
            rows.append(row_dict)
        return rows