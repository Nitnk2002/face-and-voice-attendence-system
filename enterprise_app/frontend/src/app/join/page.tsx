"use client";

import React, { useState, useRef, useEffect } from "react";
import Link from "next/link";
import {
  Camera,
  Mic,
  CheckCircle2,
  AlertCircle,
  ArrowRight,
  ArrowLeft,
  RotateCcw,
  Volume2,
  Square,
  ShieldCheck,
  UserCheck,
  FileCheck2,
} from "lucide-react";
import { supabase } from "@/lib/supabase";
import { getApiUrl } from "@/lib/api";
import { WavRecorder } from "@/lib/audioRecorder";
import { AppLogo } from "@/components/ui/AppLogo";

export default function JoinClassPage() {
  const [step, setStep] = useState(1);
  const [joinCode, setJoinCode] = useState("");
  const [classData, setClassData] = useState<any>(null);

  // Registration data
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [enrollmentNo, setEnrollmentNo] = useState("");
  const [existingBioFound, setExistingBioFound] = useState(false);
  const [existingBioName, setExistingBioName] = useState("");

  // Biometric states
  const [photoBlob, setPhotoBlob] = useState<Blob | null>(null);
  const [photoPreview, setPhotoPreview] = useState<string | null>(null);

  const [isRecording, setIsRecording] = useState(false);
  const [audioBlob, setAudioBlob] = useState<Blob | null>(null);
  const [audioURL, setAudioURL] = useState<string | null>(null);
  const [volumeLevel, setVolumeLevel] = useState(0);
  const [volumeStatus, setVolumeStatus] = useState<"silent" | "quiet" | "optimal" | "clipping">("silent");
  const [recordSeconds, setRecordSeconds] = useState(0);
  const recordTimerRef = useRef<any>(null);

  const [consentAgreed, setConsentAgreed] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");
  const [successMessage, setSuccessMessage] = useState("");

  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const wavRecorderRef = useRef<WavRecorder | null>(null);

  // Stop mic and camera on unmount or step change
  useEffect(() => {
    if (step !== 3 && isRecording) {
      stopRecording();
    }
    return () => {
      if (recordTimerRef.current) clearInterval(recordTimerRef.current);
    };
  }, [step, isRecording]);

  // Camera handling for Step 2
  useEffect(() => {
    if (step === 2) {
      startCamera();
    } else {
      stopCamera();
    }
    return () => stopCamera();
  }, [step]);

  const startCamera = async () => {
    try {
      if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        setErrorMessage(
          "Camera access is blocked by your browser on insecure HTTP. Please use a secure connection."
        );
        return;
      }

      let stream: MediaStream;
      try {
        stream = await navigator.mediaDevices.getUserMedia({
          video: { facingMode: "user", width: { ideal: 1280 }, height: { ideal: 720 } },
        });
      } catch {
        stream = await navigator.mediaDevices.getUserMedia({ video: true });
      }

      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        videoRef.current.play().catch(() => {});
      }
    } catch (e: any) {
      setErrorMessage("Could not access camera (" + (e?.name || e?.message || "Permission error") + ").");
    }
  };

  const stopCamera = () => {
    if (videoRef.current && videoRef.current.srcObject) {
      const stream = videoRef.current.srcObject as MediaStream;
      stream.getTracks().forEach((track) => track.stop());
      videoRef.current.srcObject = null;
    }
  };

  const capturePhoto = () => {
    if (!videoRef.current || !canvasRef.current) return;
    const video = videoRef.current;
    const canvas = canvasRef.current;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    canvas.width = video.videoWidth || 640;
    canvas.height = video.videoHeight || 480;
    ctx.drawImage(video, 0, 0, canvas.width, canvas.height);

    canvas.toBlob(
      (blob) => {
        if (blob) {
          setPhotoBlob(blob);
          setPhotoPreview(URL.createObjectURL(blob));
        }
      },
      "image/jpeg",
      0.95
    );
  };

  // Mic recording for Step 3 using WavRecorder (16kHz WAV)
  const startRecording = async () => {
    try {
      if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        setErrorMessage(
          "Microphone access is blocked by your browser. Please allow microphone permissions."
        );
        return;
      }

      setRecordSeconds(0);
      setVolumeLevel(0);
      setVolumeStatus("silent");
      setErrorMessage("");

      wavRecorderRef.current = new WavRecorder();
      await wavRecorderRef.current.start((vol) => {
        setVolumeLevel(vol.percentage);
        if (vol.peak >= 0.95) {
          setVolumeStatus("clipping");
        } else if (vol.percentage < 15) {
          setVolumeStatus(vol.percentage < 5 ? "silent" : "quiet");
        } else {
          setVolumeStatus("optimal");
        }
      });

      setIsRecording(true);

      if (recordTimerRef.current) clearInterval(recordTimerRef.current);
      const startTime = Date.now();
      recordTimerRef.current = setInterval(() => {
        const elapsed = Math.floor((Date.now() - startTime) / 1000);
        setRecordSeconds(elapsed);
      }, 250);

    } catch (e: any) {
      setErrorMessage("Could not access microphone (" + (e?.name || e?.message || "Permission error") + ").");
      setIsRecording(false);
    }
  };

  const stopRecording = () => {
    if (recordTimerRef.current) {
      clearInterval(recordTimerRef.current);
      recordTimerRef.current = null;
    }
    if (wavRecorderRef.current && isRecording) {
      const metrics = wavRecorderRef.current.getMetrics();
      const wav = wavRecorderRef.current.stop();
      setIsRecording(false);
      setVolumeLevel(0);

      if (metrics.durationSeconds < 1.5) {
        setErrorMessage(`Recording was too short (${metrics.durationSeconds.toFixed(1)}s). Please speak clearly for at least 2 to 3 seconds.`);
        setAudioBlob(null);
        setAudioURL(null);
        return;
      }
      if (metrics.isSilent) {
        setErrorMessage("Recording was silent or very quiet. Please speak closer to the microphone and retry.");
        setAudioBlob(null);
        setAudioURL(null);
        return;
      }

      setAudioBlob(wav);
      setAudioURL(URL.createObjectURL(wav));
      setErrorMessage("");
    }
  };

  // Validate Class Join Code & Student Info
  const handleValidateClass = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage("");

    if (!joinCode) {
      setErrorMessage("Please enter a classroom join code.");
      return;
    }

    try {
      const { data, error } = await supabase
        .from("classes")
        .select("id, class_name, join_code")
        .eq("join_code", joinCode.trim().toUpperCase())
        .single();

      if (error || !data) {
        setErrorMessage("Invalid join code. Please confirm the code with your instructor.");
        return;
      }

      setClassData(data);

      // Check if student already has active canonical biometrics
      try {
        const checkRes = await fetch(
          getApiUrl(
            `/api/v1/enrollment/check-student?email=${encodeURIComponent(
              email.trim().toLowerCase()
            )}&roll_number=${encodeURIComponent(enrollmentNo.trim())}`
          )
        );
        if (checkRes.ok) {
          const info = await checkRes.json();
          if (info.exists && info.has_biometrics) {
            setExistingBioFound(true);
            setExistingBioName(info.name || name);
            return;
          }
        }
      } catch {
        // Fallback to step 2 if check endpoint is unavailable
      }

      setStep(2);
    } catch {
      setErrorMessage("Classroom verification failed. Please try again.");
    }
  };

  const handleInstantJoin = async () => {
    if (!classData) return;
    setIsProcessing(true);
    setErrorMessage("");

    try {
      const formData = new FormData();
      formData.append("join_code", joinCode.trim().toUpperCase());
      formData.append("name", name.trim());
      formData.append("email", email.trim().toLowerCase());
      formData.append("enrollment_no", enrollmentNo.trim());
      formData.append("reuse_existing", "true");

      const res = await fetch(getApiUrl("/api/v1/enrollment/join-classroom"), {
        method: "POST",
        body: formData,
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.detail || "Could not enroll in classroom.");
      }

      setSuccessMessage(
        `Successfully joined ${classData.class_name}! Your existing verified biometrics were linked without duplicate data.`
      );
      setStep(5);
    } catch (e: any) {
      setErrorMessage(e.message || "Failed to join classroom.");
    } finally {
      setIsProcessing(false);
    }
  };

  const handleSubmitEnrollment = async () => {
    if (!photoBlob || !audioBlob || !name || !email || !enrollmentNo || !classData) {
      setErrorMessage("Please complete all fields and capture both face and voice prints.");
      return;
    }

    if (!consentAgreed) {
      setErrorMessage("Please review and agree to the biometric enrollment consent to proceed.");
      return;
    }

    setIsProcessing(true);
    setErrorMessage("");

    try {
      const formData = new FormData();
      formData.append("join_code", joinCode.trim().toUpperCase());
      formData.append("name", name.trim());
      formData.append("email", email.trim().toLowerCase());
      formData.append("enrollment_no", enrollmentNo.trim());
      formData.append("photo", photoBlob, "photo.jpg");
      formData.append("audio", audioBlob, "voice.wav");

      const response = await fetch(getApiUrl("/api/v1/enrollment/join-classroom"), {
        method: "POST",
        body: formData,
      });

      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.detail || "Could not complete biometric enrollment.");
      }

      setSuccessMessage(
        `Successfully enrolled in ${classData.class_name}! Your face and voice profiles are active for live attendance.`
      );
      setStep(5); // Success confirmation
    } catch (e: any) {
      setErrorMessage(e.message || "An error occurred during enrollment.");
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#F8F9F7] text-[#172B4D] flex flex-col justify-between p-4 sm:p-6 antialiased">
      {/* Top Header */}
      <div className="max-w-4xl w-full mx-auto flex items-center justify-between py-2">
        <AppLogo subtitle="Student Enrollment" />
        <Link
          href="/"
          className="text-xs font-semibold text-[#667085] hover:text-[#172B4D] transition-colors"
        >
          ← Return to Homepage
        </Link>
      </div>

      {/* Main Container */}
      <div className="max-w-xl w-full mx-auto my-8 bg-white rounded-2xl border border-[#E5E9E6] p-6 sm:p-9 shadow-sm">
        {/* Step Indicator */}
        {step <= 4 && (
          <div className="mb-8">
            <div className="flex items-center justify-between text-xs font-bold text-[#667085] mb-2.5">
              <span className={step >= 1 ? "text-[#176B5B]" : ""}>01 Details</span>
              <span className={step >= 2 ? "text-[#176B5B]" : ""}>02 Face</span>
              <span className={step >= 3 ? "text-[#176B5B]" : ""}>03 Voice</span>
              <span className={step >= 4 ? "text-[#176B5B]" : ""}>04 Review</span>
            </div>
            <div className="w-full bg-[#EAECE9] h-1.5 rounded-full overflow-hidden flex">
              <div
                className="bg-[#176B5B] h-full transition-all duration-300"
                style={{ width: `${(step / 4) * 100}%` }}
              />
            </div>
          </div>
        )}

        {/* Error Alert */}
        {errorMessage && (
          <div className="mb-6 p-3.5 rounded-xl bg-[#FDF4F4] border border-[#FAD2CF] text-xs text-[#C2413B] flex items-start gap-2.5">
            <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
            <div>
              <strong className="block font-bold mb-0.5">Enrollment Notice:</strong>
              <span>{errorMessage}</span>
            </div>
          </div>
        )}

        {/* STEP 1: CLASSROOM JOIN CODE & STUDENT DETAILS */}
        {step === 1 && (
          <div>
            <h1 className="text-xl font-extrabold text-[#172B4D] tracking-tight mb-1">
              Join a Classroom
            </h1>
            <p className="text-xs text-[#667085] mb-6">
              Enter your classroom enrollment code and personal academic details.
            </p>

            <form onSubmit={handleValidateClass} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-[#172B4D] mb-1.5">
                  Classroom Join Code
                </label>
                <input
                  type="text"
                  required
                  value={joinCode}
                  onChange={(e) => setJoinCode(e.target.value.toUpperCase())}
                  placeholder="e.g. CS-302"
                  className="w-full bg-white border border-[#D0D5DD] rounded-xl px-3.5 py-2.5 text-xs text-[#172B4D] font-mono uppercase tracking-wider focus:outline-none focus:border-[#176B5B] focus:ring-1 focus:ring-[#176B5B] transition-all"
                />
                <span className="text-[11px] text-[#667085] mt-1 block">
                  Ask your teacher for the 6-character classroom code.
                </span>
              </div>

              <div>
                <label className="block text-xs font-semibold text-[#172B4D] mb-1.5">
                  Full Name
                </label>
                <input
                  type="text"
                  required
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="e.g. Aarav Patel"
                  className="w-full bg-white border border-[#D0D5DD] rounded-xl px-3.5 py-2.5 text-xs text-[#172B4D] focus:outline-none focus:border-[#176B5B] focus:ring-1 focus:ring-[#176B5B] transition-all"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-[#172B4D] mb-1.5">
                  Institutional Email
                </label>
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="student@institution.edu"
                  className="w-full bg-white border border-[#D0D5DD] rounded-xl px-3.5 py-2.5 text-xs text-[#172B4D] focus:outline-none focus:border-[#176B5B] focus:ring-1 focus:ring-[#176B5B] transition-all"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-[#172B4D] mb-1.5">
                  Student Enrollment / Roll ID
                </label>
                <input
                  type="text"
                  required
                  value={enrollmentNo}
                  onChange={(e) => setEnrollmentNo(e.target.value)}
                  placeholder="e.g. CS21B042"
                  className="w-full bg-white border border-[#D0D5DD] rounded-xl px-3.5 py-2.5 text-xs text-[#172B4D] font-mono focus:outline-none focus:border-[#176B5B] focus:ring-1 focus:ring-[#176B5B] transition-all"
                />
              </div>

              {existingBioFound ? (
                <div className="mt-6 p-4 rounded-xl border border-[#CEEAD6] bg-[#F4FBF7] space-y-3">
                  <div className="flex items-center gap-2 text-[#16845B] font-bold text-xs">
                    <CheckCircle2 className="w-4 h-4 shrink-0" />
                    <span>Existing Biometric Profile Found</span>
                  </div>
                  <p className="text-xs text-[#172B4D] leading-relaxed">
                    Welcome back, <strong>{existingBioName || name}</strong>! Your facial template and vocal profile are already verified. You can join <strong>{classData?.class_name}</strong> immediately without re-recording biometrics.
                  </p>
                  <div className="flex flex-col sm:flex-row gap-2 pt-1">
                    <button
                      type="button"
                      onClick={handleInstantJoin}
                      disabled={isProcessing}
                      className="flex-1 py-2.5 rounded-xl bg-[#176B5B] hover:bg-[#12584A] text-white text-xs font-bold transition-all shadow-xs flex items-center justify-center gap-1.5"
                    >
                      <span>{isProcessing ? "Enrolling..." : `Join ${classData?.class_name} Instantly →`}</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setExistingBioFound(false);
                        setStep(2);
                      }}
                      className="py-2.5 px-3 rounded-xl border border-[#D0D5DD] bg-white hover:bg-[#F8F9F7] text-xs font-semibold text-[#667085]"
                    >
                      Re-record
                    </button>
                  </div>
                </div>
              ) : (
                <button
                  type="submit"
                  className="w-full py-3 rounded-xl bg-[#176B5B] hover:bg-[#12584A] text-white text-xs font-bold transition-all shadow-xs flex items-center justify-center gap-2 cursor-pointer mt-6"
                >
                  <span>Continue to Face Capture</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </button>
              )}
            </form>
          </div>
        )}

        {/* STEP 2: FACE CAPTURE */}
        {step === 2 && (
          <div>
            <div className="flex items-center justify-between mb-1">
              <h1 className="text-xl font-extrabold text-[#172B4D] tracking-tight">
                Face Registration
              </h1>
              <span className="text-xs font-semibold text-[#176B5B] bg-[#E7F3EF] px-2.5 py-0.5 rounded-full">
                {classData?.class_name}
              </span>
            </div>
            <p className="text-xs text-[#667085] mb-5">
              Align your face inside the oval and take a clear, well-lit photo.
            </p>

            <div className="relative aspect-[4/3] bg-black rounded-2xl overflow-hidden border border-[#D0D5DD] mb-5 flex items-center justify-center shadow-inner">
              {photoPreview ? (
                <img src={photoPreview} alt="Captured face" className="w-full h-full object-cover" />
              ) : (
                <video
                  ref={videoRef}
                  autoPlay
                  playsInline
                  muted
                  className="w-full h-full object-cover scale-x-[-1]"
                />
              )}
              {!photoPreview && (
                <div className="absolute inset-0 pointer-events-none flex items-center justify-center">
                  <div className="w-48 h-64 border-2 border-dashed border-[#2DD4BF] rounded-[50%] animate-pulse" />
                </div>
              )}
            </div>

            <div className="flex gap-3">
              {photoPreview ? (
                <button
                  type="button"
                  onClick={() => {
                    setPhotoPreview(null);
                    setPhotoBlob(null);
                    startCamera();
                  }}
                  className="flex-1 py-2.5 rounded-xl border border-[#D0D5DD] bg-white text-[#172B4D] hover:bg-[#F8F9F7] text-xs font-semibold flex items-center justify-center gap-1.5 transition-colors"
                >
                  <RotateCcw className="w-3.5 h-3.5" />
                  <span>Retake Photo</span>
                </button>
              ) : (
                <button
                  type="button"
                  onClick={capturePhoto}
                  className="flex-1 py-2.5 rounded-xl bg-[#176B5B] hover:bg-[#12584A] text-white text-xs font-semibold flex items-center justify-center gap-1.5 transition-colors shadow-xs"
                >
                  <Camera className="w-3.5 h-3.5" />
                  <span>Capture Face</span>
                </button>
              )}

              <button
                type="button"
                disabled={!photoBlob}
                onClick={() => setStep(3)}
                className="flex-1 py-2.5 rounded-xl bg-[#172B4D] hover:bg-[#0F1E36] text-white text-xs font-semibold transition-all disabled:opacity-40 disabled:cursor-not-allowed flex items-center justify-center gap-1.5 shadow-xs"
              >
                <span>Next: Voice Print</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            </div>
            <canvas ref={canvasRef} className="hidden" />
          </div>
        )}

        {/* STEP 3: VOICE CAPTURE WITH REPLAY */}
        {step === 3 && (
          <div>
            <h1 className="text-xl font-extrabold text-[#172B4D] tracking-tight mb-1">
              Voice Registration
            </h1>
            <p className="text-xs text-[#667085] mb-5">
              Speak clearly for 3 to 5 seconds stating your name and enrollment ID.
            </p>

            <div className="p-6 bg-[#F8F9F7] border border-[#E5E9E6] rounded-2xl mb-6 flex flex-col items-center justify-center min-h-[180px]">
              {isRecording ? (
                <div className="flex flex-col items-center gap-4 py-2 w-full max-w-sm">
                  {/* Duration and Status Header */}
                  <div className="flex items-center justify-between w-full text-xs">
                    <span className="font-mono font-bold text-[#172B4D]">
                      Duration: {Math.floor(recordSeconds / 60)}:{(recordSeconds % 60).toString().padStart(2, "0")}s
                    </span>
                    <span
                      className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                        volumeStatus === "optimal"
                          ? "bg-[#E6F4EA] text-[#137333] border border-[#CEEAD6]"
                          : volumeStatus === "clipping"
                          ? "bg-[#FDF4F4] text-[#C2413B] border border-[#FAD2CF]"
                          : "bg-[#FEF7E0] text-[#B06000] border border-[#FEEFC3]"
                      }`}
                    >
                      {volumeStatus === "optimal"
                        ? "✓ Audio Level Good"
                        : volumeStatus === "clipping"
                        ? "⚠ Too Loud / Clipping"
                        : volumeStatus === "quiet"
                        ? "⚠ Speak Closer"
                        : "Mic Listening..."}
                    </span>
                  </div>

                  {/* Real-time Decibel / Volume Meter */}
                  <div className="w-full">
                    <div className="flex justify-between text-[10px] text-[#667085] mb-1 font-medium">
                      <span>Mic Input Level</span>
                      <span>{volumeLevel}%</span>
                    </div>
                    <div className="w-full bg-[#E5E9E6] h-2.5 rounded-full overflow-hidden flex">
                      <div
                        className={`h-full transition-all duration-100 rounded-full ${
                          volumeStatus === "clipping"
                            ? "bg-[#C2413B]"
                            : volumeStatus === "optimal"
                            ? "bg-[#16845B]"
                            : "bg-[#F59E0B]"
                        }`}
                        style={{ width: `${Math.max(5, volumeLevel)}%` }}
                      />
                    </div>
                    <div className="flex justify-between text-[9px] text-[#8892A4] mt-1 font-mono">
                      <span>Quiet</span>
                      <span className="text-[#16845B] font-semibold">Optimal Range</span>
                      <span className="text-[#C2413B]">Clipping</span>
                    </div>
                  </div>

                  {/* Feedback Instructions */}
                  <p className="text-xs text-center text-[#667085]">
                    {volumeStatus === "optimal"
                      ? "Keep speaking your full name and student ID at this distance."
                      : volumeStatus === "clipping"
                      ? "Voice is clipping! Move slightly back from the microphone."
                      : "Please speak up clearly into your microphone."}
                  </p>

                  <button
                    type="button"
                    onClick={stopRecording}
                    className="bg-[#C2413B] hover:bg-[#9B2C27] text-white font-semibold px-6 py-2.5 rounded-xl text-xs transition-colors flex items-center gap-2 shadow-xs cursor-pointer mt-1"
                  >
                    <Square className="w-3.5 h-3.5" />
                    <span>Stop Recording {recordSeconds >= 2 ? "✓" : `(min 2s)`}</span>
                  </button>
                </div>
              ) : audioURL ? (
                <div className="flex flex-col items-center gap-4 w-full">
                  <div className="flex items-center gap-2 text-xs font-semibold text-[#16845B] bg-[#F4FBF7] border border-[#CEEAD6] px-3 py-1 rounded-full">
                    <CheckCircle2 className="w-3.5 h-3.5" />
                    <span>Audio sample captured (16kHz WAV)</span>
                  </div>

                  {/* Audible Player */}
                  <div className="w-full bg-white border border-[#E5E9E6] p-3.5 rounded-xl">
                    <span className="text-[11px] font-medium text-[#667085] flex items-center gap-1.5 mb-2">
                      <Volume2 className="w-3.5 h-3.5 text-[#176B5B]" />
                      <span>Verify audio clarity before proceeding:</span>
                    </span>
                    <audio src={audioURL} controls className="w-full h-9" />
                  </div>

                  <button
                    type="button"
                    onClick={() => {
                      setAudioBlob(null);
                      setAudioURL(null);
                      startRecording();
                    }}
                    className="py-2 px-4 rounded-xl border border-[#D0D5DD] bg-white text-[#172B4D] hover:bg-[#F8F9F7] text-xs font-semibold flex items-center gap-1.5 transition-colors"
                  >
                    <RotateCcw className="w-3.5 h-3.5" />
                    <span>Re-record Audio</span>
                  </button>
                </div>
              ) : (
                <div className="flex flex-col items-center gap-3 py-2 text-center">
                  <p className="text-xs text-[#667085] max-w-xs">
                    Click the button below and speak your full name and course title.
                  </p>
                  <button
                    type="button"
                    onClick={startRecording}
                    className="bg-[#176B5B] hover:bg-[#12584A] text-white font-semibold px-6 py-3 rounded-xl text-xs transition-all shadow-xs flex items-center gap-2"
                  >
                    <Mic className="w-4 h-4" />
                    <span>Start Voice Recording</span>
                  </button>
                </div>
              )}
            </div>

            <div className="flex gap-3">
              <button
                type="button"
                onClick={() => setStep(2)}
                className="flex-1 py-2.5 rounded-xl border border-[#D0D5DD] bg-white text-[#172B4D] hover:bg-[#F8F9F7] text-xs font-semibold transition-colors flex items-center justify-center gap-1.5"
              >
                <ArrowLeft className="w-3.5 h-3.5" />
                <span>Back</span>
              </button>
              <button
                type="button"
                disabled={!audioBlob}
                onClick={() => setStep(4)}
                className="flex-1 py-2.5 rounded-xl bg-[#172B4D] hover:bg-[#0F1E36] text-white text-xs font-semibold transition-all disabled:opacity-40 disabled:cursor-not-allowed flex items-center justify-center gap-1.5 shadow-xs"
              >
                <span>Review & Consent</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        )}

        {/* STEP 4: REVIEW & CONSENT */}
        {step === 4 && (
          <div>
            <h1 className="text-xl font-extrabold text-[#172B4D] tracking-tight mb-1">
              Review & Submit Enrollment
            </h1>
            <p className="text-xs text-[#667085] mb-5">
              Review your registration information and provide student biometric authorization.
            </p>

            <div className="bg-[#F8F9F7] border border-[#E5E9E6] rounded-xl p-4 mb-5 space-y-2 text-xs">
              <div className="flex justify-between pb-1.5 border-b border-[#E5E9E6]">
                <span className="text-[#667085]">Student Name:</span>
                <span className="font-bold text-[#172B4D]">{name}</span>
              </div>
              <div className="flex justify-between pb-1.5 border-b border-[#E5E9E6]">
                <span className="text-[#667085]">Enrollment ID:</span>
                <span className="font-mono font-bold text-[#172B4D]">{enrollmentNo}</span>
              </div>
              <div className="flex justify-between pb-1.5 border-b border-[#E5E9E6]">
                <span className="text-[#667085]">Email Address:</span>
                <span className="text-[#172B4D]">{email}</span>
              </div>
              <div className="flex justify-between pb-1.5 border-b border-[#E5E9E6]">
                <span className="text-[#667085]">Target Classroom:</span>
                <span className="font-bold text-[#176B5B]">{classData?.class_name}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-[#667085]">Biometric Samples:</span>
                <span className="text-[#16845B] font-semibold">Face Photo + 16kHz Voice Ready</span>
              </div>
            </div>

            {/* Consent Checkbox */}
            <div className="p-4 rounded-xl border border-[#D0D5DD] bg-white mb-6">
              <label className="flex items-start gap-3 cursor-pointer">
                <input
                  type="checkbox"
                  checked={consentAgreed}
                  onChange={(e) => setConsentAgreed(e.target.checked)}
                  className="mt-0.5 rounded text-[#176B5B] focus:ring-[#176B5B]"
                />
                <span className="text-xs text-[#475569] leading-relaxed">
                  I consent to the capture of my facial portrait and voice sample for the sole purpose
                  of automated classroom attendance verification in <strong>{classData?.class_name}</strong>.
                  I understand raw data is converted to mathematical embeddings and I retain the right
                  to manual roll-call alternatives.
                </span>
              </label>
            </div>

            <div className="flex gap-3">
              <button
                type="button"
                onClick={() => setStep(3)}
                className="flex-1 py-3 rounded-xl border border-[#D0D5DD] bg-white text-[#172B4D] hover:bg-[#F8F9F7] text-xs font-semibold transition-colors flex items-center justify-center gap-1.5"
              >
                <ArrowLeft className="w-3.5 h-3.5" />
                <span>Back</span>
              </button>
              <button
                type="button"
                disabled={!consentAgreed || isProcessing}
                onClick={handleSubmitEnrollment}
                className="flex-1 py-3 rounded-xl bg-[#176B5B] hover:bg-[#12584A] text-white text-xs font-bold transition-all disabled:opacity-40 disabled:cursor-not-allowed flex items-center justify-center gap-2 shadow-xs cursor-pointer"
              >
                {isProcessing ? (
                  <>
                    <span className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin"></span>
                    <span>Processing Biometrics...</span>
                  </>
                ) : (
                  <span>Submit Enrollment ✓</span>
                )}
              </button>
            </div>
          </div>
        )}

        {/* STEP 5: SUCCESS STATE */}
        {step === 5 && (
          <div className="text-center py-6">
            <div className="w-16 h-16 bg-[#F4FBF7] text-[#16845B] rounded-2xl flex items-center justify-center mx-auto mb-4 border border-[#CEEAD6] shadow-xs">
              <CheckCircle2 className="w-8 h-8" />
            </div>
            <h1 className="text-2xl font-extrabold text-[#172B4D] tracking-tight mb-2">
              Enrollment Confirmed!
            </h1>
            <p className="text-xs sm:text-sm text-[#667085] max-w-md mx-auto mb-8 leading-relaxed">
              {successMessage}
            </p>
            <div className="flex flex-wrap items-center justify-center gap-3">
              <Link
                href="/student/login"
                className="px-6 py-3 rounded-xl bg-[#176B5B] hover:bg-[#12584A] text-white text-xs font-bold transition-all shadow-xs"
              >
                Go to Student Portal →
              </Link>
              <Link
                href="/"
                className="px-6 py-3 rounded-xl border border-[#D0D5DD] bg-white text-[#172B4D] hover:bg-[#F8F9F7] text-xs font-semibold transition-colors"
              >
                Back to Homepage
              </Link>
            </div>
          </div>
        )}

        {/* Accessible Alternative Notice */}
        <div className="mt-8 pt-4 border-t border-[#E5E9E6] text-center text-[11px] text-[#667085]">
          Prefer not to use biometrics?{" "}
          <Link href="/security#fallback" className="font-semibold text-[#176B5B] hover:underline">
            Read about our non-biometric manual roll-call policy
          </Link>
        </div>
      </div>

      <div className="text-center text-[11px] text-[#8892A4] py-2">
        Student Biometric Enrollment · Protected by ArcFace 512-D & 16kHz Vocal Analysis
      </div>
    </div>
  );
}
