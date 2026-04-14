from typing import List, Dict, Any
from sqlalchemy import create_engine, inspect, text
from sqlalchemy.engine import Engine

class BaseAdapter:
    def __init__(self, connection_url: str, connect_args: dict = None):
        self.connection_url = connection_url
        self.engine: Engine = create_engine(
            connection_url, 
            echo=False, 
            pool_pre_ping=True, 
            pool_recycle=300,
            connect_args=connect_args or {}
        )
    
    def get_dialect_name(self) -> str:
        """Returns the native sqlalchemy dialect name (e.g. postgresql, mysql, sqlite)"""
        return self.engine.dialect.name
        
    def test_connection(self) -> bool:
        with self.engine.connect() as connection:
            connection.execute(text("SELECT 1"))
            return True

    def get_schemas(self) -> List[str]:
        inspector = inspect(self.engine)
        schemas = inspector.get_schema_names()
        # Filter out system schemas if possible in subclasses, but general implementation here
        return schemas

    def get_full_metadata(self) -> Dict[str, Any]:
        inspector = inspect(self.engine)
        schemas = self.get_schemas()
        
        metadata = {}
        for schema in schemas:
            metadata[schema] = {"tables": {}}
            tables = inspector.get_table_names(schema=schema)
            for table in tables:
                columns = inspector.get_columns(table, schema=schema)
                fks = inspector.get_foreign_keys(table, schema=schema)
                
                metadata[schema]["tables"][table] = {
                    "columns": [{"column_name": col["name"], "data_type": str(col["type"])} for col in columns],
                    "foreign_keys": [
                        {
                            "source_column": fk["constrained_columns"][0] if fk["constrained_columns"] else None,
                            "target_schema": fk["referred_schema"] or schema,
                            "target_table": fk["referred_table"],
                            "target_column": fk["referred_columns"][0] if fk["referred_columns"] else None
                        }
                        for fk in fks
                    ]
                }
        return metadata

    def execute_query(self, query: str) -> List[Dict[str, Any]]:
        cleaned_query = query.strip().lower()
        if not (cleaned_query.startswith("select") or cleaned_query.startswith("with")):
            raise ValueError("Only SELECT and WITH queries are allowed.")
            
        try:
            with self.engine.connect() as connection:
                # Driver-native timeout enforcement where applicable
                dialect = self.get_dialect_name()
                if dialect == "postgresql":
                    # 30-second timeout (30,000ms) for Postgres
                    connection.execute(text("SET statement_timeout = 30000"))
                elif dialect == "mysql":
                    # MySQL max execution time in ms (for SELECT statements)
                    connection.execute(text("SET SESSION MAX_EXECUTION_TIME=30000"))
                # SQL Server and SQLite timeouts are typically governed by engine connect_args

                result = connection.execute(text(query))
                
                # Enforce row limits for UI safety
                raw_rows = result.fetchmany(100)
                
                rows = []
                for row in raw_rows:
                    row_dict = dict(row._mapping)
                    for k, v in row_dict.items():
                        if type(v) not in (int, float, str, bool, type(None)):
                            row_dict[k] = str(v)
                    rows.append(row_dict)
                return rows
        except Exception as e:
            # Redact raw driver tracebacks
            error_str = str(e)
            if "(psycopg2.errors." in error_str or "sqlalchemy.exc." in error_str:
                clean_msg = error_str.split("\n")[0]
                raise RuntimeError(f"SQL Execution Failed: {clean_msg}")
            raise RuntimeError(f"SQL Execution Failed: {error_str[:200]}")

    def validate_read_only_sql(self, query: str) -> bool:
        cleaned = query.strip().lower()
        if not (cleaned.startswith("select") or cleaned.startswith("with")):
            return False
        forbidden = ["insert", "update", "delete", "drop", "alter", "truncate", "create", "grant", "revoke"]
        import re
        for keyword in forbidden:
            if re.search(rf"\b{keyword}\b", cleaned):
                return False
        return True
