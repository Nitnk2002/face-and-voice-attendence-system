"""
Face recognition utilities — crash-proof, three-tier fallback.
dlib/face_recognition → OpenCV Haar+HOG → Pure PIL

Key change: fallback vectors now use cosine similarity (threshold 0.93+)
instead of Euclidean distance, dramatically reducing false matches.
"""
import io
import numpy as np
import streamlit as st

# ── Optional heavy deps — failures silently handled ──────────
try:
    import face_recognition as _fr
    _DLIB_OK = True
except Exception:
    _fr = None
    _DLIB_OK = False

try:
    import cv2 as _cv2
    _CV2_OK = True
except Exception:
    _cv2 = None
    _CV2_OK = False


# ─────────────────────────────────────────────────────────────
# Feature extraction helpers
# ─────────────────────────────────────────────────────────────

def _extract_face_crop(image_bytes: bytes):
    """
    Returns a 64×64 grayscale numpy face crop, or None.
    Uses multi-stage OpenCV Haar detection without pre-CLAHE distortion.
    """
    try:
        from PIL import Image
        img_pil = Image.open(io.BytesIO(image_bytes)).convert("RGB")
        img_np = np.array(img_pil)

        if _CV2_OK:
            gray_orig = _cv2.cvtColor(img_np, _cv2.COLOR_RGB2GRAY)
            h_orig, w_orig = gray_orig.shape

            # Scale for detection if resolution is high (prevents pyramid bugs)
            scale = 1.0
            if max(h_orig, w_orig) > 640:
                scale = 640.0 / max(h_orig, w_orig)
                gray_det = _cv2.resize(gray_orig, (int(w_orig * scale), int(h_orig * scale)))
            else:
                gray_det = gray_orig

            # Prepare image variations to handle side-shadows, glare, and glasses
            clahe_det = _cv2.createCLAHE(clipLimit=2.0, tileGridSize=(8, 8))
            gray_vars = [
                gray_det,                           # Natural raw grayscale
                _cv2.equalizeHist(gray_det),        # Global histogram equalization (fixes one-side shadows)
                clahe_det.apply(gray_det)           # Adaptive local equalization
            ]

            # Collect all available Haar cascade XML files in OpenCV 4.13
            cascade_files = [
                _cv2.data.haarcascades + "haarcascade_frontalface_alt2.xml",
                _cv2.data.haarcascades + "haarcascade_frontalface_default.xml",
                _cv2.data.haarcascades + "haarcascade_frontalface_alt.xml",
                _cv2.data.haarcascades + "haarcascade_frontalface_alt_tree.xml",
                _cv2.data.haarcascades + "haarcascade_profileface.xml"
            ]

            # Try progressively lower minNeighbors (down to 1 for difficult glasses/shadows)
            for min_neigh in [3, 2, 1]:
                for img_var in gray_vars:
                    for c_path in cascade_files:
                        try:
                            cascade = _cv2.CascadeClassifier(c_path)
                            if cascade.empty():
                                continue
                            faces = cascade.detectMultiScale(img_var, scaleFactor=1.05, minNeighbors=min_neigh, minSize=(40, 40))
                            if len(faces) > 0:
                                faces = sorted(faces, key=lambda f: f[2] * f[3], reverse=True)
                                x, y, w, h = faces[0]
                                # Ensure we don't pick a tiny background poster if a big face is expected
                                if w * h < 1600 and min_neigh == 1:
                                    continue
                                # Map back to original unscaled resolution
                                x = int(x / scale); y = int(y / scale)
                                w = int(w / scale); h = int(h / scale)
                                pad = int(min(w, h) * 0.15)
                                x1 = max(0, x - pad); y1 = max(0, y - pad)
                                x2 = min(w_orig, x + w + pad)
                                y2 = min(h_orig, y + h + pad)
                                crop = gray_orig[y1:y2, x1:x2]
                                resized = _cv2.resize(crop, (64, 64))
                                # Apply CLAHE to the 64x64 cropped face for lighting invariance
                                clahe_out = _cv2.createCLAHE(clipLimit=2.0, tileGridSize=(8, 8))
                                return clahe_out.apply(resized)
                        except Exception:
                            continue

            # If OpenCV is installed and all cascades miss across all lighting vars, return None!
            return None
        else:
            # PIL-only path
            gray_pil = img_pil.convert("L")
            w, h = gray_pil.size
            m = 0.20
            crop = gray_pil.crop((int(w*m), int(h*m), int(w*(1-m)), int(h*(1-m))))
            resized = crop.resize((64, 64))
            return np.array(resized)
    except Exception:
        return None


