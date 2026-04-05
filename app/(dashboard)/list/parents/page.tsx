"use client";

import { useRouter } from "next/navigation";
import Pagination from "@/components/Pagination";
import Table from "@/components/Table";
import TableSearch from "@/components/TableSearch";
import { Filter, SlidersHorizontal, Plus, Edit, Trash2 } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/lib/supabase";
import { getDisplayName } from "@/lib/profile-utils";
import { computeRange } from "@/lib/list-query-state";
import { useListQuery } from "@/lib/use-list-query";

const columns = [
  {
    header: "Info",
    accessor: "info",
  },
  {
    header: "Student Names",
    accessor: "students",
    className: "hidden md:table-cell",
  },
  {
    header: "Phone",
    accessor: "phone",
    className: "hidden lg:table-cell",
  },
  {
    header: "Address",
    accessor: "address",
    className: "hidden lg:table-cell",
  },
  {
    header: "Actions",
    accessor: "action",
  },
];

export default function ParentList() {
  const [parentsData, setParentsData] = useState<any[]>([]);
  const [total, setTotal] = useState(0);
  const router = useRouter();
  const { page, pageSize, q, updateQuery } = useListQuery();
  const search = q || "";

  const fetchParents = async (nextPage: number, nextPageSize: number) => {
    const { data: auth } = await supabase.auth.getUser();
    const user = auth.user;
    if (!user) return;

    const { data: me } = await supabase
      .from("profiles")
      .select("school_id")
      .eq("id", user.id)
      .single();

    if (!me?.school_id) return;

    const { from, to } = computeRange(nextPage, nextPageSize);
    const { data: parents, count } = await supabase
      .from("parents")
      .select("id, profile_id, phone, relation_type", { count: "exact" })
      .eq("school_id", me.school_id)
      .range(from, to);
    setTotal(count || 0);

      const profileIds = (parents || []).map((p: any) => p.profile_id).filter(Boolean);
      const { data: parentProfiles } = profileIds.length
        ? await supabase
            .from("profiles")
            .select("id, first_name, last_name, email, phone, address")
            .in("id", profileIds)
        : { data: [] as any[] };

      const parentProfileMap = Object.fromEntries((parentProfiles || []).map((p: any) => [p.id, p]));

      const parentIds = (parents || []).map((p: any) => p.id);
      const { data: links } = parentIds.length
        ? await supabase
            .from("parent_students")
            .select("parent_id, student_id")
            .in("parent_id", parentIds)
        : { data: [] as any[] };

      const studentIds = Array.from(new Set((links || []).map((l: any) => l.student_id).filter(Boolean)));
      const { data: students } = studentIds.length
        ? await supabase
            .from("profiles")
            .select("id, first_name, last_name, email")
            .in("id", studentIds)
        : { data: [] as any[] };

      const studentMap = Object.fromEntries(
        (students || []).map((s: any) => [s.id, getDisplayName(s)])
      );

      const parentToStudents: Record<string, string[]> = {};
      (links || []).forEach((l: any) => {
        const current = parentToStudents[l.parent_id] || [];
        const name = studentMap[l.student_id];
        if (name) current.push(name);
        parentToStudents[l.parent_id] = current;
      });

    const rows = (parents || []).map((p: any) => {
      const profile = parentProfileMap[p.profile_id] || {};
      return {
        id: p.id,
        name: getDisplayName(profile),
        email: profile.email || "No email",
        students: parentToStudents[p.id] || [],
        phone: p.phone || profile.phone || "N/A",
        address: profile.address || "N/A",
      };
    });

    setParentsData(rows);
  };

  useEffect(() => {
    (async () => {
      await fetchParents(page, pageSize);
    })();
  }, [page, pageSize]);

  const renderRow = (item: any) => (
    <tr
      key={item.id}
      className="border-b border-gray-200 even:bg-slate-50 text-sm hover:bg-lamaPurpleLight"
    >
      <td className="flex items-center gap-4 p-4">
        <div className="flex flex-col">
          <h3 className="font-semibold">{item.name}</h3>
          <p className="text-xs text-gray-500">{item.email}</p>
        </div>
      </td>
      <td className="hidden md:table-cell">{item.students.join(", ") || "N/A"}</td>
      <td className="hidden lg:table-cell">{item.phone}</td>
      <td className="hidden lg:table-cell">{item.address}</td>
      <td>
        <div className="flex items-center gap-2">
          <button className="w-7 h-7 flex items-center justify-center rounded-full bg-lamaSky">
            <Edit className="w-4 h-4 text-white" />
          </button>
          <button className="w-7 h-7 flex items-center justify-center rounded-full bg-lamaPurple">
            <Trash2 className="w-4 h-4 text-white" />
          </button>
        </div>
      </td>
    </tr>
  );

  const visibleRows = useMemo(() => {
    const term = search.trim().toLowerCase();
    if (!term) return parentsData;
    return parentsData.filter((item) =>
      `${item.name || ""} ${item.email || ""} ${item.students?.join(" ") || ""}`.toLowerCase().includes(term)
    );
  }, [parentsData, search]);

  return (
    <div className="bg-white p-4 rounded-md flex-1 m-4 mt-0">
      {/* TOP */}
      <div className="flex items-center justify-between">
        <h1 className="hidden md:block text-lg font-semibold">All Parents</h1>
        <div className="flex flex-col md:flex-row items-center gap-4 w-full md:w-auto">
          <TableSearch
            value={search}
            onChange={(value) => updateQuery({ q: value, page: 1 })}
            placeholder="Search parents"
          />
          <div className="flex items-center gap-4 self-end">
            <button className="w-8 h-8 flex items-center justify-center rounded-full bg-lamaYellow">
              <Filter className="w-4 h-4 text-gray-600" />
            </button>
            <button className="w-8 h-8 flex items-center justify-center rounded-full bg-lamaYellow">
              <SlidersHorizontal className="w-4 h-4 text-gray-600" />
            </button>
            <button 
              onClick={() => router.push("/app/admin/users")}
              className="w-8 h-8 flex items-center justify-center rounded-full bg-lamaYellow"
            >
              <Plus className="w-4 h-4 text-gray-600" />
            </button>
          </div>
        </div>
      </div>
      {/* LIST */}
      <Table columns={columns} renderRow={renderRow} data={visibleRows} />
      {/* PAGINATION */}
      <Pagination
        page={page}
        pageSize={pageSize}
        total={total}
        onPageChange={(nextPage) => updateQuery({ page: nextPage })}
      />
    </div>
  );
}
