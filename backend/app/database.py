"""
Database models and setup for the outfit recommendation system
"""
from urllib.parse import parse_qsl, urlencode, urlsplit, urlunsplit

from sqlalchemy import create_engine, Column, Integer, String, Float, DateTime, JSON, Text
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.orm import sessionmaker
from datetime import datetime
import os

Base = declarative_base()


class User(Base):
    """User profile and preferences"""
    __tablename__ = "users"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(String, unique=True, index=True)
    category_preferences = Column(JSON, default={})
    item_preferences = Column(JSON, default={})
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)


class FeedbackHistory(Base):
    """User feedback on recommendations"""
    __tablename__ = "feedback_history"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(String, index=True)
    timestamp = Column(DateTime, default=datetime.utcnow)
    item = Column(String)
    category = Column(String)
    feedback = Column(String)  # 'like', 'dislike', 'worn', 'ignored', 'inappropriate'
    confidence = Column(Float)
    temperature = Column(Float)
    condition = Column(String)
    time_of_day = Column(String)
    session_id = Column(String)


class ModelWeights(Base):
    """ML model weights"""
    __tablename__ = "model_weights"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(String, index=True)
    feature_key = Column(String, index=True)
    weight = Column(Float)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)


class WeatherHistory(Base):
    """Historical weather data for pattern analysis"""
    __tablename__ = "weather_history"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(String, index=True)
    timestamp = Column(DateTime, default=datetime.utcnow)
    temperature = Column(Float)
    feels_like = Column(Float)
    condition = Column(String)
    humidity = Column(Float)
    wind_speed = Column(Float)
    analysis_data = Column(JSON)


# Database session management
engine = None
SessionLocal = None


def normalize_database_url(database_url: str) -> str:
    """Normalize database URLs to the SQLAlchemy driver expected by this app."""
    if database_url.startswith("postgres://"):
        database_url = database_url.replace("postgres://", "postgresql+psycopg://", 1)
    elif database_url.startswith("postgresql://"):
        database_url = database_url.replace("postgresql://", "postgresql+psycopg://", 1)

    parts = urlsplit(database_url)
    if not parts.query:
        return database_url

    filtered_query = [
        (key, value)
        for key, value in parse_qsl(parts.query, keep_blank_values=True)
        if key != "pgbouncer"
    ]

    return urlunsplit((
        parts.scheme,
        parts.netloc,
        parts.path,
        urlencode(filtered_query),
        parts.fragment,
    ))


async def init_db():
    """Initialize the database"""
    global engine, SessionLocal
    database_url = os.getenv("DATABASE_URL")
    if not database_url:
        raise RuntimeError("DATABASE_URL is not configured")

    normalized_database_url = normalize_database_url(database_url)
    engine = create_engine(
        normalized_database_url
    )
    Base.metadata.create_all(bind=engine)
    SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)


def get_db():
    """Get database session"""
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()
