"use client";

import Pagination from "@/components/Pagination";
import Table from "@/components/Table";
import TableSearch from "@/components/TableSearch";
import { Filter, SlidersHorizontal, Plus, Edit, Trash2, MessageSquare } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/lib/supabase";
import { getDisplayName } from "@/lib/profile-utils";
import { formatDate } from "@/lib/utils";
import { useRouter } from "next/navigation";
import { computeRange } from "@/lib/list-query-state";
import { useListQuery } from "@/lib/use-list-query";

const columns = [
  {
    header: "Sender",
    accessor: "sender",
  },
  {
    header: "Subject",
    accessor: "subject",
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

export default function MessageList() {
  const [messagesData, setMessagesData] = useState<any[]>([]);
  const [total, setTotal] = useState(0);
  const router = useRouter();
  const { page, pageSize, q, updateQuery } = useListQuery();
  const search = q || "";

  useEffect(() => {
    const fetchMessages = async () => {
      const { data: auth } = await supabase.auth.getUser();
      const user = auth.user;
      if (!user) return;

      const { data: me } = await supabase
        .from("profiles")
        .select("school_id")
        .eq("id", user.id)
        .single();
      if (!me?.school_id) return;

      const { from, to } = computeRange(page, pageSize);
      const { data: rows, count } = await supabase
        .from("messages")
        .select("id, sender_id, subject, created_at", { count: "exact" })
        .eq("school_id", me.school_id)
        .order("created_at", { ascending: false })
        .range(from, to);
      setTotal(count || 0);

      const senderIds = Array.from(new Set((rows || []).map((r: any) => r.sender_id).filter(Boolean)));
      const { data: senders } = senderIds.length
        ? await supabase
            .from("profiles")
            .select("id, first_name, last_name, email")
            .in("id", senderIds)
        : { data: [] as any[] };
      const senderMap = Object.fromEntries((senders || []).map((s: any) => [s.id, getDisplayName(s)]));

      setMessagesData(
        (rows || []).map((r: any) => ({
          id: r.id,
          sender: senderMap[r.sender_id] || "Unknown Sender",
          subject: r.subject || "No subject",
          date: formatDate(r.created_at),
        }))
      );
    };
    fetchMessages();
  }, [page, pageSize]);

  const renderRow = (item: any) => (
    <tr
      key={item.id}
      className="border-b border-gray-200 even:bg-slate-50 text-sm hover:bg-lamaPurpleLight"
    >
      <td className="p-4 flex items-center gap-2">
        <MessageSquare className="w-4 h-4 text-gray-400" />
        {item.sender}
      </td>
      <td>{item.subject}</td>
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
    const q = search.trim().toLowerCase();
    if (!q) return messagesData;
    return messagesData.filter((item) =>
      `${item.sender || ""} ${item.subject || ""}`.toLowerCase().includes(q)
    );
  }, [messagesData, search]);

  return (
    <div className="bg-white p-4 rounded-md flex-1 m-4 mt-0">
      {/* TOP */}
      <div className="flex items-center justify-between">
        <h1 className="hidden md:block text-lg font-semibold">Messages</h1>
        <div className="flex flex-col md:flex-row items-center gap-4 w-full md:w-auto">
          <TableSearch
            value={search}
            onChange={(value) => {
              updateQuery({ q: value, page: 1 });
            }}
            placeholder="Search messages"
          />
          <div className="flex items-center gap-4 self-end">
            <button className="w-8 h-8 flex items-center justify-center rounded-full bg-lamaYellow">
              <Filter className="w-4 h-4 text-gray-600" />
            </button>
            <button className="w-8 h-8 flex items-center justify-center rounded-full bg-lamaYellow">
              <SlidersHorizontal className="w-4 h-4 text-gray-600" />
            </button>
            <button 
              onClick={() => router.push("/app/messages")}
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
