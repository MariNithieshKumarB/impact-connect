import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useProfile } from "@/hooks/useProfile";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import {
  BarChart, Bar, XAxis, YAxis, ResponsiveContainer, Tooltip,
  PieChart, Pie, Cell, CartesianGrid,
} from "recharts";
import { ArrowRight, Compass, Users, CheckCircle2, TrendingUp, Sparkles } from "lucide-react";
import network from "@/assets/network.jpg";

export const Route = createFileRoute("/_authenticated/analytics")({
  component: Analytics,
});

const COLORS = [
  "oklch(0.62 0.24 300)",
  "oklch(0.72 0.17 165)",
  "oklch(0.7 0.18 60)",
  "oklch(0.65 0.2 20)",
  "oklch(0.6 0.2 220)",
];
const STATUS_COLORS: Record<string, string> = {
  pending: "oklch(0.7 0.18 60)",
  accepted: "oklch(0.72 0.17 165)",
  rejected: "oklch(0.65 0.2 20)",
  withdrawn: "oklch(0.5 0.02 275)",
};
const tooltipStyle = {
  background: "oklch(0.18 0.015 275)",
  border: "1px solid oklch(1 0 0 / 15%)",
  borderRadius: 12,
  fontSize: 12,
};

function classifyAvailability(text: string | null | undefined): string {
  if (!text) return "Unspecified";
  const t = text.toLowerCase();
  if (t.includes("weekend")) return "Weekends";
  if (t.includes("weekday")) return "Weekdays";
  if (t.includes("evening")) return "Evenings";
  if (t.includes("flexible")) return "Flexible";
  if (t.includes("full")) return "Full-time";
  if (t.includes("part")) return "Part-time";
  return "Other";
}

function FlowStep({
  icon: Icon, label, value, tint, isLast,
}: { icon: any; label: string; value: number; tint: string; isLast?: boolean }) {
  return (
    <div className="flex flex-1 items-center gap-3">
      <div className="glass flex-1 rounded-2xl p-5 transition-transform hover:-translate-y-0.5">
        <div className="flex items-center gap-3">
          <div
            className="grid h-11 w-11 place-items-center rounded-xl"
            style={{ background: `color-mix(in oklab, ${tint} 25%, transparent)` }}
          >
            <Icon className="h-5 w-5" style={{ color: tint }} />
          </div>
          <div className="min-w-0">
            <div className="text-xs uppercase tracking-wider text-muted-foreground">{label}</div>
            <div className="font-display text-2xl font-bold">{value}</div>
          </div>
        </div>
      </div>
      {!isLast && (
        <ArrowRight className="hidden h-5 w-5 shrink-0 text-muted-foreground md:block" aria-hidden />
      )}
    </div>
  );
}

function ChartSkeleton() {
  return (
    <div className="space-y-3">
      <Skeleton className="h-4 w-32" />
      <Skeleton className="h-[260px] w-full" />
    </div>
  );
}

