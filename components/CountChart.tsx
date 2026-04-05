"use client";
import { useEffect, useMemo, useState } from "react";
import { Loader2, MoreHorizontal } from "lucide-react";
import { RadialBarChart, RadialBar, ResponsiveContainer } from "recharts";
import { useRouter } from "next/navigation";

import { isAbortLikeError } from "@/lib/async-guards";
import { getRoleVariants, loadDashboardScope } from "@/lib/dashboard-client";
import { supabase } from "@/lib/supabase";

type StudentTotals = {
  total: number;
  boys: number;
  girls: number;
  unspecified: number;
};

export default function CountChart() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [totals, setTotals] = useState<StudentTotals>({
    total: 0,
    boys: 0,
    girls: 0,
    unspecified: 0,
  });

  useEffect(() => {
    let cancelled = false;

    const loadStudentTotals = async () => {
      try {
        const scope = await loadDashboardScope();
        if (cancelled || !scope) {
          return;
        }

        const baseQuery = () =>
          supabase
            .from("profiles")
            .select("id", { count: "exact", head: true })
            .eq("school_id", scope.schoolId)
            .in("role", getRoleVariants("student"));

        const [totalResult, boysResult, girlsResult] = await Promise.all([
          baseQuery(),
          baseQuery().in("gender", ["MALE", "male"]),
          baseQuery().in("gender", ["FEMALE", "female"]),
        ]);

        if (totalResult.error) throw totalResult.error;
        if (boysResult.error) throw boysResult.error;
        if (girlsResult.error) throw girlsResult.error;
        if (cancelled) return;

        setTotals({
          total: totalResult.count || 0,
          boys: boysResult.count || 0,
          girls: girlsResult.count || 0,
          unspecified: Math.max(0, (totalResult.count || 0) - (boysResult.count || 0) - (girlsResult.count || 0)),
        });
      } catch (error) {
        if (cancelled || isAbortLikeError(error)) return;
        console.error("Error loading student count chart:", error);
        setTotals({ total: 0, boys: 0, girls: 0, unspecified: 0 });
      } finally {
        if (!cancelled) setLoading(false);
      }
    };

    void loadStudentTotals();

    return () => {
      cancelled = true;
    };
  }, []);

  const chartData = useMemo(
    () => [
      { name: "Total", count: totals.total, fill: "white" },
      { name: "Girls", count: totals.girls, fill: "#FAE27C" },
      { name: "Boys", count: totals.boys, fill: "#C3EBFA" },
      { name: "Unspecified", count: totals.unspecified, fill: "#E2E8F0" },
    ],
    [totals]
  );
  const boysRate = totals.total > 0 ? Math.round((totals.boys / totals.total) * 100) : 0;
  const girlsRate = totals.total > 0 ? Math.round((totals.girls / totals.total) * 100) : 0;

  return (
    <div className="bg-white rounded-[22px] w-full h-full min-h-[320px] p-5 flex flex-col shadow-sm border border-slate-100">
      <div className="flex justify-between items-center">
        <h1 className="text-[2rem] font-bold text-slate-900">Students</h1>
        <button
          type="button"
          onClick={() => router.push("/app/admin/users")}
          className="grid h-9 w-9 place-items-center rounded-full text-gray-400 transition hover:bg-slate-100 hover:text-slate-700"
          aria-label="Open student management"
        >
          <MoreHorizontal className="w-5 h-5" />
        </button>
      </div>
      <div className="relative w-full h-[220px] min-h-[200px] min-w-0 mt-2">
        {loading ? (
          <div className="h-full grid place-items-center">
            <Loader2 className="w-6 h-6 animate-spin text-slate-300" />
          </div>
        ) : totals.total === 0 ? (
          <div className="h-full grid place-items-center rounded-2xl border border-dashed border-slate-200 bg-slate-50 text-center px-6">
            <div>
              <p className="text-sm font-medium text-slate-600">No students yet</p>
              <p className="mt-1 text-xs text-slate-400">Student totals will appear here after enrolment data is added.</p>
            </div>
          </div>
        ) : (
          <>
            <ResponsiveContainer width="100%" height="100%" minWidth={0}>
              <RadialBarChart
                cx="50%"
                cy="48%"
                innerRadius="34%"
                outerRadius="68%"
                barSize={18}
                data={chartData}
              >
                <RadialBar background dataKey="count" />
              </RadialBarChart>
            </ResponsiveContainer>
            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 flex items-center justify-center">
              <div className="flex items-center gap-2">
                <div className="w-5 h-10 rounded-full bg-[#bde9fb]" />
                <div className="w-5 h-10 rounded-full bg-[#f9d86d]" />
              </div>
            </div>
          </>
        )}
      </div>
      <div className="mt-auto flex justify-around gap-6 pt-3">
        <div className="flex flex-col gap-1">
          <div className="w-4 h-4 bg-[#bde9fb] rounded-full" />
          <h1 className="text-[2rem] leading-none font-bold text-slate-900">{totals.boys}</h1>
          <h2 className="text-sm text-slate-300">Boys ({boysRate}%)</h2>
        </div>
        <div className="flex flex-col gap-1">
          <div className="w-4 h-4 bg-[#f9d86d] rounded-full" />
          <h1 className="text-[2rem] leading-none font-bold text-slate-900">{totals.girls}</h1>
          <h2 className="text-sm text-slate-300">Girls ({girlsRate}%)</h2>
        </div>
        <div className="flex flex-col gap-1">
          <div className="w-4 h-4 bg-slate-200 rounded-full" />
          <h1 className="text-[2rem] leading-none font-bold text-slate-900">{totals.unspecified}</h1>
          <h2 className="text-sm text-slate-300">Unknown</h2>
        </div>
      </div>
      {totals.unspecified > 0 ? (
        <p className="mt-4 rounded-2xl bg-slate-50 px-3 py-2 text-xs text-slate-500">
          {totals.unspecified} student records still have unspecified gender. Set it in user management for a cleaner boys/girls split.
        </p>
      ) : null}
    </div>
  );
}
