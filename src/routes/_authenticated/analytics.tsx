import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useProfile } from "@/hooks/useProfile";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { BarChart, Bar, XAxis, YAxis, ResponsiveContainer, Tooltip, PieChart, Pie, Cell, Legend } from "recharts";

export const Route = createFileRoute("/_authenticated/analytics")({
  component: Analytics,
});

const COLORS = ["oklch(0.48 0.22 293)", "oklch(0.72 0.17 165)", "oklch(0.7 0.18 60)", "oklch(0.65 0.2 20)"];

function Analytics() {
  const { data: profile } = useProfile();
  const { data } = useQuery({
    enabled: !!profile,
    queryKey: ["analytics", profile?.id],
    queryFn: async () => {
      const { data: opps } = await supabase
        .from("opportunities")
        .select("id, title, status, applications(id, status)")
        .eq("ngo_id", profile!.id);
      const perOpp = (opps ?? []).map((o: any) => ({
        name: o.title.slice(0, 14),
        applicants: o.applications?.length ?? 0,
      }));
      const statuses = { pending: 0, accepted: 0, rejected: 0, withdrawn: 0 };
      (opps ?? []).forEach((o: any) => o.applications?.forEach((a: any) => {
        statuses[a.status as keyof typeof statuses] = (statuses[a.status as keyof typeof statuses] || 0) + 1;
      }));
      return {
        perOpp,
        statusPie: Object.entries(statuses).map(([name, value]) => ({ name, value })),
      };
    },
  });

  return (
    <div className="mx-auto max-w-6xl space-y-6">
      <h1 className="font-display text-3xl font-bold">Analytics</h1>
      <div className="grid gap-6 lg:grid-cols-2">
        <Card className="glass border-border/50">
          <CardHeader><CardTitle>Applicants per Opportunity</CardTitle></CardHeader>
          <CardContent style={{ height: 300 }}>
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={data?.perOpp ?? []}>
                <XAxis dataKey="name" stroke="oklch(0.7 0.02 260)" fontSize={11} />
                <YAxis stroke="oklch(0.7 0.02 260)" fontSize={11} />
                <Tooltip contentStyle={{ background: "oklch(0.18 0.015 275)", border: "1px solid oklch(1 0 0 / 10%)", borderRadius: 12 }} />
                <Bar dataKey="applicants" fill="oklch(0.48 0.22 293)" radius={[8, 8, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
        <Card className="glass border-border/50">
          <CardHeader><CardTitle>Applications by Status</CardTitle></CardHeader>
          <CardContent style={{ height: 300 }}>
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie data={data?.statusPie ?? []} dataKey="value" nameKey="name" innerRadius={60} outerRadius={100} paddingAngle={4}>
                  {(data?.statusPie ?? []).map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                </Pie>
                <Legend />
                <Tooltip contentStyle={{ background: "oklch(0.18 0.015 275)", border: "1px solid oklch(1 0 0 / 10%)", borderRadius: 12 }} />
              </PieChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
