"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import { Users, Trash2, Search, ArrowRight, ShieldCheck, Camera, Mic, AlertTriangle } from "lucide-react";
import { supabase } from "@/lib/supabase";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { PageHeader } from "@/components/ui/PageHeader";
import { SearchInput } from "@/components/ui/SearchInput";
import { EmptyState } from "@/components/ui/EmptyState";
import { ConfirmDialog } from "@/components/ui/ConfirmDialog";

export default function ReviewStudentsPage() {
  const [enrollments, setEnrollments] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [classes, setClasses] = useState<any[]>([]);
  const [selectedClassId, setSelectedClassId] = useState("");
  const [className, setClassName] = useState("Loading Class...");
  const [search, setSearch] = useState("");

  // Unenroll Confirmation State
  const [targetEnrollment, setTargetEnrollment] = useState<any | null>(null);
  const [isDeleteOpen, setIsDeleteOpen] = useState(false);

  useEffect(() => {
    fetchClassesAndEnrollments();
  }, []);

  const fetchClassesAndEnrollments = async () => {
    setLoading(true);
    try {
      const { data: classList } = await supabase.from("classes").select("id, class_name, join_code");
      if (!classList || classList.length === 0) {
        setClassName("No Classes Found");
        setLoading(false);
        return;
      }

      setClasses(classList);
      const cid = classList[0].id;
      setSelectedClassId(cid);
      setClassName(classList[0].class_name);
      await fetchClassStudents(cid);
    } catch {
      // Fallback
    } finally {
      setLoading(false);
    }
  };

  const fetchClassStudents = async (cid: string) => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from("enrollments")
        .select(`
          id,
          class_id,
          student_id,
          enrolled_at,
          users ( id, name, email, custom_id )
        `)
        .eq("class_id", cid)
        .eq("status", "active");

      if (error) throw error;

      const studentIds = (data || []).map((e: any) => e.student_id).filter(Boolean);
      const biometricsMap: Record<string, { hasFace: boolean; hasVoice: boolean }> = {};

      if (studentIds.length > 0) {
        // Query active biometric status without retrieving raw embedding vectors (privacy & performance)
        const { data: biometrics } = await supabase
          .from("student_biometrics")
          .select("student_id, biometric_type, is_active")
          .in("student_id", studentIds)
          .eq("is_active", true);

        (biometrics || []).forEach((b: any) => {
          if (!biometricsMap[b.student_id]) {
            biometricsMap[b.student_id] = { hasFace: false, hasVoice: false };
          }
          if (b.biometric_type === "face") {
            biometricsMap[b.student_id].hasFace = true;
          } else if (b.biometric_type === "voice") {
            biometricsMap[b.student_id].hasVoice = true;
          }
        });
      }

      const formatted = (data || []).map((e: any) => {
        const bio = biometricsMap[e.student_id] || { hasFace: false, hasVoice: false };
        let biometricStatus: "both" | "face_only" | "voice_only" | "none" = "none";
        if (bio.hasFace && bio.hasVoice) biometricStatus = "both";
        else if (bio.hasFace) biometricStatus = "face_only";
        else if (bio.hasVoice) biometricStatus = "voice_only";

        return {
          id: e.id,
          studentId: e.student_id,
          name: e.users?.name || "Student",
          email: e.users?.email || "—",
          roll: e.users?.custom_id || "N/A",
          enrolledAt: e.enrolled_at,
          biometricStatus,
        };
      });

      setEnrollments(formatted);
    } catch {
      // Fallback
    } finally {
      setLoading(false);
    }
  };

  const handleClassChange = async (cid: string) => {
    setSelectedClassId(cid);
    const sel = classes.find((c) => c.id === cid);
    if (sel) setClassName(sel.class_name);
    await fetchClassStudents(cid);
  };

  const handleUnenroll = async () => {
    if (!targetEnrollment) return;

    try {
      const { error } = await supabase
        .from("enrollments")
        .delete()
        .eq("id", targetEnrollment.id);

      if (error) throw error;

      setEnrollments((prev) => prev.filter((e) => e.id !== targetEnrollment.id));
      setIsDeleteOpen(false);
      setTargetEnrollment(null);
    } catch {
      alert("Failed to unenroll student.");
    }
  };

  const filtered = enrollments.filter(
    (e) =>
      e.name.toLowerCase().includes(search.toLowerCase()) ||
      e.email.toLowerCase().includes(search.toLowerCase()) ||
      e.roll.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <DashboardLayout role="teacher" title="Student Directory">
      <PageHeader
        title={`Student Directory — ${className}`}
        description="Review all registered biometric profiles and enrolled students for this course."
        action={
          <Link
            href="/join"
            className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-[#176B5B] hover:bg-[#12584A] text-white text-xs font-bold shadow-xs transition-colors"
          >
            <span>Enroll New Student</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </Link>
        }
      />

      {/* Filter Row */}
      <div className="bg-white rounded-2xl border border-[#E5E9E6] p-4 mb-6 shadow-2xs flex flex-col sm:flex-row items-center justify-between gap-4">
        <div className="flex flex-col sm:flex-row items-center gap-3 w-full sm:w-auto">
          {classes.length > 0 && (
            <select
              value={selectedClassId}
              onChange={(e) => handleClassChange(e.target.value)}
              className="bg-white border border-[#176B5B] rounded-xl px-3 py-2 text-xs font-bold text-[#176B5B] focus:outline-none w-full sm:w-auto"
            >
              {classes.map((c) => (
                <option key={c.id} value={c.id}>
                  Class: {c.class_name} ({c.join_code})
                </option>
              ))}
            </select>
          )}
          <SearchInput
            placeholder="Search by student name or roll ID..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full sm:w-80"
          />
        </div>
        <div className="text-xs text-[#667085]">
          Enrolled: <strong>{filtered.length}</strong> students
        </div>
      </div>

      <div className="bg-white rounded-2xl border border-[#E5E9E6] p-6 shadow-2xs">
        {loading ? (
          <div className="py-12 text-center text-xs text-[#667085]">Loading students...</div>
        ) : filtered.length === 0 ? (
          <EmptyState
            title="No Students Registered"
            description="Students have not yet joined this class section."
            actionText="Student Enrollment"
            actionHref="/join"
          />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-[#F8F9F7] text-[#667085] uppercase border-y border-[#E5E9E6] font-semibold">
                <tr>
                  <th className="px-4 py-3">Student Name</th>
                  <th className="px-4 py-3">Roll ID</th>
                  <th className="px-4 py-3">Email Address</th>
                  <th className="px-4 py-3">Enrolled On</th>
                  <th className="px-4 py-3">Biometrics Status</th>
                  <th className="px-4 py-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#E5E9E6]">
                {filtered.map((item) => (
                  <tr key={item.id} className="hover:bg-[#F8F9F7]/50 transition-colors">
                    <td className="px-4 py-3.5 font-semibold text-[#172B4D] flex items-center gap-2.5">
                      <div className="w-7 h-7 rounded-full bg-[#172B4D] text-white flex items-center justify-center text-[10px] font-bold">
                        {item.name.substring(0, 2).toUpperCase()}
                      </div>
                      <span>{item.name}</span>
                    </td>
                    <td className="px-4 py-3.5 font-mono text-[#667085]">{item.roll}</td>
                    <td className="px-4 py-3.5 font-mono text-[#667085]">{item.email}</td>
                    <td className="px-4 py-3.5 font-mono text-[#667085]">
                      {item.enrolledAt
                        ? new Date(item.enrolledAt).toLocaleDateString([], {
                            month: "short",
                            day: "numeric",
                            year: "numeric",
                          })
                        : "—"}
                    </td>
                    <td className="px-4 py-3.5">
                      {item.biometricStatus === "both" && (
                        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-[11px] font-semibold bg-[#E6F4EA] text-[#137333] border border-[#CEEAD6]">
                          <ShieldCheck className="w-3.5 h-3.5 text-[#137333]" />
                          <span>Face & Voice Enrolled</span>
                        </span>
                      )}
                      {item.biometricStatus === "face_only" && (
                        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-[11px] font-semibold bg-[#E8F0FE] text-[#1967D2] border border-[#D2E3FC]">
                          <Camera className="w-3.5 h-3.5 text-[#1967D2]" />
                          <span>Face Only (Voice Missing)</span>
                        </span>
                      )}
                      {item.biometricStatus === "voice_only" && (
                        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-[11px] font-semibold bg-[#FEF7E0] text-[#B06000] border border-[#FEEFC3]">
                          <Mic className="w-3.5 h-3.5 text-[#B06000]" />
                          <span>Voice Only (Face Missing)</span>
                        </span>
                      )}
                      {item.biometricStatus === "none" && (
                        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-[11px] font-semibold bg-[#F1F3F4] text-[#5F6368] border border-[#DADCE0]">
                          <AlertTriangle className="w-3.5 h-3.5 text-[#5F6368]" />
                          <span>Pending Enrollment</span>
                        </span>
                      )}
                    </td>
                    <td className="px-4 py-3.5 text-right">
                      <button
                        type="button"
                        onClick={() => {
                          setTargetEnrollment(item);
                          setIsDeleteOpen(true);
                        }}
                        className="p-1.5 rounded-lg text-[#667085] hover:text-[#C2413B] hover:bg-[#FDF4F4] transition-colors"
                        title="Unenroll student"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Delete / Unenroll Confirmation */}
      <ConfirmDialog
        isOpen={isDeleteOpen}
        title="Unenroll Student"
        message={`Are you sure you want to remove ${targetEnrollment?.name} from ${className}? Their biometric attendance records for this class will be disassociated.`}
        confirmLabel="Unenroll"
        isDestructive
        onConfirm={handleUnenroll}
        onCancel={() => {
          setIsDeleteOpen(false);
          setTargetEnrollment(null);
        }}
      />
    </DashboardLayout>
  );
}
