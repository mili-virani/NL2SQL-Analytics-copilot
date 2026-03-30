from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from pydantic import BaseModel
from typing import List

from app.database import SessionLocal
from app.models import User, AuditLog
from app.dependencies import get_db, require_role

router = APIRouter(prefix="/admin", tags=["admin"])

import os

class UserUpdate(BaseModel):
    role_name: str
    passkey: str | None = None

@router.get("/users")
def get_users(
    db: Session = Depends(get_db), 
    current_user: User = Depends(require_role(["super_admin", "admin"]))
):
    users = db.query(User).all()
    result = []
    for u in users:
        result.append({
            "id": u.user_id,
            "email": u.email,
            "name": u.full_name,
            "role": u.role,
        })
    return result

@router.patch("/users/{user_id}/role")
def update_user_role(
    user_id: int, 
    update: UserUpdate, 
    db: Session = Depends(get_db),
    current_user: User = Depends(require_role(["super_admin", "admin"]))
):
    user = db.query(User).filter(User.user_id == user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
        
    valid_roles = ["user", "admin", "super_admin"]
    if update.role_name not in valid_roles:
        raise HTTPException(status_code=400, detail="Invalid role")
        
    # require passkey if promoting TO admin or super_admin
    if update.role_name in ["admin", "super_admin"]:
        expected_passkey = os.getenv("ADMIN_CREATION_PASSKEY")
        if not update.passkey or update.passkey != expected_passkey:
            log = AuditLog(
                user_id=getattr(current_user, 'user_id', None),
                action_type="FAILED_PROMOTION", 
                action_details=f"Failed to promote {user.email} to {update.role_name} (Invalid Passkey)"
            )
            db.add(log)
            db.commit()
            raise HTTPException(status_code=403, detail="Invalid admin creation passkey")

    user.role = update.role_name
    db.commit()
    
    log = AuditLog(
        user_id=getattr(current_user, 'user_id', None),
        action_type="UPDATE_USER_ROLE", 
        action_details=f"Changed user {user.email} to {update.role_name}"
    )
    db.add(log)
    db.commit()
    
    return {"message": "Role updated"}

class DataFeedRequest(BaseModel):
    dataset_name: str
    records_count: int

@router.post("/data-feed")
def data_feed_upload(
    req: DataFeedRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_role(["super_admin", "admin"]))
):
    # Dummy processing
    log = AuditLog(
        user_id=getattr(current_user, 'user_id', None),
        action_type="DATA_FEED",
        action_details=f"Admin uploaded {req.records_count} records to {req.dataset_name}"
    )
    db.add(log)
    db.commit()
    
    return {"message": f"Successfully ingested {req.records_count} records to {req.dataset_name}"}

@router.get("/audit-logs")
def get_audit_logs(
    db: Session = Depends(get_db),
    current_user: User = Depends(require_role(["super_admin", "admin"]))
):
    logs = db.query(AuditLog).order_by(AuditLog.created_at.desc()).limit(100).all()
    result = []
    for log in logs:
        user = None
        if log.user_id:
            user = db.query(User).filter(User.user_id == log.user_id).first()
        
        result.append({
            "id": log.log_id,
            "user": user.email if user else f"Unknown or Guest ({log.user_id})",
            "action": log.action_type,
            "details": log.action_details,
            "timestamp": log.created_at
        })
        
    return result
