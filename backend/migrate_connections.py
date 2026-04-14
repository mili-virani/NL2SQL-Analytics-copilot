from app.database import engine
from app.models import Base

# Assuming this will just safely create any missing tables
print("Creating new tables...")
Base.metadata.create_all(bind=engine)
print("Migration completed.")
