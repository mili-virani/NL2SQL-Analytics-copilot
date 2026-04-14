from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from typing import Optional, List
from sqlalchemy.orm import Session
import os

from app.dependencies import get_db, get_optional_user
from app.models import User, DatabaseConnection
from app.db_adapters.factory import get_adapter
from app.crypto import encrypt

router = APIRouter(prefix="/connections", tags=["connections"])

class ConnectionCreate(BaseModel):
    name: str
    db_type: str
    host: Optional[str] = None
    port: Optional[int] = None
    database_name: Optional[str] = None
    username: Optional[str] = None
    password: Optional[str] = None
    ssl_enabled: bool = False
    extra_config_json: Optional[str] = None

class ConnectionUpdate(BaseModel):
    name: Optional[str] = None
    host: Optional[str] = None
    port: Optional[int] = None
    database_name: Optional[str] = None
    username: Optional[str] = None
    password: Optional[str] = None
    ssl_enabled: Optional[bool] = None
    extra_config_json: Optional[str] = None

@router.get("")
def list_connections(current_user: User = Depends(get_optional_user), db: Session = Depends(get_db)):
    if not current_user or current_user.role == "guest":
        raise HTTPException(status_code=401, detail="Unauthorized")
    
    connections = db.query(DatabaseConnection).filter(DatabaseConnection.user_id == current_user.user_id).all()
    
    return [{
        "id": c.id,
        "name": c.name,
        "db_type": c.db_type,
        "host": c.host,
        "port": c.port,
        "database_name": c.database_name,
        "username": c.username,
        "ssl_enabled": c.ssl_enabled,
        "extra_config_json": c.extra_config_json,
        "is_active": (current_user.active_db_connection_id == c.id)
    } for c in connections]

@router.post("")
def create_connection(conn: ConnectionCreate, current_user: User = Depends(get_optional_user), db: Session = Depends(get_db)):
    if not current_user or current_user.role == "guest":
        raise HTTPException(status_code=401, detail="Unauthorized")
        
    encrypted_pass = encrypt(conn.password) if conn.password else None
    
    new_conn = DatabaseConnection(
        user_id=current_user.user_id,
        name=conn.name,
        db_type=conn.db_type,
        host=conn.host,
        port=conn.port,
        database_name=conn.database_name,
        username=conn.username,
        encrypted_password=encrypted_pass,
        ssl_enabled=conn.ssl_enabled,
        extra_config_json=conn.extra_config_json
    )
    
    # Auto-activate if it's the first connection
    existing = db.query(DatabaseConnection).filter(DatabaseConnection.user_id == current_user.user_id).first()
    
    db.add(new_conn)
    db.commit()
    db.refresh(new_conn)
    
    if not existing:
        current_user.active_db_connection_id = new_conn.id
        db.commit()
        
    return {"id": new_conn.id, "message": "Connection created successfully"}

@router.post("/test")
def test_connection_endpoint(conn: ConnectionCreate, current_user: User = Depends(get_optional_user)):
    if not current_user or current_user.role == "guest":
        raise HTTPException(status_code=401, detail="Unauthorized")
    
    # Create an ephemeral dummy connection to test
    temp_conn = DatabaseConnection(
        db_type=conn.db_type,
        host=conn.host,
        port=conn.port,
        database_name=conn.database_name,
        username=conn.username,
        encrypted_password=encrypt(conn.password) if conn.password else None,
        ssl_enabled=conn.ssl_enabled,
        extra_config_json=conn.extra_config_json
    )
    
    try:
        adapter = get_adapter(temp_conn)
        success = adapter.test_connection()
        if success:
            return {"success": True, "message": "Connection successful"}
        else:
            return {"success": False, "message": "Connection failed for unknown reasons"}
    except Exception as e:
        return {"success": False, "error": str(e)[:200]} # redact long errors slightly

@router.delete("/{conn_id}")
def delete_connection(conn_id: int, current_user: User = Depends(get_optional_user), db: Session = Depends(get_db)):
    if not current_user or current_user.role == "guest":
        raise HTTPException(status_code=401, detail="Unauthorized")
        
    conn = db.query(DatabaseConnection).filter(DatabaseConnection.id == conn_id, DatabaseConnection.user_id == current_user.user_id).first()
    if not conn:
        raise HTTPException(status_code=404, detail="Connection not found")
        
    if current_user.active_db_connection_id == conn.id:
        current_user.active_db_connection_id = None
        
    db.delete(conn)
    db.commit()
    return {"success": True}

@router.post("/{conn_id}/activate")
def activate_connection(conn_id: int, current_user: User = Depends(get_optional_user), db: Session = Depends(get_db)):
    if not current_user or current_user.role == "guest":
        raise HTTPException(status_code=401, detail="Unauthorized")
        
    conn = db.query(DatabaseConnection).filter(DatabaseConnection.id == conn_id, DatabaseConnection.user_id == current_user.user_id).first()
    if not conn:
        raise HTTPException(status_code=404, detail="Connection not found")
        
    current_user.active_db_connection_id = conn.id
    db.commit()
    return {"success": True}
        
@router.patch("/{conn_id}")
def update_connection(conn_id: int, updates: ConnectionUpdate, current_user: User = Depends(get_optional_user), db: Session = Depends(get_db)):
    if not current_user or current_user.role == "guest":
        raise HTTPException(status_code=401, detail="Unauthorized")
        
    conn = db.query(DatabaseConnection).filter(DatabaseConnection.id == conn_id, DatabaseConnection.user_id == current_user.user_id).first()
    if not conn:
        raise HTTPException(status_code=404, detail="Connection not found")
        
    if updates.name is not None: conn.name = updates.name
    if updates.host is not None: conn.host = updates.host
    if updates.port is not None: conn.port = updates.port
    if updates.database_name is not None: conn.database_name = updates.database_name
    if updates.username is not None: conn.username = updates.username
    if updates.password is not None:
        conn.encrypted_password = encrypt(updates.password)
    if updates.ssl_enabled is not None: conn.ssl_enabled = updates.ssl_enabled
    if updates.extra_config_json is not None: conn.extra_config_json = updates.extra_config_json
    
    db.commit()
    return {"success": True}
