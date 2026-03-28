from app.schema_router import choose_schema
from app.metadata import get_schema_metadata
from app.llm_service import generate_sql
from app.sql_executor import execute_sql
from app.sql_validator import validate_sql
from app.sql_repair import repair_sql
from app.explanation import generate_explanation
from app.query_classifier import classify_user_input
from app.schema_router import route_schema


def run_baseline_nl2sql(question: str):
    classification = classify_user_input(question)

    if not classification["needs_sql_pipeline"]:
        response_type_map = {
            "CHAT": "chat",
            "AMBIGUOUS_ANALYTIC": "ambiguous",
            "OUT_OF_SCOPE": "out_of_scope",
        }

        return {
            "response_type": response_type_map.get(classification["label"], "out_of_scope"),
            "question": question,
            "assistant_message": classification["message"],
            "execution_success": False,
            "repaired": False,
            "selected_schema": None,
            "generated_sql": None,
            "results": [],
            "explanation": classification["message"],
            "audit_trail": {
                "question": question,
                "classification": classification,
                "selected_schema": None,
                "initial_sql": None,
                "initial_validation": None,
                "initial_error": None,
                "repair_attempted": False,
                "repaired_sql": None,
                "repaired_validation": None,
                "execution_outcome": "not_routed_to_sql_pipeline",
            },
            "suggestions": [
                "What were total sales last month?",
                "Which products are currently low in stock?",
                "Show top 5 customers by lifetime value",
                "Which issue types are most common?",
            ],
        }

    routing = route_schema(question)
    selected_schema = routing["selected_schema"]
    schema_metadata = get_schema_metadata(selected_schema)

    audit_trail = {
    "question": question,
    "classification": classification,
    "schema_routing": routing,
    "selected_schema": selected_schema,
    "initial_sql": None,
    "initial_validation": None,
    "initial_error": None,
    "repair_attempted": False,
    "repaired_sql": None,
    "repaired_validation": None,
    "execution_outcome": None,
}

    if not schema_metadata:
        audit_trail["execution_outcome"] = "failed"
        return {
            "response_type": "analytic_query",
            "question": question,
            "selected_schema": selected_schema,
            "generated_sql": None,
            "results": [],
            "execution_success": False,
            "repaired": False,
            "explanation": f"No metadata found for schema: {selected_schema}",
            "audit_trail": audit_trail,
        }

    generated_sql = generate_sql(question, selected_schema, schema_metadata)
    audit_trail["initial_sql"] = generated_sql

    validation = validate_sql(generated_sql)
    audit_trail["initial_validation"] = validation

    if not validation["is_valid"]:
        audit_trail["execution_outcome"] = "blocked_by_validator"
        explanation = "The generated SQL was blocked before execution because it failed validation checks."

        return {
            "response_type": "analytic_query",
            "question": question,
            "selected_schema": selected_schema,
            "generated_sql": generated_sql,
            "results": [],
            "execution_success": False,
            "repaired": False,
            "validation_errors": validation["errors"],
            "explanation": explanation,
            "audit_trail": audit_trail,
        }

    try:
        results = execute_sql(generated_sql)
        audit_trail["execution_outcome"] = "success"

        explanation = generate_explanation(
            question=question,
            selected_schema=selected_schema,
            results=results,
            execution_success=True,
            repaired=False,
        )

        return {
            "response_type": "analytic_query",
            "question": question,
            "selected_schema": selected_schema,
            "generated_sql": generated_sql,
            "results": results,
            "execution_success": True,
            "repaired": False,
            "explanation": explanation,
            "audit_trail": audit_trail,
        }

    except Exception as e:
        error_message = str(e)
        audit_trail["initial_error"] = error_message
        audit_trail["repair_attempted"] = True

        try:
            repaired_sql = repair_sql(
                question=question,
                schema_name=selected_schema,
                schema_metadata=schema_metadata,
                bad_sql=generated_sql,
                error_message=error_message,
            )
            audit_trail["repaired_sql"] = repaired_sql

            repaired_validation = validate_sql(repaired_sql)
            audit_trail["repaired_validation"] = repaired_validation

            if not repaired_validation["is_valid"]:
                audit_trail["execution_outcome"] = "repair_failed_validation"

                explanation = (
                    "The initial SQL failed during execution, and the repaired SQL also failed validation."
                )

                return {
                    "response_type": "analytic_query",
                    "question": question,
                    "selected_schema": selected_schema,
                    "generated_sql": generated_sql,
                    "results": [],
                    "execution_success": False,
                    "repaired": False,
                    "error": error_message,
                    "repair_validation_errors": repaired_validation["errors"],
                    "explanation": explanation,
                    "audit_trail": audit_trail,
                }

            repaired_results = execute_sql(repaired_sql)
            audit_trail["execution_outcome"] = "success_after_repair"

            explanation = generate_explanation(
                question=question,
                selected_schema=selected_schema,
                results=repaired_results,
                execution_success=True,
                repaired=True,
                repaired_sql=repaired_sql,
            )

            return {
                "response_type": "analytic_query",
                "question": question,
                "selected_schema": selected_schema,
                "generated_sql": generated_sql,
                "results": repaired_results,
                "execution_success": True,
                "repaired": True,
                "repaired_sql": repaired_sql,
                "explanation": explanation,
                "audit_trail": audit_trail,
            }

        except Exception as repair_error:
            audit_trail["execution_outcome"] = "repair_execution_failed"

            explanation = (
                "The initial SQL failed during execution, and the system could not successfully repair it."
            )

            return {
                "response_type": "analytic_query",
                "question": question,
                "selected_schema": selected_schema,
                "generated_sql": generated_sql,
                "results": [],
                "execution_success": False,
                "repaired": False,
                "error": error_message,
                "repair_error": str(repair_error),
                "explanation": explanation,
                "audit_trail": audit_trail,
            }