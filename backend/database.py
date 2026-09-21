import os
import uuid
from datetime import datetime

from sqlalchemy import create_engine, Column, String, Integer, DateTime, Text, ForeignKey, JSON
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.orm import sessionmaker, relationship


DATABASE_URL = os.getenv("DATABASE_URL", "sqlite:///./patient_cases.db")

engine = create_engine(
    DATABASE_URL,
    connect_args={"check_same_thread": False} if "sqlite" in DATABASE_URL else {}
)

SessionLocal = sessionmaker(
    autocommit=False,
    autoflush=False,
    bind=engine
)

Base = declarative_base()


class PatientModel(Base):
    __tablename__ = "patients"

    id = Column(String, primary_key=True, default=lambda: str(uuid.uuid4()))
    patient_id = Column(String, unique=True, index=True)
    name = Column(String, nullable=True)
    age = Column(Integer, nullable=True)
    gender = Column(String, nullable=True)
    phone = Column(String, nullable=True)
    preferred_language = Column(String, default="English")
    created_at = Column(DateTime, default=datetime.utcnow)

    cases = relationship("CaseModel", back_populates="patient")


class CaseModel(Base):
    __tablename__ = "cases"

    id = Column(String, primary_key=True, default=lambda: str(uuid.uuid4()))
    patient_id = Column(String, ForeignKey("patients.id"))
    reason_for_visit = Column(Text, nullable=True)
    symptoms = Column(JSON, default=dict)
    medical_history = Column(JSON, default=dict)
    ocr_data = Column(JSON, default=list)
    ai_summary = Column(JSON, default=dict)
    status = Column(String, default="PENDING")
    created_at = Column(DateTime, default=datetime.utcnow)

    patient = relationship("PatientModel", back_populates="cases")


Base.metadata.create_all(bind=engine)


def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()
