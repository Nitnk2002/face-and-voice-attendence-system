"""
Anti-Spoofing and Liveness Verification Engine v3.
Production-grade multi-layer presentation attack detection (PAD).

Integrated Layers:
1. Deep Presentation Attack Detection: MiniFASNet-V2 (2.7_80x80) ONNX model
   - 3-class softmax: [0: Print Attack, 1: Genuine Live Face, 2: Screen Replay Attack]
   - Evaluated on CPU via ONNX Runtime (<15ms latency).
2. Physical Screen Edge & Bezel Detection (Convex quadrilateral aspect ratio analysis)
3. Sub-pixel Color Channel Variance (LCD/OLED sub-pixel grid pattern)
4. Moiré Interference Analysis (2D-FFT spectral peaks and kurtosis)
5. Color Gamut & Blue-LED Backlight Spectrum Analysis
6. Facial Skin Specular Glare (Glass / Screen Reflection)
7. Voice Acoustic Replay Detection (Spectral bandwidth, flatness, and replay energy)
"""
import io
import os
import wave
import logging
from typing import Tuple, Dict, Any, Optional, List
import numpy as np
import cv2

logger = logging.getLogger(__name__)

# ─────────────────────────────────────────────────────────────
# 1. Deep Learning Model Layer: MiniFASNet-V2 ONNX Singleton
# ─────────────────────────────────────────────────────────────

_MINIFASNET_SESSION = None
_MODEL_PATH = os.path.join(
    os.path.dirname(os.path.dirname(os.path.abspath(__file__))),
    "models",
    "minifasnet_v2.onnx"
)

def _get_minifasnet_session():
    global _MINIFASNET_SESSION
    if _MINIFASNET_SESSION is None and os.path.exists(_MODEL_PATH):
        try:
            import onnxruntime as ort
            opts = ort.SessionOptions()
            opts.intra_op_num_threads = 2
            opts.graph_optimization_level = ort.GraphOptimizationLevel.ORT_ENABLE_ALL
            _MINIFASNET_SESSION = ort.InferenceSession(
                _MODEL_PATH,
                sess_options=opts,
                providers=["CPUExecutionProvider"]
            )
            logger.info("MiniFASNet-V2 anti-spoofing model loaded from %s", _MODEL_PATH)
        except Exception as e:
            logger.error("Failed to load MiniFASNet-V2 model: %s", e)
            _MINIFASNET_SESSION = None
    return _MINIFASNET_SESSION


def _crop_for_minifasnet(img: np.ndarray, bbox: List[int], scale: float = 2.7) -> np.ndarray:
    """
    Crops image for MiniFASNet with the required 2.7x scale margin around center.
    bbox format: [x1, y1, x2, y2]
    """
    src_h, src_w = img.shape[:2]
    x1, y1, x2, y2 = bbox
    w = max(1, x2 - x1)
    h = max(1, y2 - y1)

    scale_eff = min((src_h - 1) / h, min((src_w - 1) / w, scale))
    new_w = w * scale_eff
    new_h = h * scale_eff
    cx = x1 + w / 2.0
    cy = y1 + h / 2.0

    left_top_x = max(0, int(cx - new_w / 2.0))
    left_top_y = max(0, int(cy - new_h / 2.0))
    right_bottom_x = min(src_w - 1, int(cx + new_w / 2.0))
    right_bottom_y = min(src_h - 1, int(cy + new_h / 2.0))

    patch = img[left_top_y:right_bottom_y + 1, left_top_x:right_bottom_x + 1]
    if patch.size == 0 or patch.shape[0] < 5 or patch.shape[1] < 5:
        return cv2.resize(img, (80, 80))
    return cv2.resize(patch, (80, 80))


