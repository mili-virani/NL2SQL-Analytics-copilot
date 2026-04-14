from app.models import DatabaseConnection
from app.crypto import decrypt
from .base import BaseAdapter
from typing import List
import json

class PostgresAdapter(BaseAdapter):
    def get_schemas(self) -> List[str]:
        schemas = super().get_schemas()
        # Filter out system schemas
        system_schemas = {"information_schema", "pg_catalog", "pg_toast"}
        return [s for s in schemas if s not in system_schemas]

class MysqlAdapter(BaseAdapter):
    def get_schemas(self) -> List[str]:
        schemas = super().get_schemas()
        system_schemas = {"information_schema", "mysql", "performance_schema", "sys"}
        return [s for s in schemas if s not in system_schemas]

class SqliteAdapter(BaseAdapter):
    def get_schemas(self) -> List[str]:
        # SQLite usually just has "main"
        return ["main"]

class SqlServerAdapter(BaseAdapter):
    def get_schemas(self) -> List[str]:
        schemas = super().get_schemas()
        system_schemas = {"sys", "INFORMATION_SCHEMA", "guest", "db_owner", "db_securityadmin", "db_accessadmin", "db_backupoperator", "db_ddladmin", "db_datawriter", "db_datareader", "db_denydatawriter", "db_denydatareader"}
        return [s for s in schemas if s not in system_schemas]

def get_adapter(connection: DatabaseConnection) -> BaseAdapter:
    db_type = connection.db_type.lower()
    
    password = decrypt(connection.encrypted_password) if connection.encrypted_password else ""
    
    auth_part = ""
    if connection.username:
        auth_part = connection.username
        if password:
            auth_part += f":{password}"
        auth_part += "@"
        
    host_port = ""
    if connection.host:
        host_port = connection.host
        if connection.port:
            host_port += f":{connection.port}"
            
    database = connection.database_name or ""
    
    connect_args = {}
    if getattr(connection, "ssl_enabled", False):
        if db_type == "postgresql":
            connect_args["sslmode"] = "require"
        elif db_type == "mysql":
            connect_args["ssl"] = {"ca": "/etc/ssl/certs/ca-certificates.crt"}

    if getattr(connection, "extra_config_json", None):
        try:
            extra_config = json.loads(connection.extra_config_json)
            if isinstance(extra_config, dict):
                connect_args.update(extra_config)
        except json.JSONDecodeError:
            pass # Ignore invalid JSON config
            
    if db_type == "postgresql":
        url = f"postgresql+psycopg2://{auth_part}{host_port}/{database}"
        return PostgresAdapter(url, connect_args=connect_args)
    elif db_type == "mysql":
        # using pymysql
        url = f"mysql+pymysql://{auth_part}{host_port}/{database}"
        return MysqlAdapter(url, connect_args=connect_args)
    elif db_type == "sqlite":
        # sqlite:///path/to/db.sqlite
        url = f"sqlite:///{database}"
        return SqliteAdapter(url, connect_args=connect_args)
    elif db_type == "sqlserver":
        # using pyodbc + FreeTDS or ODBC Driver
        url = f"mssql+pyodbc://{auth_part}{host_port}/{database}?driver=ODBC+Driver+17+for+SQL+Server"
        return SqlServerAdapter(url, connect_args=connect_args)
    else:
        raise ValueError(f"Unsupported database type: {db_type}")

def get_adapter_from_url(url: str) -> BaseAdapter:
    """Fallback for the default application database (development mode)"""
    if url.startswith("postgres"):
        url = url.replace("postgres://", "postgresql+psycopg2://", 1)
        return PostgresAdapter(url)
    return BaseAdapter(url)
