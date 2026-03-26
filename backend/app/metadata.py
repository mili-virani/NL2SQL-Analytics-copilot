from sqlalchemy import text, bindparam
from app.database import engine

BUSINESS_SCHEMAS = ["sales", "inventory", "customer", "support"]


def get_schemas():
    query = text("""
        SELECT schema_name
        FROM information_schema.schemata
        WHERE schema_name IN :schemas
        ORDER BY schema_name;
    """).bindparams(bindparam("schemas", expanding=True))

    with engine.connect() as connection:
        result = connection.execute(query, {"schemas": BUSINESS_SCHEMAS})
        return [row.schema_name for row in result]


def get_tables():
    query = text("""
        SELECT table_schema, table_name
        FROM information_schema.tables
        WHERE table_schema IN :schemas
          AND table_type = 'BASE TABLE'
        ORDER BY table_schema, table_name;
    """).bindparams(bindparam("schemas", expanding=True))

    with engine.connect() as connection:
        result = connection.execute(query, {"schemas": BUSINESS_SCHEMAS})
        return [
            {
                "schema": row.table_schema,
                "table": row.table_name,
            }
            for row in result
        ]


def get_columns():
    query = text("""
        SELECT table_schema, table_name, column_name, data_type
        FROM information_schema.columns
        WHERE table_schema IN :schemas
        ORDER BY table_schema, table_name, ordinal_position;
    """).bindparams(bindparam("schemas", expanding=True))

    with engine.connect() as connection:
        result = connection.execute(query, {"schemas": BUSINESS_SCHEMAS})
        return [
            {
                "schema": row.table_schema,
                "table": row.table_name,
                "column": row.column_name,
                "data_type": row.data_type,
            }
            for row in result
        ]


def get_foreign_keys():
    query = text("""
        SELECT
            tc.table_schema AS source_schema,
            tc.table_name AS source_table,
            kcu.column_name AS source_column,
            ccu.table_schema AS target_schema,
            ccu.table_name AS target_table,
            ccu.column_name AS target_column
        FROM information_schema.table_constraints AS tc
        JOIN information_schema.key_column_usage AS kcu
            ON tc.constraint_name = kcu.constraint_name
           AND tc.table_schema = kcu.table_schema
        JOIN information_schema.constraint_column_usage AS ccu
            ON ccu.constraint_name = tc.constraint_name
           AND ccu.table_schema = tc.table_schema
        WHERE tc.constraint_type = 'FOREIGN KEY'
          AND tc.table_schema IN :schemas
        ORDER BY source_schema, source_table, source_column;
    """).bindparams(bindparam("schemas", expanding=True))

    with engine.connect() as connection:
        result = connection.execute(query, {"schemas": BUSINESS_SCHEMAS})
        return [
            {
                "source_schema": row.source_schema,
                "source_table": row.source_table,
                "source_column": row.source_column,
                "target_schema": row.target_schema,
                "target_table": row.target_table,
                "target_column": row.target_column,
            }
            for row in result
        ]


def get_full_metadata():
    schemas = get_schemas()
    tables = get_tables()
    columns = get_columns()
    foreign_keys = get_foreign_keys()

    metadata = {}

    for schema in schemas:
        metadata[schema] = {"tables": {}}

    for table in tables:
        schema_name = table["schema"]
        table_name = table["table"]
        metadata[schema_name]["tables"][table_name] = {
            "columns": [],
            "foreign_keys": [],
        }

    for column in columns:
        schema_name = column["schema"]
        table_name = column["table"]
        if schema_name in metadata and table_name in metadata[schema_name]["tables"]:
            metadata[schema_name]["tables"][table_name]["columns"].append(
                {
                    "column_name": column["column"],
                    "data_type": column["data_type"],
                }
            )

    for fk in foreign_keys:
        source_schema = fk["source_schema"]
        source_table = fk["source_table"]
        if source_schema in metadata and source_table in metadata[source_schema]["tables"]:
            metadata[source_schema]["tables"][source_table]["foreign_keys"].append(
                {
                    "source_column": fk["source_column"],
                    "target_schema": fk["target_schema"],
                    "target_table": fk["target_table"],
                    "target_column": fk["target_column"],
                }
            )

    return metadata


def get_schema_metadata(schema_name: str):
    full_metadata = get_full_metadata()
    return full_metadata.get(schema_name, {})