"use client";

import BulkImport from "@/components/BulkImport";
import Table from "@/components/Table";
import TableSearch from "@/components/TableSearch";
import Pagination from "@/components/Pagination";
import EmptyState from "@/components/EmptyState";
import { Filter, SlidersHorizontal, Plus, Eye, Trash2, Users, X, Upload, Pencil } from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import { toast } from "sonner";
import { motion, AnimatePresence } from "motion/react";
import { useRouter, useSearchParams } from "next/navigation";
import { computeRange, parseQueryState } from "@/lib/list-query-state";
import { useListQuery } from "@/lib/use-list-query";

const columns = [
  {
    header: "Teacher",
    accessor: "info",
  },
  {
    header: "Employee ID",
    accessor: "employeeId",
    className: "hidden md:table-cell",
  },
  {
    header: "Subjects",
    accessor: "subjects",
    className: "hidden lg:table-cell",
  },
  {
    header: "Classes",
    accessor: "classes",
    className: "hidden lg:table-cell",
  },
  {
    header: "Status",
    accessor: "status",
    className: "hidden xl:table-cell",
  },
  {
    header: "Actions",
    accessor: "action",
  },
];

export default function TeacherList() {
  const [teachers, setTeachers] = useState<any[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [showImport, setShowImport] = useState(false);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [schoolId, setSchoolId] = useState<string | null>(null);
  const router = useRouter();
  const searchParams = useSearchParams();
  const { page, pageSize, updateQuery } = useListQuery();

  const fetchTeachers = useCallback(async () => {
    setLoading(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        setLoading(false);
        return;
      }

      // Get user's school_id
      const { data: profile } = await supabase
        .from("profiles")
        .select("school_id")
        .eq("id", user.id)
        .single();
      
      if (!profile?.school_id) {
        setLoading(false);
        return;
      }
      
      setSchoolId(profile.school_id);

      const { from, to } = computeRange(page, pageSize);
      let query = supabase
        .from("profiles")
        .select("*", { count: "exact" })
        .eq("school_id", profile.school_id)
        .eq("role", "TEACHER")
        .order("created_at", { ascending: false })
        .range(from, to);

      if (statusFilter) {
        query = query.eq("status", statusFilter);
      }

      const { data, error, count } = await query;

      if (error) throw error;
      setTotal(count || 0);
      
      setTeachers(
        (data || []).map((item: any) => ({
          ...item,
          name:
            [item.first_name, item.last_name].filter(Boolean).join(" ").trim() ||
            item.email ||
            "Unnamed Teacher",
        }))
      );
    } catch (err) {
      console.error("Error fetching teachers:", err);
      setTeachers([]);
    } finally {
      setLoading(false);
    }
  }, [page, pageSize, statusFilter]);

  useEffect(() => {
    fetchTeachers();
  }, [fetchTeachers]);

  useEffect(() => {
    const qs = parseQueryState(searchParams);
    setSearch(qs.q || "");
    setStatusFilter(qs.status || "");
  }, [searchParams]);

  const handleDelete = async (id: string) => {
    if (!confirm("Are you sure you want to delete this teacher? This action cannot be undone.")) return;

    const loadingToast = toast.loading("Deleting teacher...");
    try {
      const { error } = await supabase.from("profiles").delete().eq("id", id);
      if (error) throw error;
      toast.success("Teacher deleted successfully", { id: loadingToast });
      fetchTeachers();
    } catch (error: any) {
      toast.error(error.message || "Failed to delete teacher", { id: loadingToast });
    }
  };

  const visibleTeachers = teachers.filter((item) => {
    const q = search.trim().toLowerCase();
    if (!q) return true;
    return `${item.name} ${item.email || ""} ${item.employee_id || ""}`.toLowerCase().includes(q);
  });

  const renderRow = (item: any) => (
    <tr
      key={item.id}
      className="border-b border-slate-100 even:bg-slate-50/50 text-sm hover:bg-lamaSkyLight/50 transition-colors"
    >
      <td className="flex items-center gap-4 p-4">
        <div className="w-10 h-10 rounded-full overflow-hidden border border-slate-200">
          <Image
            src={item.photo || item.avatar_url || "/avatar-placeholder.svg"}
            alt=""
            width={40}
            height={40}
            className="w-full h-full object-cover"
            referrerPolicy="no-referrer"
          />
        </div>
        <div className="flex flex-col">
          <h3 className="font-bold text-slate-700">{item.name}</h3>
          <p className="text-[10px] text-slate-400 font-medium">{item.email}</p>
        </div>
      </td>
      <td className="hidden md:table-cell text-slate-500 font-medium">{item.employee_id || "EMP-" + item.id.slice(0,4)}</td>
      <td className="hidden lg:table-cell text-slate-500">{item.subjects?.join(", ") || "General"}</td>
      <td className="hidden lg:table-cell text-slate-500">{item.classes?.join(", ") || "N/A"}</td>
      <td className="hidden xl:table-cell">
        <span className={`px-2 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider ${
          item.status === 'ACTIVE' ? 'bg-green-100 text-green-700' : 
          item.status === 'INACTIVE' ? 'bg-slate-100 text-slate-500' : 
          'bg-yellow-100 text-yellow-700'
        }`}>
          {item.status || "ACTIVE"}
        </span>
      </td>
      <td>
        <div className="flex items-center gap-2">
          <Link href={`/list/teachers/${item.id}`}>
            <button className="w-8 h-8 flex items-center justify-center rounded-xl bg-lamaSky/10 hover:bg-lamaSky transition-all group">
              <Eye className="w-4 h-4 text-lamaSky group-hover:text-white" />
            </button>
          </Link>
          <button 
            onClick={() => router.push(`/app/admin/users?tab=teachers&edit=${item.id}`)}
            className="w-8 h-8 flex items-center justify-center rounded-xl bg-amber-50 hover:bg-amber-500 transition-all group"
            title="Edit teacher"
          >
            <Pencil className="w-4 h-4 text-amber-600 group-hover:text-white" />
          </button>
          <button 
            onClick={() => handleDelete(item.id)}
            className="w-8 h-8 flex items-center justify-center rounded-xl bg-red-50 hover:bg-red-500 transition-all group"
          >
            <Trash2 className="w-4 h-4 text-red-500 group-hover:text-white" />
          </button>
        </div>
      </td>
    </tr>
  );

  return (
    <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100 flex-1">
      {/* TOP */}
      <div className="flex flex-col md:flex-row items-center justify-between gap-4 mb-8">
        <h1 className="text-2xl font-bold text-slate-800 self-start md:self-center">Teachers</h1>
        <div className="flex flex-col sm:flex-row items-center gap-4 w-full md:w-auto">
          <TableSearch
            value={search}
            onChange={(value) => {
              setSearch(value);
              updateQuery({ q: value, page: 1 });
            }}
            placeholder="Search teachers"
          />
          <div className="flex items-center gap-3 self-end sm:self-center">
            <div className="flex items-center gap-2 rounded-xl border border-slate-100 bg-slate-50 px-2 h-10">
              <Filter className="w-4 h-4 text-slate-500" />
              <select
                value={statusFilter}
                onChange={(e) => {
                  const value = e.target.value;
                  setStatusFilter(value);
                  updateQuery({ status: value, page: 1 });
                }}
                className="bg-transparent text-xs outline-none"
              >
                <option value="">All</option>
                <option value="ACTIVE">Active</option>
                <option value="INACTIVE">Inactive</option>
              </select>
            </div>
            <button 
              disabled
              title="Advanced filters coming soon"
              className="w-10 h-10 flex items-center justify-center rounded-xl bg-slate-50 hover:bg-slate-100 transition-colors border border-slate-100 cursor-not-allowed opacity-60"
            >
              <SlidersHorizontal className="w-4 h-4 text-slate-500" />
            </button>
            <button 
              onClick={() => setShowImport(!showImport)}
              className={`w-10 h-10 flex items-center justify-center rounded-xl transition-all shadow-lg ${
                showImport ? "bg-slate-800 text-white shadow-slate-800/20" : "bg-lamaPurple text-white shadow-lamaPurple/20"
              }`}
              title="Bulk Import"
            >
              {showImport ? <X className="w-5 h-5" /> : <Upload className="w-5 h-5" />}
            </button>
            <button 
              onClick={() => router.push("/app/admin/users")}
              className="w-10 h-10 flex items-center justify-center rounded-xl bg-lamaSky text-white hover:bg-opacity-90 transition-all shadow-lg shadow-lamaSky/20"
            >
              <Plus className="w-5 h-5" />
            </button>
          </div>
        </div>
      </div>

      <AnimatePresence>
        {showImport && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="overflow-hidden mb-8"
          >
            <BulkImport role="TEACHER" onComplete={() => {
              setShowImport(false);
              fetchTeachers();
            }} />
          </motion.div>
        )}
      </AnimatePresence>

      {/* LIST */}
      {loading ? (
        <div className="flex flex-col items-center justify-center p-20 gap-4">
          <div className="w-12 h-12 border-4 border-lamaSky/20 border-t-lamaSky rounded-full animate-spin" />
          <p className="text-slate-400 font-medium">Loading teacher records...</p>
        </div>
      ) : visibleTeachers.length === 0 ? (
        <EmptyState
          icon={Users}
          title="No Teachers Found"
          description="You haven't added any teachers to your school yet. Start by adding your first faculty member."
          actionLabel="Add Teacher"
          onAction={() => router.push("/app/admin/users")}
        />
      ) : (
        <div className="overflow-x-auto">
          <Table columns={columns} renderRow={renderRow} data={visibleTeachers} />
        </div>
      )}

      {/* PAGINATION */}
      <div className="mt-8">
        <Pagination
          page={page}
          pageSize={pageSize}
          total={total}
          onPageChange={(nextPage) => updateQuery({ page: nextPage })}
        />
      </div>
    </div>
  );
}