def predict_minifasnet(img: np.ndarray, bbox: List[int]) -> Optional[Tuple[float, float, float]]:
    """
    Runs MiniFASNet-V2 on the face crop.
    Input range: [0, 255] float32, BGR, shape [1, 3, 80, 80].
    Returns (p_live, p_print, p_replay) where:
      p_live: probability of genuine live human face (class 1)
      p_print: probability of paper/photo print attack (class 0)
      p_replay: probability of phone/screen video replay attack (class 2)
    """
    session = _get_minifasnet_session()
    if session is None:
        return None

    try:
        patch = _crop_for_minifasnet(img, bbox, scale=2.7)
        # Upstream MiniFASNet takes unnormalized float32 [0, 255]
        tensor = patch.astype(np.float32).transpose(2, 0, 1)[np.newaxis, ...]
        outputs = session.run(None, {"input": tensor})
        logits = outputs[0][0]

        # Stable softmax
        exp_logits = np.exp(logits - np.max(logits))
        probs = exp_logits / (np.sum(exp_logits) + 1e-8)

        p_print = float(probs[0])
        p_live = float(probs[1])
        p_replay = float(probs[2])
        return (p_live, p_print, p_replay)
    except Exception as e:
        logger.error("MiniFASNet inference failed: %s", e)
        return None


# ─────────────────────────────────────────────────────────────
# 2. Supporting Heuristic Signals (Optical and Physical Sensor Analysis)
# ─────────────────────────────────────────────────────────────

def _get_face_roi_and_bbox(img: np.ndarray) -> Tuple[np.ndarray, Optional[List[int]]]:
    """
    Extracts face ROI and bounding box [x1, y1, x2, y2].
    """
    h_orig, w_orig = img.shape[:2]

    try:
        from core.face_utils import _get_insightface_app
        app = _get_insightface_app()
        if app is not None:
            faces = app.get(img)
            if faces and len(faces) > 0:
                best_face = max(faces, key=lambda f: (f.bbox[2] - f.bbox[0]) * (f.bbox[3] - f.bbox[1]))
                x1, y1, x2, y2 = [int(v) for v in best_face.bbox]
                fw, fh = x2 - x1, y2 - y1
                pad_w = int(fw * 0.35)
                pad_h = int(fh * 0.35)
                nx1 = max(0, x1 - pad_w)
                ny1 = max(0, y1 - pad_h)
                nx2 = min(w_orig, x2 + pad_w)
                ny2 = min(h_orig, y2 + pad_h)
                crop = img[ny1:ny2, nx1:nx2]
                if crop.size > 0:
                    return crop, [x1, y1, x2, y2]
    except Exception:
        pass

    try:
        gray = cv2.cvtColor(img, cv2.COLOR_BGR2GRAY)
        cascade = cv2.CascadeClassifier(cv2.data.haarcascades + "haarcascade_frontalface_default.xml")
        faces = cascade.detectMultiScale(gray, scaleFactor=1.1, minNeighbors=3, minSize=(60, 60))
        if len(faces) > 0:
            faces = sorted(faces, key=lambda f: f[2] * f[3], reverse=True)
            x, y, w, h = faces[0]
            pad = int(min(w, h) * 0.35)
            nx1 = max(0, x - pad)
            ny1 = max(0, y - pad)
            nx2 = min(w_orig, x + w + pad)
            ny2 = min(h_orig, y + h + pad)
            crop = img[ny1:ny2, nx1:nx2]
            if crop.size > 0:
                return crop, [x, y, x + w, y + h]
    except Exception:
        pass

    return img, None


def _detect_screen_rectangle(img: np.ndarray) -> Tuple[float, str]:
    """
    Detects closed rectangular contours characteristic of handheld phone/tablet screens.
    """
    gray = cv2.cvtColor(img, cv2.COLOR_BGR2GRAY)
    h, w = gray.shape
    total_area = h * w

    filtered = cv2.bilateralFilter(gray, 5, 50, 50)
    edges = cv2.Canny(filtered, 50, 150)
    contours, _ = cv2.findContours(edges, cv2.RETR_TREE, cv2.CHAIN_APPROX_SIMPLE)

    for cnt in contours:
        area = cv2.contourArea(cnt)
        if area > total_area * 0.12:
            peri = cv2.arcLength(cnt, True)
            approx = cv2.approxPolyDP(cnt, 0.035 * peri, True)
            if len(approx) == 4 and cv2.isContourConvex(approx):
                x, y, cw, ch = cv2.boundingRect(approx)
                aspect = max(cw, ch) / (min(cw, ch) + 1e-8)
                if 1.2 <= aspect <= 2.4:
                    return 0.15, "Phone/tablet screen bezel detected"

    return 0.92, "No rectangular screen border detected"


