import os
import json
from google import genai
from pydantic import BaseModel
from typing import Optional, Any
from app.baseline_nl2sql import run_baseline_nl2sql
from app.services.search_service import perform_web_search
from app.services.playwright_service import extract_from_url
from app.cache import cached

class ChatRequest(BaseModel):
    question: str
    context: Optional[str] = None

class OrchestratorResponse(BaseModel):
    mode: str
    repaired: bool = False
    cache_hit: bool = False
    results: Any = None
    explanation: Optional[str] = None
    audit_trail: Optional[dict] = None

def classify_intent(question: str) -> str:
    """Classifies question into CHAT, NL2SQL, SEARCH, PLAYWRIGHT"""
    api_key = os.getenv("GEMINI_API_KEY")
    client = genai.Client(api_key=api_key)
    prompt = f"""
    Classify the following query into exactly ONE of the following modes:
    - NL2SQL: If it asks about business data, internal databases, analytics, tables, or charts.
    - SEARCH: If it asks for external current events, pricing, web data, or general knowledge.
    - PLAYWRIGHT: If it explicitly asks to scrape, extract, or visit a specific URL.
    - CHAT: If it is a normal greeting, vague question, or conversational chit-chat.

    Query: "{question}"
    
    Output JUST the mode name (e.g., NL2SQL).
    """
    try:
        response = client.models.generate_content(
            model='gemini-2.5-flash',
            contents=prompt
        )
        t = response.text.strip().upper()
        if "NL2SQL" in t: return "NL2SQL"
        if "SEARCH" in t: return "SEARCH"
        if "PLAYWRIGHT" in t: return "PLAYWRIGHT"
        return "CHAT"
    except Exception:
        return "CHAT"  # Safe fallback

def handle_chat_mode(question: str):
    api_key = os.getenv("GEMINI_API_KEY")
    client = genai.Client(api_key=api_key)
    response = client.models.generate_content(
        model='gemini-2.5-flash',
        contents=question
    )
    return {
        "mode": "CHAT",
        "results": response.text,
        "explanation": "Answered via normal LLM chat."
    }

@cached(ttl=21600)
def route_query_impl(question: str):
    mode = classify_intent(question)
    
    if mode == "NL2SQL":
        # Call the existing NL2SQL pipeline from the base codebase
        res = run_baseline_nl2sql(question)
        return {
            "mode": "NL2SQL",
            "results": res.get("results", []),
            "explanation": res.get("explanation", ""),
            "repaired": res.get("repaired", False),
            "repaired_sql": res.get("repaired_sql"),
            "audit_trail": res.get("audit_trail")
        }
    
    elif mode == "SEARCH":
        search_res = perform_web_search(question)
        return {
            "mode": "SEARCH",
            "results": search_res,
            "explanation": "Answered via Web Search."
        }
        
    elif mode == "PLAYWRIGHT":
        # Extract URL trivially for the demo
        words = question.split()
        url = next((w for w in words if w.startswith("http")), None)
        if url:
            pw_res = extract_from_url(url)
            return {
                "mode": "PLAYWRIGHT",
                "results": pw_res,
                "explanation": f"Extracted data from {url}"
            }
        else:
             return {
                "mode": "PLAYWRIGHT",
                "results": "No valid URL found in question.",
                "explanation": "Failed to extract."
             }
             
    else:
        return handle_chat_mode(question)

def route_query(question: str) -> dict:
    return route_query_impl(question)