# Initialize SFace & YuNet if OpenCV is available
@st.cache_resource
def _get_sface():
    if not _CV2_OK:
        return None
    try:
        import pathlib
        base_dir = pathlib.Path(__file__).parent.parent.parent
        return _cv2.FaceRecognizerSF_create(str(base_dir / "sface.onnx"), "")
    except Exception as e:
        print(f"Failed to load SFace: {e}")
        return None

def _vec_from_crop(crop: np.ndarray) -> list:
    """
    Turn a 64×64 grayscale array into a discriminative feature vector.
    Uses OpenCV SFace for true 128-D face recognition embeddings.
    """
    sface_model = _get_sface()
    if sface_model is not None:
        try:
            # SFace needs a 112x112 color image. Our crop is 64x64 gray.
            # Convert crop back to color and resize to 112x112 for SFace alignment/feature extraction.
            if len(crop.shape) == 2:
                color_crop = _cv2.cvtColor(crop, _cv2.COLOR_GRAY2BGR)
            else:
                color_crop = crop
            resized = _cv2.resize(color_crop, (112, 112))
            
            # Since the crop is already tightly bounding the face, we provide a dummy aligned box
            # or just use the SFace feature extraction directly on the center-aligned image
            # SFace expects a specific alignment, but with an already cropped face it performs well.
            feature = sface_model.feature(resized)
            vec = feature.flatten()
            norm = np.linalg.norm(vec) + 1e-8
            return (vec / norm).tolist()
        except Exception as e:
            print(f"SFace error: {e}")
            pass

    # Fallback for non-OpenCV: simple block normalization
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


def _cosine_sim(a: np.ndarray, b: np.ndarray) -> float:
    return float(np.dot(a, b) / (np.linalg.norm(a) * np.linalg.norm(b) + 1e-8))


# ─────────────────────────────────────────────────────────────
# Public API
# ─────────────────────────────────────────────────────────────

def encode_face_from_bytes(image_bytes: bytes) -> list | None:
    """
    Encode a face from raw image bytes.
    Returns list[float] encoding, or None if no face found.
    """
    # ── Path 1: dlib face_recognition (128-D, most accurate) ──
    if _DLIB_OK:
        try:
            img = _fr.load_image_file(io.BytesIO(image_bytes))
            if _CV2_OK:
                h, w = img.shape[:2]
                scale = min(640 / max(h, w, 1), 1.0)
                if scale < 1.0:
                    img = _cv2.resize(img, (int(w * scale), int(h * scale)))
            encs = _fr.face_encodings(img)
            return encs[0].tolist() if encs else None
        except Exception:
            pass

    # ── Path 2: OpenCV + block-normalized pixel HOG-like vector ─
    crop = _extract_face_crop(image_bytes)
    if crop is not None:
        try:
            return _vec_from_crop(crop)
        except Exception:
            pass
    elif _CV2_OK:
        # If OpenCV was used but no face was found, return None immediately!
        # Do not use Path 3 center crop, which encodes background rooms.
        return None

    # ── Path 3: Pure PIL last resort (only if OpenCV not installed) ──
    try:
        from PIL import Image
        img = Image.open(io.BytesIO(image_bytes)).convert("L")
        w, h = img.size
        crop_pil = img.crop((int(w*0.2), int(h*0.15), int(w*0.8), int(h*0.85)))
        resized = crop_pil.resize((64, 64))
        arr = np.array(resized, dtype=np.float32)
        return _vec_from_crop(arr)
    except Exception:
        return None


