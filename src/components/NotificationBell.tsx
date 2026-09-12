import { Link } from "@tanstack/react-router";
import { Bell, CheckCheck } from "lucide-react";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { cn } from "@/lib/utils";
import { useNotifications } from "@/hooks/useNotifications";

export function NotificationBell() {
  const { data, unread, isLoading, markRead, markAllRead } = useNotifications();
  const items = data ?? [];

  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button variant="ghost" size="icon" className="relative" aria-label={`Notifications${unread ? `, ${unread} unread` : ""}`}>
          <Bell className="h-4 w-4" />
          {unread > 0 && (
            <span className="absolute -right-0.5 -top-0.5 grid h-4 min-w-4 place-items-center rounded-full bg-secondary px-1 text-[10px] font-bold text-secondary-foreground">
              {unread > 9 ? "9+" : unread}
            </span>
          )}
        </Button>
      </PopoverTrigger>
      <PopoverContent align="end" className="w-80 p-0">
        <div className="flex items-center justify-between border-b border-border/50 px-3 py-2">
          <span className="text-sm font-semibold">Notifications</span>
          {unread > 0 && (
            <Button variant="ghost" size="sm" className="h-7 px-2 text-xs" onClick={() => void markAllRead()}>
              <CheckCheck className="mr-1 h-3 w-3" /> Mark all read
            </Button>
          )}
        </div>
        <ScrollArea className="max-h-80">
          {isLoading ? (
            <p className="p-4 text-sm text-muted-foreground">Loading…</p>
          ) : !items.length ? (
            <p className="p-6 text-center text-sm text-muted-foreground">
              You're all caught up. Updates about applications appear here.
            </p>
          ) : (
            <ul className="divide-y divide-border/40">
              {items.map((n) => {
                const inner = (
                  <div className={cn("px-3 py-2.5 transition-colors hover:bg-muted/40", !n.read_at && "bg-primary/5")}>
                    <div className="flex items-start gap-2">
                      {!n.read_at && <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-secondary" />}
                      <div className="min-w-0">
                        <div className="text-sm font-medium leading-snug">{n.title}</div>
                        {n.body && <div className="mt-0.5 text-xs text-muted-foreground">{n.body}</div>}
                        <div className="mt-1 text-[10px] uppercase tracking-wider text-muted-foreground">
                          {new Date(n.created_at).toLocaleString()}
                        </div>
                      </div>
                    </div>
                  </div>
                );
                return (
                  <li key={n.id} onClick={() => !n.read_at && void markRead(n.id)}>
                    {n.link === "/applicants" ? (
                      <Link to="/applicants" search={{ opportunity: undefined }}>{inner}</Link>
                    ) : n.link === "/applications" ? (
                      <Link to="/applications">{inner}</Link>
                    ) : (
                      inner
                    )}
                  </li>
                );
              })}
            </ul>
          )}
        </ScrollArea>
      </PopoverContent>
    </Popover>
  );
}
