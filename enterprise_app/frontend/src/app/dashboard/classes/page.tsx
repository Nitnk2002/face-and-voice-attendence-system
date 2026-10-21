"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import { Plus, Layers, Users, Search, ArrowRight, ExternalLink } from "lucide-react";
import { supabase } from "@/lib/supabase";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { PageHeader } from "@/components/ui/PageHeader";
import { SearchInput } from "@/components/ui/SearchInput";
import { EmptyState } from "@/components/ui/EmptyState";

export default function ClassroomsPage() {
  const [classes, setClasses] = useState<any[]>([]);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);

  // New Class Modal
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [newClassName, setNewClassName] = useState("");
  const [isCreating, setIsCreating] = useState(false);

  useEffect(() => {
    fetchClasses();
  }, []);

  const fetchClasses = async () => {
    setLoading(true);
    try {
      const { data: classList } = await supabase
        .from("classes")
        .select("id, class_name, join_code, created_at");

      const list = classList || [];

      // Fetch student counts for each class
      const classesWithCounts = await Promise.all(
        list.map(async (c: any) => {
          const { count } = await supabase
            .from("enrollments")
            .select("*", { count: "exact", head: true })
            .eq("class_id", c.id);

          return {
            ...c,
            studentCount: count || 0,
          };
        })
      );

      setClasses(classesWithCounts);
    } catch {
      // Fallback
    } finally {
      setLoading(false);
    }
  };

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newClassName.trim()) return;

    setIsCreating(true);
    try {
      const code = "CS-" + Math.floor(100 + Math.random() * 900);
      const { error } = await supabase.from("classes").insert({
        class_name: newClassName.trim(),
        join_code: code,
      });

      if (error) throw error;

      setIsModalOpen(false);
      setNewClassName("");
      await fetchClasses();
    } catch {
      alert("Could not create class.");
    } finally {
      setIsCreating(false);
    }
  };

  const filtered = classes.filter((c) =>
    c.class_name.toLowerCase().includes(search.toLowerCase()) ||
    c.join_code.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <DashboardLayout role="teacher" title="Classrooms">
      <PageHeader
        title="Classroom Directory"
        description="Manage assigned course sections, enrollment join codes, and student rosters."
        action={
          <button
            onClick={() => setIsModalOpen(true)}
            className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-[#176B5B] hover:bg-[#12584A] text-white text-xs font-bold shadow-xs transition-colors"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Create Classroom</span>
          </button>
        }
      />

      {/* Filter / Search Bar */}
      <div className="mb-6 flex flex-col sm:flex-row items-center justify-between gap-4">
        <SearchInput
          placeholder="Search by class name or join code..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="w-full sm:w-80"
        />
        <div className="text-xs text-[#667085]">
          Showing <strong>{filtered.length}</strong> of {classes.length} classes
        </div>
      </div>

      {/* Classroom Cards Grid */}
      {loading ? (
        <div className="py-12 text-center text-xs text-[#667085]">Loading classrooms...</div>
      ) : filtered.length === 0 ? (
        <EmptyState
          title="No Classrooms Found"
          description="Create your first classroom section to generate join codes and start tracking attendance."
          actionText="Create Class"
          onAction={() => setIsModalOpen(true)}
        />
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filtered.map((item) => (
            <div
              key={item.id}
              className="bg-white rounded-2xl border border-[#E5E9E6] p-6 shadow-2xs hover:shadow-sm hover:border-[#176B5B] transition-all flex flex-col justify-between"
            >
              <div>
                <div className="flex items-center justify-between mb-4">
                  <div className="w-10 h-10 rounded-xl bg-[#E7F3EF] text-[#176B5B] flex items-center justify-center font-bold text-xs">
                    <Layers className="w-5 h-5" />
                  </div>
                  <span className="font-mono text-xs font-bold text-[#176B5B] bg-[#E7F3EF] px-2.5 py-1 rounded-md">
                    {item.join_code}
                  </span>
                </div>

                <h3 className="text-base font-bold text-[#172B4D] mb-1">{item.class_name}</h3>
                <div className="flex items-center gap-1.5 text-xs text-[#667085] mb-5">
                  <Users className="w-3.5 h-3.5" />
                  <span>{item.studentCount} enrolled students</span>
                </div>
              </div>

              <div className="pt-4 border-t border-[#E5E9E6] flex items-center justify-between">
                <Link
                  href={`/dashboard/classes/${item.id}`}
                  className="text-xs font-semibold text-[#176B5B] hover:underline flex items-center gap-1"
                >
                  <span>View Details</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </Link>

                <Link
                  href="/dashboard/take-attendance"
                  className="text-xs font-semibold text-[#172B4D] hover:text-[#176B5B] flex items-center gap-1"
                >
                  <span>Kiosk</span>
                  <ExternalLink className="w-3 h-3" />
                </Link>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-xs">
          <div className="bg-white rounded-2xl border border-[#D0D5DD] p-6 max-w-md w-full shadow-xl">
            <h3 className="text-base font-bold text-[#172B4D] mb-1">Add Classroom</h3>
            <p className="text-xs text-[#667085] mb-5">
              Enter the course name. A unique student enrollment code will be generated.
            </p>

            <form onSubmit={handleCreate} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-[#172B4D] mb-1.5">
                  Classroom Title
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. CS201: Data Structures"
                  value={newClassName}
                  onChange={(e) => setNewClassName(e.target.value)}
                  className="w-full bg-white border border-[#D0D5DD] rounded-xl px-3.5 py-2.5 text-xs text-[#172B4D] focus:outline-none focus:border-[#176B5B] focus:ring-1 focus:ring-[#176B5B]"
                />
              </div>

              <div className="flex justify-end gap-2.5 pt-2">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2 rounded-xl border border-[#D0D5DD] text-xs font-semibold text-[#667085] hover:bg-[#F8F9F7]"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isCreating}
                  className="px-4 py-2 rounded-xl bg-[#176B5B] hover:bg-[#12584A] text-white text-xs font-bold"
                >
                  {isCreating ? "Saving..." : "Create Classroom"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </DashboardLayout>
  );
}
