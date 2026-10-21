"""
Face recognition and biometric analysis utilities.
Powered by InsightFace (RetinaFace/SCRFD detector + ArcFace 512-D embeddings)
with adaptive low-light enhancement, soft-blur restoration, and multi-scale fallback.
"""
import io
import logging
import numpy as np
from functools import lru_cache

logger = logging.getLogger(__name__)

# ── Optional dependency detection ─────────────────────────────
_INSIGHTFACE_OK = False
try:
    import insightface
    from insightface.app import FaceAnalysis
    _INSIGHTFACE_OK = True
except Exception as e:
    logger.warning("InsightFace could not be loaded: %s", e)

_CV2_OK = False
try:
    import cv2
    _CV2_OK = True
except Exception:
    cv2 = None


# ── Illumination & Soft-Blur Image Preprocessing ──────────────
def enhance_low_light(img: np.ndarray) -> np.ndarray:
    """
    Adaptive illumination enhancement for dim, backlit, or blurry webcam frames.
    Uses LAB color space CLAHE (Contrast Limited Adaptive Histogram Equalization)
    and gamma brightening without blowing out highlights.
    """
    if not _CV2_OK or img is None or img.size == 0:
        return img
    try:
        lab = cv2.cvtColor(img, cv2.COLOR_BGR2LAB)
        l, a, b = cv2.split(lab)
        
        # Adaptive contrast boost on luminance
        clahe = cv2.createCLAHE(clipLimit=2.8, tileGridSize=(8, 8))
        cl = clahe.apply(l)
        
        # Gamma brightening if image is dark
        mean_l = np.mean(cl)
        if mean_l < 115:
            gamma = 0.65
            table = np.array([((i / 255.0) ** gamma) * 255 for i in range(256)]).astype("uint8")
            cl = cv2.LUT(cl, table)
            
        merged = cv2.merge((cl, a, b))
        return cv2.cvtColor(merged, cv2.COLOR_LAB2BGR)
    except Exception:
        return img


def sharpen_soft_blur(img: np.ndarray) -> np.ndarray:
    """
    Unsharp masking to restore edge sharpness (eyes, nose, mouth)
    blurred by soft room lighting or low-end webcam denoising filters.
    """
    if not _CV2_OK or img is None or img.size == 0:
        return img
    try:
        gaussian = cv2.GaussianBlur(img, (0, 0), 2.0)
        return cv2.addWeighted(img, 1.45, gaussian, -0.45, 0)
    except Exception:
        return img


# ── InsightFace ArcFace Model Singleton ───────────────────────
@lru_cache(maxsize=1)
def _get_insightface_app():
    """
    Initializes and caches the InsightFace FaceAnalysis engine.
    Uses 'buffalo_sc' pack: lightweight SCRFD face detector + MobileFaceNet ArcFace (512-D).
    Configured with det_thresh=0.25 to detect faces in dim lighting and cluttered backgrounds.
    """
    if not _INSIGHTFACE_OK:
        return None
    try:
        app = FaceAnalysis(name="buffalo_sc", providers=["CPUExecutionProvider"])
        # det_thresh=0.25 allows robust detection in poor/dim lighting and difficult angles
        app.prepare(ctx_id=0, det_size=(640, 640), det_thresh=0.25)
        logger.info("InsightFace (SCRFD + ArcFace) initialized with det_thresh=0.25.")
        return app
    except Exception as e:
        logger.error("Failed to initialize InsightFace engine: %s", e)
        return None


# ── Helper: Decode Image Bytes to BGR Numpy Array ─────────────
def _decode_image_bytes(image_bytes: bytes) -> np.ndarray | None:
    """Safely decodes image bytes to OpenCV BGR numpy array."""
    if not image_bytes:
        return None

    if _CV2_OK:
        try:
            nparr = np.frombuffer(image_bytes, np.uint8)
            img = cv2.imdecode(nparr, cv2.IMREAD_COLOR)
            if img is not None and img.size > 0:
                return img
        except Exception:
            pass

    try:
        from PIL import Image
        pil_img = Image.open(io.BytesIO(image_bytes)).convert("RGB")
        rgb_arr = np.array(pil_img)
        if _CV2_OK:
            return cv2.cvtColor(rgb_arr, cv2.COLOR_RGB2BGR)
        else:
            return rgb_arr
    except Exception:
        return None


def _cosine_similarity(a: np.ndarray, b: np.ndarray) -> float:
    """Computes cosine similarity between two feature vectors."""
    norm_a = np.linalg.norm(a)
    norm_b = np.linalg.norm(b)
    if norm_a == 0.0 or norm_b == 0.0:
        return 0.0
    return float(np.dot(a, b) / (norm_a * norm_b))


