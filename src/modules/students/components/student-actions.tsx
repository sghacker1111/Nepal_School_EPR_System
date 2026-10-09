"use client";
import { Archive, EyeOff, RotateCcw } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  changeStudentStatusAction,
  hideFromCurrentClassAction,
} from "@/modules/students/actions";
export function StudentStatusActions({
  studentId,
  status,
  hasActiveEnrollment,
  canArchive,
  canRestore,
  canEnroll,
}: {
  studentId: string;
  status: string;
  hasActiveEnrollment: boolean;
  canArchive: boolean;
  canRestore: boolean;
  canEnroll: boolean;
}) {
  return (
    <div className="flex flex-wrap gap-2">
      {status === "ARCHIVED"
        ? canRestore && (
            <form
              action={changeStudentStatusAction}
              onSubmit={(e) => {
                if (!confirm("Restore this archived student to active status?"))
                  e.preventDefault();
              }}
            >
              <input type="hidden" name="studentId" value={studentId} />
              <input type="hidden" name="status" value="ACTIVE" />
              <Button type="submit">
                <RotateCcw />
                Restore student
              </Button>
            </form>
          )
        : canArchive && (
            <>
              <form
                action={changeStudentStatusAction}
                onSubmit={(e) => {
                  if (
                    !confirm(
                      "Apply this lifecycle status? Historical records will remain unchanged.",
                    )
                  )
                    e.preventDefault();
                }}
                className="flex"
              >
                <input type="hidden" name="studentId" value={studentId} />
                <select
                  name="status"
                  defaultValue={status}
                  className="h-10 rounded-l-lg border bg-white px-3 text-sm"
                >
                  <option value="INACTIVE">Inactive</option>
                  <option value="TRANSFERRED">Transferred</option>
                  <option value="GRADUATED">Graduated</option>
                  <option value="DROPPED">Dropped</option>
                  <option value="ACTIVE">Active</option>
                </select>
                <Button
                  type="submit"
                  variant="outline"
                  className="rounded-l-none"
                >
                  Update status
                </Button>
              </form>
              <form
                action={changeStudentStatusAction}
                onSubmit={(e) => {
                  if (
                    !confirm(
                      "Archive this student? Historical enrollment and future records will be preserved.",
                    )
                  )
                    e.preventDefault();
                }}
              >
                <input type="hidden" name="studentId" value={studentId} />
                <input type="hidden" name="status" value="ARCHIVED" />
                <Button type="submit" variant="destructive">
                  <Archive />
                  Archive
                </Button>
              </form>
            </>
          )}
      {hasActiveEnrollment && canEnroll && (
        <form
          action={hideFromCurrentClassAction}
          onSubmit={(e) => {
            if (
              !confirm(
                "Hide this student from the current class? The student master record and enrollment history remain available.",
              )
            )
              e.preventDefault();
          }}
        >
          <input type="hidden" name="studentId" value={studentId} />
          <Button type="submit" variant="outline">
            <EyeOff />
            Hide from current class
          </Button>
        </form>
      )}
    </div>
  );
}
