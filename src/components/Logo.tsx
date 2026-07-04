import { cn } from "@/lib/utils";

export function Logo({ className, showText = true }: { className?: string; showText?: boolean }) {
  return (
    <div className={cn("flex items-center gap-2", className)}>
      <div className="relative grid h-9 w-9 shrink-0 place-items-center rounded-xl bg-gradient-to-br from-primary to-secondary shadow-[0_0_20px_-5px_var(--primary)]">
        <svg viewBox="0 0 24 24" className="h-5 w-5 text-white" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
          <path d="M18.6 6.6a5.5 5.5 0 0 0-7.8 0L9.4 8 8 6.6a5.5 5.5 0 0 0-7.8 7.8L8 22.2l1.4-1.4" opacity="0.9"/>
          <path d="M5.4 17.4a5.5 5.5 0 0 0 7.8 0L14.6 16l1.4 1.4a5.5 5.5 0 0 0 7.8-7.8L16 1.8" opacity="0.7"/>
        </svg>
      </div>
      {showText && (
        <div className="flex flex-col leading-none">
          <span className="font-display text-lg font-bold tracking-tight">Impact Link</span>
          <span className="text-[10px] uppercase tracking-widest text-muted-foreground">Connect · Volunteer</span>
        </div>
      )}
    </div>
  );
}
