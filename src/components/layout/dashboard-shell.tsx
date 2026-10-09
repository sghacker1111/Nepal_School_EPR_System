"use client";

import { Bell, ChevronRight, LogOut, Menu, X } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";

import { Logo } from "@/components/brand/logo";
import { Button } from "@/components/ui/button";
import { cn, getInitials } from "@/lib/utils";
import { logoutAction } from "@/modules/auth/actions";

export type NavigationItem = {
  label: string;
  href: string;
  icon: React.ReactNode;
};

type DashboardShellProps = {
  children: React.ReactNode;
  navigation: NavigationItem[];
  user: { firstName: string; lastName: string; username: string };
  contextLabel: string;
  contextDetail: string;
};

export function DashboardShell({
  children,
  navigation,
  user,
  contextLabel,
  contextDetail,
}: DashboardShellProps) {
  const pathname = usePathname();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [search, setSearch] = useState("");
  const activeHref = navigation
    .filter(
      (item) => pathname === item.href || pathname.startsWith(item.href + "/"),
    )
    .sort((a, b) => b.href.length - a.href.length)[0]?.href;
  const visibleNavigation = navigation.filter((item) =>
    item.label.toLowerCase().includes(search.toLowerCase()),
  );
  const group = (href: string) =>
    /users|settings|security|audit|notifications/.test(href)
      ? "Administration"
      : /exam|result|question/.test(href)
        ? "Examinations"
        : /academic|classes|sections|subjects|assignments/.test(href)
          ? "Academic setup"
          : "School";

  const sidebar = (
    <>
      <div className="flex h-20 items-center justify-between border-b px-5">
        <Logo />
        <Button
          className="lg:hidden"
          variant="ghost"
          size="icon"
          onClick={() => setMobileOpen(false)}
          aria-label="Close navigation"
        >
          <X />
        </Button>
      </div>
      <div className="border-b px-5 py-4">
        <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-slate-400">
          {contextLabel}
        </p>
        <p className="mt-1 truncate text-sm font-semibold text-slate-800">
          {contextDetail}
        </p>
      </div>
      <nav
        className="flex-1 space-y-1 overflow-y-auto px-3 py-5"
        aria-label="Main navigation"
      >
        <label className="mb-3 block px-1">
          <span className="sr-only">Find a section</span>
          <input
            type="search"
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder="Find a section…"
            className="h-10 w-full rounded-lg border px-3 text-sm"
          />
        </label>
        {visibleNavigation.map((item, index) => {
          const active = item.href === activeHref;
          return (
            <div key={item.href}>
              {(index === 0 ||
                group(visibleNavigation[index - 1].href) !==
                  group(item.href)) && (
                <p className="px-3 pb-2 pt-4 text-[10px] font-bold uppercase tracking-wider text-slate-400">
                  {group(item.href)}
                </p>
              )}
              <Link
                aria-current={active ? "page" : undefined}
                href={item.href}
                onClick={() => setMobileOpen(false)}
                className={cn(
                  "flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors",
                  active
                    ? "bg-emerald-50 text-emerald-800"
                    : "text-slate-600 hover:bg-slate-100 hover:text-slate-950",
                )}
              >
                {item.icon}
                <span>{item.label}</span>
                {active && <ChevronRight className="ml-auto size-4" />}
              </Link>
            </div>
          );
        })}
      </nav>
      <div className="border-t p-3">
        <div className="mb-2 flex items-center gap-3 rounded-lg px-3 py-2">
          <span className="grid size-9 shrink-0 place-items-center rounded-full bg-slate-900 text-xs font-bold text-white">
            {getInitials(user.firstName, user.lastName)}
          </span>
          <span className="min-w-0">
            <span className="block truncate text-sm font-semibold text-slate-800">
              {user.firstName} {user.lastName}
            </span>
            <span className="block truncate text-xs text-slate-500">
              @{user.username}
            </span>
          </span>
        </div>
        <form action={logoutAction}>
          <Button
            type="submit"
            variant="ghost"
            className="w-full justify-start text-slate-600"
          >
            <LogOut />
            Sign out
          </Button>
        </form>
      </div>
    </>
  );

  return (
    <div className="min-h-screen bg-slate-50">
      <a
        href="#workspace-main"
        className="sr-only focus:not-sr-only focus:fixed focus:z-50 focus:bg-white focus:p-3"
      >
        Skip to content
      </a>
      <aside className="print:hidden fixed inset-y-0 left-0 z-40 hidden w-72 flex-col border-r bg-white lg:flex">
        {sidebar}
      </aside>
      {mobileOpen && (
        <div className="fixed inset-0 z-50 lg:hidden">
          <button
            className="absolute inset-0 bg-slate-950/40"
            onClick={() => setMobileOpen(false)}
            aria-label="Close navigation overlay"
          />
          <aside className="relative flex h-full w-[min(88vw,18rem)] flex-col bg-white shadow-xl">
            {sidebar}
          </aside>
        </div>
      )}
      <div className="lg:pl-72 print:pl-0">
        <header className="print:hidden sticky top-0 z-30 flex h-16 items-center border-b bg-white/95 px-4 backdrop-blur sm:px-6 lg:px-8">
          <Button
            className="mr-3 lg:hidden"
            variant="ghost"
            size="icon"
            onClick={() => setMobileOpen(true)}
            aria-label="Open navigation"
          >
            <Menu />
          </Button>
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-semibold text-slate-900">
              {contextDetail}
            </p>
            <p className="text-xs text-slate-500">Secure workspace</p>
          </div>
          {navigation.some(
            (item) => item.href === "/dashboard/notifications",
          ) && (
            <Button
              asChild
              variant="ghost"
              size="icon"
              aria-label="Notifications"
            >
              <Link href="/dashboard/notifications">
                <Bell />
              </Link>
            </Button>
          )}
        </header>
        <main
          id="workspace-main"
          className="mx-auto w-full max-w-[1600px] p-4 sm:p-6 lg:p-8"
        >
          {children}
        </main>
      </div>
    </div>
  );
}
