from fastapi import Depends, HTTPException, status
from fastapi.security import OAuth2PasswordBearer
from jose import JWTError, jwt
from sqlalchemy.orm import Session
from app.database import SessionLocal
from app.auth import SECRET_KEY, ALGORITHM, TokenData
from app.models import User

oauth2_scheme = OAuth2PasswordBearer(tokenUrl="/auth/token", auto_error=False)

def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()

def get_current_user(token: str = Depends(oauth2_scheme), db: Session = Depends(get_db)):
    credentials_exception = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Could not validate credentials",
        headers={"WWW-Authenticate": "Bearer"},
    )
    if not token:
        raise credentials_exception
    try:
        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
        email: str = payload.get("sub")
        if email is None:
            raise credentials_exception
            
        if email == "guest_user":
            guest = User(email="guest_user", full_name="Guest User", role="guest")
            guest.user_id = None
            return guest
            
        token_data = TokenData(email=email)
    except JWTError:
        raise credentials_exception
        
    user = db.query(User).filter(User.email == token_data.email).first()
    if user is None:
        raise credentials_exception
    return user

def require_role(allowed_roles: list[str]):
    def role_checker(current_user: User = Depends(get_current_user)):
        if not current_user.role or current_user.role not in allowed_roles:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Operation not permitted for your role"
            )
        return current_user
    return role_checker

def get_optional_user(token: str = Depends(oauth2_scheme), db: Session = Depends(get_db)):
    if not token or token == "null" or token == "undefined":
        return None
    try:
        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
        email: str = payload.get("sub")
        if email is None:
            return None
            
        if email == "guest_user":
            guest = User(email="guest_user", full_name="Guest User", role="guest")
            guest.user_id = None
            return guest
            
    except JWTError:
        return None
        
    return db.query(User).filter(User.email == email).first()
