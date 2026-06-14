"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  BarChart3,
  LogOut,
  Mail,
  Menu,
  Search,
  Settings,
  Users,
  X,
} from "lucide-react";
import { signOut, useSession } from "next-auth/react";
import { useState } from "react";
import { Logo } from "@/components/brand/Logo";
import { Avatar } from "@/components/ui/Avatar";
import { Badge } from "@/components/ui/Badge";
import {
  DropdownMenu,
  DropdownMenuItem,
  DropdownMenuLabel,
} from "@/components/ui/DropdownMenu";
import { cn } from "@/lib/utils/cn";

const links = [
  { href: "/search", label: "Search", icon: Search },
  { href: "/campaigns", label: "Campaigns", icon: Mail },
  { href: "/analytics", label: "Analytics", icon: BarChart3 },
];

const adminLinks = [
  { href: "/admin/users", label: "Users", icon: Users },
  { href: "/admin/services", label: "Services", icon: Settings },
];

export function AppNav() {
  const pathname = usePathname();
  const { data: session } = useSession();
  const [mobileOpen, setMobileOpen] = useState(false);
  const isAdmin = session?.user?.role === "ADMIN";
  const allLinks = isAdmin ? [...links, ...adminLinks] : links;

  function isActive(href: string) {
    return pathname.startsWith(href);
  }

  function NavLink({
    href,
    label,
    icon: Icon,
    onClick,
  }: {
    href: string;
    label: string;
    icon: typeof Search;
    onClick?: () => void;
  }) {
    const active = isActive(href);

    return (
      <Link
        href={href}
        onClick={onClick}
        className={cn(
          "inline-flex items-center gap-2 rounded-lg px-3 py-2 text-sm font-medium transition-colors",
          active
            ? "nav-link-active"
            : "text-slate-300 hover:bg-white/5 hover:text-white",
        )}
      >
        <Icon className="h-4 w-4" aria-hidden="true" />
        {label}
      </Link>
    );
  }

  return (
    <header className="sticky top-0 z-40 border-b border-slate-800 bg-slate-900/95 backdrop-blur-md">
      <div className="mx-auto flex max-w-7xl items-center justify-between gap-4 px-4 py-3 sm:px-6 lg:px-8">
        <div className="flex items-center gap-6">
          <Link href="/search" className="shrink-0">
            <Logo variant="light" />
          </Link>

          <nav className="hidden items-center gap-1 md:flex">
            {allLinks.map((link) => (
              <NavLink key={link.href} {...link} />
            ))}
          </nav>
        </div>

        <div className="flex items-center gap-2">
          {session?.user ? (
            <DropdownMenu
              trigger={
                <button
                  type="button"
                  className="flex items-center gap-2 rounded-lg px-2 py-1.5 transition-colors hover:bg-white/5"
                  aria-label="User menu"
                >
                  <Avatar name={session.user.name ?? session.user.email ?? "User"} size="sm" />
                  <span className="hidden text-sm text-slate-200 sm:inline">
                    {session.user.name}
                  </span>
                </button>
              }
            >
              <DropdownMenuLabel>
                <p className="font-medium text-slate-900">{session.user.name}</p>
                <p className="mt-0.5 text-xs text-slate-500">{session.user.email}</p>
                {session.user.role ? (
                  <Badge variant="brand" className="mt-2">
                    {session.user.role.replace("_", " ")}
                  </Badge>
                ) : null}
              </DropdownMenuLabel>
              <DropdownMenuItem
                destructive
                onClick={() => void signOut({ callbackUrl: "/login" })}
              >
                <LogOut className="h-4 w-4" aria-hidden="true" />
                Sign out
              </DropdownMenuItem>
            </DropdownMenu>
          ) : null}

          <button
            type="button"
            className="inline-flex items-center justify-center rounded-lg p-2 text-slate-300 hover:bg-white/5 hover:text-white md:hidden"
            aria-label={mobileOpen ? "Close menu" : "Open menu"}
            onClick={() => setMobileOpen((value) => !value)}
          >
            {mobileOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
          </button>
        </div>
      </div>

      {mobileOpen ? (
        <nav className="border-t border-slate-800 px-4 py-3 md:hidden">
          <div className="flex flex-col gap-1">
            {allLinks.map((link) => (
              <NavLink
                key={link.href}
                {...link}
                onClick={() => setMobileOpen(false)}
              />
            ))}
          </div>
        </nav>
      ) : null}
    </header>
  );
}
