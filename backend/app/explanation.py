def generate_explanation(
    question: str,
    selected_schema: str,
    results: list,
    execution_success: bool,
    repaired: bool = False,
    repaired_sql: str | None = None,
):
    if not execution_success:
        return "The query could not be completed successfully."

    q = question.lower()

    if not results:
        if "low in stock" in q:
            base = "No products are currently below their reorder level."
        elif "monthly revenue" in q:
            base = "The query ran successfully, but no revenue records matched the requested period."
        elif "issue types" in q:
            base = "The query ran successfully, but no support issue records were found."
        else:
            base = "The query ran successfully, but no matching records were found."

        if repaired:
            base += " The initial SQL was automatically repaired before execution."

        return base

    row_count = len(results)

    if "which city has the most customers" in q:
        top_city = results[0].get("city")
        if top_city is not None:
            base = f"{top_city} has the highest number of customers in the current dataset."
        else:
            base = f"The query returned {row_count} result row(s) for customer-by-city analysis."

    elif "which issue types are most common" in q:
        first = results[0]
        top_issue = first.get("issue_type")
        top_count = first.get("issue_count") or first.get("ticket_count")

        if row_count > 1:
            second = results[1]
            second_count = second.get("issue_count") or second.get("ticket_count")
        else:
            second_count = None

        if top_issue is not None and top_count is not None:
            if second_count == top_count:
                base = (
                    "All issue types currently appear with the same frequency in the dataset, "
                    "so there is no single most common issue type."
                )
            else:
                base = f"The most common issue type is '{top_issue}' with {top_count} ticket(s)."
        else:
            base = f"The query returned {row_count} issue-type result row(s)."

    elif "low in stock" in q:
        base = f"The query found {row_count} product(s) currently below reorder level."

    elif "monthly revenue" in q:
        months = [row.get("month") for row in results if "month" in row]
        if months:
            base = f"The query returned monthly revenue for {len(months)} month(s) in 2025."
        else:
            base = f"The query returned {row_count} monthly revenue record(s)."

    else:
        base = f"The query ran successfully and returned {row_count} result row(s) from the {selected_schema} schema."

    if repaired and repaired_sql:
        base += " The initial SQL was automatically repaired before successful execution."

    return base