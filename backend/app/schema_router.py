import json
import re
from typing import Any

from app.llm_service import generate_text


SCHEMA_KEYWORDS = {
    "sales": {
        "sales",
        "sale",
        "revenue",
        "order",
        "orders",
        "ordered",
        "purchase",
        "purchases",
        "gmv",
        "aov",
        "transaction",
        "transactions",
        "invoice",
        "invoices",
        "refund",
        "refunds",
        "returned",
        "return",
        "cancelled",
        "shipped",
        "delivered",
        "order value",
        "total amount",
    },
    "inventory": {
        "inventory",
        "stock",
        "sku",
        "skus",
        "warehouse",
        "warehouses",
        "reorder",
        "restock",
        "restocking",
        "low stock",
        "out of stock",
        "product",
        "products",
        "item",
        "items",
        "supplier",
        "suppliers",
        "quantity",
        "unit cost",
        "category",
        "categories",
    },
    "customer": {
        "customer",
        "customers",
        "user",
        "users",
        "buyer",
        "buyers",
        "signup",
        "signups",
        "registered",
        "joined",
        "city",
        "state",
        "country",
        "segment",
        "lifetime value",
        "ltv",
        "retention",
        "churn",
        "repeat customer",
        "repeat customers",
    },
    "support": {
        "support",
        "ticket",
        "tickets",
        "issue",
        "issues",
        "complaint",
        "complaints",
        "case",
        "cases",
        "resolution",
        "resolved",
        "open",
        "closed",
        "pending",
        "agent",
        "agents",
        "escalated",
        "priority",
        "sla",
        "response time",
    },
}

SCHEMA_HINT_PHRASES = {
    "sales": {
        "top customers by revenue",
        "monthly sales",
        "sales trend",
        "order count",
        "average order value",
        "total revenue",
    },
    "inventory": {
        "low in stock",
        "low stock",
        "products to reorder",
        "inventory by category",
        "items out of stock",
    },
    "customer": {
        "customer lifetime value",
        "customers by city",
        "new customers",
        "repeat customers",
        "customer growth",
    },
    "support": {
        "common issue types",
        "tickets by status",
        "open tickets",
        "resolution time",
        "support volume",
    },
}

TOKEN_PATTERN = re.compile(r"\b[a-zA-Z0-9_]+\b")


def _normalize(text: str) -> str:
    return re.sub(r"\s+", " ", text.strip().lower())


def _tokenize(text: str) -> list[str]:
    return TOKEN_PATTERN.findall(text.lower())


def _score_schema(question: str) -> dict[str, int]:
    q = _normalize(question)
    tokens = set(_tokenize(q))
    scores = {schema: 0 for schema in SCHEMA_KEYWORDS}

    for schema, keywords in SCHEMA_KEYWORDS.items():
        for keyword in keywords:
            if " " in keyword:
                if keyword in q:
                    scores[schema] += 3
            else:
                if keyword in tokens:
                    scores[schema] += 2

    for schema, phrases in SCHEMA_HINT_PHRASES.items():
        for phrase in phrases:
            if phrase in q:
                scores[schema] += 4

    # Useful contextual bonuses
    if "revenue" in q or "order" in q or "orders" in q:
        scores["sales"] += 1

    if "stock" in q or "inventory" in q or "warehouse" in q:
        scores["inventory"] += 1

    if "customer" in q or "customers" in q or "ltv" in q:
        scores["customer"] += 1

    if "ticket" in q or "issue" in q or "support" in q:
        scores["support"] += 1

    return scores


def _top_schema(scores: dict[str, int]) -> tuple[str, int]:
    best_schema = max(scores, key=scores.get)
    return best_schema, scores[best_schema]


def _routing_confidence(scores: dict[str, int]) -> str:
    ordered = sorted(scores.values(), reverse=True)
    best = ordered[0]
    second = ordered[1] if len(ordered) > 1 else 0

    if best == 0:
        return "low"
    if best >= 5 and (best - second) >= 3:
        return "high"
    if best >= 3 and (best - second) >= 1:
        return "medium"
    return "low"


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


def _route_with_llm(question: str) -> dict[str, Any]:
    prompt = f"""
You are a schema router for an enterprise NL2SQL analytics assistant.

Available schemas:
1. sales
   - orders, revenue, transactions, returns, shipped/delivered/cancelled orders
2. inventory
   - products, stock levels, warehouses, suppliers, reorder/restock
3. customer
   - customers, signups, locations, segments, lifetime value, retention
4. support
   - tickets, issues, complaint categories, statuses, agents, resolution

Choose the BEST single schema for the user question.

Return ONLY valid JSON in this exact format:
{{
  "selected_schema": "sales | inventory | customer | support",
  "confidence": "low | medium | high",
  "reason": "short routing reason"
}}

User question:
{question}
"""

    raw = generate_text(prompt, model="gemini-2.5-flash")
    parsed = _extract_json_object(raw)

    selected_schema = parsed.get("selected_schema", "sales")
    confidence = parsed.get("confidence", "low")
    reason = parsed.get("reason", "llm_route")

    valid = {"sales", "inventory", "customer", "support"}
    if selected_schema not in valid:
        selected_schema = "sales"
        confidence = "low"
        reason = "invalid_llm_schema_defaulted_to_sales"

    if confidence not in {"low", "medium", "high"}:
        confidence = "low"

    return {
        "selected_schema": selected_schema,
        "confidence": confidence,
        "reason": reason,
    }


def route_schema(question: str) -> dict[str, Any]:
    scores = _score_schema(question)
    best_schema, best_score = _top_schema(scores)
    confidence = _routing_confidence(scores)

    sorted_scores = sorted(scores.items(), key=lambda x: x[1], reverse=True)
    top_schema, top_score = sorted_scores[0]
    second_schema, second_score = sorted_scores[1]

    # High-confidence rule route
    if confidence == "high":
        return {
            "selected_schema": best_schema,
            "confidence": confidence,
            "scores": scores,
            "reason": "rule_based_high_confidence",
        }

    # Medium confidence but still usable
    if confidence == "medium" and top_score >= second_score + 2:
        return {
            "selected_schema": best_schema,
            "confidence": confidence,
            "scores": scores,
            "reason": "rule_based_medium_confidence",
        }

    # LLM fallback for uncertainty / ties / weak signal
    llm_route = _route_with_llm(question)

    return {
        "selected_schema": llm_route["selected_schema"],
        "confidence": llm_route["confidence"],
        "scores": scores,
        "reason": f'llm_fallback_after_rule_uncertainty:{llm_route["reason"]}',
    }


def choose_schema(question: str) -> str:
    return route_schema(question)["selected_schema"]