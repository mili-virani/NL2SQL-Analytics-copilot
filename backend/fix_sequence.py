import os
from dotenv import load_dotenv
from sqlalchemy import create_engine, text

load_dotenv()
DATABASE_URL = os.getenv("DATABASE_URL")
if DATABASE_URL.startswith("postgres://"):
    DATABASE_URL = DATABASE_URL.replace("postgres://", "postgresql+psycopg2://", 1)

engine = create_engine(DATABASE_URL)
with engine.connect() as connection:
    # Fix customer.customers sequence
    query = text("""
    SELECT setval(pg_get_serial_sequence('customer.customers', 'customer_id'), coalesce(max(customer_id), 1), max(customer_id) IS NOT null) FROM customer.customers;
    """)
    result = connection.execute(query)
    connection.commit()
    print("Fixed customer.customers sequence:", result.fetchone())

    # Might want to fix other tables too, let's check what schemas/tables exist.
    tables_query = text("""
    SELECT table_schema, table_name 
    FROM information_schema.tables 
    WHERE table_schema NOT IN ('information_schema', 'pg_catalog') 
    AND table_type = 'BASE TABLE';
    """)
    tables = connection.execute(tables_query).fetchall()
    
    for schema, table in tables:
        # Get pk column name
        pk_query = text(f"""
        SELECT a.attname
        FROM   pg_index i
        JOIN   pg_attribute a ON a.attrelid = i.indrelid
                             AND a.attnum = ANY(i.indkey)
        WHERE  i.indrelid = '{schema}.{table}'::regclass
        AND    i.indisprimary;
        """)
        try:
            pk = connection.execute(pk_query).fetchone()
            if pk:
                pk_col = pk[0]
                # Check if it has a sequence
                seq_query = text(f"SELECT pg_get_serial_sequence('{schema}.{table}', '{pk_col}')")
                seq = connection.execute(seq_query).fetchone()
                if seq and seq[0]:
                    print(f"Fixing sequence for {schema}.{table} ({pk_col})")
                    fix_q = text(f"SELECT setval('{seq[0]}', coalesce(max({pk_col}), 1), max({pk_col}) IS NOT null) FROM {schema}.{table};")
                    connection.execute(fix_q)
                    connection.commit()
        except Exception as e:
            pass

print("Done.")
