"use client";

import { LucideIcon, Plus } from "lucide-react";
import { motion } from "motion/react";

interface EmptyStateProps {
  icon: LucideIcon;
  title: string;
  description: string;
  actionLabel?: string;
  onAction?: () => void;
}

export default function EmptyState({
  icon: Icon,
  title,
  description,
  actionLabel,
  onAction,
}: EmptyStateProps) {
  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      className="flex flex-col items-center justify-center p-12 text-center bg-white rounded-2xl border-2 border-dashed border-slate-100"
    >
      <div className="w-20 h-20 rounded-full bg-slate-50 flex items-center justify-center mb-6">
        <Icon className="w-10 h-10 text-slate-300" />
      </div>
      <h3 className="text-xl font-bold text-slate-800 mb-2">{title}</h3>
      <p className="text-slate-500 max-w-sm mb-8">{description}</p>
      {actionLabel && onAction && (
        <button
          onClick={onAction}
          className="flex items-center gap-2 bg-lamaSky text-white px-6 py-3 rounded-xl font-bold hover:bg-opacity-90 transition-all shadow-lg shadow-lamaSky/20"
        >
          <Plus className="w-5 h-5" />
          {actionLabel}
        </button>
      )}
    </motion.div>
  );
}
