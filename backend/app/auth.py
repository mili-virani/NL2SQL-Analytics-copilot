import os
from datetime import datetime, timedelta
from jose import JWTError, jwt
from fastapi import HTTPException, status
from pydantic import BaseModel
from google.oauth2 import id_token
from google.auth.transport import requests

SECRET_KEY = os.getenv("JWT_SECRET_KEY", "supersecretkey_change_in_prod")
ALGORITHM = "HS256"
ACCESS_TOKEN_EXPIRE_MINUTES = 60 * 24

GOOGLE_CLIENT_ID = os.getenv("GOOGLE_CLIENT_ID")

class Token(BaseModel):
    access_token: str
    token_type: str

class TokenData(BaseModel):
    email: str | None = None

def create_access_token(data: dict, expires_delta: timedelta | None = None):
    to_encode = data.copy()
    if expires_delta:
        expire = datetime.utcnow() + expires_delta
    else:
        expire = datetime.utcnow() + timedelta(days=14)
    to_encode.update({"exp": expire})
    encoded_jwt = jwt.encode(to_encode, SECRET_KEY, algorithm=ALGORITHM)
    return encoded_jwt

def verify_google_token(token: str):
    try:
        idinfo = id_token.verify_oauth2_token(token, requests.Request(), GOOGLE_CLIENT_ID)
        return idinfo
    except ValueError:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid Google token",
            headers={"WWW-Authenticate": "Bearer"},
        )
