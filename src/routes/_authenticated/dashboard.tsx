import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useProfile } from "@/hooks/useProfile";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Compass, FileText, PlusCircle, Users, TrendingUp, Sparkles } from "lucide-react";

export const Route = createFileRoute("/_authenticated/dashboard")({
  component: DashboardHome,
});

function StatCard({ label, value, icon: Icon, hint }: { label: string; value: number | string; icon: any; hint?: string }) {
  return (
    <Card className="glass border-border/50">
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-sm font-medium text-muted-foreground">{label}</CardTitle>
        <Icon className="h-4 w-4 text-primary" />
      </CardHeader>
      <CardContent>
        <div className="font-display text-3xl font-bold">{value}</div>
        {hint && <p className="mt-1 text-xs text-muted-foreground">{hint}</p>}
      </CardContent>
    </Card>
  );
}

function DashboardHome() {
  const { data: profile } = useProfile();

  const vol = useQuery({
    enabled: profile?.role === "volunteer",
    queryKey: ["vol-stats", profile?.id],
    queryFn: async () => {
      const [apps, opps] = await Promise.all([
        supabase.from("applications").select("id, status").eq("volunteer_id", profile!.id),
        supabase.from("opportunities").select("id", { count: "exact", head: true }).eq("status", "open"),
      ]);
      const applications = apps.data ?? [];
      return {
        total: applications.length,
        accepted: applications.filter((a) => a.status === "accepted").length,
        pending: applications.filter((a) => a.status === "pending").length,
        openOpps: opps.count ?? 0,
      };
    },
  });

  const ngo = useQuery({
    enabled: profile?.role === "ngo",
    queryKey: ["ngo-stats", profile?.id],
    queryFn: async () => {
      const [opps, apps] = await Promise.all([
        supabase.from("opportunities").select("id, status").eq("ngo_id", profile!.id),
        supabase.from("applications").select("id, opportunities!inner(ngo_id)").eq("opportunities.ngo_id", profile!.id),
      ]);
      const opportunities = opps.data ?? [];
      return {
        totalOpps: opportunities.length,
        openOpps: opportunities.filter((o) => o.status === "open").length,
        applicants: apps.data?.length ?? 0,
      };
    },
  });

  return (
    <div className="mx-auto max-w-6xl space-y-8">
      <div>
        <h1 className="font-display text-3xl font-bold md:text-4xl">
          {profile?.role === "ngo" ? "Organization Overview" : "Your Impact Dashboard"}
        </h1>
        <p className="mt-2 text-muted-foreground">
          {profile?.role === "ngo"
            ? "Manage opportunities, review applicants, and track engagement."
            : "Discover causes that need your skills and track your contributions."}
        </p>
      </div>

      {profile?.role === "volunteer" ? (
        <>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <StatCard label="Applications" value={vol.data?.total ?? 0} icon={FileText} />
            <StatCard label="Accepted" value={vol.data?.accepted ?? 0} icon={Sparkles} hint="Ready to make impact" />
            <StatCard label="Pending Review" value={vol.data?.pending ?? 0} icon={TrendingUp} />
            <StatCard label="Open Opportunities" value={vol.data?.openOpps ?? 0} icon={Compass} />
          </div>
          <Card className="glass border-border/50">
            <CardContent className="flex flex-col items-start gap-4 p-8 md:flex-row md:items-center md:justify-between">
              <div>
                <h3 className="font-display text-xl font-semibold">Find your next cause</h3>
                <p className="text-sm text-muted-foreground">Browse opportunities matched to your skills.</p>
              </div>
              <Button asChild className="bg-gradient-to-r from-primary to-primary-glow text-white">
                <Link to="/opportunities"><Compass className="mr-2 h-4 w-4" /> Explore Opportunities</Link>
              </Button>
            </CardContent>
          </Card>
        </>
      ) : (
        <>
          <div className="grid gap-4 sm:grid-cols-3">
            <StatCard label="Total Opportunities" value={ngo.data?.totalOpps ?? 0} icon={FileText} />
            <StatCard label="Currently Open" value={ngo.data?.openOpps ?? 0} icon={Sparkles} />
            <StatCard label="Total Applicants" value={ngo.data?.applicants ?? 0} icon={Users} />
          </div>
          <Card className="glass border-border/50">
            <CardContent className="flex flex-col items-start gap-4 p-8 md:flex-row md:items-center md:justify-between">
              <div>
                <h3 className="font-display text-xl font-semibold">Post a new opportunity</h3>
                <p className="text-sm text-muted-foreground">Describe what you need — we'll help the right volunteers find you.</p>
              </div>
              <Button asChild className="bg-gradient-to-r from-primary to-primary-glow text-white">
                <Link to="/opportunities/new"><PlusCircle className="mr-2 h-4 w-4" /> Create Opportunity</Link>
              </Button>
            </CardContent>
          </Card>
        </>
      )}
    </div>
  );
}
