import json
import traceback
from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from typing import Optional, List, Any
from sqlalchemy.orm import Session

from app.dependencies import get_optional_user, get_db
from app.models import User, Conversation, ConversationMessage, QueryLog
from app.orchestrator import route_query

router = APIRouter(prefix="/chat", tags=["chat"])

# --- Models ---
class ChatRequest(BaseModel):
    question: str
    context: Optional[str] = None
    conversation_id: Optional[int] = None

class CreateConversationRequest(BaseModel):
    title: Optional[str] = "New Chat"

class UpdateConversationRequest(BaseModel):
    title: str

# --- Endpoints ---

@router.get("/conversations")
def list_conversations(current_user: User = Depends(get_optional_user), db: Session = Depends(get_db)):
    if not current_user:
        return []
    convs = db.query(Conversation).filter(Conversation.user_id == current_user.user_id).order_by(Conversation.updated_at.desc()).all()
    return [{"conversation_id": c.conversation_id, "title": c.title, "created_at": c.created_at, "updated_at": c.updated_at} for c in convs]

@router.post("/conversations")
def create_conversation(req: CreateConversationRequest, current_user: User = Depends(get_optional_user), db: Session = Depends(get_db)):
    if not current_user:
        raise HTTPException(status_code=401, detail="Must be logged in to save chats")
    conv = Conversation(user_id=current_user.user_id, title=req.title)
    db.add(conv)
    db.commit()
    db.refresh(conv)
    return {"conversation_id": conv.conversation_id, "title": conv.title}

@router.get("/conversations/{conversation_id}")
def get_conversation(conversation_id: int, current_user: User = Depends(get_optional_user), db: Session = Depends(get_db)):
    if not current_user:
        raise HTTPException(status_code=401, detail="Unauthorized")
    conv = db.query(Conversation).filter(Conversation.conversation_id == conversation_id, Conversation.user_id == current_user.user_id).first()
    if not conv:
        raise HTTPException(status_code=404, detail="Conversation not found")
        
    msgs = db.query(ConversationMessage).filter(ConversationMessage.conversation_id == conversation_id).order_by(ConversationMessage.created_at.asc()).all()
    
    formatted_msgs = []
    for m in msgs:
        formatted_msgs.append({
            "message_id": m.message_id,
            "role": m.role,
            "content": m.content,
            "response_json": json.loads(m.response_json) if m.response_json else None,
            "created_at": m.created_at
        })
        
    return {
        "conversation_id": conv.conversation_id,
        "title": conv.title,
        "messages": formatted_msgs
    }

@router.patch("/conversations/{conversation_id}")
def rename_conversation(conversation_id: int, req: UpdateConversationRequest, current_user: User = Depends(get_optional_user), db: Session = Depends(get_db)):
    if not current_user:
        raise HTTPException(status_code=401, detail="Unauthorized")
    conv = db.query(Conversation).filter(Conversation.conversation_id == conversation_id, Conversation.user_id == current_user.user_id).first()
    if not conv:
        raise HTTPException(status_code=404, detail="Conversation not found")
    conv.title = req.title
    db.commit()
    return {"success": True}

@router.delete("/conversations/{conversation_id}")
def delete_conversation(conversation_id: int, current_user: User = Depends(get_optional_user), db: Session = Depends(get_db)):
    if not current_user:
        raise HTTPException(status_code=401, detail="Unauthorized")
    conv = db.query(Conversation).filter(Conversation.conversation_id == conversation_id, Conversation.user_id == current_user.user_id).first()
    if not conv:
        raise HTTPException(status_code=404, detail="Conversation not found")
    
    # Delete messages first
    db.query(ConversationMessage).filter(ConversationMessage.conversation_id == conversation_id).delete()
    db.delete(conv)
    db.commit()
    return {"success": True}


@router.post("/query")
def submit_query(
    request: ChatRequest,
    current_user: Optional[User] = Depends(get_optional_user),
    db: Session = Depends(get_db)
):
    user_id = current_user.user_id if current_user else None
    email = current_user.email if current_user else "Guest"
    print(f"User {email} queried: {request.question}")

    # Validate conversation ownership if provided
    if request.conversation_id and user_id:
        conv = db.query(Conversation).filter(Conversation.conversation_id == request.conversation_id, Conversation.user_id == user_id).first()
        if not conv:
            raise HTTPException(status_code=404, detail="Conversation not found")

    # Save user message
    if request.conversation_id:
        user_msg = ConversationMessage(
            conversation_id=request.conversation_id,
            role="user",
            content=request.question
        )
        db.add(user_msg)
        db.commit()
        
        # Auto-title
        conv = db.query(Conversation).filter(Conversation.conversation_id == request.conversation_id).first()
        if conv and conv.title == "New Chat":
            conv.title = request.question[:30] + ("..." if len(request.question) > 30 else "")
            db.commit()

    try:
        response = route_query(request.question)

        # Save assistant message
        if request.conversation_id:
            cleaned_response_for_db = {
                "mode": response.get("mode"),
                "explanation": response.get("explanation"),
                "results": response.get("results"),     
                "selected_schema": response.get("selected_schema")
            }
            assistant_msg = ConversationMessage(
                conversation_id=request.conversation_id,
                role="assistant",
                content=str(response.get("results", "")),
                response_json=json.dumps(cleaned_response_for_db, default=str)
            )
            db.add(assistant_msg)
            db.commit()

        # Log internal details
        log = QueryLog(
            user_id=user_id,
            conversation_id=request.conversation_id,
            question=request.question,
            mode=response.get("mode"),
            selected_schema=response.get("selected_schema"),
            generated_sql=response.get("generated_sql"),
            repaired_sql=response.get("repaired_sql"),
            execution_success=True,
            repaired=bool(response.get("repaired_sql")),
            audit_trail_json=json.dumps(response.get("audit_trail", []), default=str),
            results_preview=str(response.get("results", ""))[:500]
        )
        db.add(log)
        db.commit()

        # REMOVE unsafe data from frontend payload
        response.pop("generated_sql", None)
        response.pop("repaired_sql", None)
        response.pop("audit_trail", None)

        return response
    except Exception as e:
        err_msg = traceback.format_exc()
        print(f"ERROR processing query: {err_msg}")
        
        # Log failure
        try:
            log = QueryLog(
                user_id=user_id,
                conversation_id=request.conversation_id,
                question=request.question,
                execution_success=False,
                results_preview="Error: " + str(e)[:200]
            )
            db.add(log)
            db.commit()
        except:
            pass # ignore log db error
            
        return {
            "mode": "CHAT",
            "results": "**System Error Detected**:\n\nThe orchestrator encountered an unexpected error processing your request.",
            "explanation": f"Error: {str(e)[:150]}"  # Show a small hint of the error in explanation!
        }
