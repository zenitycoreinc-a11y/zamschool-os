import { NextResponse } from "next/server";

import { buildDisplayName, isVisibleToRole, jsonWithPrivateCache } from "@/lib/teacher-route-common";
import { loadTeacherAccountDetail } from "@/lib/teacher-account-detail";
import { loadTeacherAssignmentScope } from "@/lib/teacher-assignment-scope-server";
import { requireTeacherContext } from "@/lib/server-auth";
import { safeErrorMessage } from "@/lib/server-guards";
import { supabaseAdmin } from "@/lib/supabase";

export async function GET(req: Request) {
  try {
    const access = await requireTeacherContext(req);
    if (!access.ok) return access.response;
    if (!access.context.schoolId) {
      return NextResponse.json({ error: "No school linked to this account" }, { status: 403 });
    }

    const { data: profile, error: profileError } = await supabaseAdmin
      .from("profiles")
      .select("*")
      .eq("id", access.context.userId)
      .eq("school_id", access.context.schoolId)
      .maybeSingle();

    if (profileError) throw profileError;
    if (!profile) {
      return NextResponse.json({ error: "Profile not found" }, { status: 404 });
    }

    const assignmentScope = await loadTeacherAssignmentScope({
      schoolId: access.context.schoolId,
      actorProfileId: access.context.userId,
    });

    const [teacher, unreadSummary, assignments, results, events] = await Promise.all([
      loadTeacherAccountDetail({
        schoolId: access.context.schoolId,
        profileId: access.context.userId,
        baseProfile: {
          profileId: profile.id,
          role: "teacher",
          displayName: buildDisplayName(profile),
          email: profile.email || null,
          avatarUrl: profile.avatar_url || profile.photo_url || null,
          status: profile.is_active === false ? "INACTIVE" : "ACTIVE",
          updatedAt: profile.updated_at || profile.created_at || null,
        },
      }),
      loadUnreadSummary(access.context.userId),
      loadAssignmentsInScope(access.context.schoolId, assignmentScope),
      loadResultsInScope(access.context.schoolId, assignmentScope),
      loadUpcomingEvents(access.context.schoolId, access.context.role),
    ]);

    const pendingGrades = results.filter(
      (row: any) => row.created_at && row.score == null && !row.grade
    ).length;
    const draftResults = results.filter((row: any) => !row.published_at).length;

    return jsonWithPrivateCache({
      success: true,
      data: {
        profile: {
          first_name: profile.first_name || "",
          last_name: profile.last_name || "",
          email: profile.email || "",
          phone: profile.phone || "",
          role: "TEACHER",
          status: profile.is_active === false ? "INACTIVE" : "ACTIVE",
        },
        teacher,
        workload: {
          unreadMessages: unreadSummary.messages,
          unreadNotifications: unreadSummary.notifications,
          pendingGrades,
          draftResults,
          upcomingEvents: events.length,
        },
        assignments: {
          total: assignments.length,
        },
        results: {
          total: results.length,
        },
        events: {
          total: events.length,
        },
      },
    });
  } catch (error: unknown) {
    return NextResponse.json(
      { error: safeErrorMessage(error, "Failed to load teacher dashboard") },
      { status: 500 }
    );
  }
}

async function loadUnreadSummary(userId: string) {
  const [messagesResult, notifications] = await Promise.all([
    supabaseAdmin
      .from("messages")
      .select("id", { count: "exact", head: true })
      .eq("recipient_id", userId)
      .eq("is_read", false),
    loadUnreadNotificationCount(userId),
  ]);

  if (messagesResult.error) throw messagesResult.error;

  return {
    messages: messagesResult.count || 0,
    notifications,
  };
}

async function loadUnreadNotificationCount(userId: string) {
  const queryAttempts = [
    () =>
      supabaseAdmin
        .from("notifications")
        .select("id", { count: "exact", head: true })
        .eq("user_id", userId)
        .eq("is_read", false),
    () =>
      supabaseAdmin
        .from("notifications")
        .select("id", { count: "exact", head: true })
        .eq("recipient_id", userId)
        .eq("is_read", false),
  ];

  for (const runQuery of queryAttempts) {
    const result = await runQuery();
    if (!result.error) return result.count || 0;
  }

  return 0;
}

async function loadAssignmentsInScope(
  schoolId: string,
  assignmentScope: { actorTeacherIds: string[]; allowedClassIds: string[] }
) {
  if (assignmentScope.actorTeacherIds.length === 0 || assignmentScope.allowedClassIds.length === 0) {
    return [];
  }

  const { data, error } = await supabaseAdmin
    .from("assignments")
    .select("id, class_id, subject_id, teacher_id, created_at")
    .eq("school_id", schoolId)
    .in("teacher_id", assignmentScope.actorTeacherIds)
    .in("class_id", assignmentScope.allowedClassIds);

  if (error) throw error;
  return data || [];
}

async function loadResultsInScope(
  schoolId: string,
  assignmentScope: { actorTeacherIds: string[]; allowedClassIds: string[] }
) {
  const assignments = await loadAssignmentsInScope(schoolId, assignmentScope);
  const assignmentIds = Array.from(new Set(assignments.map((row: any) => row.id).filter(Boolean)));
  if (assignmentIds.length === 0) return [];

  const { data, error } = await supabaseAdmin
    .from("results")
    .select("id, assignment_id, created_at, score, grade, published_at")
    .eq("school_id", schoolId)
    .in("assignment_id", assignmentIds);

  if (error) throw error;
  return data || [];
}

async function loadUpcomingEvents(schoolId: string, role: string) {
  const today = new Date().toISOString().slice(0, 10);

  const queryAttempts = [
    () =>
      supabaseAdmin
        .from("events")
        .select("id, target_role, event_date")
        .eq("school_id", schoolId)
        .gte("event_date", today),
    () =>
      supabaseAdmin
        .from("events")
        .select("id, event_date")
        .eq("school_id", schoolId)
        .gte("event_date", today),
  ];

  for (const runQuery of queryAttempts) {
    const result = await runQuery();
    if (!result.error) {
      return (result.data || []).filter((row: any) => isVisibleToRole(row.target_role, role));
    }
  }

  return [];
}

