from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from typing import Optional, Any
from app.dependencies import get_optional_user
from app.models import User
from app.orchestrator import route_query

router = APIRouter(prefix="/chat", tags=["chat"])

class ChatRequest(BaseModel):
    question: str
    context: Optional[str] = None

@router.post("/query")
def submit_query(
    request: ChatRequest,
    current_user: Optional[User] = Depends(get_optional_user)
):
    try:
        email = current_user.email if current_user else "Guest"
        print(f"User {email} queried: {request.question}")
        response = route_query(request.question)
        return response
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
