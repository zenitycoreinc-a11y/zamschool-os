"use client";

import { createContext, useContext, useEffect, useMemo, useState } from "react";

import {
  fetchTeacherBootstrap,
  invalidateTeacherBootstrap,
  preloadTeacherBootstrap,
  readCachedTeacherBootstrap,
} from "@/lib/teacher-bootstrap-client";
import type {
  TeacherBootstrapData,
  TeacherWorkloadSummary,
  TeacherWorkspaceStats,
} from "@/lib/teacher-route-common";

type TeacherWorkspaceAccount = Pick<TeacherBootstrapData, "profile" | "firstLogin" | "teacher">;

type TeacherWorkspaceState = {
  account: TeacherWorkspaceAccount | null;
  stats: TeacherWorkspaceStats;
  workload: TeacherWorkloadSummary;
  loading: boolean;
  error: string;
  displayName: string;
  schoolName: string;
  yearTerm: string;
  refresh: () => Promise<void>;
};

const TeacherWorkspaceContext = createContext<TeacherWorkspaceState | null>(null);

const EMPTY_STATS: TeacherWorkspaceStats = {
  lessons: 0,
  students: 0,
  completed: 0,
  pending: 0,
};

const EMPTY_WORKLOAD: TeacherWorkloadSummary = {
  unreadMessages: 0,
  unreadNotifications: 0,
  pendingGrades: 0,
  draftResults: 0,
  upcomingEvents: 0,
};

export function TeacherWorkspaceProvider({ children }: { children: React.ReactNode }) {
  const cachedBootstrap = readCachedTeacherBootstrap();
  const initialData = cachedBootstrap?.data || null;
  const [account, setAccount] = useState<TeacherWorkspaceAccount | null>(() =>
    initialData
      ? {
          profile: initialData.profile,
          firstLogin: initialData.firstLogin,
          teacher: initialData.teacher,
        }
      : null
  );
  const [stats, setStats] = useState<TeacherWorkspaceStats>(() => initialData?.stats || EMPTY_STATS);
  const [workload, setWorkload] = useState<TeacherWorkloadSummary>(
    () => initialData?.workload || EMPTY_WORKLOAD
  );
  const [loading, setLoading] = useState(!initialData);
  const [error, setError] = useState("");
  const [displayName, setDisplayName] = useState(initialData?.displayName || "Your Account");
  const [schoolName, setSchoolName] = useState(initialData?.schoolName || "Your School");
  const [yearTerm, setYearTerm] = useState(initialData?.yearTerm || "Academic Context");

  async function loadWorkspace(options: { force?: boolean } = {}) {
    if (!account) {
      setLoading(true);
    }
    setError("");

    try {
      const payload = await fetchTeacherBootstrap({ force: options.force });
      const nextData = payload.data || null;

      setAccount(
        nextData
          ? {
              profile: nextData.profile,
              firstLogin: nextData.firstLogin,
              teacher: nextData.teacher,
            }
          : null
      );
      setStats(nextData?.stats || EMPTY_STATS);
      setWorkload(nextData?.workload || EMPTY_WORKLOAD);
      setDisplayName(nextData?.displayName || "Your Account");
      setSchoolName(nextData?.schoolName || "Your School");
      setYearTerm(nextData?.yearTerm || "Academic Context");
    } catch (loadError: unknown) {
      setError(loadError instanceof Error ? loadError.message : "Failed to load teacher workspace");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    preloadTeacherBootstrap();
    void loadWorkspace();
  }, []);

  async function refresh() {
    invalidateTeacherBootstrap();
    await loadWorkspace({ force: true });
  }

  const value = useMemo(
    () => ({
      account,
      stats,
      workload,
      loading,
      error,
      displayName,
      schoolName,
      yearTerm,
      refresh,
    }),
    [account, displayName, error, loading, refresh, schoolName, stats, workload, yearTerm]
  );

  return (
    <TeacherWorkspaceContext.Provider value={value}>
      {children}
    </TeacherWorkspaceContext.Provider>
  );
}

export function useTeacherWorkspace() {
  const context = useContext(TeacherWorkspaceContext);
  if (!context) {
    throw new Error("useTeacherWorkspace must be used within a TeacherWorkspaceProvider");
  }

  return context;
}
