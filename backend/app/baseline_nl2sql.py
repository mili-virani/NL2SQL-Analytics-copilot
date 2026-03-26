from app.schema_router import choose_schema
from app.metadata import get_schema_metadata
from app.llm_service import generate_sql
from app.sql_executor import execute_sql
from app.sql_validator import validate_sql
from app.sql_repair import repair_sql
from app.explanation import generate_explanation


def run_baseline_nl2sql(question: str):
    selected_schema = choose_schema(question)
    schema_metadata = get_schema_metadata(selected_schema)

    audit_trail = {
        "question": question,
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