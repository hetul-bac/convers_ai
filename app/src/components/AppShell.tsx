"use client";

import type { ReactNode } from "react";
import { usePathname } from "next/navigation";
import { Sidebar } from "@/components/Sidebar";

const sidebarlessRoutes = ["/login", "/onboarding"];

type AppShellProps = {
  children: ReactNode;
  initialUser: {
    email: string | null;
    avatarUrl: string | null;
  } | null;
};

export function AppShell({ children, initialUser }: AppShellProps) {
  const pathname = usePathname();
  const isSidebarless =
    pathname.startsWith("/auth") ||
    sidebarlessRoutes.some((route) => pathname === route);

  if (isSidebarless || !initialUser) {
    return children;
  }

  return (
    <div className="min-h-screen bg-[#0f172a]">
      <div className="flex min-h-screen">
        <Sidebar initialUser={initialUser} />
        <main className="min-w-0 flex-1 bg-[#f8fbff] px-4 py-4 sm:px-6 sm:py-6 lg:px-8 lg:py-8">
          <div className="mx-auto w-full max-w-7xl">{children}</div>
        </main>
      </div>
    </div>
  );
}
