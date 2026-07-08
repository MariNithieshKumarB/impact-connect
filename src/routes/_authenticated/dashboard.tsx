import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useProfile } from "@/hooks/useProfile";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Compass, FileText, PlusCircle, Users, TrendingUp, Sparkles, Trophy } from "lucide-react";
import { computeMatch } from "@/lib/matching";
import { MatchBadge } from "@/components/MatchBadge";

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
      const [apps, opps, me] = await Promise.all([
        supabase.from("applications").select("id, status, opportunity_id").eq("volunteer_id", profile!.id),
        supabase.from("opportunities").select("*, ngos(organization_name, focus_area)").eq("status", "open"),
        supabase.from("volunteers").select("*").eq("profile_id", profile!.id).maybeSingle(),
      ]);
      const applications = apps.data ?? [];
      const openOpps = opps.data ?? [];
      const appliedIds = new Set(applications.map((a) => a.opportunity_id));
      const ranked = me.data
        ? openOpps
            .map((o: any) => ({
              o,
              match: computeMatch(
                { ...me.data, location: profile?.location },
                { title: o.title, description: o.description, required_skills: o.required_skills, location: o.location, ngos: o.ngos },
              ),
            }))
            .sort((a, b) => b.match.score - a.match.score)
        : [];
      const avgMatch = ranked.length
        ? Math.round(ranked.slice(0, 10).reduce((s, r) => s + r.match.score, 0) / Math.min(10, ranked.length))
        : 0;
      return {
        total: applications.length,
        accepted: applications.filter((a) => a.status === "accepted").length,
        pending: applications.filter((a) => a.status === "pending").length,
        openOpps: openOpps.length,
        recommendations: ranked.filter((r) => !appliedIds.has(r.o.id)).slice(0, 4),
        top: ranked[0],
        avgMatch,
      };
    },
  });

  const ngo = useQuery({
    enabled: profile?.role === "ngo",
    queryKey: ["ngo-stats", profile?.id],
    queryFn: async () => {
      const [opps, apps] = await Promise.all([
        supabase.from("opportunities").select("id, status").eq("ngo_id", profile!.id),
        supabase.from("applications").select("id, status, opportunities!inner(ngo_id)").eq("opportunities.ngo_id", profile!.id),
      ]);
      const opportunities = opps.data ?? [];
      const applications = apps.data ?? [];
      const accepted = applications.filter((a: any) => a.status === "accepted").length;
      const pending = applications.filter((a: any) => a.status === "pending").length;
      const rejected = applications.filter((a: any) => a.status === "rejected").length;
      const rate = applications.length ? Math.round((accepted / applications.length) * 100) : 0;
      return {
        totalOpps: opportunities.length,
        openOpps: opportunities.filter((o) => o.status === "open").length,
        applicants: applications.length,
        accepted, pending, rejected,
        selectionRate: rate,
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
            <StatCard label="AI Match Score" value={`${vol.data?.avgMatch ?? 0}%`} icon={Sparkles} hint="Avg. across top opportunities" />
            <StatCard label="Applications" value={vol.data?.total ?? 0} icon={FileText} />
            <StatCard label="Accepted" value={vol.data?.accepted ?? 0} icon={Trophy} hint="Ready to make impact" />
            <StatCard label="Pending Review" value={vol.data?.pending ?? 0} icon={TrendingUp} />
          </div>

          {vol.data?.top && (
            <Card className="glass border-primary/30">
              <CardHeader>
                <div className="flex items-center gap-2">
                  <Trophy className="h-5 w-5 text-primary" />
                  <CardTitle>Top Match for You</CardTitle>
                </div>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <h3 className="font-display text-xl font-semibold">{vol.data.top.o.title}</h3>
                    <p className="text-sm text-muted-foreground">{vol.data.top.o.ngos?.organization_name}</p>
                  </div>
                  <MatchBadge match={vol.data.top.match} />
                </div>
                <p className="text-sm text-muted-foreground">{vol.data.top.match.recommendation}</p>
                <Button asChild className="bg-gradient-to-r from-primary to-primary-glow text-white">
                  <Link to="/opportunities">View & Apply</Link>
                </Button>
              </CardContent>
            </Card>
          )}

          <div>
            <div className="mb-3 flex items-center justify-between">
              <h2 className="font-display text-xl font-semibold">Recommended Opportunities</h2>
              <Button asChild variant="outline" size="sm"><Link to="/opportunities">See all</Link></Button>
            </div>
            {vol.data?.recommendations?.length ? (
              <div className="grid gap-3 md:grid-cols-2">
                {vol.data.recommendations.map(({ o, match }) => (
                  <Card key={o.id} className="glass border-border/50">
                    <CardContent className="space-y-2 p-4">
                      <div className="flex items-start justify-between gap-2">
                        <div className="min-w-0">
                          <div className="truncate font-semibold">{o.title}</div>
                          <div className="text-xs text-muted-foreground">{o.ngos?.organization_name}</div>
                        </div>
                        <MatchBadge match={match} compact />
                      </div>
                      <div className="flex flex-wrap gap-1.5">
                        {(o.required_skills ?? []).slice(0, 4).map((s: string) => (
                          <Badge key={s} variant="outline" className="border-primary/30 text-xs">{s}</Badge>
                        ))}
                      </div>
                      <p className="text-xs text-muted-foreground">{match.recommendation}</p>
                    </CardContent>
                  </Card>
                ))}
              </div>
            ) : (
              <Card className="glass border-border/50">
                <CardContent className="p-8 text-center text-sm text-muted-foreground">
                  Complete your profile with skills, interests & availability to unlock AI-matched recommendations.
                  <div className="mt-3">
                    <Button asChild size="sm" variant="outline"><Link to="/profile">Update profile</Link></Button>
                  </div>
                </CardContent>
              </Card>
            )}
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
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <StatCard label="Total Opportunities" value={ngo.data?.totalOpps ?? 0} icon={FileText} />
            <StatCard label="Currently Open" value={ngo.data?.openOpps ?? 0} icon={Sparkles} />
            <StatCard label="Total Applicants" value={ngo.data?.applicants ?? 0} icon={Users} />
            <StatCard label="Selection Rate" value={`${ngo.data?.selectionRate ?? 0}%`} icon={TrendingUp} hint="Accepted / total" />
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
