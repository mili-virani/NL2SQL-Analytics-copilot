from app.llm_service import generate_sql


def repair_sql(question: str, schema_name: str, schema_metadata: dict, bad_sql: str, error_message: str) -> str:
    repair_question = f"""
The original user question was:
{question}

The following PostgreSQL query failed and needs repair.

Bad SQL:
{bad_sql}

Execution error:
{error_message}

Please generate a corrected PostgreSQL SQL query that answers the original user question.

Important:
- Return ONLY SQL
- Use only SELECT or WITH
- Use fully qualified schema.table names
- Use only tables and columns present in the metadata
"""

    return generate_sql(
        question=repair_question,
        schema_name=schema_name,
        schema_metadata=schema_metadata,
    )