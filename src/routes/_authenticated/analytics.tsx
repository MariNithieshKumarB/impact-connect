import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useProfile } from "@/hooks/useProfile";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  BarChart, Bar, XAxis, YAxis, ResponsiveContainer, Tooltip,
  PieChart, Pie, Cell, Legend, RadialBarChart, RadialBar,
} from "recharts";

export const Route = createFileRoute("/_authenticated/analytics")({
  component: Analytics,
});

const COLORS = ["oklch(0.48 0.22 293)", "oklch(0.72 0.17 165)", "oklch(0.7 0.18 60)", "oklch(0.65 0.2 20)", "oklch(0.6 0.2 200)"];
const tooltipStyle = { background: "oklch(0.18 0.015 275)", border: "1px solid oklch(1 0 0 / 10%)", borderRadius: 12 };

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

function Analytics() {
  const { data: profile } = useProfile();
  const { data } = useQuery({
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

      const perOpp = opps.map((o: any) => ({
        name: o.title.length > 14 ? o.title.slice(0, 14) + "…" : o.title,
        applicants: o.applications?.length ?? 0,
      }));

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
      const selectionRate = total ? Math.round((accepted / total) * 100) : 0;

      return {
        perOpp,
        statusPie: Object.entries(statuses).map(([name, value]) => ({ name, value })),
        skillDemand,
        availability,
        selectionRate,
        selectionData: [{ name: "Selection", value: selectionRate, fill: "oklch(0.72 0.17 165)" }],
        totalApplicants: total,
        accepted,
      };
    },
  });

  return (
    <div className="mx-auto max-w-6xl space-y-6">
      <div>
        <h1 className="font-display text-3xl font-bold">Analytics</h1>
        <p className="text-sm text-muted-foreground">Live insights across opportunities, applicants, and skill demand.</p>
      </div>

      <div className="grid gap-4 sm:grid-cols-3">
        <Card className="glass border-border/50">
          <CardHeader className="pb-2"><CardTitle className="text-sm text-muted-foreground">Total Applicants</CardTitle></CardHeader>
          <CardContent><div className="font-display text-3xl font-bold">{data?.totalApplicants ?? 0}</div></CardContent>
        </Card>
        <Card className="glass border-border/50">
          <CardHeader className="pb-2"><CardTitle className="text-sm text-muted-foreground">Accepted</CardTitle></CardHeader>
          <CardContent><div className="font-display text-3xl font-bold">{data?.accepted ?? 0}</div></CardContent>
        </Card>
        <Card className="glass border-border/50">
          <CardHeader className="pb-2"><CardTitle className="text-sm text-muted-foreground">Selection Rate</CardTitle></CardHeader>
          <CardContent><div className="font-display text-3xl font-bold text-secondary">{data?.selectionRate ?? 0}%</div></CardContent>
        </Card>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <Card className="glass border-border/50">
          <CardHeader><CardTitle>Applications per Opportunity</CardTitle></CardHeader>
          <CardContent style={{ height: 300 }}>
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={data?.perOpp ?? []}>
                <XAxis dataKey="name" stroke="oklch(0.7 0.02 260)" fontSize={11} />
                <YAxis stroke="oklch(0.7 0.02 260)" fontSize={11} />
                <Tooltip contentStyle={tooltipStyle} />
                <Bar dataKey="applicants" fill="oklch(0.48 0.22 293)" radius={[8, 8, 0, 0]} animationDuration={800} />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <Card className="glass border-border/50">
          <CardHeader><CardTitle>Applications by Status</CardTitle></CardHeader>
          <CardContent style={{ height: 300 }}>
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie data={data?.statusPie ?? []} dataKey="value" nameKey="name" innerRadius={60} outerRadius={100} paddingAngle={4} animationDuration={800}>
                  {(data?.statusPie ?? []).map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                </Pie>
                <Legend />
                <Tooltip contentStyle={tooltipStyle} />
              </PieChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <Card className="glass border-border/50">
          <CardHeader><CardTitle>Skill Demand</CardTitle></CardHeader>
          <CardContent style={{ height: 300 }}>
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={data?.skillDemand ?? []} layout="vertical">
                <XAxis type="number" stroke="oklch(0.7 0.02 260)" fontSize={11} />
                <YAxis type="category" dataKey="name" stroke="oklch(0.7 0.02 260)" fontSize={11} width={100} />
                <Tooltip contentStyle={tooltipStyle} />
                <Bar dataKey="value" fill="oklch(0.72 0.17 165)" radius={[0, 8, 8, 0]} animationDuration={800} />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <Card className="glass border-border/50">
          <CardHeader><CardTitle>Volunteer Availability</CardTitle></CardHeader>
          <CardContent style={{ height: 300 }}>
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie data={data?.availability ?? []} dataKey="value" nameKey="name" outerRadius={100} animationDuration={800}>
                  {(data?.availability ?? []).map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                </Pie>
                <Legend />
                <Tooltip contentStyle={tooltipStyle} />
              </PieChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <Card className="glass border-border/50 lg:col-span-2">
          <CardHeader><CardTitle>Volunteer Selection Rate</CardTitle></CardHeader>
          <CardContent style={{ height: 240 }}>
            <ResponsiveContainer width="100%" height="100%">
              <RadialBarChart innerRadius="60%" outerRadius="100%" data={data?.selectionData ?? []} startAngle={90} endAngle={-270}>
                <RadialBar background dataKey="value" cornerRadius={12} animationDuration={900} />
                <Tooltip contentStyle={tooltipStyle} />
              </RadialBarChart>
            </ResponsiveContainer>
            <div className="-mt-40 text-center">
              <div className="font-display text-4xl font-bold text-secondary">{data?.selectionRate ?? 0}%</div>
              <div className="text-xs text-muted-foreground">of applicants accepted</div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
