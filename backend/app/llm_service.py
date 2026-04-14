import os
from dotenv import load_dotenv
from google import genai

load_dotenv()

api_key = os.getenv("GEMINI_API_KEY")
if not api_key:
    raise ValueError("GEMINI_API_KEY is missing from .env")

client = genai.Client(api_key=api_key)


def generate_text(prompt: str, model: str = "gemini-2.5-flash") -> str:
    response = client.models.generate_content(
        model=model,
        contents=prompt,
    )

    if not response or not hasattr(response, "text") or response.text is None:
        raise ValueError("LLM did not return a valid text response.")

    return response.text.strip()


def generate_sql(question: str, schema_name: str, schema_metadata: dict, dialect: str = "postgresql") -> str:
    prompt = f"""
You are a {dialect} SQL generator.

Generate ONLY SQL.
Do NOT include explanations.
Do NOT use markdown.
Only generate read-only SQL using SELECT or WITH.
Ensure identifiers are properly quoted for {dialect}.

User question:
{question}

Selected schema:
{schema_name}

Schema metadata:
{schema_metadata}

Rules:
1. Use only tables and columns present in the metadata.
2. ALWAYS use fully qualified table names with schema prefixes (unless SQLite).
   Example: schema.table
3. Use {dialect} syntax strictly.
4. Prefer explicit JOINs.
5. Add LIMIT 50 unless aggregation.
6. Do not generate INSERT, UPDATE, DELETE, DROP, or ALTER.
"""

    sql = generate_text(prompt, model="gemini-2.5-flash")

    sql = sql.replace("```sql", "").replace("```", "").strip()

    return sql