import os
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from pydantic import BaseModel
from typing import Optional
import bcrypt

from app.database import SessionLocal
from app.models import User, AuditLog
from app.auth import create_access_token, verify_google_token
from app.dependencies import get_db, get_current_user

router = APIRouter(prefix="/auth", tags=["auth"])

def hash_password(password: str) -> str:
    salt = bcrypt.gensalt()
    return bcrypt.hashpw(password.encode('utf-8'), salt).decode('utf-8')

def verify_password(plain_password: str, hashed_password: str) -> bool:
    return bcrypt.checkpw(plain_password.encode('utf-8'), hashed_password.encode('utf-8'))

class GoogleLoginRequest(BaseModel):
    credential: str

class SignupRequest(BaseModel):
    email: str
    username: str
    password: str
    full_name: str

class LocalLoginRequest(BaseModel):
    email: str
    password: str

class UserResponse(BaseModel):
    id: Optional[int]
    email: str
    name: str
    role: str

@router.post("/guest/login")
def guest_login():
    access_token = create_access_token(data={"sub": "guest_user"})
    return {"access_token": access_token, "token_type": "bearer"}

@router.post("/signup")
def signup_local(req: SignupRequest, db: Session = Depends(get_db)):
    # Check if user exists
    existing = db.query(User).filter((User.email == req.email) | (User.username == req.username)).first()
    if existing:
        raise HTTPException(status_code=400, detail="Email or username already registered")
        
    admin_email = os.getenv("ADMIN_EMAIL")
    role = "super_admin" if req.email == admin_email else "user"
    
    hashed_password = hash_password(req.password)
    
    user = User(
        email=req.email,
        username=req.username,
        password_hash=hashed_password,
        full_name=req.full_name,
        auth_provider="local",
        role=role
    )
    db.add(user)
    db.commit()
    db.refresh(user)
    
    audit = AuditLog(user_id=user.user_id, action_type="Signup", action_details=f"User registered locally with role {role}")
    db.add(audit)
    db.commit()
    
    access_token = create_access_token(data={"sub": user.email})
    return {"access_token": access_token, "token_type": "bearer"}

@router.post("/local/login")
def local_login(req: LocalLoginRequest, db: Session = Depends(get_db)):
    user = db.query(User).filter(User.email == req.email).first()
    if not user or not user.password_hash:
        raise HTTPException(status_code=401, detail="Invalid email or password")
        
    if not verify_password(req.password, user.password_hash):
        raise HTTPException(status_code=401, detail="Invalid email or password")
        
    audit = AuditLog(user_id=user.user_id, action_type="Login", action_details="User logged in locally")
    db.add(audit)
    db.commit()
    
    access_token = create_access_token(data={"sub": user.email})
    return {"access_token": access_token, "token_type": "bearer"}


@router.post("/google/login")
def google_login(req: GoogleLoginRequest, db: Session = Depends(get_db)):
    try:
        idinfo = verify_google_token(req.credential)
        email = idinfo.get("email")
        name = idinfo.get("name")
        
        user = db.query(User).filter(User.email == email).first()
        admin_email = os.getenv("ADMIN_EMAIL")
        
        if not user:
            role = "super_admin" if email == admin_email else "user"
            
            # auto-generate a username
            base_username = email.split('@')[0]
            
            user = User(
                email=email,
                username=base_username,
                full_name=name,
                auth_provider="google",
                role=role
            )
            db.add(user)
            db.commit()
            db.refresh(user)
            
            audit = AuditLog(user_id=user.user_id, action_type="User Created", action_details=f"User registered via Google with role {role}")
            db.add(audit)
            db.commit()
        else:
            if email == admin_email and user.role != "super_admin":
                user.role = "super_admin"
                db.commit()

        audit = AuditLog(user_id=user.user_id, action_type="Login", action_details="User logged in via Google")
        db.add(audit)
        db.commit()
            
        access_token = create_access_token(data={"sub": user.email})
        return {"access_token": access_token, "token_type": "bearer"}
        
    except Exception as e:
        import traceback
        traceback.print_exc()
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail=f"Invalid token: {str(e)}")

@router.get("/me", response_model=UserResponse)
def read_users_me(current_user: User = Depends(get_current_user)):
    return {
         "id": getattr(current_user, 'user_id', None),
         "email": current_user.email,
         "name": getattr(current_user, 'full_name', "Guest User"),
         "role": current_user.role
    }

@router.post("/logout")
def logout(current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    if getattr(current_user, 'user_id', None):
        audit = AuditLog(user_id=current_user.user_id, action_type="Logout", action_details="User logged out")
        db.add(audit)
        db.commit()
    return {"message": "Logged out successfully"}
