import re
from app.metadata import get_full_metadata


FORBIDDEN_KEYWORDS = [
    "insert", "update", "delete", "drop", "alter", "truncate", "create", "grant", "revoke"
]


def extract_table_references(query: str):
    """
    Extract table references only from FROM and JOIN clauses.
    Examples matched:
      FROM inventory.products
      JOIN sales.orders
    """
    pattern = r"\b(?:from|join)\s+([a-zA-Z_][a-zA-Z0-9_]*\.[a-zA-Z_][a-zA-Z0-9_]*)"
    return re.findall(pattern, query, flags=re.IGNORECASE)


def validate_sql(query: str):
    errors = []

    if not query or not query.strip():
        errors.append("Generated SQL is empty.")
        return {
            "is_valid": False,
            "errors": errors,
            "referenced_tables": [],
        }

    cleaned = query.strip().lower()

    if not (cleaned.startswith("select") or cleaned.startswith("with")):
        errors.append("Only SELECT or WITH queries are allowed.")

    for keyword in FORBIDDEN_KEYWORDS:
        if re.search(rf"\b{keyword}\b", cleaned):
            errors.append(f"Forbidden SQL keyword detected: {keyword}")

    metadata = get_full_metadata()
    valid_tables = set()

    for schema_name, schema_data in metadata.items():
        for table_name in schema_data["tables"].keys():
            valid_tables.add(f"{schema_name}.{table_name}")

    found_tables = extract_table_references(query)

    if not found_tables:
        errors.append("No schema-qualified table references found in FROM/JOIN clauses.")

    for table in found_tables:
        if table not in valid_tables:
            errors.append(f"Unknown or invalid table reference: {table}")

    return {
        "is_valid": len(errors) == 0,
        "errors": errors,
        "referenced_tables": found_tables,
    }