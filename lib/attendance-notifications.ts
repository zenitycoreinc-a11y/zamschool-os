export type AttendanceNotificationStatus =
  | "PRESENT"
  | "ABSENT"
  | "LATE"
  | "EXCUSED";

export function buildAttendanceNotificationPayloads(input: {
  studentUserId: string;
  studentId: string;
  lessonId: string;
  parents: Array<{ id: string }>;
  studentName: string;
  className: string;
  lessonName: string;
  teacherName: string;
  date: string;
  timeLabel?: string | null;
  status: AttendanceNotificationStatus;
}) {
  const title = `${input.studentName} attendance for ${input.lessonName} (${input.className}) on ${input.date}${input.timeLabel ? ` at ${input.timeLabel}` : ""}`;
  const recipientIds = [
    input.studentUserId,
    ...input.parents.map((parent) => parent.id),
  ].filter(Boolean);

  return Array.from(new Set(recipientIds)).map((recipientId) => ({
    user_id: recipientId,
    dedupe_key: `${recipientId}:${input.studentId}:${input.lessonId}:${input.date}`,
    title,
    message: `${input.studentName} was marked ${input.status} for ${input.lessonName} (${input.className}) on ${input.date}${input.timeLabel ? ` at ${input.timeLabel}` : ""} by ${input.teacherName}.`,
    type: "attendance",
  }));
}
