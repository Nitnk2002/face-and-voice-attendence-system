"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import { Plus, Users, Search, Trash2, Edit, ShieldAlert } from "lucide-react";
import { supabase } from "@/lib/supabase";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { PageHeader } from "@/components/ui/PageHeader";
import { SearchInput } from "@/components/ui/SearchInput";
import { EmptyState } from "@/components/ui/EmptyState";
import { ConfirmDialog } from "@/components/ui/ConfirmDialog";

export default function AdminUsersPage() {
  const [users, setUsers] = useState<any[]>([]);
  const [search, setSearch] = useState("");
  const [roleFilter, setRoleFilter] = useState("all");
  const [loading, setLoading] = useState(true);

  // Delete State
  const [targetUser, setTargetUser] = useState<any | null>(null);
  const [isDeleteOpen, setIsDeleteOpen] = useState(false);

  useEffect(() => {
    fetchUsers();
  }, []);

  const fetchUsers = async () => {
    setLoading(true);
    try {
      const { data } = await supabase
        .from("users")
        .select("id, name, email, role, custom_id, created_at")
        .order("created_at", { ascending: false });

      setUsers(data || []);
    } catch {
      // Fallback
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteUser = async () => {
    if (!targetUser) return;

    try {
      const { error } = await supabase.from("users").delete().eq("id", targetUser.id);
      if (error) throw error;

      setUsers((prev) => prev.filter((u) => u.id !== targetUser.id));
      setIsDeleteOpen(false);
      setTargetUser(null);
    } catch {
      alert("Failed to delete user.");
    }
  };

  const filtered = users.filter((u) => {
    const matchesRole = roleFilter === "all" || u.role === roleFilter;
    const matchesSearch =
      u.name.toLowerCase().includes(search.toLowerCase()) ||
      u.email.toLowerCase().includes(search.toLowerCase()) ||
      (u.custom_id || "").toLowerCase().includes(search.toLowerCase());
    return matchesRole && matchesSearch;
  });

  return (
    <DashboardLayout role="admin" title="User Management">
      <PageHeader
        title="Campus User Directory"
        description="Manage faculty, student, and administrator accounts, roles, and institutional credentials."
        action={
          <Link
            href="/admin/users/new"
            className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-[#176B5B] hover:bg-[#12584A] text-white text-xs font-bold shadow-xs transition-colors"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Create User Account</span>
          </Link>
        }
      />

      {/* Filter Row */}
      <div className="bg-white rounded-2xl border border-[#E5E9E6] p-4 mb-6 shadow-2xs flex flex-col sm:flex-row items-center justify-between gap-4">
        <div className="flex flex-wrap items-center gap-3 w-full sm:w-auto">
          <SearchInput
            placeholder="Search by name, email, or ID..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full sm:w-72"
          />

          <select
            value={roleFilter}
            onChange={(e) => setRoleFilter(e.target.value)}
            className="bg-[#F8F9F7] border border-[#D0D5DD] rounded-xl px-3 py-2 text-xs font-semibold text-[#172B4D] focus:outline-none focus:border-[#176B5B]"
          >
            <option value="all">All Roles</option>
            <option value="student">Students</option>
            <option value="teacher">Faculty / Teachers</option>
            <option value="admin">Administrators</option>
          </select>
        </div>

        <div className="text-xs text-[#667085]">
          Total Users: <strong>{filtered.length}</strong>
        </div>
      </div>

      <div className="bg-white rounded-2xl border border-[#E5E9E6] p-6 shadow-2xs">
        {loading ? (
          <div className="py-12 text-center text-xs text-[#667085]">Loading user directory...</div>
        ) : filtered.length === 0 ? (
          <EmptyState
            title="No Users Found"
            description="No user accounts match your filter criteria."
            actionText="Create New User"
            actionHref="/admin/users/new"
          />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-[#F8F9F7] text-[#667085] uppercase border-y border-[#E5E9E6] font-semibold">
                <tr>
                  <th className="px-4 py-3">Full Name</th>
                  <th className="px-4 py-3">Email Address</th>
                  <th className="px-4 py-3">Role</th>
                  <th className="px-4 py-3">Enrollment / Employee ID</th>
                  <th className="px-4 py-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#E5E9E6]">
                {filtered.map((user) => (
                  <tr key={user.id} className="hover:bg-[#F8F9F7]/50 transition-colors">
                    <td className="px-4 py-3.5 font-semibold text-[#172B4D] flex items-center gap-2.5">
                      <div className="w-7 h-7 rounded-full bg-[#172B4D] text-white flex items-center justify-center text-[10px] font-bold">
                        {user.name.substring(0, 2).toUpperCase()}
                      </div>
                      <span>{user.name}</span>
                    </td>
                    <td className="px-4 py-3.5 font-mono text-[#667085]">{user.email}</td>
                    <td className="px-4 py-3.5 capitalize">
                      <span
                        className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                          user.role === "admin"
                            ? "bg-purple-100 text-purple-700"
                            : user.role === "teacher"
                            ? "bg-blue-100 text-blue-700"
                            : "bg-emerald-100 text-emerald-700"
                        }`}
                      >
                        {user.role}
                      </span>
                    </td>
                    <td className="px-4 py-3.5 font-mono text-[#667085]">
                      {user.custom_id || "—"}
                    </td>
                    <td className="px-4 py-3.5 text-right flex items-center justify-end gap-2">
                      <Link
                        href={`/admin/users/${user.id}`}
                        className="p-1 rounded-md text-[#667085] hover:text-[#172B4D] hover:bg-[#F8F9F7]"
                        title="Edit User"
                      >
                        <Edit className="w-4 h-4" />
                      </Link>
                      {user.role !== "admin" && (
                        <button
                          type="button"
                          onClick={() => {
                            setTargetUser(user);
                            setIsDeleteOpen(true);
                          }}
                          className="p-1 rounded-md text-[#667085] hover:text-[#C2413B] hover:bg-[#FDF4F4]"
                          title="Delete User"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      )}
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
        title="Delete User Account"
        message={`Are you sure you want to permanently delete ${targetUser?.name} (${targetUser?.email})? All associated classroom enrollments and attendance records will be removed.`}
        confirmLabel="Delete User"
        isDestructive
        onConfirm={handleDeleteUser}
        onCancel={() => {
          setIsDeleteOpen(false);
          setTargetUser(null);
        }}
      />
    </DashboardLayout>
  );
}
