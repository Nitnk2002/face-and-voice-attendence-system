"""
Database Migration: 001_centralized_biometrics.py
Creates the centralized student_biometrics table and migrates existing
biometric records from enrollments into canonical reusable biometric profiles.
"""
import sys
import os
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
import json
import logging
from sqlalchemy import text
from infrastructure.database import engine

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger("migration_001")

def run_migration():
    logger.info("Starting migration: 001_centralized_biometrics...")
    
    with engine.connect() as conn:
        # 1. Create student_biometrics table
        logger.info("Step 1: Creating student_biometrics table...")
        conn.execute(text("""
            CREATE TABLE IF NOT EXISTS student_biometrics (
                id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
                student_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
                biometric_type VARCHAR(20) NOT NULL CHECK (biometric_type IN ('face', 'voice')),
                embedding JSONB NOT NULL,
                model_name VARCHAR(100) NOT NULL,
                model_version VARCHAR(50) DEFAULT '1.0',
                embedding_dimension INTEGER NOT NULL,
                sample_data TEXT,
                is_active BOOLEAN NOT NULL DEFAULT true,
                created_at TIMESTAMPTZ DEFAULT now(),
                updated_at TIMESTAMPTZ DEFAULT now()
            );
        """))
        
        # 2. Create partial unique index: exactly one active profile per (student_id, biometric_type)
        logger.info("Step 2: Creating unique index on active biometrics...")
        conn.execute(text("""
            CREATE UNIQUE INDEX IF NOT EXISTS uq_active_student_biometric 
            ON student_biometrics (student_id, biometric_type) 
            WHERE is_active = true;
        """))
        
        conn.execute(text("""
            CREATE INDEX IF NOT EXISTS idx_student_biometrics_lookup 
            ON student_biometrics (student_id, biometric_type, is_active);
        """))

        # 3. Add status column to enrollments if not present
        logger.info("Step 3: Ensuring status column exists on enrollments...")
        conn.execute(text("""
            DO $$ BEGIN
                IF NOT EXISTS (
                    SELECT 1 FROM information_schema.columns 
                    WHERE table_name = 'enrollments' AND column_name = 'status'
                ) THEN
                    ALTER TABLE enrollments ADD COLUMN status VARCHAR(20) DEFAULT 'active';
                END IF;
            END $$;
        """))
        
        # 4. Safe backfill from existing enrollments
        logger.info("Step 4: Backfilling existing enrollments into student_biometrics...")
        existing_enrollments = conn.execute(text("""
            SELECT id, student_id, face_encoding, voice_encoding, face_photo, voice_audio, enrolled_at
            FROM enrollments
            ORDER BY enrolled_at DESC
        """)).fetchall()

        migrated_faces = set()
        migrated_voices = set()

        for row in existing_enrollments:
            student_id = str(row[1])
            face_enc = row[2]
            voice_enc = row[3]
            face_photo = row[4]
            voice_audio = row[5]

            # Parse encodings if stored as string
            if isinstance(face_enc, str):
                try:
                    face_enc = json.loads(face_enc)
                except Exception:
                    face_enc = None

            if isinstance(voice_enc, str):
                try:
                    voice_enc = json.loads(voice_enc)
                except Exception:
                    voice_enc = None

            # Migrate Face if not already migrated for this student
            if face_enc and len(face_enc) == 512 and student_id not in migrated_faces:
                # Check if already in student_biometrics
                existing = conn.execute(text("""
                    SELECT id FROM student_biometrics 
                    WHERE student_id = :sid AND biometric_type = 'face' AND is_active = true
                """), {"sid": student_id}).fetchone()

                if not existing:
                    # Filter out dummy/placeholder photo if any
                    valid_photo = face_photo if (face_photo and len(face_photo) > 100) else None
                    conn.execute(text("""
                        INSERT INTO student_biometrics (
                            student_id, biometric_type, embedding, model_name, 
                            model_version, embedding_dimension, sample_data, is_active
                        ) VALUES (
                            :sid, 'face', :emb, 'insightface_buffalo_sc_arcface',
                            '1.0', 512, :photo, true
                        )
                    """), {
                        "sid": student_id,
                        "emb": json.dumps(face_enc),
                        "photo": valid_photo
                    })
                    logger.info(f"  Migrated canonical face profile for student {student_id}")
                migrated_faces.add(student_id)

            # Migrate Voice if not already migrated for this student
            if voice_enc and len(voice_enc) == 256 and student_id not in migrated_voices:
                existing = conn.execute(text("""
                    SELECT id FROM student_biometrics 
                    WHERE student_id = :sid AND biometric_type = 'voice' AND is_active = true
                """), {"sid": student_id}).fetchone()

                if not existing:
                    valid_audio = voice_audio if (voice_audio and len(voice_audio) > 100) else None
                    conn.execute(text("""
                        INSERT INTO student_biometrics (
                            student_id, biometric_type, embedding, model_name, 
                            model_version, embedding_dimension, sample_data, is_active
                        ) VALUES (
                            :sid, 'voice', :emb, 'spectral_fft_256',
                            '1.0', 256, :audio, true
                        )
                    """), {
                        "sid": student_id,
                        "emb": json.dumps(voice_enc),
                        "audio": valid_audio
                    })
                    logger.info(f"  Migrated canonical voice profile for student {student_id}")
                migrated_voices.add(student_id)

        conn.commit()
        logger.info("Migration 001 completed successfully!")

if __name__ == "__main__":
    run_migration()
