"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { signOut, useSession } from "next-auth/react";
import { Button } from "@/components/ui/Button";
import { cn } from "@/lib/utils/cn";

const links = [
  { href: "/search", label: "Search" },
  { href: "/campaigns", label: "Campaigns" },
  { href: "/analytics", label: "Analytics" },
];

export function AppNav() {
  const pathname = usePathname();
  const { data: session } = useSession();
  const isAdmin = session?.user?.role === "ADMIN";

  return (
    <header className="border-b border-slate-200 bg-white">
      <div className="mx-auto flex max-w-7xl items-center justify-between gap-4 px-4 py-3 sm:px-6 lg:px-8">
        <div className="flex items-center gap-6">
          <Link href="/search" className="text-sm font-semibold text-brand-700">
            Parijat Sales
          </Link>
          <nav className="flex items-center gap-4">
            {links.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                className={cn(
                  "text-sm font-medium",
                  pathname.startsWith(link.href)
                    ? "text-brand-700"
                    : "text-slate-600 hover:text-slate-900",
                )}
              >
                {link.label}
              </Link>
            ))}
            {isAdmin ? (
              <>
                <Link
                  href="/admin/users"
                  className={cn(
                    "text-sm font-medium",
                    pathname.startsWith("/admin/users")
                      ? "text-brand-700"
                      : "text-slate-600 hover:text-slate-900",
                  )}
                >
                  Users
                </Link>
                <Link
                  href="/admin/services"
                  className={cn(
                    "text-sm font-medium",
                    pathname.startsWith("/admin/services")
                      ? "text-brand-700"
                      : "text-slate-600 hover:text-slate-900",
                  )}
                >
                  Services
                </Link>
              </>
            ) : null}
          </nav>
        </div>
        <div className="flex items-center gap-3">
          {session?.user?.name ? (
            <span className="hidden text-sm text-slate-600 sm:inline">{session.user.name}</span>
          ) : null}
          <Button type="button" variant="secondary" onClick={() => void signOut({ callbackUrl: "/login" })}>
            Sign out
          </Button>
        </div>
      </div>
    </header>
  );
}