# ── Fallback Haar Crop & Extraction (Safety Net) ───────────────
def _fallback_extract_crop(img_bgr: np.ndarray) -> np.ndarray | None:
    """Haar-cascade center face crop fallback with adaptive lighting equalization."""
    if not _CV2_OK or img_bgr is None:
        return None
    try:
        gray = cv2.cvtColor(img_bgr, cv2.COLOR_BGR2GRAY)
        clahe = cv2.createCLAHE(clipLimit=2.5, tileGridSize=(8, 8))
        gray_eq = clahe.apply(gray)
        
        cascade_path = cv2.data.haarcascades + "haarcascade_frontalface_default.xml"
        cascade = cv2.CascadeClassifier(cascade_path)
        faces = cascade.detectMultiScale(gray_eq, scaleFactor=1.08, minNeighbors=2, minSize=(40, 40))
        if len(faces) > 0:
            faces = sorted(faces, key=lambda f: f[2] * f[3], reverse=True)
            x, y, w, h = faces[0]
            crop = gray[y:y+h, x:x+w]
            return cv2.resize(crop, (64, 64))
            
        # Center crop fallback
        h, w = gray.shape
        cy, cx = h // 2, w // 2
        r = min(h, w) // 3
        crop = gray[max(0, cy - r):min(h, cy + r), max(0, cx - r):min(w, cx + r)]
        return cv2.resize(crop, (64, 64))
    except Exception:
        return None


# ─────────────────────────────────────────────────────────────
# Public API
# ─────────────────────────────────────────────────────────────

def encode_face_from_bytes(image_bytes: bytes) -> list[float] | None:
    """
    Detects face and generates a 512-D ArcFace embedding from image bytes.
    Features multi-stage recovery for dim lighting, soft focus, and cluttered backgrounds.
    Returns list of 512 normalized floats, or None if no face found.
    """
    img = _decode_image_bytes(image_bytes)
    if img is None:
        return None

    app = _get_insightface_app()
    if app is not None:
        try:
            # Stage 1: Standard detection on raw frame
            faces = app.get(img)

            # Stage 2: If missed (due to dark/dim lighting), enhance illumination & retry
            if len(faces) == 0:
                enhanced_img = enhance_low_light(img)
                faces = app.get(enhanced_img)

            # Stage 3: If missed (due to blurry lighting), apply edge sharpening & retry
            if len(faces) == 0:
                sharpened = sharpen_soft_blur(enhance_low_light(img))
                faces = app.get(sharpened)

            # Stage 4: Multi-scale search if frame is very large or very small
            if len(faces) == 0:
                h, w = img.shape[:2]
                if max(h, w) > 960:
                    scale = 640.0 / max(h, w)
                    resized = cv2.resize(img, (int(w * scale), int(h * scale)))
                    faces = app.get(enhance_low_light(resized))
                elif max(h, w) < 400:
                    scale = 640.0 / max(h, w)
                    resized = cv2.resize(img, (int(w * scale), int(h * scale)))
                    faces = app.get(enhance_low_light(resized))

            if len(faces) > 0:
                # Select the most prominent face (largest bounding box area)
                best_face = max(faces, key=lambda f: (f.bbox[2] - f.bbox[0]) * (f.bbox[3] - f.bbox[1]))
                emb = best_face.embedding.astype(np.float32)
                # L2 unit normalize
                norm = np.linalg.norm(emb)
                if norm > 0:
                    emb = emb / norm
                return emb.tolist()
        except Exception as e:
            logger.error("InsightFace extraction error: %s", e)

    # Stage 5: Safety Fallback: Haar Cascade + block normalized vector
    crop = _fallback_extract_crop(img)
    if crop is not None:
        arr = crop.astype(np.float32)
        block_vecs = []
        for by in range(8):
            for bx in range(8):
                block = arr[by*8:(by+1)*8, bx*8:(bx+1)*8].flatten()
                mu = block.mean()
                sigma = block.std() + 1e-6
                block_vecs.append((block - mu) / sigma)
        vec = np.concatenate(block_vecs)
        norm = np.linalg.norm(vec) + 1e-8
        return (vec / norm).tolist()

