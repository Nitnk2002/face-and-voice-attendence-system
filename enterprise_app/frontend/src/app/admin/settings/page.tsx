"use client";

import React, { useState } from "react";
import { Settings, ShieldCheck, Database, Key, Info, CheckCircle2 } from "lucide-react";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { PageHeader } from "@/components/ui/PageHeader";

export default function AdminSettingsPage() {
  const [sessionTimeout, setSessionTimeout] = useState("120");
  const [faceThreshold, setFaceThreshold] = useState("0.70");
  const [voiceThreshold, setVoiceThreshold] = useState("0.70");
  const [retentionDays, setRetentionDays] = useState("180");
  const [saved, setSaved] = useState(false);

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    setSaved(true);
    setTimeout(() => setSaved(false), 3000);
  };

  return (
    <DashboardLayout role="admin" title="System Settings">
      <PageHeader
        title="Institutional System Settings"
        description="Configure biometric sensitivity thresholds, session timeout durations, and data retention policies."
      />

      <div className="max-w-4xl space-y-6">
        {saved && (
          <div className="p-3.5 rounded-xl bg-[#F4FBF7] border border-[#CEEAD6] text-xs text-[#16845B] flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 shrink-0" />
            <span>Institutional configuration saved locally.</span>
          </div>
        )}

        <form onSubmit={handleSave} className="space-y-6">
          {/* Biometric Thresholds Card */}
          <div className="bg-white rounded-2xl border border-[#E5E9E6] p-6 shadow-2xs">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 rounded-xl bg-[#E7F3EF] text-[#176B5B] flex items-center justify-center font-bold">
                <ShieldCheck className="w-5 h-5" />
              </div>
              <div>
                <h2 className="text-base font-bold text-[#172B4D]">Biometric Consensus Thresholds</h2>
                <p className="text-xs text-[#667085]">
                  Cosine similarity cutoff scores required to verify a student present.
                </p>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold text-[#172B4D] mb-1.5">
                  Facial Match Cosine Threshold
                </label>
                <input
                  type="number"
                  step="0.05"
                  min="0.50"
                  max="0.95"
                  value={faceThreshold}
                  onChange={(e) => setFaceThreshold(e.target.value)}
                  className="w-full bg-white border border-[#D0D5DD] rounded-xl px-3.5 py-2.5 text-xs text-[#172B4D] focus:outline-none focus:border-[#176B5B]"
                />
                <span className="text-[11px] text-[#667085] mt-1 block">
                  Default: 0.70 (InsightFace ArcFace 512-D recommended).
                </span>
              </div>

              <div>
                <label className="block text-xs font-semibold text-[#172B4D] mb-1.5">
                  Voice Acoustic Cosine Threshold
                </label>
                <input
                  type="number"
                  step="0.05"
                  min="0.50"
                  max="0.95"
                  value={voiceThreshold}
                  onChange={(e) => setVoiceThreshold(e.target.value)}
                  className="w-full bg-white border border-[#D0D5DD] rounded-xl px-3.5 py-2.5 text-xs text-[#172B4D] focus:outline-none focus:border-[#176B5B]"
                />
                <span className="text-[11px] text-[#667085] mt-1 block">
                  Default: 0.70 (16kHz acoustic spectral fit).
                </span>
              </div>
            </div>
          </div>

          {/* Data Retention & Deletion Policy */}
          <div className="bg-white rounded-2xl border border-[#E5E9E6] p-6 shadow-2xs">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 rounded-xl bg-[#F8F9F7] text-[#172B4D] flex items-center justify-center font-bold">
                <Database className="w-5 h-5" />
              </div>
              <div>
                <h2 className="text-base font-bold text-[#172B4D]">Data Retention & Privacy Erasure</h2>
                <p className="text-xs text-[#667085]">
                  Automated purging policy for student biometric feature embeddings.
                </p>
              </div>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-[#172B4D] mb-1.5">
                  Biometric Retention Period (Days after Semester)
                </label>
                <input
                  type="number"
                  min="30"
                  max="365"
                  value={retentionDays}
                  onChange={(e) => setRetentionDays(e.target.value)}
                  className="w-full sm:w-64 bg-white border border-[#D0D5DD] rounded-xl px-3.5 py-2.5 text-xs text-[#172B4D] focus:outline-none focus:border-[#176B5B]"
                />
                <span className="text-[11px] text-[#667085] mt-1 block">
                  Biometric vectors will be queued for automated cryptographic erasure upon course graduation.
                </span>
              </div>

              <div className="p-3.5 rounded-xl bg-[#F8F9F7] border border-[#E5E9E6] text-xs text-[#667085] flex items-start gap-2.5">
                <Info className="w-4 h-4 text-[#8892A4] shrink-0 mt-0.5" />
                <span>
                  <strong>Implementation Notice:</strong> Automated periodic cron purging requires
                  enabling the PostgreSQL pg_cron extension on your Supabase database instance.
                </span>
              </div>
            </div>
          </div>

          <div className="flex justify-end">
            <button
              type="submit"
              className="py-3 px-6 rounded-xl bg-[#176B5B] hover:bg-[#12584A] text-white text-xs font-bold transition-all shadow-xs cursor-pointer"
            >
              Save Configuration Settings
            </button>
          </div>
        </form>
      </div>
    </DashboardLayout>
  );
}
