"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import { Plus, Building2, Search, Trash2, Edit, Users, ArrowRight } from "lucide-react";
import { supabase } from "@/lib/supabase";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { PageHeader } from "@/components/ui/PageHeader";
import { SearchInput } from "@/components/ui/SearchInput";
import { EmptyState } from "@/components/ui/EmptyState";
import { ConfirmDialog } from "@/components/ui/ConfirmDialog";

export default function AdminClassesPage() {
  const [classes, setClasses] = useState<any[]>([]);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);

  // Delete State
  const [targetClass, setTargetClass] = useState<any | null>(null);
  const [isDeleteOpen, setIsDeleteOpen] = useState(false);

  useEffect(() => {
    fetchClasses();
  }, []);

  const fetchClasses = async () => {
    setLoading(true);
    try {
      const { data: cls } = await supabase
        .from("classes")
        .select(`
          id,
          class_name,
          join_code,
          created_at,
          teacher_id,
          users:teacher_id ( id, name, email, custom_id )
        `);
      const list = cls || [];

      // Fetch student count for each class
      const enriched = await Promise.all(
        list.map(async (c: any) => {
          const { count } = await supabase
            .from("enrollments")
            .select("*", { count: "exact", head: true })
            .eq("class_id", c.id);

          const teacher = Array.isArray(c.users) ? c.users[0] : c.users;

          return {
            ...c,
            teacher,
            studentCount: count || 0,
          };
        })
      );

      setClasses(enriched);
    } catch {
      // Fallback
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteClass = async () => {
    if (!targetClass) return;

    try {
      const { error } = await supabase.from("classes").delete().eq("id", targetClass.id);
      if (error) throw error;

      setClasses((prev) => prev.filter((c) => c.id !== targetClass.id));
      setIsDeleteOpen(false);
      setTargetClass(null);
    } catch {
      alert("Failed to delete classroom.");
    }
  };

  const filtered = classes.filter(
    (c) =>
      c.class_name.toLowerCase().includes(search.toLowerCase()) ||
      c.join_code.toLowerCase().includes(search.toLowerCase()) ||
      (c.teacher?.name && c.teacher.name.toLowerCase().includes(search.toLowerCase())) ||
      (c.teacher?.email && c.teacher.email.toLowerCase().includes(search.toLowerCase()))
  );

  return (
    <DashboardLayout role="admin" title="Classrooms">
      <PageHeader
        title="Classroom Management"
        description="Oversee institutional course sections, student enrollment codes, and departmental classes."
        action={
          <Link
            href="/admin/classes/new"
            className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-[#176B5B] hover:bg-[#12584A] text-white text-xs font-bold shadow-xs transition-colors"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Create Classroom</span>
          </Link>
        }
      />

      <div className="bg-white rounded-2xl border border-[#E5E9E6] p-4 mb-6 shadow-2xs flex flex-col sm:flex-row items-center justify-between gap-4">
        <SearchInput
          placeholder="Search by class name or join code..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="w-full sm:w-80"
        />
        <div className="text-xs text-[#667085]">
          Active Classrooms: <strong>{filtered.length}</strong>
        </div>
      </div>

      <div className="bg-white rounded-2xl border border-[#E5E9E6] p-6 shadow-2xs">
        {loading ? (
          <div className="py-12 text-center text-xs text-[#667085]">Loading classrooms...</div>
        ) : filtered.length === 0 ? (
          <EmptyState
            title="No Classrooms Found"
            description="Create your first classroom to begin managing course sections."
            actionText="Create Classroom"
            actionHref="/admin/classes/new"
          />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-[#F8F9F7] text-[#667085] uppercase border-y border-[#E5E9E6] font-semibold">
                <tr>
                  <th className="px-4 py-3">Classroom Title</th>
                  <th className="px-4 py-3">Join Code</th>
                  <th className="px-4 py-3">Faculty Lead</th>
                  <th className="px-4 py-3">Enrolled Students</th>
                  <th className="px-4 py-3">Created Date</th>
                  <th className="px-4 py-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#E5E9E6]">
                {filtered.map((cls) => (
                  <tr key={cls.id} className="hover:bg-[#F8F9F7]/50 transition-colors">
                    <td className="px-4 py-3.5 font-semibold text-[#172B4D]">
                      {cls.class_name}
                    </td>
                    <td className="px-4 py-3.5 font-mono text-[#176B5B] font-bold">
                      {cls.join_code}
                    </td>
                    <td className="px-4 py-3.5">
                      {cls.teacher ? (
                        <div>
                          <div className="font-semibold text-[#172B4D]">
                            {cls.teacher.name}
                          </div>
                          <div className="text-[11px] text-[#667085] font-mono">
                            {cls.teacher.email}
                          </div>
                        </div>
                      ) : (
                        <span className="inline-flex items-center px-2 py-0.5 rounded text-[11px] font-medium bg-[#F1F3F4] text-[#5F6368] border border-[#DADCE0]">
                          Unassigned
                        </span>
                      )}
                    </td>
                    <td className="px-4 py-3.5 text-[#667085]">
                      <span className="inline-flex items-center gap-1.5 font-medium">
                        <Users className="w-3.5 h-3.5 text-[#8892A4]" />
                        <span>{cls.studentCount} students</span>
                      </span>
                    </td>
                    <td className="px-4 py-3.5 text-[#667085]">
                      {new Date(cls.created_at).toLocaleDateString()}
                    </td>
                    <td className="px-4 py-3.5 text-right flex items-center justify-end gap-2">
                      <Link
                        href={`/admin/classes/${cls.id}`}
                        className="p-1 rounded-md text-[#667085] hover:text-[#172B4D] hover:bg-[#F8F9F7]"
                        title="Edit Class"
                      >
                        <Edit className="w-4 h-4" />
                      </Link>
                      <button
                        type="button"
                        onClick={() => {
                          setTargetClass(cls);
                          setIsDeleteOpen(true);
                        }}
                        className="p-1 rounded-md text-[#667085] hover:text-[#C2413B] hover:bg-[#FDF4F4]"
                        title="Delete Class"
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

      <ConfirmDialog
        isOpen={isDeleteOpen}
        title="Delete Classroom"
        message={`Are you sure you want to permanently delete "${targetClass?.class_name}"? All associated attendance sessions and student enrollments will be deleted.`}
        confirmLabel="Delete Classroom"
        isDestructive
        onConfirm={handleDeleteClass}
        onCancel={() => {
          setIsDeleteOpen(false);
          setTargetClass(null);
        }}
      />
    </DashboardLayout>
  );
}