def _detect_subpixel_pattern(bgr_face: np.ndarray) -> Tuple[float, str]:
    """
    Detects LCD/OLED subpixel grid variance across color channels.
    """
    h, w = bgr_face.shape[:2]
    if h < 50 or w < 50:
        return 0.70, "Image too small for sub-pixel analysis"

    b, g, r = cv2.split(bgr_face)
    lap_b = cv2.Laplacian(b, cv2.CV_64F).var()
    lap_g = cv2.Laplacian(g, cv2.CV_64F).var()
    lap_r = cv2.Laplacian(r, cv2.CV_64F).var()

    channel_vars = [lap_b, lap_g, lap_r]
    max_var = max(channel_vars)
    min_var = min(channel_vars) + 1e-8
    channel_ratio = max_var / min_var

    sob_b = cv2.Sobel(b, cv2.CV_64F, 1, 0, ksize=3).flatten()
    sob_g = cv2.Sobel(g, cv2.CV_64F, 1, 0, ksize=3).flatten()
    sob_r = cv2.Sobel(r, cv2.CV_64F, 1, 0, ksize=3).flatten()

    corr_bg = abs(np.corrcoef(sob_b, sob_g)[0, 1]) if len(sob_b) > 10 else 1.0
    corr_rg = abs(np.corrcoef(sob_r, sob_g)[0, 1]) if len(sob_r) > 10 else 1.0
    avg_corr = (corr_bg + corr_rg) / 2.0

    if channel_ratio > 3.0 and avg_corr < 0.80:
        return 0.10, "LCD/OLED sub-pixel grid detected (screen replay)"
    elif channel_ratio > 2.5 or avg_corr < 0.82:
        return 0.35, "Abnormal color channel variance — possible screen"

    return 0.90, "Natural inter-channel correlation"


def _lbp_texture_analysis(gray_face: np.ndarray) -> Tuple[float, str]:
    """
    Local Binary Pattern (LBP) micro-texture analysis.
    """
    h, w = gray_face.shape
    if h < 48 or w < 48:
        return 0.70, "Too small for LBP"

    lbp = np.zeros_like(gray_face, dtype=np.uint8)
    for dy in range(-1, 2):
        for dx in range(-1, 2):
            if dy == 0 and dx == 0:
                continue
            shifted = np.roll(np.roll(gray_face, dy, axis=0), dx, axis=1)
            lbp = (lbp << 1) | (gray_face >= shifted).astype(np.uint8)

    hist, _ = np.histogram(lbp, bins=64, range=(0, 256))
    hist = hist.astype(np.float64) / (hist.sum() + 1e-8)
    entropy = -np.sum(hist[hist > 0] * np.log2(hist[hist > 0] + 1e-12))
    uniformity = np.max(hist)

    if entropy < 3.5 and uniformity > 0.12:
        return 0.15, "Low texture diversity — flat photo or screen surface"
    elif entropy < 4.2:
        return 0.40, "Reduced texture richness — possible non-live surface"

    return 0.90, "Rich natural skin micro-texture"


