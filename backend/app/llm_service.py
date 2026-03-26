import os
from dotenv import load_dotenv
from google import genai

load_dotenv()

api_key = os.getenv("GEMINI_API_KEY")
if not api_key:
    raise ValueError("GEMINI_API_KEY is missing from .env")

client = genai.Client(api_key=api_key)


def generate_sql(question: str, schema_name: str, schema_metadata: dict) -> str:
    prompt = f"""
You are a PostgreSQL SQL generator.

Generate ONLY SQL.
Do NOT include explanations.
Do NOT use markdown.
Only generate read-only SQL using SELECT or WITH.

User question:
{question}

Selected schema:
{schema_name}

Schema metadata:
{schema_metadata}

Rules:
1. Use only tables and columns present in the metadata.
2. ALWAYS use fully qualified table names with schema prefixes.
   Example:
   - inventory.products
   - inventory.stock
3. Use PostgreSQL syntax.
4. Prefer explicit JOINs.
5. Add LIMIT 50 unless aggregation.
6. Do not generate INSERT, UPDATE, DELETE, DROP, or ALTER.
"""

    response = client.models.generate_content(
        model="gemini-2.5-flash",
        contents=prompt,
    )

    # 🔥 SAFE EXTRACTION
    if not response or not hasattr(response, "text") or response.text is None:
        raise ValueError("LLM did not return valid SQL response.")

    sql = response.text.strip()

    # clean markdown
    sql = sql.replace("```sql", "").replace("```", "").strip()

    return sql