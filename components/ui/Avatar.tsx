import { cn } from "@/lib/utils/cn";

interface AvatarProps {
  name: string;
  size?: "sm" | "md" | "lg";
  className?: string;
}

const sizeClasses = {
  sm: "h-8 w-8 text-xs",
  md: "h-9 w-9 text-sm",
  lg: "h-11 w-11 text-base",
};

export function getInitials(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);

  if (parts.length === 0) {
    return "?";
  }

  if (parts.length === 1) {
    return parts[0]!.slice(0, 2).toUpperCase();
  }

  return `${parts[0]![0] ?? ""}${parts[1]![0] ?? ""}`.toUpperCase();
}

export function Avatar({ name, size = "md", className }: AvatarProps) {
  return (
    <div
      className={cn(
        "inline-flex shrink-0 items-center justify-center rounded-full bg-brand-600 font-semibold text-white ring-2 ring-white/10",
        sizeClasses[size],
        className,
      )}
      aria-hidden="true"
    >
      {getInitials(name)}
    </div>
  );
}
