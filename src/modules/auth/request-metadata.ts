import { headers } from "next/headers";

import type { RequestMetadata } from "@/modules/audit/service";

export async function getRequestMetadata(): Promise<RequestMetadata> {
  const requestHeaders = await headers();
  const forwarded = requestHeaders.get("x-forwarded-for");

  return {
    ipAddress:
      forwarded?.split(",")[0]?.trim() ??
      requestHeaders.get("x-real-ip") ??
      undefined,
    userAgent: requestHeaders.get("user-agent")?.slice(0, 500),
  };
}
