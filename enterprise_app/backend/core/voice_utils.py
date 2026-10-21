"""
Voice recognition utilities — resemblyzer + librosa with NumPy FFT fallback.
Embeds voice samples as d-vectors and compares cosine similarity.
resilient to missing audio libraries on Windows.
"""
import io
import wave
import numpy as np
from functools import lru_cache

try:
    from resemblyzer import VoiceEncoder, preprocess_wav
    RESEMBLYZER_AVAILABLE = True
except ImportError:
    RESEMBLYZER_AVAILABLE = False


@lru_cache(maxsize=1)
def _get_encoder():
    """Load VoiceEncoder once and cache."""
    if not RESEMBLYZER_AVAILABLE:
        return None
    return VoiceEncoder()


def _fallback_encode_voice(audio_bytes: bytes) -> list | None:
    """
    Built-in wave + numpy FFT spectral embedding fallback when resemblyzer is unavailable.
    Generates a 256-D frequency log-power vector.
    """
    try:
        with wave.open(io.BytesIO(audio_bytes), 'rb') as wf:
            n_frames = wf.getnframes()
            sr = wf.getframerate()
            duration = n_frames / float(sr)
            if duration < 1.0:
                return None
            raw_data = wf.readframes(n_frames)
            
        # Convert to numpy float array
        dtype = np.int16 if wf.getsampwidth() == 2 else np.int8
        samples = np.frombuffer(raw_data, dtype=dtype).astype(np.float32)
        
        # If stereo, average to mono
        if wf.getnchannels() > 1:
            samples = samples.reshape(-1, wf.getnchannels()).mean(axis=1)
            
        # Take magnitude spectrum of middle 2 seconds
        mid = len(samples) // 2
        window = samples[max(0, mid - sr):min(len(samples), mid + sr)]
        if len(window) < 100:
            return None
            
        fft_mag = np.abs(np.fft.rfft(window * np.hamming(len(window))))
        # Bin into 256 frequency bands
        bins = np.array_split(fft_mag[:max(256, len(fft_mag)//4)], 256)
        vec = np.array([np.log1p(np.mean(b)) for b in bins], dtype=np.float32)
        norm = np.linalg.norm(vec) + 1e-8
        return (vec / norm).tolist()
    except Exception:
        # If wave parsing fails (e.g. webm/ogg audio), try librosa if available
        try:
            import librosa
            y, sr = librosa.load(io.BytesIO(audio_bytes), sr=16000, duration=3.0)
            if len(y) < sr * 1.0:
                return None
            mfcc = librosa.feature.mfcc(y=y, sr=sr, n_mfcc=20)
            vec = np.mean(mfcc, axis=1)
            # Pad or repeat to 256 dims
            vec_256 = np.resize(vec, 256)
            norm = np.linalg.norm(vec_256) + 1e-8
            return (vec_256 / norm).tolist()
        except Exception:
            return None


def encode_voice_from_bytes(audio_bytes: bytes, sample_rate: int = 16000) -> list | None:
    """
    Given raw WAV audio bytes, return a d-vector (list[float]) or None on failure.
    """
    if RESEMBLYZER_AVAILABLE:
        try:
            import soundfile as sf
            audio_data, sr = sf.read(io.BytesIO(audio_bytes))
            duration = len(audio_data) / sr
            if duration < 1.5:
                return None
            wav = preprocess_wav(audio_data, source_sr=sr)
            encoder = _get_encoder()
            if encoder:
                embedding = encoder.embed_utterance(wav)
                return embedding.tolist()
        except Exception:
            pass
            
    return _fallback_encode_voice(audio_bytes)


def compare_voices(known_embedding: list, candidate_embedding: list, threshold: float = 0.70) -> bool:
    """Return True if cosine similarity ≥ threshold."""
    if not known_embedding or not candidate_embedding:
        return False
    if len(known_embedding) != len(candidate_embedding):
        return False
    known = np.array(known_embedding)
    candidate = np.array(candidate_embedding)
    
    dot = np.dot(known, candidate)
    norm_k = np.linalg.norm(known)
    norm_c = np.linalg.norm(candidate)
    sim = dot / (norm_k * norm_c + 1e-8)
    return sim >= threshold
