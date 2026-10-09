import { redirect } from "next/navigation";
import { ForbiddenError, UnauthorizedError } from "@/lib/errors";
import { requireSchoolContext } from "./session";

// Pages navigate to useful feedback. Actions/APIs retain typed 401/403 errors.
export async function requireSchoolPage(permission?: string) {
  try {
    return await requireSchoolContext(permission);
  } catch (error) {
    if (error instanceof UnauthorizedError) redirect("/login");
    if (error instanceof ForbiddenError) redirect("/access-denied");
    throw error;
  }
}
