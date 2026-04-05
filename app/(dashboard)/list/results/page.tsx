"use client";

import Pagination from "@/components/Pagination";
import Table from "@/components/Table";
import TableSearch from "@/components/TableSearch";
import { Filter, SlidersHorizontal, Plus, Edit, Trash2 } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";
import { getDisplayName } from "@/lib/profile-utils";
import { formatDate } from "@/lib/utils";
import { computeRange } from "@/lib/list-query-state";
import { useListQuery } from "@/lib/use-list-query";

const columns = [
  {
    header: "Subject Name",
    accessor: "name",
  },
  {
    header: "Student",
    accessor: "student",
  },
  {
    header: "Score",
    accessor: "score",
    className: "hidden md:table-cell",
  },
  {
    header: "Teacher",
    accessor: "teacher",
    className: "hidden md:table-cell",
  },
  {
    header: "Class",
    accessor: "class",
    className: "hidden md:table-cell",
  },
  {
    header: "Date",
    accessor: "date",
    className: "hidden md:table-cell",
  },
  {
    header: "Actions",
    accessor: "action",
  },
];

export default function ResultList() {
  const [resultsData, setResultsData] = useState<any[]>([]);
  const [total, setTotal] = useState(0);
  const router = useRouter();
  const { page, pageSize, q, updateQuery } = useListQuery();
  const search = q || "";

  const fetchResults = async (nextPage: number, nextPageSize: number) => {
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
    const { data: rows, count } = await supabase
      .from("results")
      .select("id, student_id, exam_id, score, grade, remarks, created_at", { count: "exact" })
      .eq("school_id", me.school_id)
      .order("created_at", { ascending: false })
      .range(from, to);
    setTotal(count || 0);

      const studentIds = Array.from(new Set((rows || []).map((r: any) => r.student_id).filter(Boolean)));
      const examIds = Array.from(new Set((rows || []).map((r: any) => r.exam_id).filter(Boolean)));

      const { data: students } = studentIds.length
        ? await supabase
            .from("profiles")
            .select("id, first_name, last_name, email")
            .in("id", studentIds)
        : { data: [] as any[] };

      const { data: exams } = examIds.length
        ? await supabase
            .from("exams")
            .select("id, title, class_id, subject_id")
            .in("id", examIds)
        : { data: [] as any[] };

      const classIds = Array.from(new Set((exams || []).map((e: any) => e.class_id).filter(Boolean)));
      const subjectIds = Array.from(new Set((exams || []).map((e: any) => e.subject_id).filter(Boolean)));

      const { data: classes } = classIds.length
        ? await supabase.from("classes").select("id, name").in("id", classIds)
        : { data: [] as any[] };
      const { data: subjects } = subjectIds.length
        ? await supabase.from("subjects").select("id, name").in("id", subjectIds)
        : { data: [] as any[] };

      const studentMap = Object.fromEntries((students || []).map((s: any) => [s.id, getDisplayName(s)]));
      const examMap = Object.fromEntries((exams || []).map((e: any) => [e.id, e]));
      const classMap = Object.fromEntries((classes || []).map((c: any) => [c.id, c.name]));
      const subjectMap = Object.fromEntries((subjects || []).map((s: any) => [s.id, s.name]));

    setResultsData(
      (rows || []).map((r: any) => {
        const exam = examMap[r.exam_id] || {};
        return {
          id: r.id,
          subject: subjectMap[exam.subject_id] || "Subject",
          student: studentMap[r.student_id] || "Unknown Student",
          score: r.score,
          teacher: "-",
          class: classMap[exam.class_id] || "-",
          date: formatDate(r.created_at),
        };
      })
    );
  };

  useEffect(() => {
    (async () => {
      await fetchResults(page, pageSize);
    })();
  }, [page, pageSize]);

  const renderRow = (item: any) => (
    <tr
      key={item.id}
      className="border-b border-gray-200 even:bg-slate-50 text-sm hover:bg-lamaPurpleLight"
    >
      <td className="p-4">{item.subject}</td>
      <td>{item.student}</td>
      <td className="hidden md:table-cell">{item.score}</td>
      <td className="hidden md:table-cell">{item.teacher}</td>
      <td className="hidden md:table-cell">{item.class}</td>
      <td className="hidden md:table-cell">{item.date}</td>
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
    if (!term) return resultsData;
    return resultsData.filter((item) =>
      `${item.subject || ""} ${item.student || ""} ${item.class || ""}`.toLowerCase().includes(term)
    );
  }, [resultsData, search]);

  return (
    <div className="bg-white p-4 rounded-md flex-1 m-4 mt-0">
      {/* TOP */}
      <div className="flex items-center justify-between">
        <h1 className="hidden md:block text-lg font-semibold">All Results</h1>
        <div className="flex flex-col md:flex-row items-center gap-4 w-full md:w-auto">
          <TableSearch
            value={search}
            onChange={(value) => updateQuery({ q: value, page: 1 })}
            placeholder="Search results"
          />
          <div className="flex items-center gap-4 self-end">
            <button className="w-8 h-8 flex items-center justify-center rounded-full bg-lamaYellow">
              <Filter className="w-4 h-4 text-gray-600" />
            </button>
            <button className="w-8 h-8 flex items-center justify-center rounded-full bg-lamaYellow">
              <SlidersHorizontal className="w-4 h-4 text-gray-600" />
            </button>
            <button 
              onClick={() => router.push("/app/teacher")}
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
