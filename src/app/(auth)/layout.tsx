import { Building2, LockKeyhole, MapPin } from "lucide-react";

import { Logo } from "@/components/brand/logo";

export default function AuthLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <main className="grid min-h-screen bg-white lg:grid-cols-[1.08fr_0.92fr]">
      <section className="relative hidden overflow-hidden bg-[#0c3b27] p-12 text-white lg:flex lg:flex-col lg:justify-between">
        <div className="absolute inset-0 opacity-20 [background-image:radial-gradient(circle_at_20%_20%,#86efac_0,transparent_32%),radial-gradient(circle_at_80%_70%,#60a5fa_0,transparent_28%)]" />
        <div className="relative">
          <Logo className="[&_span]:text-white [&_span_span:last-child]:text-emerald-200" />
        </div>
        <div className="relative max-w-xl">
          <p className="mb-4 text-sm font-semibold uppercase tracking-[0.22em] text-emerald-200">
            Built for Nepal&apos;s schools
          </p>
          <h1 className="text-4xl font-bold leading-tight tracking-tight xl:text-5xl">
            One secure platform. Every school kept separate.
          </h1>
          <p className="mt-5 max-w-lg text-base leading-7 text-emerald-50/80">
            A dependable foundation for administrators, teachers, students,
            examinations, and academic records.
          </p>
        </div>
        <div className="relative grid grid-cols-3 gap-4 text-xs text-emerald-50/80">
          <div className="flex items-center gap-2">
            <LockKeyhole className="size-4" /> Tenant isolation
          </div>
          <div className="flex items-center gap-2">
            <Building2 className="size-4" /> Multi-school ready
          </div>
          <div className="flex items-center gap-2">
            <MapPin className="size-4" /> Asia/Kathmandu
          </div>
        </div>
      </section>
      <section className="flex min-h-screen items-center justify-center bg-slate-50 px-5 py-10 sm:px-8">
        <div className="w-full max-w-md">
          <Logo className="mb-10 lg:hidden" />
          {children}
          <p className="mt-8 text-center text-xs leading-5 text-slate-500">
            Authorized users only. Access and administrative actions may be
            audited.
          </p>
        </div>
      </section>
    </main>
  );
}
