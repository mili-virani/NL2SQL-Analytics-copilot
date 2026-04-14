from sqlalchemy import Column, Integer, String, DateTime, ForeignKey, Boolean
from sqlalchemy.orm import declarative_base
from datetime import datetime

Base = declarative_base()

class User(Base):
    __tablename__ = "users"
    user_id = Column(Integer, primary_key=True, index=True)
    email = Column(String, unique=True, index=True, nullable=False)
    username = Column(String, unique=True, index=True, nullable=True)
    password_hash = Column(String, nullable=True)
    full_name = Column(String)
    auth_provider = Column(String, default="google")
    role = Column(String, default="user")
    is_active = Column(Boolean, default=True)
    active_db_connection_id = Column(Integer, ForeignKey("database_connections.id", ondelete="SET NULL"), nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

class DatabaseConnection(Base):
    __tablename__ = "database_connections"
    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.user_id", ondelete="CASCADE"), nullable=False, index=True)
    name = Column(String, nullable=False)
    db_type = Column(String, nullable=False) # e.g., 'postgresql', 'mysql', 'sqlite', 'sqlserver'
    host = Column(String)
    port = Column(Integer)
    database_name = Column(String)
    username = Column(String)
    encrypted_password = Column(String)
    ssl_enabled = Column(Boolean, default=False)
    extra_config_json = Column(String, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)


class AuditLog(Base):
    __tablename__ = "audit_logs"
    log_id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.user_id"), nullable=True)
    action_type = Column(String)
    action_details = Column(String)
    created_at = Column(DateTime, default=datetime.utcnow)

class Project(Base):
    __tablename__ = "projects"
    project_id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.user_id"), nullable=False, index=True)
    name = Column(String, nullable=False)
    color = Column(String, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

class Conversation(Base):
    __tablename__ = "conversations"
    conversation_id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.user_id"), nullable=True, index=True)
    title = Column(String, default="New Chat")
    is_pinned = Column(Boolean, default=False)
    is_archived = Column(Boolean, default=False)
    project_id = Column(Integer, ForeignKey("projects.project_id"), nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

class ConversationMessage(Base):
    __tablename__ = "conversation_messages"
    message_id = Column(Integer, primary_key=True, index=True)
    conversation_id = Column(Integer, ForeignKey("conversations.conversation_id"), nullable=False, index=True)
    role = Column(String, nullable=False) # 'user' or 'assistant'
    content = Column(String, nullable=False)
    response_json = Column(String, nullable=True) # Full structured response if assistant
    created_at = Column(DateTime, default=datetime.utcnow)

class QueryLog(Base):
    __tablename__ = "query_logs"
    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.user_id"), nullable=True, index=True)
    conversation_id = Column(Integer, ForeignKey("conversations.conversation_id"), nullable=True, index=True)
    question = Column(String, nullable=False)
    mode = Column(String)
    selected_schema = Column(String)
    generated_sql = Column(String)
    repaired_sql = Column(String)
    execution_success = Column(Boolean, default=False)
    repaired = Column(Boolean, default=False)
    audit_trail_json = Column(String)
    results_preview = Column(String)
    created_at = Column(DateTime, default=datetime.utcnow)
