"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { Loader2, Megaphone } from "lucide-react";
import { formatDate } from "@/lib/utils";
import { isAbortLikeError } from "@/lib/async-guards";
import { adminApiJson } from "@/lib/admin-browser-api";

export default function Announcements() {
  const pathname = usePathname();
  const [announcements, setAnnouncements] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    const announcementsEndpoint = pathname.startsWith("/teacher")
      ? "/api/teacher/announcements?limit=3"
      : "/api/account/announcements?limit=3";

    const fetchAnnouncements = async () => {
      try {
        const body = await adminApiJson<{ data?: any[] }>(announcementsEndpoint);
        if (cancelled) return;
        setAnnouncements((body.data || []).slice(0, 3));
      } catch (err) {
        if (cancelled || isAbortLikeError(err)) return;
        console.error("Error fetching announcements:", err);
        setAnnouncements([]);
      } finally {
        if (!cancelled) setLoading(false);
      }
    };

    fetchAnnouncements();

    return () => {
      cancelled = true;
    };
  }, [pathname]);

  const viewAllHref = pathname.startsWith("/teacher")
    ? "/teacher/announcements"
    : "/app/announcements";

  return (
    <div className="bg-white p-6 rounded-[22px] shadow-sm border border-slate-100">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-2">
          <Megaphone className="w-5 h-5 text-lamaPurple" />
          <h1 className="text-[2rem] font-bold text-slate-900">Announcements</h1>
        </div>
        <Link href={viewAllHref} className="text-xs font-bold text-slate-400 transition hover:text-slate-600 hover:underline">
          View All
        </Link>
      </div>
      
      <div className="flex flex-col gap-4">
        {loading ? (
          <div className="flex justify-center p-4">
            <Loader2 className="w-6 h-6 animate-spin text-slate-300" />
          </div>
        ) : announcements.length === 0 ? (
          <div className="text-center p-8 bg-slate-50 rounded-2xl border border-dashed border-slate-200">
            <p className="text-sm text-slate-400">No recent announcements</p>
          </div>
        ) : (
          announcements.map((ann, index) => (
            <div 
              key={ann.id} 
              className={`rounded-2xl p-4 border transition-all hover:shadow-md ${
                index === 0 ? "bg-[#eef8ff] border-[#d9eefc]" : 
                index === 1 ? "bg-[#f4f1ff] border-[#e1dbff]" : 
                "bg-[#fff9e9] border-[#f8e8b1]"
              }`}
            >
              <div className="flex items-center justify-between mb-2">
                <h2 className="font-bold text-slate-800 line-clamp-1">{ann.title}</h2>
                <span className="text-[10px] font-bold text-slate-400 bg-white/90 px-2 py-1 rounded-full">
                  {formatDate(ann.date || ann.created_at)}
                </span>
              </div>
              <p className="text-xs text-slate-500 leading-relaxed line-clamp-2">
                {ann.content}
              </p>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
