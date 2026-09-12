import { Link, useRouterState, useNavigate } from "@tanstack/react-router";
import { useQueryClient } from "@tanstack/react-query";
import {
  Sidebar, SidebarContent, SidebarGroup, SidebarGroupContent, SidebarGroupLabel,
  SidebarMenu, SidebarMenuButton, SidebarMenuItem, SidebarProvider, SidebarTrigger,
  SidebarFooter, SidebarHeader, useSidebar,
} from "@/components/ui/sidebar";
import { Logo } from "./Logo";
import { useProfile } from "@/hooks/useProfile";
import { supabase } from "@/integrations/supabase/client";
import {
  LayoutDashboard, UserRound, Compass, FileText, PlusCircle, Briefcase, Users, BarChart3, LogOut, Loader2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { NotificationBell } from "./NotificationBell";
import { useRealtimeSync } from "@/hooks/useRealtimeSync";

const VOLUNTEER_ITEMS = [
  { title: "Dashboard", to: "/dashboard", icon: LayoutDashboard },
  { title: "Profile", to: "/profile", icon: UserRound },
  { title: "Opportunities", to: "/opportunities", icon: Compass },
  { title: "My Applications", to: "/applications", icon: FileText },
] as const;

const NGO_ITEMS = [
  { title: "Dashboard", to: "/dashboard", icon: LayoutDashboard },
  { title: "Profile", to: "/profile", icon: UserRound },
  { title: "Create Opportunity", to: "/opportunities/new", icon: PlusCircle },
  { title: "Manage Opportunities", to: "/opportunities/manage", icon: Briefcase },
  { title: "Applicants", to: "/applicants", icon: Users },
  { title: "Analytics", to: "/analytics", icon: BarChart3 },
] as const;

function AppSidebar() {
  const { data: profile } = useProfile();
  const { state } = useSidebar();
  const path = useRouterState({ select: (r) => r.location.pathname });
  const collapsed = state === "collapsed";
  const items = profile?.role === "ngo" ? NGO_ITEMS : VOLUNTEER_ITEMS;

  return (
    <Sidebar collapsible="icon" className="border-r border-sidebar-border">
      <SidebarHeader className="border-b border-sidebar-border p-3">
        <Link to="/dashboard"><Logo showText={!collapsed} /></Link>
      </SidebarHeader>
      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupLabel>{profile?.role === "ngo" ? "Organization" : "Volunteer"}</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {items.map((it) => {
                const active = path === it.to || (it.to !== "/dashboard" && path.startsWith(it.to));
                return (
                  <SidebarMenuItem key={it.to}>
                    <SidebarMenuButton asChild isActive={active}>
                      <Link to={it.to} className="flex items-center gap-2">
                        <it.icon className="h-4 w-4" />
                        {!collapsed && <span>{it.title}</span>}
                      </Link>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                );
              })}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>
      <SidebarFooter className="border-t border-sidebar-border p-3">
        {!collapsed && profile && (
          <div className="flex items-center gap-2 rounded-lg bg-sidebar-accent/50 p-2">
            <Avatar className="h-8 w-8">
              <AvatarFallback className="bg-gradient-to-br from-primary to-secondary text-xs text-white">
                {profile.full_name?.slice(0, 2).toUpperCase() || "??"}
              </AvatarFallback>
            </Avatar>
            <div className="min-w-0 flex-1">
              <div className="truncate text-sm font-medium">{profile.full_name}</div>
              <div className="text-xs capitalize text-muted-foreground">{profile.role}</div>
            </div>
          </div>
        )}
      </SidebarFooter>
    </Sidebar>
  );
}

export function DashboardShell({ children }: { children: React.ReactNode }) {
  const { data: profile, isLoading } = useProfile();
  const navigate = useNavigate();
  const qc = useQueryClient();
  useRealtimeSync();

  const signOut = async () => {
    await qc.cancelQueries();
    qc.clear();
    await supabase.auth.signOut();
    navigate({ to: "/auth", replace: true });
  };

  if (isLoading) {
    return (
      <div className="grid min-h-screen place-items-center bg-background">
        <Loader2 className="h-6 w-6 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <SidebarProvider>
      <div className="flex min-h-screen w-full bg-background">
        <AppSidebar />
        <div className="flex flex-1 flex-col">
          <header className="sticky top-0 z-30 flex h-14 items-center justify-between border-b border-border/40 bg-background/70 px-4 backdrop-blur-xl">
            <div className="flex items-center gap-2">
              <SidebarTrigger />
              <div className="text-sm text-muted-foreground">
                Welcome back, <span className="text-foreground">{profile?.full_name?.split(" ")[0] || "friend"}</span>
              </div>
            </div>
            <Button variant="ghost" size="sm" onClick={signOut}>
              <LogOut className="mr-2 h-4 w-4" /> Sign out
            </Button>
          </header>
          <main className="flex-1 p-4 sm:p-6 lg:p-8">{children}</main>
        </div>
      </div>
    </SidebarProvider>
  );
}