function Analytics() {
  const { data: profile } = useProfile();
  const { data, isLoading } = useQuery({
    enabled: !!profile,
    queryKey: ["analytics", profile?.id],
    queryFn: async () => {
      const [oppsRes, applicantsRes] = await Promise.all([
        supabase
          .from("opportunities")
          .select("id, title, status, required_skills, applications(id, status, volunteer_id)")
          .eq("ngo_id", profile!.id),
        supabase
          .from("applications")
          .select("id, status, opportunities!inner(ngo_id), volunteers(availability)")
          .eq("opportunities.ngo_id", profile!.id),
      ]);
      const opps = oppsRes.data ?? [];
      const applicants = applicantsRes.data ?? [];

      const perOpp = opps
        .map((o: any) => ({
          name: o.title.length > 16 ? o.title.slice(0, 16) + "…" : o.title,
          applicants: o.applications?.length ?? 0,
          accepted: o.applications?.filter((a: any) => a.status === "accepted").length ?? 0,
        }))
        .sort((a, b) => b.applicants - a.applicants)
        .slice(0, 7);

      const statuses: Record<string, number> = { pending: 0, accepted: 0, rejected: 0, withdrawn: 0 };
      opps.forEach((o: any) => o.applications?.forEach((a: any) => {
        statuses[a.status] = (statuses[a.status] || 0) + 1;
      }));

      const skillCounts: Record<string, number> = {};
      opps.forEach((o: any) => (o.required_skills ?? []).forEach((s: string) => {
        skillCounts[s] = (skillCounts[s] || 0) + 1;
      }));
      const skillDemand = Object.entries(skillCounts)
        .sort((a, b) => b[1] - a[1])
        .slice(0, 8)
        .map(([name, value]) => ({ name, value }));

      const availCounts: Record<string, number> = {};
      applicants.forEach((a: any) => {
        const k = classifyAvailability(a.volunteers?.availability);
        availCounts[k] = (availCounts[k] || 0) + 1;
      });
      const availability = Object.entries(availCounts).map(([name, value]) => ({ name, value }));

      const total = applicants.length;
      const accepted = statuses.accepted;
      const pending = statuses.pending;
      const selectionRate = total ? Math.round((accepted / total) * 100) : 0;
      const responseRate = total ? Math.round(((total - pending) / total) * 100) : 0;

      return {
        perOpp,
        statusPie: Object.entries(statuses)
          .filter(([, v]) => v > 0)
          .map(([name, value]) => ({ name, value })),
        skillDemand,
        availability,
        selectionRate,
        responseRate,
        totalApplicants: total,
        accepted,
        pending,
        totalOpps: opps.length,
        openOpps: opps.filter((o: any) => o.status === "open").length,
      };
    },
  });

  const empty = !isLoading && (data?.totalOpps ?? 0) === 0;

  return (
    <div className="mx-auto max-w-6xl space-y-8">
      {/* HERO BANNER */}
      <div className="glass relative overflow-hidden rounded-3xl border-border/50 p-6 md:p-8">
        <img
          src={network}
          alt=""
          aria-hidden
          loading="lazy"
          className="pointer-events-none absolute inset-0 h-full w-full object-cover opacity-20"
        />
        <div className="pointer-events-none absolute inset-0 bg-gradient-to-r from-background via-background/70 to-transparent" />
        <div className="relative flex flex-wrap items-center justify-between gap-4">
          <div>
            <div className="inline-flex items-center gap-2 rounded-full border border-border/60 bg-card/60 px-3 py-1 text-xs text-muted-foreground backdrop-blur">
              <Sparkles className="h-3 w-3 text-secondary" /> Live insights
            </div>
            <h1 className="mt-3 font-display text-3xl font-bold md:text-4xl">Impact Analytics</h1>
            <p className="mt-1 max-w-xl text-sm text-muted-foreground">
              Track how volunteers flow from discovery to real-world impact across your opportunities.
            </p>
          </div>
          <Button asChild variant="outline">
            <Link to="/applicants">Review applicants</Link>
          </Button>
        </div>
      </div>

      {empty ? (
        <Card className="glass border-border/50">
          <CardContent className="flex flex-col items-center gap-4 p-12 text-center">
            <div className="grid h-14 w-14 place-items-center rounded-2xl bg-gradient-to-br from-primary/30 to-secondary/20">
              <TrendingUp className="h-6 w-6 text-primary-foreground" />
            </div>
            <div>
              <h3 className="font-display text-xl font-semibold">No data yet</h3>
              <p className="mt-1 max-w-md text-sm text-muted-foreground">
                Publish your first opportunity to start collecting applicant insights, skill demand, and selection metrics.
              </p>
            </div>
            <Button asChild className="bg-gradient-to-r from-primary to-primary-glow text-white">
              <Link to="/opportunities/new">Post an opportunity</Link>
            </Button>
          </CardContent>
        </Card>
      ) : (
        <>
          {/* APPLICATION FLOW */}
          <div>
            <div className="mb-3 flex items-center gap-2">
              <div className="h-1.5 w-8 rounded-full bg-gradient-to-r from-primary to-secondary" />
              <h2 className="font-display text-lg font-semibold">Application flow</h2>
            </div>
            <div className="flex flex-col gap-3 md:flex-row md:items-stretch">
              <FlowStep icon={Compass} label="Opportunities" value={data?.totalOpps ?? 0} tint="oklch(0.62 0.24 300)" />
              <FlowStep icon={Users} label="Applicants" value={data?.totalApplicants ?? 0} tint="oklch(0.7 0.18 60)" />
              <FlowStep icon={CheckCircle2} label="Accepted" value={data?.accepted ?? 0} tint="oklch(0.72 0.17 165)" isLast />
            </div>

            {/* Conversion bars */}
            <div className="glass mt-4 rounded-2xl p-5">
              <div className="grid gap-4 sm:grid-cols-2">
                <ConversionBar
                  label="Response rate"
                  hint="Reviewed vs. total applicants"
                  value={data?.responseRate ?? 0}
                  color="oklch(0.62 0.24 300)"
                />
                <ConversionBar
                  label="Selection rate"
                  hint="Accepted vs. total applicants"
                  value={data?.selectionRate ?? 0}
                  color="oklch(0.72 0.17 165)"
                />
              </div>
            </div>
          </div>

          {/* CHARTS GRID */}
          <div className="grid gap-6 lg:grid-cols-2">
            <Card className="glass border-border/50">
              <CardHeader>
                <CardTitle className="text-base">Applications per opportunity</CardTitle>
                <p className="text-xs text-muted-foreground">Total applicants (purple) vs. accepted (emerald)</p>
              </CardHeader>
              <CardContent style={{ height: 300 }}>
                {isLoading ? <ChartSkeleton /> : (
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={data?.perOpp ?? []} margin={{ top: 8, right: 8, left: -16, bottom: 0 }}>
                      <CartesianGrid stroke="oklch(1 0 0 / 6%)" vertical={false} />
                      <XAxis dataKey="name" stroke="oklch(0.7 0.02 260)" fontSize={11} tickLine={false} axisLine={false} />
                      <YAxis stroke="oklch(0.7 0.02 260)" fontSize={11} tickLine={false} axisLine={false} allowDecimals={false} />
                      <Tooltip contentStyle={tooltipStyle} cursor={{ fill: "oklch(1 0 0 / 4%)" }} />
                      <Bar dataKey="applicants" fill="oklch(0.62 0.24 300)" radius={[8, 8, 0, 0]} animationDuration={900} />
                      <Bar dataKey="accepted" fill="oklch(0.72 0.17 165)" radius={[8, 8, 0, 0]} animationDuration={900} animationBegin={150} />
                    </BarChart>
                  </ResponsiveContainer>
                )}
              </CardContent>
            </Card>

            <Card className="glass border-border/50">
              <CardHeader>
                <CardTitle className="text-base">Applications by status</CardTitle>
                <p className="text-xs text-muted-foreground">Breakdown of every application received</p>
              </CardHeader>
              <CardContent style={{ height: 300 }}>
                {isLoading ? <ChartSkeleton /> : (
                  <div className="grid h-full grid-cols-[1fr_auto] items-center gap-4">
                    <ResponsiveContainer width="100%" height="100%">
                      <PieChart>
                        <Pie
                          data={data?.statusPie ?? []}
                          dataKey="value"
                          nameKey="name"
                          innerRadius={60}
                          outerRadius={95}
                          paddingAngle={3}
                          animationDuration={900}
                        >
                          {(data?.statusPie ?? []).map((s) => (
                            <Cell key={s.name} fill={STATUS_COLORS[s.name] ?? "oklch(0.5 0.02 275)"} />
                          ))}
                        </Pie>
                        <Tooltip contentStyle={tooltipStyle} />
                      </PieChart>
                    </ResponsiveContainer>
                    <ul className="space-y-2 pr-2 text-xs">
                      {(data?.statusPie ?? []).map((s) => (
                        <li key={s.name} className="flex items-center gap-2">
                          <span
                            className="inline-block h-2.5 w-2.5 rounded-full"
                            style={{ background: STATUS_COLORS[s.name] ?? "oklch(0.5 0.02 275)" }}
                          />
                          <span className="capitalize text-muted-foreground">{s.name}</span>
                          <span className="ml-auto font-semibold">{s.value}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
              </CardContent>
            </Card>

            <Card className="glass border-border/50">
              <CardHeader>
                <CardTitle className="text-base">Skill demand</CardTitle>
                <p className="text-xs text-muted-foreground">Skills most requested across your opportunities</p>
              </CardHeader>
              <CardContent style={{ height: 300 }}>
                {isLoading ? <ChartSkeleton /> : (
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={data?.skillDemand ?? []} layout="vertical" margin={{ top: 8, right: 16, left: 8, bottom: 0 }}>
                      <CartesianGrid stroke="oklch(1 0 0 / 6%)" horizontal={false} />
                      <XAxis type="number" stroke="oklch(0.7 0.02 260)" fontSize={11} tickLine={false} axisLine={false} allowDecimals={false} />
                      <YAxis type="category" dataKey="name" stroke="oklch(0.7 0.02 260)" fontSize={11} width={100} tickLine={false} axisLine={false} />
                      <Tooltip contentStyle={tooltipStyle} cursor={{ fill: "oklch(1 0 0 / 4%)" }} />
                      <Bar dataKey="value" fill="oklch(0.72 0.17 165)" radius={[0, 8, 8, 0]} animationDuration={900} />
                    </BarChart>
                  </ResponsiveContainer>
                )}
              </CardContent>
            </Card>

            <Card className="glass border-border/50">
              <CardHeader>
                <CardTitle className="text-base">Volunteer availability</CardTitle>
                <p className="text-xs text-muted-foreground">When your applicants can contribute</p>
              </CardHeader>
              <CardContent style={{ height: 300 }}>
                {isLoading ? <ChartSkeleton /> : (data?.availability?.length ?? 0) === 0 ? (
                  <div className="grid h-full place-items-center text-sm text-muted-foreground">
                    No availability data yet.
                  </div>
                ) : (
                  <div className="grid h-full grid-cols-[1fr_auto] items-center gap-4">
                    <ResponsiveContainer width="100%" height="100%">
                      <PieChart>
                        <Pie
                          data={data?.availability ?? []}
                          dataKey="value"
                          nameKey="name"
                          outerRadius={100}
                          animationDuration={900}
                        >
                          {(data?.availability ?? []).map((_, i) => (
                            <Cell key={i} fill={COLORS[i % COLORS.length]} />
                          ))}
                        </Pie>
                        <Tooltip contentStyle={tooltipStyle} />
                      </PieChart>
                    </ResponsiveContainer>
                    <ul className="space-y-2 pr-2 text-xs">
                      {(data?.availability ?? []).map((s, i) => (
                        <li key={s.name} className="flex items-center gap-2">
                          <span
                            className="inline-block h-2.5 w-2.5 rounded-full"
                            style={{ background: COLORS[i % COLORS.length] }}
                          />
                          <span className="text-muted-foreground">{s.name}</span>
                          <span className="ml-auto font-semibold">{s.value}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </>
      )}
    </div>
  );
}

function ConversionBar({ label, hint, value, color }: { label: string; hint: string; value: number; color: string }) {
  return (
    <div>
      <div className="mb-2 flex items-baseline justify-between">
        <div>
          <div className="text-sm font-medium">{label}</div>
          <div className="text-xs text-muted-foreground">{hint}</div>
        </div>
        <div className="font-display text-2xl font-bold" style={{ color }}>{value}%</div>
      </div>
      <div className="h-2 overflow-hidden rounded-full bg-muted/60">
        <div
          className="h-full rounded-full transition-[width] duration-1000 ease-out"
          style={{ width: `${Math.min(100, Math.max(0, value))}%`, background: color }}
        />
      </div>
    </div>
  );
}
