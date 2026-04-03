import os
import sys

# Add backend to path
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "..")))

from app.database import engine
from app.models import Base
from sqlalchemy import text

def run_migration():
    print("Creating new tables (Project)...")
    Base.metadata.create_all(bind=engine)
    
    with engine.connect() as conn:
        print("Checking if conversations table needs column additions...")
        # Check columns
        res = conn.execute(text("SELECT column_name FROM information_schema.columns WHERE table_name='conversations';"))
        columns = [row[0] for row in res]
        
        commands = []
        if 'is_pinned' not in columns:
            commands.append("ALTER TABLE conversations ADD COLUMN is_pinned BOOLEAN DEFAULT FALSE;")
        if 'is_archived' not in columns:
            commands.append("ALTER TABLE conversations ADD COLUMN is_archived BOOLEAN DEFAULT FALSE;")
        if 'project_id' not in columns:
            commands.append("ALTER TABLE conversations ADD COLUMN project_id INTEGER;")
            
            # Since projects table was just created, we can add a foreign key optionally, but letting it just be an INTEGER is fine if we don't know the exact constraint name format. 
            # Or we can add constraint: 
            commands.append(
                "ALTER TABLE conversations ADD CONSTRAINT fk_conversations_project_id FOREIGN KEY (project_id) REFERENCES projects (project_id) ON DELETE SET NULL;"
            )

        for cmd in commands:
            print(f"Executing: {cmd}")
            conn.execute(text(cmd))
            
        conn.commit()
    print("Migration complete!")

if __name__ == "__main__":
    run_migration()