def _analyze_moire_peaks(gray_face: np.ndarray) -> Tuple[float, str]:
    """
    Moiré pattern detection using 2D FFT spectral peak analysis.
    """
    h, w = gray_face.shape
    if h < 48 or w < 48:
        return 0.60, "Too small for spectral analysis"

    f = np.fft.fft2(gray_face.astype(np.float64))
    fshift = np.fft.fftshift(f)
    mag_spec = np.log1p(np.abs(fshift))

    cy, cx = h // 2, w // 2
    r_dc = max(3, min(h, w) // 12)
    y, x = np.ogrid[:h, :w]

    r_mid = min(h, w) // 4
    mid_mask = ((x - cx)**2 + (y - cy)**2 > r_dc**2) & \
               ((x - cx)**2 + (y - cy)**2 <= r_mid**2)

    mid_vals = mag_spec[mid_mask]
    if len(mid_vals) == 0:
        return 0.70, "Insufficient spectral data"

    mid_mean = np.mean(mid_vals)
    mid_max = np.max(mid_vals)
    mid_std = np.std(mid_vals)
    peak_ratio = (mid_max - mid_mean) / (mid_std + 1e-8)

    mid_centered = mid_vals - mid_mean
    kurtosis = np.mean(mid_centered**4) / (np.mean(mid_centered**2)**2 + 1e-8) - 3.0

    if peak_ratio > 8.0 and kurtosis > 4.0:
        return 0.10, "Strong Moiré periodic peaks — screen display detected"
    elif peak_ratio > 5.5 or kurtosis > 3.0:
        return 0.35, "Moderate spectral periodicity — possible screen"

    return 0.88, "Natural optical frequency distribution"


def _analyze_color_temperature(bgr_face: np.ndarray) -> Tuple[float, str]:
    """
    Color temperature, saturation uniformity, and skin chrominance check.
    """
    ycrcb = cv2.cvtColor(bgr_face, cv2.COLOR_BGR2YCrCb)
    y_ch, cr, cb = cv2.split(ycrcb)

    hsv = cv2.cvtColor(bgr_face, cv2.COLOR_BGR2HSV)
    h_ch, s_ch, v_ch = cv2.split(hsv)

    mean_cb = float(np.mean(cb))
    mean_cr = float(np.mean(cr))
    mean_sat = float(np.mean(s_ch))
    std_sat = float(np.std(s_ch))

    blue_dominance = mean_cb - mean_cr
    sat_uniformity = std_sat / (mean_sat + 1e-8)

    if blue_dominance > 5.0 and sat_uniformity < 0.35:
        return 0.15, "Screen backlight color profile (high blue/Cb, uniform sat)"
    elif mean_cb > 135 and sat_uniformity < 0.40:
        return 0.30, "Elevated blue emission — possible display"
    elif mean_sat > 170:
        return 0.30, "Over-saturated display gamut detected"

    skin_mask = (cr >= 125) & (cr <= 182) & (cb >= 72) & (cb <= 140)
    skin_pct = np.sum(skin_mask) / (skin_mask.size + 1e-8)

    if skin_pct < 0.10:
        return 0.25, "Non-biological skin chrominance"

    score = np.clip(skin_pct / 0.40, 0.50, 1.0)
    return float(score), "Natural skin color balance"


def _analyze_specular_glare(bgr_face: np.ndarray) -> Tuple[float, str]:
    """
    Detects glass reflections characteristic of screens or laminated photos across facial skin.
    """
    ycrcb = cv2.cvtColor(bgr_face, cv2.COLOR_BGR2YCrCb)
    _, cr, cb = cv2.split(ycrcb)
    skin_mask = (cr >= 125) & (cr <= 182) & (cb >= 72) & (cb <= 140)

    hsv = cv2.cvtColor(bgr_face, cv2.COLOR_BGR2HSV)
    _, s, v = cv2.split(hsv)

    glare_mask = (v >= 252) & (s <= 20) & skin_mask
    skin_pixels = np.sum(skin_mask) + 1e-8
    glare_ratio = float(np.sum(glare_mask)) / skin_pixels

    if glare_ratio > 0.18:
        return 0.25, "Glass screen glare across facial skin"
    elif glare_ratio > 0.08:
        return 0.55, "Moderate glass reflection"

    return 0.92, "Natural diffuse lighting"


# ─────────────────────────────────────────────────────────────
# 3. Authoritative Multi-Layer Decision Engine & State Machine
# ─────────────────────────────────────────────────────────────

def detect_face_spoof(
    image_bytes: bytes,
    face_roi: np.ndarray = None,
    bbox: Optional[List[int]] = None
) -> Dict[str, Any]:
    """
    Authoritative presentation-attack detection combining MiniFASNet-V2 ONNX
    deep liveness inference with physical optical sensor heuristics.

    States:
      - 'verified': High-confidence genuine live face.
      - 'spoof_suspected': Presentation attack detected (screen replay or photo print).
      - 'review_required': Inconclusive liveness; teacher manual review recommended.
      - 'rejected': Low quality, invalid image, or face too small.
      - 'error': Internal failure (fails closed).
    """
    try:
        nparr = np.frombuffer(image_bytes, np.uint8)
        img = cv2.imdecode(nparr, cv2.IMREAD_COLOR)
        if img is None:
            return {
                "state": "rejected",
                "is_live": False,
                "liveness_score": 0.0,
                "spoof_type": "Invalid image format",
                "details": {},
                "diagnostics": {"stage": "image_decode_failed"}
            }

        if face_roi is None or bbox is None:
            face_roi, detected_bbox = _get_face_roi_and_bbox(img)
            if bbox is None:
                bbox = detected_bbox

        h, w = face_roi.shape[:2]
        if h < 45 or w < 45:
            return {
                "state": "rejected",
                "is_live": False,
                "liveness_score": 0.0,
                "spoof_type": "Face too small / far from camera",
                "details": {},
                "diagnostics": {"stage": "face_resolution_insufficient", "w": w, "h": h}
            }

        # ── Step A: Deep Presentation Attack Model (MiniFASNet-V2) ────
        nn_result = None
        if bbox is not None:
            nn_result = predict_minifasnet(img, bbox)

        if nn_result is not None:
            p_live, p_print, p_replay = nn_result
        else:
            # Fallback if model missing: neutral placeholder
            p_live, p_print, p_replay = 0.50, 0.25, 0.25

        # ── Step B: Optical & Physical Sensor Analysis ───────────────
        gray = cv2.cvtColor(face_roi, cv2.COLOR_BGR2GRAY)
        rect_score, rect_msg     = _detect_screen_rectangle(face_roi)
        subpx_score, subpx_msg   = _detect_subpixel_pattern(face_roi)
        lbp_score, lbp_msg       = _lbp_texture_analysis(gray)
        moire_score, moire_msg   = _analyze_moire_peaks(gray)
        color_score, color_msg   = _analyze_color_temperature(face_roi)
        glare_score, glare_msg   = _analyze_specular_glare(face_roi)

        heuristic_score = (
            0.15 * rect_score +
            0.25 * subpx_score +
            0.25 * lbp_score +
            0.20 * moire_score +
            0.10 * color_score +
            0.05 * glare_score
        )

        # Composite score weighting: 65% deep model, 35% optical heuristics
        if nn_result is not None:
            composite_liveness = 0.65 * p_live + 0.35 * heuristic_score
        else:
            composite_liveness = heuristic_score

        # ── Step C: Multi-Signal Attack Evaluation ────────────────────
        # 1. Direct Deep Model Attack Flag:
        # Replay attack (phone screen) or Print attack (paper)
        is_attack = False
        spoof_type = "None"
        state = "verified"

        # Check if neural net detected attack with high confidence
        if p_replay >= 0.55:
            is_attack = True
            spoof_type = f"Smartphone screen replay attack detected (confidence: {p_replay:.0%})"
            state = "spoof_suspected"
        elif p_print >= 0.55:
            is_attack = True
            spoof_type = f"Printed photograph attack detected (confidence: {p_print:.0%})"
            state = "spoof_suspected"
        elif p_live < 0.45:
            is_attack = True
            spoof_type = "Non-live presentation pattern detected"
            state = "spoof_suspected"

        # 2. Corroborating Physical Optical Check:
        # If neural net was borderline (p_live between 0.45 and 0.70)
        # but optical sensors detect physical screen patterns:
        if not is_attack and p_live < 0.70:
            has_screen_frequency = (moire_score <= 0.25) or (subpx_score <= 0.20)
            has_screen_boundary = (rect_score <= 0.20) or (glare_score <= 0.30)
            if has_screen_frequency and has_screen_boundary:
                is_attack = True
                spoof_type = "Screen display artifacts detected (Moiré / subpixel / bezel)"
                state = "spoof_suspected"
            elif composite_liveness < 0.55:
                # Inconclusive / borderline: teacher review required
                state = "review_required"
                spoof_type = "Liveness inconclusive (borderline score)"

        # Final liveness determination:
        # Only 'verified' is allowed to proceed to automated attendance write!
        is_live = (not is_attack) and (state == "verified") and (composite_liveness >= 0.58)

        if not is_live and state == "verified":
            state = "review_required"
            spoof_type = "Liveness score below automated threshold"

        return {
            "state": state,
            "is_live": bool(is_live),
            "liveness_score": round(float(composite_liveness), 3),
            "spoof_type": spoof_type if not is_live else "None",
            "model_live_prob": round(float(p_live), 3),
            "model_replay_prob": round(float(p_replay), 3),
            "model_print_prob": round(float(p_print), 3),
            "details": {
                "minifasnet_live": round(float(p_live), 3),
                "minifasnet_replay": round(float(p_replay), 3),
                "minifasnet_print": round(float(p_print), 3),
                "screen_rect": round(rect_score, 3),
                "subpixel": round(subpx_score, 3),
                "lbp_texture": round(lbp_score, 3),
                "moire_fft": round(moire_score, 3),
                "color_temp": round(color_score, 3),
                "glare": round(glare_score, 3),
                "heuristic_score": round(float(heuristic_score), 3)
            },
            "diagnostics": {
                "has_nn_model": nn_result is not None,
                "state": state,
                "face_width": w,
                "face_height": h
            }
        }
    except Exception as e:
        logger.error("Anti-spoofing engine error: %s", e)
        # Fail CLOSED (reject)
        return {
            "state": "error",
            "is_live": False,
            "liveness_score": 0.0,
            "spoof_type": f"Anti-spoofing verification error: {e}",
            "details": {},
            "diagnostics": {"error": str(e)}
        }


# ─────────────────────────────────────────────────────────────
# 4. Voice Anti-Spoofing (Audio Replay Detection)
# ─────────────────────────────────────────────────────────────

def detect_voice_spoof(audio_bytes: bytes) -> Dict[str, Any]:
    """
    Detects audio replay attacks (loudspeaker playback vs live vocal tract).

    Calibration rationale (v3.1):
    ─────────────────────────────
    Previous version used single-threshold checks that caused false positives:
    - energy_ratio < 0.005  → Triggered on standard laptop/phone mics that
      hardware-filter audio above 4kHz (WebRTC noiseSuppression, built-in low-pass).
    - spectral_flatness > 0.45  → Triggered on quiet speech amplified by normalization.
    - energy_jitter < 0.15  → Triggered on steady, calm speaking voices.

    Fix: Require MULTI-SIGNAL CONSENSUS. At least 2 of 3 indicators must agree
    before classifying as replay. Individual signals only raise suspicion.
    Added: Raw RMS pre-check to catch silence/clipping before normalization.
    """
    try:
        samples = None
        sr = 16000

        try:
            with wave.open(io.BytesIO(audio_bytes), 'rb') as wf:
                sr = wf.getframerate()
                n_frames = wf.getnframes()
                raw_data = wf.readframes(n_frames)
                dtype = np.int16 if wf.getsampwidth() == 2 else np.int8
                samples = np.frombuffer(raw_data, dtype=dtype).astype(np.float32)
                if wf.getnchannels() > 1:
                    samples = samples.reshape(-1, wf.getnchannels()).mean(axis=1)
        except Exception:
            try:
                import soundfile as sf
                audio_data, sr = sf.read(io.BytesIO(audio_bytes))
                samples = audio_data.astype(np.float32)
                if len(samples.shape) > 1:
                    samples = samples.mean(axis=1)
            except Exception:
                pass

        if samples is None or len(samples) < int(sr * 0.5):
            return {
                "is_live": False,
                "liveness_score": 0.0,
                "spoof_type": "Audio clip too short or corrupt (< 0.5s). Please record for at least 2-3 seconds.",
                "details": {}
            }

        duration_s = len(samples) / sr
        if duration_s < 1.5:
            return {
                "is_live": False,
                "liveness_score": 0.0,
                "spoof_type": f"Recording too short ({duration_s:.1f}s). Please speak clearly for at least 2-3 seconds.",
                "details": {"duration_seconds": round(duration_s, 2)}
            }

        # ── Audio Quality Pre-Checks (BEFORE normalization) ──────────
        abs_max = np.max(np.abs(samples))
        if abs_max > 1.5:
            # 16-bit integer samples: scale is 32768
            rms_scale = 32768.0
        else:
            # Float samples already in [-1, 1]
            rms_scale = 1.0

        raw_rms = float(np.sqrt(np.mean((samples / rms_scale) ** 2)))

        # Check 1: Silence / too quiet
        if raw_rms < 0.005:
            return {
                "is_live": False,
                "liveness_score": 0.0,
                "spoof_type": "Audio too quiet or silent. Please speak closer to the microphone and ensure it is not muted.",
                "details": {"raw_rms": round(raw_rms, 5)}
            }

        # Check 2: Clipping detection
        clip_threshold = 0.98 * abs_max if abs_max > 1.5 else 0.98
        clipped_ratio = float(np.mean(np.abs(samples) >= clip_threshold))
        if clipped_ratio > 0.15:
            return {
                "is_live": False,
                "liveness_score": 0.0,
                "spoof_type": f"Audio is clipping ({clipped_ratio:.0%} saturated). Please move slightly away from the microphone or reduce input volume.",
                "details": {"clipped_ratio": round(clipped_ratio, 4), "raw_rms": round(raw_rms, 5)}
            }

        # Check 3: Excessive noise floor (flat electrical hum or constant broadband drone)
        crest_factor = float(abs_max / rms_scale) / (raw_rms + 1e-8)
        if crest_factor < 1.3 and raw_rms > 0.05:
            return {
                "is_live": False,
                "liveness_score": 0.0,
                "spoof_type": "Recording appears to be environmental noise without clear speech. Please record in a quieter environment.",
                "details": {"crest_factor": round(crest_factor, 3), "raw_rms": round(raw_rms, 5)}
            }

        # ── Normalize for spectral analysis ──────────────────────────
        samples = samples / (abs_max + 1e-8)
        fft_vals = np.abs(np.fft.rfft(samples))
        freqs = np.fft.rfftfreq(len(samples), 1.0 / sr)

        # Spectral flatness: geometric mean / arithmetic mean of FFT magnitudes
        geo_mean = np.exp(np.mean(np.log(fft_vals + 1e-8)))
        ari_mean = np.mean(fft_vals) + 1e-8
        spectral_flatness = float(geo_mean / ari_mean)

        # High-frequency energy ratio: energy in 4-8kHz vs 100-4000Hz
        high_band = (freqs >= 4000) & (freqs <= 8000)
        low_band = (freqs >= 100) & (freqs < 4000)
        high_energy = np.sum(fft_vals[high_band] ** 2) + 1e-8
        low_energy = np.sum(fft_vals[low_band] ** 2) + 1e-8
        energy_ratio = float(high_energy / low_energy)

        # Micro-tremor jitter: natural vocal tract produces frame-to-frame energy variation
        frame_len = int(sr * 0.03)
        energies = [
            np.sum(samples[i:i + frame_len] ** 2)
            for i in range(0, len(samples) - frame_len, frame_len)
        ]
        energy_jitter = float(np.std(energies) / (np.mean(energies) + 1e-8))

        # ── Multi-Signal Consensus Replay Detection ──────────────────
        # Each signal contributes a suspicion flag. We require at least 2 out of 3
        # to agree before classifying as replay.
        suspicion_flags = []
        suspicion_reasons = []

        # Signal 1: Extreme high-frequency roll-off (threshold relaxed from 0.005 to 0.001)
        if energy_ratio < 0.001:
            suspicion_flags.append("spectral_rolloff")
            suspicion_reasons.append("severe high-frequency roll-off")

        # Signal 2: Abnormally flat spectrum
        if spectral_flatness > 0.45:
            suspicion_flags.append("spectral_flatness")
            suspicion_reasons.append("abnormal spectral flatness")

        # Signal 3: Unnaturally stable energy (threshold relaxed from 0.15 to 0.10)
        if energy_jitter < 0.10:
            suspicion_flags.append("low_jitter")
            suspicion_reasons.append("unnaturally stable energy pattern")

        is_replay = False
        spoof_type = "None"

        if len(suspicion_flags) >= 2:
            is_replay = True
            spoof_type = f"Audio replay detected ({' + '.join(suspicion_reasons)}). Please speak live into the microphone."
        elif len(suspicion_flags) == 1 and spectral_flatness > 0.55:
            is_replay = True
            spoof_type = "Synthesized or digitally generated audio detected. Please speak naturally into the microphone."

        score = 0.90
        if is_replay:
            score = 0.15
        elif len(suspicion_flags) == 1:
            score = 0.65

        return {
            "is_live": not is_replay,
            "liveness_score": round(score, 3),
            "spoof_type": spoof_type if is_replay else "None",
            "details": {
                "spectral_flatness": round(spectral_flatness, 4),
                "high_low_energy_ratio": round(energy_ratio, 4),
                "energy_jitter": round(energy_jitter, 4),
                "raw_rms": round(raw_rms, 5),
                "clipped_ratio": round(clipped_ratio, 4),
                "crest_factor": round(crest_factor, 3),
                "duration_seconds": round(duration_s, 2),
                "suspicion_flags": suspicion_flags
            }
        }
    except Exception as e:
        logger.error("Voice anti-spoofing error: %s", e)
        return {
            "is_live": False,
            "liveness_score": 0.0,
            "spoof_type": "Voice analysis error. Please try recording again.",
            "details": {"error": str(e)}
        }
