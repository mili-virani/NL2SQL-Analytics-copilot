from fastapi import FastAPI
from app.database import test_connection
from pydantic import BaseModel
from fastapi.middleware.cors import CORSMiddleware
from app.baseline_nl2sql import run_baseline_nl2sql
from app.metadata import (
    get_schemas,
    get_tables,
    get_columns,
    get_foreign_keys,
    get_full_metadata,
    get_schema_metadata,
)

from app.sql_validator import validate_sql
from app.sql_repair import repair_sql
from app.sql_executor import execute_sql
from app.explanation import generate_explanation

app = FastAPI(title="Enterprise Multi-Agent NL2SQL Assistant")

app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://127.0.0.1:5173",
        "http://localhost:5173",
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

class QueryRequest(BaseModel):
    question: str

class RepairTestRequest(BaseModel):
    question: str
    schema_name: str
    bad_sql: str

@app.get("/")
def root():
    return {"message": "Backend is running"}


@app.get("/test-db")
def test_db():
    db_name, user_name = test_connection()
    return {
        "status": "success",
        "database": db_name,
        "user": user_name,
    }


@app.get("/metadata/schemas")
def metadata_schemas():
    return {"schemas": get_schemas()}


@app.get("/metadata/tables")
def metadata_tables():
    return {"tables": get_tables()}


@app.get("/metadata/columns")
def metadata_columns():
    return {"columns": get_columns()}


@app.get("/metadata/foreign-keys")
def metadata_foreign_keys():
    return {"foreign_keys": get_foreign_keys()}


@app.get("/metadata/full")
def metadata_full():
    return get_full_metadata()

@app.post("/nl2sql/query")
def nl2sql_query(request: QueryRequest):
    return run_baseline_nl2sql(request.question)
    
@app.post("/nl2sql/test-repair")
def test_repair(request: RepairTestRequest):
    schema_metadata = get_schema_metadata(request.schema_name)

    audit_trail = {
        "question": request.question,
        "selected_schema": request.schema_name,
        "initial_sql": request.bad_sql,
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
            "question": request.question,
            "schema_name": request.schema_name,
            "execution_success": False,
            "repaired": False,
            "results": [],
            "explanation": f"No metadata found for schema: {request.schema_name}",
            "audit_trail": audit_trail,
        }

    initial_validation = validate_sql(request.bad_sql)
    audit_trail["initial_validation"] = initial_validation

    try:
        initial_results = execute_sql(request.bad_sql)
        audit_trail["execution_outcome"] = "success"
        explanation = generate_explanation(
            question=request.question,
            selected_schema=request.schema_name,
            results=initial_results,
            execution_success=True,
            repaired=False,
        )

        return {
            "question": request.question,
            "schema_name": request.schema_name,
            "bad_sql": request.bad_sql,
            "execution_success": True,
            "repaired": False,
            "results": initial_results,
            "explanation": explanation,
            "message": "The provided bad_sql unexpectedly succeeded, so repair was not needed.",
            "audit_trail": audit_trail,
        }

    except Exception as e:
        initial_error = str(e)
        audit_trail["initial_error"] = initial_error
        audit_trail["repair_attempted"] = True

        try:
            repaired_sql = repair_sql(
                question=request.question,
                schema_name=request.schema_name,
                schema_metadata=schema_metadata,
                bad_sql=request.bad_sql,
                error_message=initial_error,
            )
            audit_trail["repaired_sql"] = repaired_sql

            repaired_validation = validate_sql(repaired_sql)
            audit_trail["repaired_validation"] = repaired_validation

            if not repaired_validation["is_valid"]:
                audit_trail["execution_outcome"] = "repair_failed_validation"

                return {
                    "question": request.question,
                    "schema_name": request.schema_name,
                    "bad_sql": request.bad_sql,
                    "execution_success": False,
                    "repaired": False,
                    "results": [],
                    "explanation": "The repair attempt produced SQL that failed validation.",
                    "audit_trail": audit_trail,
                }

            repaired_results = execute_sql(repaired_sql)
            audit_trail["execution_outcome"] = "success_after_repair"

            explanation = generate_explanation(
                question=request.question,
                selected_schema=request.schema_name,
                results=repaired_results,
                execution_success=True,
                repaired=True,
                repaired_sql=repaired_sql,
            )

            return {
                "question": request.question,
                "schema_name": request.schema_name,
                "bad_sql": request.bad_sql,
                "execution_success": True,
                "repaired": True,
                "repaired_sql": repaired_sql,
                "results": repaired_results,
                "explanation": explanation,
                "audit_trail": audit_trail,
            }

        except Exception as repair_error:
            audit_trail["execution_outcome"] = "repair_execution_failed"

            return {
                "question": request.question,
                "schema_name": request.schema_name,
                "bad_sql": request.bad_sql,
                "execution_success": False,
                "repaired": False,
                "results": [],
                "explanation": "The original SQL failed, and the repair attempt also failed.",
                "repair_error": str(repair_error),
                "audit_trail": audit_trail,
            }