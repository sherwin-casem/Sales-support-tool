import type { ReactNode } from "react";

interface AuthCardProps {
  title: string;
  description: string;
  children: ReactNode;
  footer?: ReactNode;
}

export function AuthCard({ title, description, children, footer }: AuthCardProps) {
  return (
    <div className="w-full max-w-md rounded-2xl border border-slate-200/80 bg-white p-8 shadow-xl shadow-slate-200/50">
      <div className="mb-8">
        <h1 className="text-2xl font-semibold tracking-tight text-slate-900">{title}</h1>
        <p className="mt-2 text-sm text-slate-600">{description}</p>
      </div>

      {children}

      {footer ? (
        <div className="mt-6 border-t border-slate-100 pt-6 text-center text-sm text-slate-600">
          {footer}
        </div>
      ) : null}
    </div>
  );
}
