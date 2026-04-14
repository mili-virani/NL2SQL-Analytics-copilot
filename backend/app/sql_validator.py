import re
from app.db_adapters.base import BaseAdapter


FORBIDDEN_KEYWORDS = [
    "insert", "update", "delete", "drop", "alter", "truncate", "create", "grant", "revoke"
]


def extract_table_references(query: str):
    """
    Extract table references from FROM and JOIN clauses.
    Examples matched:
      FROM inventory.products
      JOIN orders
    """
    # Matches optional_schema.table or just table
    pattern = r"\b(?:from|join)\s+(?:([a-zA-Z0-9_]+)\.)?([a-zA-Z0-9_]+)"
    matches = re.finditer(pattern, query, flags=re.IGNORECASE)
    tables = []
    for match in matches:
        schema = match.group(1)
        table = match.group(2)
        if schema:
            tables.append(f"{schema}.{table}")
        else:
            tables.append(table)
    return tables

def validate_sql(query: str, full_metadata: dict, adapter: BaseAdapter = None):
    errors = []

    if not query or not query.strip():
        errors.append("Generated SQL is empty.")
        return {
            "is_valid": False,
            "errors": errors,
            "referenced_tables": [],
        }

    if adapter:
        if not adapter.validate_read_only_sql(query):
            errors.append("Invalid or forbidden SQL keyword detected (must be read-only SELECT/WITH without destructive keywords).")
    else:
        cleaned = query.strip().lower()
        if not (cleaned.startswith("select") or cleaned.startswith("with")):
            errors.append("Only SELECT or WITH queries are allowed.")
        for keyword in FORBIDDEN_KEYWORDS:
            if re.search(rf"\b{keyword}\b", cleaned):
                errors.append(f"Forbidden SQL keyword detected: {keyword}")

    valid_tables = set()

    for schema_name, schema_data in full_metadata.items():
        for table_name in schema_data["tables"].keys():
            valid_tables.add(f"{schema_name}.{table_name}")
            valid_tables.add(table_name)

    found_tables = extract_table_references(query)

    if not found_tables:
        errors.append("No table references found in FROM/JOIN clauses.")

    for table in found_tables:
        if table not in valid_tables:
            errors.append(f"Unknown or invalid table reference: {table}")

    return {
        "is_valid": len(errors) == 0,
        "errors": errors,
        "referenced_tables": found_tables,
    }