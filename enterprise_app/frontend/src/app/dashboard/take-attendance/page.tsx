"use client";

import React, { useEffect, useState, useRef } from "react";
import Link from "next/link";
import {
  ScanFace,
  Mic,
  Camera,
  Play,
  Square,
  CheckCircle2,
  AlertTriangle,
  Users,
  Clock4,
  RotateCcw,
  Check,
  Plus,
  ArrowLeft,
  Volume2,
  ShieldCheck,
  Radio,
} from "lucide-react";
import { supabase } from "@/lib/supabase";
import { getApiUrl } from "@/lib/api";
import { WavRecorder } from "@/lib/audioRecorder";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { PageHeader } from "@/components/ui/PageHeader";
import { StatusBadge } from "@/components/ui/StatusBadge";
import { ConfirmDialog } from "@/components/ui/ConfirmDialog";

export default function TakeAttendancePage() {
  const [students, setStudents] = useState<any[]>([]);
  const [classId, setClassId] = useState<string>("");
  const [className, setClassName] = useState<string>("Loading...");
  const [classes, setClasses] = useState<any[]>([]);

  // Sessions
  const [sessions, setSessions] = useState<any[]>([]);
  const [selectedSessionId, setSelectedSessionId] = useState<string>("");

  // Scanner Modes
  const [isFaceScanning, setIsFaceScanning] = useState(false);
  const [isVoiceScanning, setIsVoiceScanning] = useState(false);

  // States
  const [faceScanResult, setFaceScanResult] = useState<string | null>(null);
  const [faceScanResultType, setFaceScanResultType] = useState<"success" | "warning" | "error">("success");
  const [voiceScanResult, setVoiceScanResult] = useState<string | null>(null);
  const [voiceScanResultType, setVoiceScanResultType] = useState<"success" | "warning" | "error">("success");
  const [sessionNotice, setSessionNotice] = useState<string | null>(null);
  const [isMatching, setIsMatching] = useState(false);
  const [isRecording, setIsRecording] = useState(false);
  const [audioBlob, setAudioBlob] = useState<Blob | null>(null);

  // Manual Check-in Modal
  const [manualStudent, setManualStudent] = useState<any | null>(null);
  const [isManualConfirmOpen, setIsManualConfirmOpen] = useState(false);

  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const scanIntervalRef = useRef<any>(null);
  const wavRecorderRef = useRef<WavRecorder | null>(null);
  const isScanningRef = useRef<boolean>(false);
  const mediaStreamRef = useRef<MediaStream | null>(null);
  const abortControllerRef = useRef<AbortController | null>(null);

  // 1. Fetch Class and Sessions
  useEffect(() => {
    fetchClassAndSessions();
  }, []);

  const fetchClassAndSessions = async () => {
    const { data: classList } = await supabase
      .from("classes")
      .select("id, class_name, join_code");

    if (classList && classList.length > 0) {
      setClasses(classList);
      setClassId(classList[0].id);
      setClassName(classList[0].class_name);
      await fetchSessions(classList[0].id);
    } else {
      setClassName("No active class");
    }
  };

  const fetchSessions = async (cid: string) => {
    const { data: sList } = await supabase
      .from("attendance_sessions")
      .select("id, date, is_active, created_at")
      .eq("class_id", cid)
      .order("created_at", { ascending: false });

    const list = sList || [];
    setSessions(list);
    if (list.length > 0) {
      setSelectedSessionId(list[0].id);
    } else {
      setSelectedSessionId("");
    }
  };

  const handleClassChange = async (newCid: string) => {
    setClassId(newCid);
    const selected = classes.find((c) => c.id === newCid);
    if (selected) setClassName(selected.class_name);
    setStudents([]);
    setSelectedSessionId("");
    setFaceScanResult(null);
    setVoiceScanResult(null);
    await fetchSessions(newCid);
  };

  const formatSessionLabel = (s: any) => {
    if (!s) return "";
    const dateObj = s.created_at ? new Date(s.created_at) : new Date(s.date);
    const dateStr = dateObj.toLocaleDateString([], { month: "short", day: "numeric" });
    const timeStr = s.created_at
      ? dateObj.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })
      : "";
    return timeStr ? `${dateStr} • ${timeStr}` : dateStr;
  };

  // 2. Fetch students and match records for the selected session
  useEffect(() => {
    if (!classId || !selectedSessionId) return;

    const fetchRosterAndRecords = async () => {
      // STRICT CLASSROOM ISOLATION: Fetch enrolled students for this class only
      const { data: enrollments } = await supabase
        .from("enrollments")
        .select("student_id")
        .eq("class_id", classId);

      let roster: any[] = [];
      if (enrollments && enrollments.length > 0) {
        const sIds = enrollments.map((e) => e.student_id);
        const { data: users } = await supabase
          .from("users")
          .select("id, name, custom_id")
          .in("id", sIds);
        roster = users || [];
      } else {
        // Enforce strict classroom isolation: if no students enrolled, roster is empty!
        roster = [];
      }

      // Fetch records for current selected session
      const { data: records } = await supabase
        .from("attendance_records")
        .select("student_id, marked_at, method")
        .eq("session_id", selectedSessionId);

      const formatted = roster.map((student) => {
        const record = (records || []).find((r) => r.student_id === student.id);
        return {
          id: student.id,
          name: student.name,
          roll: student.custom_id || "N/A",
          time: record
            ? new Date(record.marked_at).toLocaleTimeString([], {
                hour: "2-digit",
                minute: "2-digit",
              })
            : "—",
          status: record ? "Present" : "Pending",
          method: record?.method || "—",
        };
      });

      formatted.sort((a, b) => {
        if (a.status !== b.status) return a.status === "Pending" ? -1 : 1;
        return a.name.localeCompare(b.name);
      });

      setStudents(formatted);
    };

    fetchRosterAndRecords();

    // Subscribe to Realtime events for this specific session
    const channelName = `session-attendance-${selectedSessionId}`;
    const channel = supabase
      .channel(channelName)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "attendance_records",
          filter: `session_id=eq.${selectedSessionId}`,
        },
        (payload) => {
          const rec = payload.new as any;
          if (rec && rec.student_id) {
            setStudents((prev) => {
              const copy = [...prev];
              const idx = copy.findIndex((s) => s.id === rec.student_id);
              if (idx !== -1) {
                const timeStr = rec.marked_at
                  ? new Date(rec.marked_at).toLocaleTimeString([], {
                      hour: "2-digit",
                      minute: "2-digit",
                    })
                  : new Date().toLocaleTimeString([], {
                      hour: "2-digit",
                      minute: "2-digit",
                    });
                copy[idx] = {
                  ...copy[idx],
                  status: "Present",
                  time: timeStr,
                  method: rec.method || "face",
                };
              }
              return copy.sort((a, b) => {
                if (a.status !== b.status) return a.status === "Pending" ? -1 : 1;
                return a.name.localeCompare(b.name);
              });
            });
          }
        }
      )
      .subscribe((status) => {
        if (status === "SUBSCRIBED") {
          console.log(`[Realtime] Subscribed to session ${selectedSessionId}`);
        }
      });

    return () => {
      supabase.removeChannel(channel);
    };
  }, [classId, selectedSessionId]);

  const handleStartFaceScanner = () => {
    isScanningRef.current = true;
    setIsFaceScanning(true);
  };

  const handleStopFaceScanner = () => {
    isScanningRef.current = false;
    setIsFaceScanning(false);
    stopCamera();
    if (scanIntervalRef.current) {
      clearInterval(scanIntervalRef.current);
      scanIntervalRef.current = null;
    }
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
      abortControllerRef.current = null;
    }
    setIsMatching(false);
  };

  // WebCam loop
  useEffect(() => {
    if (isFaceScanning) {
      isScanningRef.current = true;
      startCamera();
      scanIntervalRef.current = setInterval(captureAndRecognizeFace, 2500);
    } else {
      isScanningRef.current = false;
      stopCamera();
      if (scanIntervalRef.current) {
        clearInterval(scanIntervalRef.current);
        scanIntervalRef.current = null;
      }
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
        abortControllerRef.current = null;
      }
    }
    return () => {
      isScanningRef.current = false;
      stopCamera();
      if (scanIntervalRef.current) {
        clearInterval(scanIntervalRef.current);
        scanIntervalRef.current = null;
      }
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
        abortControllerRef.current = null;
      }
    };
  }, [isFaceScanning, classId, selectedSessionId]);

  const startCamera = async () => {
    try {
      if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        setFaceScanResult("Camera blocked. Please verify browser camera permissions.");
        setFaceScanResultType("error");
        setIsFaceScanning(false);
        isScanningRef.current = false;
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

      // Guard against race condition: user stopped scanner before getUserMedia resolved
      if (!isScanningRef.current) {
        stream.getTracks().forEach((track) => track.stop());
        return;
      }

      mediaStreamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        videoRef.current.play().catch(() => {});
      }
    } catch {
      setIsFaceScanning(false);
      isScanningRef.current = false;
    }
  };

  const stopCamera = () => {
    if (mediaStreamRef.current) {
      mediaStreamRef.current.getTracks().forEach((track) => track.stop());
      mediaStreamRef.current = null;
    }
    if (videoRef.current && videoRef.current.srcObject) {
      const stream = videoRef.current.srcObject as MediaStream;
      stream.getTracks().forEach((track) => track.stop());
      videoRef.current.srcObject = null;
    }
  };

  const captureAndRecognizeFace = async () => {
    if (
      !isScanningRef.current ||
      !videoRef.current ||
      !canvasRef.current ||
      !classId ||
      !selectedSessionId ||
      isMatching
    )
      return;
    const video = videoRef.current;
    const canvas = canvasRef.current;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const w = video.videoWidth || 640;
    const h = video.videoHeight || 480;
    canvas.width = w;
    canvas.height = h;
    ctx.drawImage(video, 0, 0, w, h);

    canvas.toBlob(
      async (blob) => {
        if (!blob || !isScanningRef.current) return;
        setIsMatching(true);
        const formData = new FormData();
        formData.append("class_id", classId);
        formData.append("session_id", selectedSessionId);
        formData.append("file", blob, "webcam.jpg");

        const controller = new AbortController();
        abortControllerRef.current = controller;

        try {
          const response = await fetch(getApiUrl("/api/v1/attendance/scan-face"), {
            method: "POST",
            body: formData,
            signal: controller.signal,
          });

          if (!isScanningRef.current) return;

          if (!response.ok) {
            const err = await response.json().catch(() => ({}));
            setFaceScanResult(`Notice: ${err.detail || "No face detected"}`);
            setFaceScanResultType("warning");
            setTimeout(() => {
              if (isScanningRef.current) setFaceScanResult(null);
            }, 3000);
            return;
          }

          const data = await response.json();
          if (!isScanningRef.current) return;

          if (data.spoof_detected) {
            setFaceScanResult(`⚠️ Presentation Alert: ${data.spoof_type || "Screen/Photo detected"}`);
            setFaceScanResultType("error");
            setTimeout(() => {
              if (isScanningRef.current) setFaceScanResult(null);
            }, 4000);
          } else if (data.review_required) {
            setFaceScanResult(`⚠️ Liveness Inconclusive: Teacher Review Required`);
            setFaceScanResultType("warning");
            setTimeout(() => {
              if (isScanningRef.current) setFaceScanResult(null);
            }, 4000);
          } else if (data.matched && data.student_id) {
            // Immediate Authoritative Local State Update (No refresh or delay)
            const timeStr = data.record?.marked_at
              ? new Date(data.record.marked_at).toLocaleTimeString([], {
                  hour: "2-digit",
                  minute: "2-digit",
                })
              : new Date().toLocaleTimeString([], {
                  hour: "2-digit",
                  minute: "2-digit",
                });

            setStudents((prev) => {
              const copy = [...prev];
              const idx = copy.findIndex((s) => s.id === data.student_id);
              if (idx !== -1) {
                copy[idx] = {
                  ...copy[idx],
                  status: "Present",
                  time: timeStr,
                  method: data.record?.method || "face",
                };
              }
              return copy.sort((a, b) => {
                if (a.status !== b.status) return a.status === "Pending" ? -1 : 1;
                return a.name.localeCompare(b.name);
              });
            });

            setFaceScanResult(`Verified: ${data.name} (Live Face ✓)`);
            setFaceScanResultType("success");
            setTimeout(() => {
              if (isScanningRef.current) setFaceScanResult(null);
            }, 3000);
          } else {
            setFaceScanResult(`Not Recognized: ${data.detail || "Try framing face clearly"}`);
            setFaceScanResultType("warning");
            setTimeout(() => {
              if (isScanningRef.current) setFaceScanResult(null);
            }, 3000);
          }
        } catch (err: any) {
          if (err?.name === "AbortError" || !isScanningRef.current) {
            return;
          }
          setFaceScanResult("Network Error: Backend unreachable.");
          setFaceScanResultType("error");
          setTimeout(() => {
            if (isScanningRef.current) setFaceScanResult(null);
          }, 3000);
        } finally {
          setIsMatching(false);
        }
      },
      "image/jpeg",
      0.95
    );
  };

  // Mic loop with WavRecorder (Cross-platform 16kHz WAV)
  const startRecording = async () => {
    try {
      if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        alert("Microphone access is blocked by your browser permissions.");
        return;
      }

      wavRecorderRef.current = new WavRecorder();
      await wavRecorderRef.current.start();
      setIsRecording(true);
    } catch {
      alert("Microphone access denied. Please check device permissions.");
      setIsRecording(false);
    }
  };

  const stopRecording = () => {
    if (wavRecorderRef.current && isRecording) {
      const wavBlob = wavRecorderRef.current.stop();
      setAudioBlob(wavBlob);
      setIsRecording(false);
    }
  };

  const sendVoiceToBackend = async () => {
    if (!audioBlob || !classId) return;
    setIsMatching(true);
    const formData = new FormData();
    formData.append("class_id", classId);
    formData.append("session_id", selectedSessionId);
    formData.append("file", audioBlob, "voice.wav");

    try {
      const response = await fetch(getApiUrl("/api/v1/attendance/scan-voice"), {
        method: "POST",
        body: formData,
      });
      const data = await response.json();
      if (data.spoof_detected) {
        setVoiceScanResult(`⚠️ Voice Alert: ${data.spoof_type || "Recorded speaker detected"}`);
        setVoiceScanResultType("error");
        setTimeout(() => setVoiceScanResult(null), 4000);
      } else if (data.matched && data.student_id) {
        // Immediate Authoritative Local State Update
        const timeStr = data.record?.marked_at
          ? new Date(data.record.marked_at).toLocaleTimeString([], {
              hour: "2-digit",
              minute: "2-digit",
            })
          : new Date().toLocaleTimeString([], {
              hour: "2-digit",
              minute: "2-digit",
            });

        setStudents((prev) => {
          const copy = [...prev];
          const idx = copy.findIndex((s) => s.id === data.student_id);
          if (idx !== -1) {
            copy[idx] = {
              ...copy[idx],
              status: "Present",
              time: timeStr,
              method: data.record?.method || "voice",
            };
          }
          return copy.sort((a, b) => {
            if (a.status !== b.status) return a.status === "Pending" ? -1 : 1;
            return a.name.localeCompare(b.name);
          });
        });

        setVoiceScanResult(`Verified Voice: ${data.name} (Live ✓)`);
        setVoiceScanResultType("success");
        setTimeout(() => setVoiceScanResult(null), 3000);
      } else {
        setVoiceScanResult(`Voice Mismatch: ${data.detail || "Could not recognize voice"}`);
        setVoiceScanResultType("warning");
        setTimeout(() => setVoiceScanResult(null), 3000);
      }
    } catch {
      setVoiceScanResult("Network Error: Backend unreachable.");
      setVoiceScanResultType("error");
      setTimeout(() => setVoiceScanResult(null), 3000);
    } finally {
      setIsMatching(false);
      setAudioBlob(null);
    }
  };

  const handleStartNewSession = async () => {
    if (!classId) return;
    const today = new Date().toISOString().split("T")[0];
    const nowIso = new Date().toISOString();

    try {
      const { data, error } = await supabase
        .from("attendance_sessions")
        .insert({
          class_id: classId,
          date: today,
          created_at: nowIso,
          is_active: true,
        })
        .select("id, date, is_active, created_at")
        .single();

      if (error) throw error;

      const updated = [data, ...sessions];
      setSessions(updated);
      setSelectedSessionId(data.id);

      const timeStr = new Date(nowIso).toLocaleTimeString([], {
        hour: "2-digit",
        minute: "2-digit",
      });
      setSessionNotice(`Session Launched (${timeStr}) ✓`);
      setTimeout(() => setSessionNotice(null), 4000);
    } catch (e: any) {
      alert("Failed to start new session: " + (e?.message || "Check network"));
    }
  };

  // Manual Check-In Override
  const handleManualCheckIn = async () => {
    if (!manualStudent || !selectedSessionId) return;

    try {
      const { data, error } = await supabase
        .from("attendance_records")
        .upsert(
          {
            session_id: selectedSessionId,
            student_id: manualStudent.id,
            method: "manual",
          },
          { onConflict: "session_id,student_id" }
        )
        .select()
        .single();

      if (error) throw error;

      const timeStr = data?.marked_at
        ? new Date(data.marked_at).toLocaleTimeString([], {
            hour: "2-digit",
            minute: "2-digit",
          })
        : new Date().toLocaleTimeString([], {
            hour: "2-digit",
            minute: "2-digit",
          });

      setStudents((prev) => {
        const copy = [...prev];
        const idx = copy.findIndex((s) => s.id === manualStudent.id);
        if (idx !== -1) {
          copy[idx] = {
            ...copy[idx],
            status: "Present",
            time: timeStr,
            method: "manual",
          };
        }
        return copy.sort((a, b) => {
          if (a.status !== b.status) return a.status === "Pending" ? -1 : 1;
          return a.name.localeCompare(b.name);
        });
      });

      setSessionNotice(`Manually marked ${manualStudent.name} present ✓`);
      setIsManualConfirmOpen(false);
      setManualStudent(null);
      setTimeout(() => setSessionNotice(null), 3000);
    } catch {
      alert("Could not update attendance record.");
    }
  };

  const presentCount = students.filter((s) => s.status === "Present").length;
  const totalCount = students.length;

  return (
    <DashboardLayout role="teacher" title="Live Attendance Kiosk">
      <PageHeader
        title="Attendance Scanner"
        description="Position this device at the classroom podium or entrance for automated biometric check-in."
        backHref="/dashboard"
        backLabel="Back to Dashboard"
        action={
          <div className="flex flex-wrap items-center gap-2">
            {/* Classroom Selector (Strict Isolation) */}
            {classes.length > 0 && (
              <select
                value={classId}
                onChange={(e) => handleClassChange(e.target.value)}
                className="bg-white border border-[#176B5B] rounded-xl px-3 py-2 text-xs font-bold text-[#176B5B] focus:outline-none"
              >
                {classes.map((c) => (
                  <option key={c.id} value={c.id}>
                    Class: {c.class_name} ({c.join_code})
                  </option>
                ))}
              </select>
            )}

            {/* Session Selector */}
            {sessions.length > 0 && (
              <select
                value={selectedSessionId}
                onChange={(e) => setSelectedSessionId(e.target.value)}
                className="bg-white border border-[#D0D5DD] rounded-xl px-3 py-2 text-xs font-semibold text-[#172B4D] focus:outline-none focus:border-[#176B5B]"
              >
                {sessions.map((s) => (
                  <option key={s.id} value={s.id}>
                    Session: {formatSessionLabel(s)}
                  </option>
                ))}
              </select>
            )}

            <button
              onClick={handleStartNewSession}
              className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl border border-[#D0D5DD] bg-white hover:bg-[#F8F9F7] text-xs font-semibold text-[#172B4D] transition-colors"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>New Session</span>
            </button>
          </div>
        }
      />

      {/* Main 2-Column Scanner Interface */}
      <div className="grid lg:grid-cols-12 gap-8 items-start">
        {/* Left Column: Camera and Voice Scanner Controls (7 cols) */}
        <div className="lg:col-span-7 space-y-6">
          {/* Camera Frame Card */}
          <div className="bg-white rounded-2xl border border-[#E5E9E6] p-6 shadow-2xs">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <span
                  className={`w-2.5 h-2.5 rounded-full ${
                    isFaceScanning ? "bg-[#16845B] animate-ping" : "bg-[#8892A4]"
                  }`}
                />
                <h3 className="text-sm font-bold text-[#172B4D]">
                  {isFaceScanning ? "Live Camera Stream Active" : "Camera Stream Paused"}
                </h3>
              </div>
              <span className="text-[11px] text-[#667085] font-mono">
                ArcFace 512-D + Anti-Spoof
              </span>
            </div>

            {/* Video Viewport with Portrait Oval Overlay */}
            <div className="relative aspect-[4/3] bg-black rounded-xl overflow-hidden border border-[#D0D5DD] mb-5 flex items-center justify-center shadow-inner">
              <video
                ref={videoRef}
                autoPlay
                playsInline
                muted
                className={`w-full h-full object-cover scale-x-[-1] ${
                  isFaceScanning ? "block" : "hidden"
                }`}
              />

              {!isFaceScanning && (
                <div className="text-center p-6 text-slate-400">
                  <Camera className="w-10 h-10 mx-auto mb-2 opacity-50 text-white" />
                  <p className="text-xs">Camera is paused</p>
                  <p className="text-[11px] opacity-75 mt-0.5">
                    Click "Start Face Scanner" below to begin recognition
                  </p>
                </div>
              )}

              {/* Oval guide when active */}
              {isFaceScanning && (
                <div className="absolute inset-0 pointer-events-none flex items-center justify-center">
                  <div className="w-48 h-64 border-2 border-dashed border-[#2DD4BF] rounded-[50%] animate-pulse" />
                </div>
              )}

              {/* Status pill overlay */}
              {isFaceScanning && (
                <div className="absolute top-3 left-3 bg-black/60 backdrop-blur-xs text-white px-2.5 py-1 rounded-md text-[11px] font-mono flex items-center gap-1.5">
                  <Radio className="w-3 h-3 text-[#2DD4BF] animate-pulse" />
                  <span>Scanning at 2.5s cadence</span>
                </div>
              )}
            </div>

            {/* Live Face Scan Feedback Notification (Positioned directly above Stop button) */}
            {faceScanResult && (
              <div
                className={`mb-4 p-3 rounded-xl border text-xs font-semibold flex items-center gap-2.5 transition-all shadow-xs ${
                  faceScanResultType === "success"
                    ? "bg-[#F4FBF7] border-[#CEEAD6] text-[#16845B]"
                    : faceScanResultType === "warning"
                    ? "bg-[#FEFBF0] border-[#FEEFC3] text-[#B7791F]"
                    : "bg-[#FDF4F4] border-[#FAD2CF] text-[#C2413B]"
                }`}
              >
                {faceScanResultType === "success" ? (
                  <CheckCircle2 className="w-4 h-4 shrink-0" />
                ) : (
                  <AlertTriangle className="w-4 h-4 shrink-0" />
                )}
                <span>{faceScanResult}</span>
              </div>
            )}

            {/* Camera Controls */}
            <div className="flex gap-3">
              {isFaceScanning ? (
                <button
                  type="button"
                  onClick={handleStopFaceScanner}
                  className="flex-1 py-2.5 rounded-xl bg-[#C2413B] hover:bg-[#9B2C27] text-white text-xs font-semibold flex items-center justify-center gap-2 shadow-xs transition-colors"
                >
                  <Square className="w-3.5 h-3.5" />
                  <span>Stop Face Scanner</span>
                </button>
              ) : (
                <button
                  type="button"
                  onClick={handleStartFaceScanner}
                  className="flex-1 py-2.5 rounded-xl bg-[#176B5B] hover:bg-[#12584A] text-white text-xs font-semibold flex items-center justify-center gap-2 shadow-xs transition-colors"
                >
                  <Play className="w-3.5 h-3.5" />
                  <span>Start Face Scanner</span>
                </button>
              )}
            </div>
            <canvas ref={canvasRef} className="hidden" />
          </div>

          {/* Voiceprint Scanner Card */}
          <div className="bg-white rounded-2xl border border-[#E5E9E6] p-6 shadow-2xs">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <Mic className="w-4 h-4 text-[#176B5B]" />
                <h3 className="text-sm font-bold text-[#172B4D]">Voiceprint Verification</h3>
              </div>
              <span className="text-[11px] text-[#667085] font-mono">16kHz Acoustic Spectrogram</span>
            </div>

            <p className="text-xs text-[#667085] mb-4 leading-relaxed">
              If a student's face cannot be framed easily, use microphone check-in. Ask the student
              to state their name into the microphone.
            </p>

            <div className="p-4 bg-[#F8F9F7] rounded-xl border border-[#E5E9E6] mb-4 flex flex-col items-center justify-center">
              {isRecording ? (
                <div className="flex flex-col items-center gap-3 py-2">
                  <div className="flex gap-1.5 items-center h-6">
                    <span className="w-1.5 h-5 bg-[#C2413B] rounded-full animate-bounce"></span>
                    <span className="w-1.5 h-7 bg-[#C2413B] rounded-full animate-bounce delay-100"></span>
                    <span className="w-1.5 h-4 bg-[#C2413B] rounded-full animate-bounce delay-200"></span>
                    <span className="w-1.5 h-6 bg-[#C2413B] rounded-full animate-bounce delay-300"></span>
                  </div>
                  <span className="text-xs text-[#C2413B] font-bold animate-pulse">
                    Recording live audio...
                  </span>
                  <button
                    type="button"
                    onClick={stopRecording}
                    className="px-4 py-1.5 bg-[#C2413B] hover:bg-[#9B2C27] text-white text-xs font-semibold rounded-lg shadow-xs"
                  >
                    Stop & Analyze
                  </button>
                </div>
              ) : audioBlob ? (
                <div className="flex flex-col items-center gap-3 w-full">
                  <span className="text-xs text-[#16845B] font-semibold flex items-center gap-1.5">
                    <CheckCircle2 className="w-4 h-4" />
                    <span>Voice clip recorded (16kHz WAV ready)</span>
                  </span>
                  <div className="flex gap-2 w-full">
                    <button
                      type="button"
                      onClick={() => setAudioBlob(null)}
                      className="flex-1 py-2 rounded-lg border border-[#D0D5DD] bg-white text-xs font-semibold text-[#667085]"
                    >
                      Discard
                    </button>
                    <button
                      type="button"
                      onClick={sendVoiceToBackend}
                      disabled={isMatching}
                      className="flex-1 py-2 rounded-lg bg-[#176B5B] hover:bg-[#12584A] text-white text-xs font-bold"
                    >
                      {isMatching ? "Matching..." : "Verify Voiceprint"}
                    </button>
                  </div>
                </div>
              ) : (
                <button
                  type="button"
                  onClick={startRecording}
                  className="px-5 py-2.5 rounded-xl border border-[#D0D5DD] bg-white hover:bg-[#F8F9F7] text-xs font-semibold text-[#172B4D] flex items-center gap-2 shadow-2xs"
                >
                  <Mic className="w-4 h-4 text-[#176B5B]" />
                  <span>Record Student Voice (3s)</span>
                </button>
              )}
            </div>

            {/* Live Voice Scan Feedback Notification (Positioned inside Voice card) */}
            {voiceScanResult && (
              <div
                className={`p-3 rounded-xl border text-xs font-semibold flex items-center gap-2.5 transition-all shadow-xs ${
                  voiceScanResultType === "success"
                    ? "bg-[#F4FBF7] border-[#CEEAD6] text-[#16845B]"
                    : voiceScanResultType === "warning"
                    ? "bg-[#FEFBF0] border-[#FEEFC3] text-[#B7791F]"
                    : "bg-[#FDF4F4] border-[#FAD2CF] text-[#C2413B]"
                }`}
              >
                {voiceScanResultType === "success" ? (
                  <CheckCircle2 className="w-4 h-4 shrink-0" />
                ) : (
                  <AlertTriangle className="w-4 h-4 shrink-0" />
                )}
                <span>{voiceScanResult}</span>
              </div>
            )}
          </div>
        </div>

        {/* Right Column: Live Roster & Manual Overrides (5 cols) */}
        <div className="lg:col-span-5 bg-white rounded-2xl border border-[#E5E9E6] p-6 shadow-2xs">
          {sessionNotice && (
            <div className="mb-4 p-3 rounded-xl border border-[#CEEAD6] bg-[#F4FBF7] text-[#16845B] text-xs font-semibold flex items-center gap-2.5 transition-all shadow-xs">
              <CheckCircle2 className="w-4 h-4 shrink-0" />
              <span>{sessionNotice}</span>
            </div>
          )}

          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="text-base font-bold text-[#172B4D]">Live Session Roster</h3>
              <p className="text-xs text-[#667085]">
                {presentCount} of {totalCount} students verified
              </p>
            </div>
            <div className="text-right">
              <span className="text-lg font-bold text-[#16845B]">
                {totalCount > 0 ? Math.round((presentCount / totalCount) * 100) : 0}%
              </span>
              <span className="text-[10px] text-[#667085] block">Attendance</span>
            </div>
          </div>

          <div className="w-full bg-[#EAECE9] h-2 rounded-full overflow-hidden mb-6 flex">
            <div
              className="bg-[#16845B] h-full transition-all duration-300"
              style={{
                width: `${totalCount > 0 ? (presentCount / totalCount) * 100 : 0}%`,
              }}
            />
          </div>

          {/* Student List */}
          <div className="space-y-2 max-h-[560px] overflow-y-auto pr-1">
            {students.length === 0 ? (
              <div className="py-8 text-center text-xs text-[#667085]">
                No students enrolled in this course yet.
              </div>
            ) : (
              students.map((student) => (
                <div
                  key={student.id}
                  className="p-3 rounded-xl border border-[#E5E9E6] bg-[#F8F9F7]/60 flex items-center justify-between hover:bg-white transition-colors"
                >
                  <div className="flex items-center gap-2.5 min-w-0">
                    <div className="w-7 h-7 rounded-full bg-[#172B4D] text-white flex items-center justify-center font-bold text-[10px] shrink-0">
                      {student.name.substring(0, 2).toUpperCase()}
                    </div>
                    <div className="min-w-0">
                      <div className="text-xs font-bold text-[#172B4D] truncate">
                        {student.name}
                      </div>
                      <div className="text-[10px] text-[#667085] font-mono">
                        {student.roll} · {student.time} ({student.method})
                      </div>
                    </div>
                  </div>

                  <div>
                    {student.status === "Present" ? (
                      <StatusBadge status="Present" size="sm" />
                    ) : (
                      <button
                        type="button"
                        onClick={() => {
                          setManualStudent(student);
                          setIsManualConfirmOpen(true);
                        }}
                        className="px-2.5 py-1 rounded-md text-[10px] font-semibold border border-[#D0D5DD] bg-white hover:bg-[#F4FBF7] hover:border-[#CEEAD6] hover:text-[#16845B] transition-colors"
                      >
                        Mark Present
                      </button>
                    )}
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>

      {/* Manual Attendance Confirmation Modal */}
      <ConfirmDialog
        isOpen={isManualConfirmOpen}
        title="Confirm Manual Attendance"
        message={`Mark ${manualStudent?.name} (${manualStudent?.roll}) as Present for the current session? This action will be logged in the permanent audit trail.`}
        confirmLabel="Confirm Present"
        onConfirm={handleManualCheckIn}
        onCancel={() => {
          setIsManualConfirmOpen(false);
          setManualStudent(null);
        }}
      />
    </DashboardLayout>
  );
}
