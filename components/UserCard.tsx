"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";
import { MoreHorizontal, Loader2 } from "lucide-react";
import { isAbortLikeError } from "@/lib/async-guards";
import { getRoleVariants, loadDashboardScope } from "@/lib/dashboard-client";

const cardTone = {
  admin: "bg-[#c9c4ff]",
  teacher: "bg-[#ffe082]",
  student: "bg-[#c9c4ff]",
  parent: "bg-[#ffe082]",
} as const;

export default function UserCard({ type }: { type: string }) {
  const [count, setCount] = useState<number | null>(null);
  const [academicLabel, setAcademicLabel] = useState("Academic Context");
  const [loading, setLoading] = useState(true);
  const router = useRouter();

  const handleClick = () => {
    router.push(`/list/${type}s`);
  };

  useEffect(() => {
    let cancelled = false;

    const fetchCount = async () => {
      try {
        const scope = await loadDashboardScope();
        if (cancelled || !scope) return;

        setAcademicLabel(scope.academicLabel);

        const { count, error } = await supabase
          .from("profiles")
          .select("id", { count: "exact", head: true })
          .eq("school_id", scope.schoolId)
          .in("role", getRoleVariants(type));

        if (error) throw error;
        if (cancelled) return;
        setCount(count);
      } catch (err) {
        if (cancelled || isAbortLikeError(err)) return;
        console.error(`Error fetching ${type} count:`, err);
        setCount(0);
      } finally {
        if (!cancelled) setLoading(false);
      }
    };

    fetchCount();

    return () => {
      cancelled = true;
    };
  }, [type]);

  return (
    <div className={`rounded-[20px] ${cardTone[type as keyof typeof cardTone] || "bg-[#dbe5ff]"} p-4 min-w-[130px] shadow-sm`}>
      <div className="flex justify-between items-center">
        <span className="text-[10px] bg-white/90 px-2 py-1 rounded-full text-emerald-500 font-bold">
          {academicLabel}
        </span>
        <button
          type="button"
          onClick={handleClick}
          title="View all"
          aria-label={`View all ${type}s`}
          className="text-white/90 hover:text-white transition-colors"
        >
          <MoreHorizontal className="w-5 h-5 cursor-pointer" />
        </button>
      </div>
      <h1 className="text-[2rem] font-bold mt-5 mb-3 text-slate-900">
        {loading ? <Loader2 className="w-6 h-6 animate-spin" /> : count?.toLocaleString() || "0"}
      </h1>
      <h2 className="capitalize text-base font-medium text-slate-500">{type}s</h2>
    </div>
  );
}
