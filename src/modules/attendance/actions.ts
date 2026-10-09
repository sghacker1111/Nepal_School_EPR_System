"use server";

import { revalidatePath } from "next/cache";

import { toPublicMessage } from "@/lib/errors";
import {
  lockAttendanceSession,
  saveAttendanceSheet,
} from "@/modules/attendance/service";
import { attendanceSheetSchema } from "@/modules/attendance/validation";
import { getRequestMetadata } from "@/modules/auth/request-metadata";
import { ROLE_CODES } from "@/modules/auth/constants";
import { requireSchoolContext } from "@/modules/auth/session";

export type AttendanceActionState = {
  error?: string;
  success?: string;
  fieldErrors?: Record<string, string[]>;
};

export async function saveAttendanceAction(
  _previous: AttendanceActionState,
  formData: FormData,
): Promise<AttendanceActionState> {
  const studentIds = formData.getAll("studentId").map(String);
  const parsed = attendanceSheetSchema.safeParse({
    academicYearId: formData.get("academicYearId"),
    classId: formData.get("classId"),
    sectionId: formData.get("sectionId"),
    date: formData.get("date"),
    submit: formData.get("intent") === "submit",
    records: studentIds.map((studentId) => ({
      studentId,
      status: formData.get(`status:${studentId}`),
      remarks: formData.get(`remarks:${studentId}`),
    })),
  });
  if (!parsed.success)
    return {
      error: "Please correct the attendance sheet.",
      fieldErrors: parsed.error.flatten().fieldErrors,
    };
  try {
    const session = await requireSchoolContext("attendance.manage");
    await saveAttendanceSheet(parsed.data, {
      schoolId: session.schoolId,
      userId: session.user.id,
      isSchoolAdmin: session.roles.has(ROLE_CODES.SCHOOL_ADMIN),
      metadata: await getRequestMetadata(),
    });
    revalidatePath("/dashboard/attendance");
    revalidatePath("/dashboard/attendance/reports");
    return {
      success: parsed.data.submit
        ? "Attendance submitted."
        : "Attendance draft saved.",
    };
  } catch (error) {
    return { error: toPublicMessage(error) };
  }
}

export async function lockAttendanceAction(sessionId: string) {
  const session = await requireSchoolContext("attendance.lock");
  await lockAttendanceSession(sessionId, {
    schoolId: session.schoolId,
    userId: session.user.id,
    metadata: await getRequestMetadata(),
  });
  revalidatePath("/dashboard/attendance");
  revalidatePath("/dashboard/attendance/reports");
}
export async function lockAttendanceFormAction(
  sessionId: string,
  _previous: AttendanceActionState,
  _form: FormData,
): Promise<AttendanceActionState> {
  void [_previous, _form];
  try {
    await lockAttendanceAction(sessionId);
    return { success: "Attendance locked." };
  } catch (error) {
    return { error: toPublicMessage(error) };
  }
}
