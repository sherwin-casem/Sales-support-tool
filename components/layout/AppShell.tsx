import type { ReactNode } from "react";
import { AppNav } from "@/components/layout/AppNav";

export function AppShell({ children }: { children: ReactNode }) {
  return (
    <div className="min-h-screen app-gradient-bg">
      <AppNav />
      <div className="mx-auto max-w-7xl">{children}</div>
    </div>
  );
}