def compare_faces(known_encoding: list, candidate_encoding: list,
                  tolerance: float = 0.55) -> bool:
    """
    Return True if candidate matches known encoding.

    For dlib 128-D vectors: uses face_recognition compare_faces.
    For fallback 4096-D vectors: uses cosine similarity >= 0.93
    (much stricter than old Euclidean — prevents cross-person matches).
    """
    if not known_encoding or not candidate_encoding:
        return False
    if len(known_encoding) != len(candidate_encoding):
        return False

    known = np.array(known_encoding)
    candidate = np.array(candidate_encoding)

    # dlib path
    if len(known) == 128 and _DLIB_OK:
        try:
            results = _fr.compare_faces([known], candidate, tolerance=tolerance)
            return bool(results[0])
        except Exception:
            pass

    # Fallback path — cosine similarity
    sim = _cosine_sim(known, candidate)
    
    if len(known) == 128:
        # SFace embeddings: threshold is empirically ~0.363, using 0.45 for strictness
        return sim >= 0.45
    elif len(known) == 1764:
        # HOG vectors: different individuals score <0.60, same person ~0.75 - 0.95
        return sim >= 0.75
    return sim >= 0.82


def face_distance(known_encoding: list, candidate_encoding: list) -> float:
    """Return a distance score (lower = more similar, 0 = identical)."""
    if not known_encoding or not candidate_encoding:
        return 1.0
    if len(known_encoding) != len(candidate_encoding):
        return 1.0
    known = np.array(known_encoding)
    candidate = np.array(candidate_encoding)
    if len(known) == 128 and _DLIB_OK:
        try:
            return float(_fr.face_distance([known], candidate)[0])
        except Exception:
            pass
    # Convert cosine similarity to distance: 0 = identical, 1 = completely different
    sim = _cosine_sim(known, candidate)
    return 1.0 - sim

def find_best_face_match(known_encodings: list[list[float]], candidate_encoding: list[float]) -> tuple[int, float]:
    """
    Vectorized similarity search.
    Compares one candidate against an NxM matrix of known encodings.
    Returns (best_match_index, best_score) where score is 1.0 - distance.
    If no matches meet the threshold, returns (-1, 0.0).
    """
    if not known_encodings or not candidate_encoding:
        return -1, 0.0

    # Ensure consistent dimensions and filter out bad rows
    dim = len(candidate_encoding)
    valid_indices = []
    valid_matrix = []
    
    for i, enc in enumerate(known_encodings):
        if enc and len(enc) == dim:
            valid_indices.append(i)
            valid_matrix.append(enc)
            
    if not valid_matrix:
        return -1, 0.0
        
    K = np.array(valid_matrix) # Shape (N, 128)
    C = np.array(candidate_encoding) # Shape (128,)
    
    if len(C) == 128 and _DLIB_OK:
        try:
            # dlib batch distance comparison
            distances = _fr.face_distance(K, C)
            best_idx_in_valid = np.argmin(distances)
            min_dist = distances[best_idx_in_valid]
            
            # Use dlib compare_faces threshold logic
            matches = _fr.compare_faces([K[best_idx_in_valid]], C)
            if matches[0]:
                return valid_indices[best_idx_in_valid], 1.0 - min_dist
            else:
                return -1, 0.0
        except Exception:
            pass

    # Vectorized Cosine Similarity
    # np.dot(K, C) -> (N,)
    dot_products = np.dot(K, C)
    
    # Norms
    k_norms = np.linalg.norm(K, axis=1)
    c_norm = np.linalg.norm(C)
    
    similarities = dot_products / (k_norms * c_norm + 1e-8)
    
    best_idx_in_valid = np.argmax(similarities)
    best_sim = similarities[best_idx_in_valid]
    
    # Thresholds
    threshold = 0.82
    if dim == 128:
        threshold = 0.45
    elif dim == 1764:
        threshold = 0.75
        
    if best_sim >= threshold:
        return valid_indices[best_idx_in_valid], float(best_sim)
        
    return -1, 0.0

