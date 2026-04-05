import Link from "next/link";
import { ArrowRight } from "lucide-react";

export default function SectionPlaceholder({
  title,
  summary,
  primaryHref,
  primaryLabel,
}: {
  title: string;
  summary: string;
  primaryHref?: string;
  primaryLabel?: string;
}) {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-900">{title}</h1>
        <p className="text-slate-500 mt-1">{summary}</p>
      </div>

      <div className="rounded-2xl border border-slate-200 bg-white p-6">
        <p className="text-sm text-slate-600">
          This section shell is now wired under <code>/app</code> with the new admin navigation.
          Next step is full CRUD + live data binding for this exact module workflow.
        </p>

        {primaryHref && primaryLabel ? (
          <Link
            href={primaryHref}
            className="inline-flex items-center gap-2 mt-4 rounded-xl bg-sky-500 text-white px-4 py-2.5 text-sm font-semibold hover:bg-sky-400 transition-colors"
          >
            {primaryLabel}
            <ArrowRight className="w-4 h-4" />
          </Link>
        ) : null}
      </div>
    </div>
  );
}
