"use client";

import { useEffect, useMemo, useState, useTransition } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import {
  BookUser,
  Bot,
  LayoutDashboard,
  LogOut,
  Mail,
  Menu,
  Megaphone,
  PanelLeftClose,
  PlugZap,
  Settings,
  Sparkles,
  Workflow,
  X,
} from "lucide-react";
import { createClient } from "@/lib/supabase/client";

const navigation = [
  { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { href: "/campaigns", label: "Campaigns", icon: Megaphone },
  { href: "/contacts", label: "Contacts", icon: BookUser },
  { href: "/inbox", label: "Inbox", icon: Mail },
  { href: "/chatbots", label: "Chatbots", icon: Workflow },
  { href: "/optimize", label: "Optimize", icon: Sparkles },
  { href: "/connectors", label: "Connectors", icon: PlugZap },
  { href: "/settings", label: "Settings", icon: Settings },
];

type SidebarUser = {
  avatarUrl: string | null;
  email: string | null;
};

type SidebarProps = {
  initialUser: SidebarUser;
};

function UserIdentity({ user }: { user: SidebarUser }) {
  return (
    <div className="flex items-center gap-3">
      {user.avatarUrl ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          alt={user.email ?? "User avatar"}
          className="h-11 w-11 rounded-full object-cover"
          height={44}
          src={user.avatarUrl}
          width={44}
        />
      ) : (
        <div className="flex h-11 w-11 items-center justify-center rounded-full bg-[#3182ce]/15 text-sm font-semibold text-white">
          {(user.email?.[0] ?? "U").toUpperCase()}
        </div>
      )}
      <div className="min-w-0">
        <p className="text-[11px] uppercase tracking-[0.24em] text-slate-500">
          Signed In
        </p>
        <p className="truncate text-sm text-slate-100">
          {user.email ?? "Loading..."}
        </p>
      </div>
    </div>
  );
}

export function Sidebar({ initialUser }: SidebarProps) {
  const pathname = usePathname();
  const router = useRouter();
  const supabase = useMemo(() => createClient(), []);
  const [user, setUser] = useState<SidebarUser>(initialUser);
  const [isPending, startTransition] = useTransition();
  const [isMobileOpen, setIsMobileOpen] = useState(false);

  useEffect(() => {
    let isMounted = true;

    const loadUser = async () => {
      const {
        data: { user: sessionUser },
      } = await supabase.auth.getUser();

      if (!isMounted || !sessionUser) {
        return;
      }

      setUser({
        avatarUrl:
          typeof sessionUser.user_metadata?.avatar_url === "string"
            ? sessionUser.user_metadata.avatar_url
            : null,
        email: sessionUser.email ?? null,
      });
    };

    void loadUser();

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser({
        avatarUrl:
          typeof session?.user.user_metadata?.avatar_url === "string"
            ? session.user.user_metadata.avatar_url
            : null,
        email: session?.user.email ?? null,
      });
    });

    return () => {
      isMounted = false;
      subscription.unsubscribe();
    };
  }, [supabase]);

  const handleSignOut = () => {
    startTransition(async () => {
      setIsMobileOpen(false);
      await supabase.auth.signOut();
      router.replace("/login");
      router.refresh();
    });
  };

  return (
    <>
      <div className="sticky top-0 z-40 flex items-center justify-between border-b border-white/10 bg-[#1a202c] px-4 py-4 text-white lg:hidden">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-[#3182ce]/20 text-[#8fc3ff]">
            <Bot className="h-5 w-5" />
          </div>
          <div>
            <p className="font-display text-lg font-bold">ConversAI</p>
            <p className="text-[10px] uppercase tracking-[0.28em] text-slate-400">
              Control Center
            </p>
          </div>
        </div>
        <button
          className="inline-flex h-10 w-10 items-center justify-center rounded-2xl border border-white/10 bg-white/5"
          onClick={() => setIsMobileOpen((open) => !open)}
          type="button"
        >
          {isMobileOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
        </button>
      </div>

      {isMobileOpen ? (
        <button
          aria-label="Close navigation"
          className="fixed inset-0 z-30 bg-slate-950/55 lg:hidden"
          onClick={() => setIsMobileOpen(false)}
          type="button"
        />
      ) : null}

      <aside
        className={`fixed inset-y-0 left-0 z-40 flex w-[240px] flex-col border-r border-white/10 bg-[#1a202c] px-4 py-6 text-white transition-transform duration-300 lg:sticky lg:top-0 lg:h-screen ${
          isMobileOpen ? "translate-x-0" : "-translate-x-full lg:translate-x-0"
        }`}
      >
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-[#3182ce]/20 text-[#8fc3ff]">
              <Bot className="h-6 w-6" />
            </div>
            <div>
              <p className="font-display text-lg font-bold tracking-wide">ConversAI</p>
              <p className="text-xs uppercase tracking-[0.3em] text-slate-400">
                NextGen CPaaS
              </p>
            </div>
          </div>
          <button
            className="inline-flex h-9 w-9 items-center justify-center rounded-2xl border border-white/10 bg-white/5 lg:hidden"
            onClick={() => setIsMobileOpen(false)}
            type="button"
          >
            <PanelLeftClose className="h-4 w-4" />
          </button>
        </div>

        <nav className="mt-10 space-y-2">
          {navigation.map(({ href, label, icon: Icon }) => {
            const active = pathname === href;

            return (
              <Link
                key={href}
                href={href}
                className={`flex items-center gap-3 rounded-2xl px-4 py-3 text-sm font-medium transition ${
                  active
                    ? "bg-[#3182ce] text-white shadow-[0_14px_28px_rgba(49,130,206,0.26)]"
                    : "text-slate-300 hover:bg-white/5 hover:text-white"
                }`}
                onClick={() => setIsMobileOpen(false)}
              >
                <Icon className="h-4 w-4" />
                {label}
              </Link>
            );
          })}
        </nav>

        <div className="mt-auto rounded-3xl border border-white/10 bg-white/5 p-4">
          <UserIdentity user={user} />
          <button
            className="mt-4 flex w-full items-center justify-center gap-2 rounded-2xl bg-white px-4 py-3 text-sm font-semibold text-slate-950 transition hover:bg-slate-100 disabled:cursor-not-allowed disabled:opacity-60"
            disabled={isPending}
            onClick={handleSignOut}
            type="button"
          >
            <LogOut className="h-4 w-4" />
            {isPending ? "Signing Out..." : "Sign Out"}
          </button>
        </div>
      </aside>
    </>
  );
}
