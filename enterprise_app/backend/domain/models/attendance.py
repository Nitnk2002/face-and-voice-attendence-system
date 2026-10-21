import uuid
from sqlalchemy import Column, String, Boolean, DateTime, Date, ForeignKey, Integer, JSON
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.sql import func
from sqlalchemy.orm import relationship
from infrastructure.database import Base

class Class(Base):
    __tablename__ = "classes"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    teacher_id = Column(UUID(as_uuid=True), ForeignKey("users.id", ondelete="CASCADE"), nullable=True)
    class_name = Column(String, nullable=False)
    join_code = Column(String, unique=True, nullable=False)
    created_at = Column(DateTime(timezone=True), server_default=func.now())

    teacher = relationship("User", foreign_keys=[teacher_id])
    enrollments = relationship("Enrollment", back_populates="classroom", cascade="all, delete-orphan")
    sessions = relationship("AttendanceSession", back_populates="classroom", cascade="all, delete-orphan")


class Enrollment(Base):
    __tablename__ = "enrollments"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    class_id = Column(UUID(as_uuid=True), ForeignKey("classes.id", ondelete="CASCADE"), nullable=False)
    student_id = Column(UUID(as_uuid=True), ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
    status = Column(String, default="active", nullable=False) # 'active', 'inactive', 'dropped'
    enrolled_at = Column(DateTime(timezone=True), server_default=func.now())

    # Legacy/Transition columns preserved for backward-compatibility
    face_encoding = Column(JSON, nullable=True)
    voice_encoding = Column(JSON, nullable=True)
    face_photo = Column(String, nullable=True)
    voice_audio = Column(String, nullable=True)

    classroom = relationship("Class", back_populates="enrollments")
    student = relationship("User", foreign_keys=[student_id])


class StudentBiometric(Base):
    __tablename__ = "student_biometrics"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    student_id = Column(UUID(as_uuid=True), ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
    biometric_type = Column(String, nullable=False) # 'face' or 'voice'
    embedding = Column(JSON, nullable=False)
    model_name = Column(String, nullable=False)
    model_version = Column(String, default="1.0")
    embedding_dimension = Column(Integer, nullable=False)
    sample_data = Column(String, nullable=True) # Optional base64 snapshot/audio clip
    is_active = Column(Boolean, default=True, nullable=False)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())

    student = relationship("User", foreign_keys=[student_id])


class AttendanceSession(Base):
    __tablename__ = "attendance_sessions"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    class_id = Column(UUID(as_uuid=True), ForeignKey("classes.id", ondelete="CASCADE"), nullable=False)
    date = Column(Date, nullable=False)
    is_active = Column(Boolean, default=False)
    created_at = Column(DateTime(timezone=True), server_default=func.now())

    classroom = relationship("Class", back_populates="sessions")
    records = relationship("AttendanceRecord", back_populates="session", cascade="all, delete-orphan")


class AttendanceRecord(Base):
    __tablename__ = "attendance_records"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    session_id = Column(UUID(as_uuid=True), ForeignKey("attendance_sessions.id", ondelete="CASCADE"), nullable=False)
    student_id = Column(UUID(as_uuid=True), ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
    marked_at = Column(DateTime(timezone=True), server_default=func.now())
    method = Column(String, nullable=False, default="face") # 'face', 'voice', 'manual'

    session = relationship("AttendanceSession", back_populates="records")
    student = relationship("User", foreign_keys=[student_id])
