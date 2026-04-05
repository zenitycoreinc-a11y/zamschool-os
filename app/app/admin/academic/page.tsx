"use client";

import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/lib/supabase";
import { Calendar, Loader2, Plus, Save, Trash2 } from "lucide-react";
import { toast } from "sonner";

type YearRow = Record<string, any>;
type TermRow = Record<string, any>;

const YEAR_TABLE_CANDIDATES = ["academic_years", "school_years", "years"];
const TERM_TABLE_CANDIDATES = ["terms", "academic_terms"];

export default function AdminAcademicPage() {
  const [loading, setLoading] = useState(true);
  const [savingYear, setSavingYear] = useState(false);
  const [savingTerm, setSavingTerm] = useState(false);

  const [schoolId, setSchoolId] = useState<string | null>(null);
  const [yearTable, setYearTable] = useState<string | null>(null);
  const [termTable, setTermTable] = useState<string | null>(null);

  const [years, setYears] = useState<YearRow[]>([]);
  const [terms, setTerms] = useState<TermRow[]>([]);

  const [newYear, setNewYear] = useState({ name: "", start_date: "", end_date: "" });
  const [newTerm, setNewTerm] = useState({ name: "", start_date: "", end_date: "", academic_year_id: "" });

  const yearNameKey = useMemo(() => inferKey(years, ["name", "title", "label", "year_name"], "name"), [years]);
  const yearStartKey = useMemo(() => inferKey(years, ["start_date", "starts_at", "start"], "start_date"), [years]);
  const yearEndKey = useMemo(() => inferKey(years, ["end_date", "ends_at", "end"], "end_date"), [years]);
  const yearActiveKey = useMemo(() => inferKey(years, ["is_active", "active", "is_current"], "is_active"), [years]);

  const termNameKey = useMemo(() => inferKey(terms, ["name", "title", "label", "term_name"], "name"), [terms]);
  const termStartKey = useMemo(() => inferKey(terms, ["start_date", "starts_at", "start"], "start_date"), [terms]);
  const termEndKey = useMemo(() => inferKey(terms, ["end_date", "ends_at", "end"], "end_date"), [terms]);
  const termActiveKey = useMemo(() => inferKey(terms, ["is_active", "active", "is_current"], "is_active"), [terms]);
  const termYearFkKey = useMemo(
    () => inferKey(terms, ["academic_year_id", "year_id", "school_year_id"], "academic_year_id"),
    [terms]
  );

  useEffect(() => {
    const init = async () => {
      setLoading(true);
      try {
        const { data: auth } = await supabase.auth.getUser();
        if (!auth.user) throw new Error("No active session");

        const { data: me, error: meErr } = await supabase
          .from("profiles")
          .select("school_id")
          .eq("id", auth.user.id)
          .maybeSingle();
        if (meErr) throw meErr;
        if (!me?.school_id) throw new Error("No school linked to this account");
        setSchoolId(me.school_id);

        const resolvedYearTable = await resolveTable(YEAR_TABLE_CANDIDATES);
        const resolvedTermTable = await resolveTable(TERM_TABLE_CANDIDATES);
        setYearTable(resolvedYearTable);
        setTermTable(resolvedTermTable);

        if (!resolvedYearTable || !resolvedTermTable) {
          throw new Error("Academic tables not found. Create academic_years and terms tables first.");
        }

        await loadData(me.school_id, resolvedYearTable, resolvedTermTable);
      } catch (err: any) {
        toast.error(err?.message || "Failed to initialize academic module");
      } finally {
        setLoading(false);
      }
    };

    init();
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const loadData = async (sid: string, yTable: string, tTable: string) => {
    const { data: yRows, error: yErr } = await supabase.from(yTable).select("*").order("created_at", { ascending: false });
    if (yErr) throw yErr;

    const { data: tRows, error: tErr } = await supabase.from(tTable).select("*").order("created_at", { ascending: false });
    if (tErr) throw tErr;

    const yearsFiltered = (yRows || []).filter((r: any) => !r.school_id || r.school_id === sid);
    const termsFiltered = (tRows || []).filter((r: any) => !r.school_id || r.school_id === sid);

    setYears(yearsFiltered);
    setTerms(termsFiltered);

    if (yearsFiltered.length > 0 && !newTerm.academic_year_id) {
      setNewTerm((prev) => ({ ...prev, academic_year_id: yearsFiltered[0].id }));
    }
  };

  const addYear = async () => {
    if (!yearTable || !schoolId) return;
    if (!newYear.name.trim() || !newYear.start_date || !newYear.end_date) {
      toast.error("Year name, start date, and end date are required");
      return;
    }

    setSavingYear(true);
    const t = toast.loading("Creating academic year...");
    try {
      const payload: Record<string, any> = {
        name: newYear.name.trim(),
        start_date: newYear.start_date,
        end_date: newYear.end_date,
        school_id: schoolId,
      };
      if (yearActiveKey) payload[yearActiveKey] = false;

      const { error } = await supabase.from(yearTable).insert(payload);
      if (error) throw error;

      setNewYear({ name: "", start_date: "", end_date: "" });
      await loadData(schoolId, yearTable, termTable!);
      toast.success("Academic year created", { id: t });
    } catch (err: any) {
      toast.error(err?.message || "Failed to create year", { id: t });
    } finally {
      setSavingYear(false);
    }
  };

  const addTerm = async () => {
    if (!termTable || !schoolId) return;
    if (!newTerm.name.trim() || !newTerm.start_date || !newTerm.end_date || !newTerm.academic_year_id) {
      toast.error("Term name, dates, and linked year are required");
      return;
    }

    setSavingTerm(true);
    const t = toast.loading("Creating term...");
    try {
      const payload: Record<string, any> = {
        name: newTerm.name.trim(),
        start_date: newTerm.start_date,
        end_date: newTerm.end_date,
        school_id: schoolId,
        [termYearFkKey]: newTerm.academic_year_id,
      };
      if (termActiveKey) payload[termActiveKey] = false;

      const { error } = await supabase.from(termTable).insert(payload);
      if (error) throw error;

      setNewTerm((prev) => ({ ...prev, name: "", start_date: "", end_date: "" }));
      await loadData(schoolId, yearTable!, termTable);
      toast.success("Term created", { id: t });
    } catch (err: any) {
      toast.error(err?.message || "Failed to create term", { id: t });
    } finally {
      setSavingTerm(false);
    }
  };

  const setActiveYear = async (id: string) => {
    if (!yearTable || !schoolId || !yearActiveKey) return;
    const t = toast.loading("Updating active year...");
    try {
      await supabase.from(yearTable).update({ [yearActiveKey]: false }).eq("school_id", schoolId);
      const { error } = await supabase.from(yearTable).update({ [yearActiveKey]: true }).eq("id", id);
      if (error) throw error;
      await loadData(schoolId, yearTable, termTable!);
      toast.success("Active year updated", { id: t });
    } catch (err: any) {
      toast.error(err?.message || "Failed to update active year", { id: t });
    }
  };

  const setActiveTerm = async (id: string) => {
    if (!termTable || !schoolId || !termActiveKey) return;
    const t = toast.loading("Updating active term...");
    try {
      await supabase.from(termTable).update({ [termActiveKey]: false }).eq("school_id", schoolId);
      const { error } = await supabase.from(termTable).update({ [termActiveKey]: true }).eq("id", id);
      if (error) throw error;
      await loadData(schoolId, yearTable!, termTable);
      toast.success("Active term updated", { id: t });
    } catch (err: any) {
      toast.error(err?.message || "Failed to update active term", { id: t });
    }
  };

  const deleteYear = async (id: string) => {
    if (!yearTable || !schoolId) return;
    const t = toast.loading("Deleting year...");
    try {
      const { error } = await supabase.from(yearTable).delete().eq("id", id);
      if (error) throw error;
      await loadData(schoolId, yearTable, termTable!);
      toast.success("Year deleted", { id: t });
    } catch (err: any) {
      toast.error(err?.message || "Failed to delete year", { id: t });
    }
  };

  const deleteTerm = async (id: string) => {
    if (!termTable || !schoolId) return;
    const t = toast.loading("Deleting term...");
    try {
      const { error } = await supabase.from(termTable).delete().eq("id", id);
      if (error) throw error;
      await loadData(schoolId, yearTable!, termTable);
      toast.success("Term deleted", { id: t });
    } catch (err: any) {
      toast.error(err?.message || "Failed to delete term", { id: t });
    }
  };

  if (loading) {
    return (
      <div className="rounded-2xl border border-slate-200 bg-white p-10 flex items-center justify-center gap-3">
        <Loader2 className="w-5 h-5 animate-spin text-sky-600" />
        <span className="text-sm text-slate-500">Loading academic module...</span>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-900">Academic Years & Terms</h1>
        <p className="text-slate-500 mt-1">Create, manage, and activate school years and terms.</p>
      </div>

      <div className="grid xl:grid-cols-2 gap-6">
        <section className="rounded-2xl border border-slate-200 bg-white p-5 space-y-4">
          <div className="flex items-center gap-2">
            <Calendar className="w-4 h-4 text-sky-600" />
            <h2 className="font-semibold text-slate-900">Academic Years</h2>
          </div>

          <div className="grid md:grid-cols-3 gap-3">
            <Field label="Name" value={newYear.name} onChange={(v) => setNewYear((p) => ({ ...p, name: v }))} />
            <Field label="Start" type="date" value={newYear.start_date} onChange={(v) => setNewYear((p) => ({ ...p, start_date: v }))} />
            <Field label="End" type="date" value={newYear.end_date} onChange={(v) => setNewYear((p) => ({ ...p, end_date: v }))} />
          </div>

          <button onClick={addYear} disabled={savingYear} className="inline-flex items-center gap-2 rounded-xl bg-sky-500 text-white px-4 py-2.5 text-sm font-semibold hover:bg-sky-400 disabled:opacity-60">
            {savingYear ? <Loader2 className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />} Add Year
          </button>

          <div className="divide-y divide-slate-100 border border-slate-100 rounded-xl">
            {years.length === 0 ? <EmptyRow label="No academic years yet" /> : null}
            {years.map((y) => (
              <div key={y.id} className="px-3 py-3 flex items-center justify-between gap-3">
                <div>
                  <p className="font-medium text-slate-800">{String(y[yearNameKey] || "Unnamed Year")}</p>
                  <p className="text-xs text-slate-500 mt-0.5">
                    {String(y[yearStartKey] || "-")} to {String(y[yearEndKey] || "-")}
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  {yearActiveKey ? (
                    <button
                      onClick={() => setActiveYear(y.id)}
                      className={`text-xs px-2.5 py-1.5 rounded-lg ${y[yearActiveKey] ? "bg-emerald-100 text-emerald-700" : "bg-slate-100 text-slate-600"}`}
                    >
                      {y[yearActiveKey] ? "Active" : "Set Active"}
                    </button>
                  ) : null}
                  <button onClick={() => deleteYear(y.id)} className="w-8 h-8 rounded-lg bg-red-50 text-red-600 grid place-items-center hover:bg-red-100">
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        </section>

        <section className="rounded-2xl border border-slate-200 bg-white p-5 space-y-4">
          <div className="flex items-center gap-2">
            <Save className="w-4 h-4 text-sky-600" />
            <h2 className="font-semibold text-slate-900">Terms</h2>
          </div>

          <div className="grid md:grid-cols-4 gap-3">
            <Field label="Name" value={newTerm.name} onChange={(v) => setNewTerm((p) => ({ ...p, name: v }))} />
            <Field label="Start" type="date" value={newTerm.start_date} onChange={(v) => setNewTerm((p) => ({ ...p, start_date: v }))} />
            <Field label="End" type="date" value={newTerm.end_date} onChange={(v) => setNewTerm((p) => ({ ...p, end_date: v }))} />
            <label>
              <span className="block text-xs font-medium text-slate-600 mb-1">Academic Year</span>
              <select
                value={newTerm.academic_year_id}
                onChange={(e) => setNewTerm((p) => ({ ...p, academic_year_id: e.target.value }))}
                className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-sky-200"
              >
                {years.map((y) => (
                  <option key={y.id} value={y.id}>{String(y[yearNameKey] || y.id)}</option>
                ))}
              </select>
            </label>
          </div>

          <button onClick={addTerm} disabled={savingTerm} className="inline-flex items-center gap-2 rounded-xl bg-sky-500 text-white px-4 py-2.5 text-sm font-semibold hover:bg-sky-400 disabled:opacity-60">
            {savingTerm ? <Loader2 className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />} Add Term
          </button>

          <div className="divide-y divide-slate-100 border border-slate-100 rounded-xl">
            {terms.length === 0 ? <EmptyRow label="No terms yet" /> : null}
            {terms.map((t) => (
              <div key={t.id} className="px-3 py-3 flex items-center justify-between gap-3">
                <div>
                  <p className="font-medium text-slate-800">{String(t[termNameKey] || "Unnamed Term")}</p>
                  <p className="text-xs text-slate-500 mt-0.5">
                    {String(t[termStartKey] || "-")} to {String(t[termEndKey] || "-")}
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  {termActiveKey ? (
                    <button
                      onClick={() => setActiveTerm(t.id)}
                      className={`text-xs px-2.5 py-1.5 rounded-lg ${t[termActiveKey] ? "bg-emerald-100 text-emerald-700" : "bg-slate-100 text-slate-600"}`}
                    >
                      {t[termActiveKey] ? "Active" : "Set Active"}
                    </button>
                  ) : null}
                  <button onClick={() => deleteTerm(t.id)} className="w-8 h-8 rounded-lg bg-red-50 text-red-600 grid place-items-center hover:bg-red-100">
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        </section>
      </div>
    </div>
  );
}

function Field({
  label,
  value,
  onChange,
  type = "text",
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  type?: string;
}) {
  return (
    <label>
      <span className="block text-xs font-medium text-slate-600 mb-1">{label}</span>
      <input
        type={type}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-sky-200"
      />
    </label>
  );
}

function EmptyRow({ label }: { label: string }) {
  return <div className="px-3 py-4 text-sm text-slate-500">{label}</div>;
}

async function resolveTable(candidates: string[]): Promise<string | null> {
  for (const table of candidates) {
    const { error } = await supabase.from(table).select("id").limit(1);
    if (!error) return table;
  }
  return null;
}

function inferKey(rows: Record<string, any>[], candidates: string[], fallback: string) {
  const sample = rows[0] || {};
  for (const c of candidates) {
    if (c in sample) return c;
  }
  return fallback;
}