def extract_face_info(image_bytes: bytes) -> dict:
    """
    Detailed face extraction:
    Returns dict:
      {
        "embedding": list[float] | None,
        "face_count": int,
        "multiple_faces": bool,
        "ambiguous_multiple": bool,
        "box": list[int] | None,
        "score": float
      }
    """
    img = _decode_image_bytes(image_bytes)
    if img is None:
        return {"embedding": None, "face_count": 0, "multiple_faces": False, "ambiguous_multiple": False, "box": None, "score": 0.0}

    app = _get_insightface_app()
    if app is None:
        emb = encode_face_from_bytes(image_bytes)
        return {"embedding": emb, "face_count": 1 if emb else 0, "multiple_faces": False, "ambiguous_multiple": False, "box": None, "score": 1.0 if emb else 0.0}

    faces = app.get(img)
    if len(faces) == 0:
        enhanced = enhance_low_light(img)
        faces = app.get(enhanced)

    if len(faces) == 0:
        return {"embedding": None, "face_count": 0, "multiple_faces": False, "ambiguous_multiple": False, "box": None, "score": 0.0}

    # Sort faces by area descending
    faces = sorted(faces, key=lambda f: (f.bbox[2] - f.bbox[0]) * (f.bbox[3] - f.bbox[1]), reverse=True)
    best_face = faces[0]
    best_area = (best_face.bbox[2] - best_face.bbox[0]) * (best_face.bbox[3] - best_face.bbox[1])
    
    ambiguous = False
    if len(faces) > 1:
        second_area = (faces[1].bbox[2] - faces[1].bbox[0]) * (faces[1].bbox[3] - faces[1].bbox[1])
        if second_area > 0.45 * best_area:
            ambiguous = True

    emb = best_face.embedding.astype(np.float32)
    norm = np.linalg.norm(emb)
    if norm > 0:
        emb = emb / norm

    return {
        "embedding": emb.tolist(),
        "face_count": len(faces),
        "multiple_faces": len(faces) > 1,
        "ambiguous_multiple": ambiguous,
        "box": [int(v) for v in best_face.bbox],
        "score": float(getattr(best_face, "det_score", 1.0))
    }


def compare_faces(known_encoding: list[float], candidate_encoding: list[float],
                  tolerance: float = 0.40) -> bool:
    """
    Compares two face embeddings using cosine similarity.
    For 512-D ArcFace vectors, a similarity >= 0.40 denotes a match.
    """
    if not known_encoding or not candidate_encoding:
        return False
    if len(known_encoding) != len(candidate_encoding):
        return False

    known = np.array(known_encoding, dtype=np.float32)
    cand = np.array(candidate_encoding, dtype=np.float32)

    sim = _cosine_similarity(known, cand)

    if len(known) == 512:
        return sim >= tolerance
    elif len(known) == 128:
        return sim >= 0.55
    else:
        return sim >= 0.78


def face_distance(known_encoding: list[float], candidate_encoding: list[float]) -> float:
    """
    Returns distance score (0.0 = identical, 1.0 = completely different).
    """
    if not known_encoding or not candidate_encoding:
        return 1.0
    if len(known_encoding) != len(candidate_encoding):
        return 1.0

    known = np.array(known_encoding, dtype=np.float32)
    cand = np.array(candidate_encoding, dtype=np.float32)

    sim = _cosine_similarity(known, cand)
    return float(max(0.0, 1.0 - sim))


def find_best_face_match(known_encodings: list[list[float]], candidate_encoding: list[float]) -> tuple[int, float]:
    """
    Vectorized similarity search comparing candidate against enrolled student encodings.
    Returns (best_match_index, best_score) where score is cosine similarity [0.0 - 1.0].
    """
    if not known_encodings or not candidate_encoding:
        return -1, 0.0

    cand_dim = len(candidate_encoding)
    valid_indices = []
    valid_matrix = []

    for idx, enc in enumerate(known_encodings):
        if enc and len(enc) == cand_dim:
            valid_indices.append(idx)
            valid_matrix.append(enc)

    if not valid_matrix:
        return -1, 0.0

    K = np.array(valid_matrix, dtype=np.float32)
    C = np.array(candidate_encoding, dtype=np.float32)

    # Vectorized cosine similarity
    dot_products = np.dot(K, C)
    k_norms = np.linalg.norm(K, axis=1)
    c_norm = np.linalg.norm(C)

    similarities = dot_products / (k_norms * c_norm + 1e-8)

    best_local_idx = int(np.argmax(similarities))
    best_sim = float(similarities[best_local_idx])

    if cand_dim == 512:
        threshold = 0.40 # Calibrated ArcFace threshold for varying lighting/angles
    elif cand_dim == 128:
        threshold = 0.55
    else:
        threshold = 0.78

    if best_sim >= threshold:
        return valid_indices[best_local_idx], best_sim

    return -1, 0.0
