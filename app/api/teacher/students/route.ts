import { NextResponse } from "next/server";

import { jsonWithPrivateCache } from "@/lib/teacher-route-common";
import { loadTeacherStudentIntelligence } from "@/lib/teacher-student-intelligence";
import { requireTeacherContext } from "@/lib/server-auth";
import { safeErrorMessage } from "@/lib/server-guards";

export async function GET(req: Request) {
  try {
    const access = await requireTeacherContext(req);
    if (!access.ok) return access.response;
    if (!access.context.schoolId) {
      return NextResponse.json({ error: "No school linked to this account" }, { status: 403 });
    }

    return jsonWithPrivateCache({
      success: true,
      data: await loadTeacherStudentIntelligence({
        schoolId: access.context.schoolId,
        actorProfileId: access.context.userId,
      }),
    });
  } catch (error: unknown) {
    return NextResponse.json(
      { error: safeErrorMessage(error, "Failed to load teacher students") },
      { status: 500 }
    );
  }
}
