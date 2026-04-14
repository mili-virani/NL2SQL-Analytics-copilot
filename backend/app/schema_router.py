import json
import re
from typing import Any
from app.llm_service import generate_text
from app.db_adapters.base import BaseAdapter

def _extract_json_object(text: str) -> dict[str, Any]:
    cleaned = text.strip()

    if cleaned.startswith("```"):
        cleaned = cleaned.replace("```json", "").replace("```", "").strip()

    try:
        return json.loads(cleaned)
    except json.JSONDecodeError:
        pass

    match = re.search(r"\{.*\}", cleaned, flags=re.DOTALL)
    if not match:
        raise ValueError("No JSON object found in schema router response.")

    return json.loads(match.group(0))

def _route_with_llm(question: str, adapter: BaseAdapter) -> dict[str, Any]:
    schemas = adapter.get_schemas()
    if not schemas:
        raise ValueError("No schemas available in connected database.")
        
    full_metadata = adapter.get_full_metadata()
    
    schema_descriptions = []
    for schema_name, data in full_metadata.items():
        table_names = list(data.get("tables", {}).keys())
        table_list_str = ", ".join(table_names[:15]) # cap to avoid huge prompt
        if len(table_names) > 15:
            table_list_str += f" (and {len(table_names) - 15} more)"
        schema_descriptions.append(f"{schema_name}: Tables include [{table_list_str}]")
        
    schemas_str = "\n".join(schema_descriptions)
    
    prompt = f"""
You are a database schema router. 
You must choose the single BEST schema from the live database context that answers the user's analytical question.

Live Database Schemas Available:
{schemas_str}

Return ONLY valid JSON in this exact format:
{{
  "selected_schema": "insert schema name here",
  "confidence": "low | medium | high",
  "reason": "short distinct routing reason"
}}

User question:
{question}
"""

    raw = generate_text(prompt, model="gemini-2.5-flash")
    parsed = _extract_json_object(raw)

    selected_schema = parsed.get("selected_schema", "")
    confidence = parsed.get("confidence", "low")
    reason = parsed.get("reason", "llm_route")

    if selected_schema not in schemas:
        selected_schema = schemas[0]
        confidence = "low"
        reason = "invalid_llm_schema_defaulted_to_first"

    if confidence not in {"low", "medium", "high"}:
        confidence = "low"

    return {
        "selected_schema": selected_schema,
        "confidence": confidence,
        "reason": reason,
    }


def route_schema(question: str, adapter: BaseAdapter) -> dict[str, Any]:
    schemas = adapter.get_schemas()
    
    if len(schemas) == 1:
        return {
            "selected_schema": schemas[0],
            "confidence": "high",
            "scores": {},
            "reason": "only_one_schema_available"
        }
    
    # Delegate to LLM if multiple schemas exist
    llm_route = _route_with_llm(question, adapter)

    return {
        "selected_schema": llm_route["selected_schema"],
        "confidence": llm_route["confidence"],
        "scores": {},
        "reason": f'llm_dynamic:{llm_route["reason"]}',
    }


def choose_schema(question: str, adapter: BaseAdapter) -> str:
    return route_schema(question, adapter)["selected_schema"]