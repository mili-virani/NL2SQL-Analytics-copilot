import json
import re
from typing import Any

from app.llm_service import generate_text


GREETING_PATTERNS = {
    "hi",
    "hello",
    "hey",
    "hii",
    "heyy",
    "good morning",
    "good afternoon",
    "good evening",
    "yo",
    "sup",
    "hola",
}

CHAT_PATTERNS = {
    "how are you",
    "what can you do",
    "who are you",
    "help",
    "thanks",
    "thank you",
    "okay",
    "ok",
    "cool",
    "nice",
}

ANALYTICS_KEYWORDS = {
    "sales",
    "revenue",
    "order",
    "orders",
    "inventory",
    "stock",
    "customer",
    "customers",
    "support",
    "ticket",
    "tickets",
    "issue",
    "issues",
    "product",
    "products",
    "top",
    "highest",
    "lowest",
    "most",
    "least",
    "count",
    "total",
    "average",
    "avg",
    "sum",
    "trend",
    "monthly",
    "weekly",
    "daily",
    "city",
    "state",
    "category",
    "status",
    "shipped",
    "cancelled",
    "returned",
    "low stock",
    "restock",
    "reorder",
    "lifetime value",
    "ltv",
    "joined",
    "closed",
    "open",
    "resolved",
    "amount",
    "quantity",
}

AMBIGUOUS_ANALYTICS_TERMS = {
    "sales",
    "revenue",
    "orders",
    "order",
    "inventory",
    "stock",
    "customers",
    "customer",
    "support",
    "tickets",
    "ticket",
    "products",
    "product",
    "top",
    "bottom",
    "monthly",
    "weekly",
    "daily",
    "last month",
    "this month",
    "last week",
    "today",
    "yesterday",
    "trend",
}

NOISE_PATTERN = re.compile(r"^[^a-zA-Z0-9]+$")
WORD_PATTERN = re.compile(r"\b\w+\b")


def _normalize(text: str) -> str:
    return re.sub(r"\s+", " ", text.strip().lower())


def _word_count(text: str) -> int:
    return len(WORD_PATTERN.findall(text))


def _contains_analytics_signal(text: str) -> bool:
    return any(keyword in text for keyword in ANALYTICS_KEYWORDS)


def _looks_like_noise(text: str) -> bool:
    if not text:
        return True

    if NOISE_PATTERN.match(text):
        return True

    letters = re.sub(r"[^a-zA-Z]", "", text)
    if letters and len(letters) >= 6 and _word_count(text) <= 2:
        vowels = sum(1 for c in letters.lower() if c in "aeiou")
        vowel_ratio = vowels / len(letters)
        if vowel_ratio < 0.15:
            return True

    return False


def _build_response(
    label: str,
    message: str,
    needs_sql_pipeline: bool,
    confidence: str,
    reason: str,
) -> dict[str, Any]:
    return {
        "label": label,
        "message": message,
        "needs_sql_pipeline": needs_sql_pipeline,
        "confidence": confidence,
        "reason": reason,
    }


def classify_user_input(question: str) -> dict[str, Any]:
    q = _normalize(question)

    if not q:
        return _build_response(
            label="OUT_OF_SCOPE",
            message=(
                "Please enter a business question. For example: "
                "'What were total sales last month?'"
            ),
            needs_sql_pipeline=False,
            confidence="high",
            reason="empty_input",
        )

    if q in GREETING_PATTERNS:
        return _build_response(
            label="CHAT",
            message=(
                "Hi! I can help with business analytics questions across sales, "
                "inventory, customer, and support data."
            ),
            needs_sql_pipeline=False,
            confidence="high",
            reason="greeting_rule",
        )

    if q in CHAT_PATTERNS:
        return _build_response(
            label="CHAT",
            message=(
                "I can answer business questions and generate analytics from your database. "
                "Try asking something like 'What were total sales last month?' "
                "or 'Which products are low in stock?'"
            ),
            needs_sql_pipeline=False,
            confidence="high",
            reason="chat_rule",
        )

    if _looks_like_noise(q):
        return _build_response(
            label="OUT_OF_SCOPE",
            message=(
                "That does not look like a business analytics question. "
                "Try something like 'Top 5 customers by revenue' "
                "or 'Which issue types are most common?'"
            ),
            needs_sql_pipeline=False,
            confidence="high",
            reason="noise_rule",
        )

    wc = _word_count(q)
    analytics_signal = _contains_analytics_signal(q)

    if wc <= 2 and q in AMBIGUOUS_ANALYTICS_TERMS:
        return _build_response(
            label="AMBIGUOUS_ANALYTIC",
            message=(
                f"I think you're asking about **{question.strip()}**, but I need a bit more detail. "
                "For example, ask 'Show monthly sales trend', "
                "'Top customers by lifetime value', or "
                "'Products currently low in stock'."
            ),
            needs_sql_pipeline=False,
            confidence="high",
            reason="short_ambiguous_analytic_rule",
        )

    if wc <= 2 and not analytics_signal:
        return _build_response(
            label="OUT_OF_SCOPE",
            message=(
                "Please ask a more specific business question. "
                "For example: 'Show top 5 selling products this month'."
            ),
            needs_sql_pipeline=False,
            confidence="high",
            reason="too_short_non_analytic_rule",
        )

    if analytics_signal and wc >= 4:
        return _build_response(
            label="ANALYTIC_QUERY",
            message="Analytical query detected.",
            needs_sql_pipeline=True,
            confidence="high",
            reason="analytic_rule",
        )

    # LLM fallback only for uncertain cases
    return _classify_with_llm(question)


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
        raise ValueError("No JSON object found in LLM classifier response.")

    return json.loads(match.group(0))


def _classify_with_llm(question: str) -> dict[str, Any]:
    prompt = f"""
You are an intent classifier for an enterprise NL2SQL analytics assistant.

Classify the user input into exactly one of these labels:
- CHAT
- ANALYTIC_QUERY
- AMBIGUOUS_ANALYTIC
- OUT_OF_SCOPE

Definitions:
- CHAT: greeting, small talk, thanks, asking what the assistant can do.
- ANALYTIC_QUERY: a specific business question that should go to the SQL pipeline.
- AMBIGUOUS_ANALYTIC: analytics-related but too vague or incomplete to generate SQL safely.
- OUT_OF_SCOPE: unrelated, random, personal, or non-business content.

Return ONLY valid JSON with this exact structure:
{{
  "label": "CHAT | ANALYTIC_QUERY | AMBIGUOUS_ANALYTIC | OUT_OF_SCOPE",
  "message": "one short user-facing reply",
  "needs_sql_pipeline": true or false,
  "confidence": "low | medium | high"
}}

User input:
{question}
"""

    raw = generate_text(prompt)
    parsed = _extract_json_object(raw)

    label = parsed.get("label", "OUT_OF_SCOPE")
    message = parsed.get(
        "message",
        "Please ask a business analytics question related to sales, inventory, customer, or support data.",
    )
    needs_sql_pipeline = bool(parsed.get("needs_sql_pipeline", False))
    confidence = parsed.get("confidence", "medium")

    valid_labels = {"CHAT", "ANALYTIC_QUERY", "AMBIGUOUS_ANALYTIC", "OUT_OF_SCOPE"}
    if label not in valid_labels:
        label = "OUT_OF_SCOPE"
        needs_sql_pipeline = False

    if label != "ANALYTIC_QUERY":
        needs_sql_pipeline = False

    return _build_response(
        label=label,
        message=message,
        needs_sql_pipeline=needs_sql_pipeline,
        confidence=confidence,
        reason="llm_fallback",
    )