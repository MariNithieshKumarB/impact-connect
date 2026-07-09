import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useProfile } from "@/hooks/useProfile";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useMemo, useState } from "react";
import { Calendar, MapPin, Compass, CheckCircle2, Circle, Clock, XCircle } from "lucide-react";
import { categoryImage } from "@/lib/category-image";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/_authenticated/applications")({
  component: MyApplications,
});

const statusStyles: Record<string, string> = {
  pending: "border-amber-400/50 text-amber-300",
  accepted: "border-emerald-400/50 text-emerald-300",
  rejected: "border-destructive/50 text-destructive",
  completed: "border-sky-400/50 text-sky-300",
  withdrawn: "border-border/60 text-muted-foreground",
};

function MyApplications() {
  const { data: profile } = useProfile();
  const [filter, setFilter] = useState("all");
  const { data, isLoading } = useQuery({
    enabled: !!profile,
    queryKey: ["my-apps", profile?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("applications")
        .select("*, opportunities(title, location, description, ngos(organization_name, focus_area))")
        .eq("volunteer_id", profile!.id)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data;
    },
  });

  const counts = useMemo(() => {
    const c = { total: 0, pending: 0, accepted: 0, rejected: 0 };
    (data ?? []).forEach((a: any) => {
      c.total++;
      if (a.status in c) (c as any)[a.status]++;
    });
    return c;
  }, [data]);

  const filtered = useMemo(() => {
    if (!data) return [];
    if (filter === "all") return data;
    return data.filter((a: any) => a.status === filter);
  }, [data, filter]);

  return (
    <div className="mx-auto max-w-5xl space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="font-display text-3xl font-bold">My Applications</h1>
          <p className="text-sm text-muted-foreground">Track every opportunity you've applied to.</p>
        </div>
        <Select value={filter} onValueChange={setFilter}>
          <SelectTrigger className="w-44"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All statuses</SelectItem>
            <SelectItem value="pending">Pending</SelectItem>
            <SelectItem value="accepted">Accepted</SelectItem>
            <SelectItem value="rejected">Rejected</SelectItem>
            <SelectItem value="completed">Completed</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        {([
          ["Total", counts.total, "border-border/50"],
          ["Pending", counts.pending, "border-amber-400/40"],
          ["Accepted", counts.accepted, "border-emerald-400/40"],
          ["Rejected", counts.rejected, "border-destructive/40"],
        ] as const).map(([label, val, cls]) => (
          <Card key={label} className={`glass ${cls}`}>
            <CardContent className="p-4">
              <div className="text-xs uppercase tracking-wider text-muted-foreground">{label}</div>
              <div className="font-display text-2xl font-bold">{val}</div>
            </CardContent>
          </Card>
        ))}
      </div>

      {isLoading ? <p className="text-muted-foreground">Loading…</p> :
        !filtered.length ? (
          <Card className="glass border-border/50">
            <CardContent className="flex flex-col items-center gap-3 p-12 text-center">
              <Compass className="h-10 w-10 text-primary" />
              <p className="text-muted-foreground">No applications in this view yet.</p>
              <Button asChild className="bg-gradient-to-r from-primary to-primary-glow text-white">
                <Link to="/opportunities">Explore opportunities</Link>
              </Button>
            </CardContent>
          </Card>
        ) : (
          <div className="grid gap-4">
            {filtered.map((a: any) => (
              <Card key={a.id} className="glass overflow-hidden border-border/50 transition-all hover:-translate-y-0.5 hover:border-primary/40">
                <div className="grid gap-0 md:grid-cols-[180px_1fr]">
                  <div className="relative h-32 md:h-full">
                    <img
                      src={categoryImage(a.opportunities?.title, a.opportunities?.ngos?.focus_area, a.opportunities?.description)}
                      alt=""
                      loading="lazy"
                      className="h-full w-full object-cover"
                    />
                    <div className="absolute inset-0 bg-gradient-to-r from-background/40 via-transparent to-transparent" />
                  </div>
                  <div>
                    <CardHeader>
                      <div className="flex flex-wrap items-start justify-between gap-3">
                        <div>
                          <CardTitle className="text-lg">{a.opportunities?.title}</CardTitle>
                          <div className="mt-1 flex flex-wrap items-center gap-3 text-xs text-muted-foreground">
                            <span>{a.opportunities?.ngos?.organization_name}</span>
                            {a.opportunities?.ngos?.focus_area && <Badge variant="secondary" className="text-[10px]">{a.opportunities.ngos.focus_area}</Badge>}
                          </div>
                        </div>
                        <Badge variant="outline" className={statusStyles[a.status] ?? ""}>{a.status}</Badge>
                      </div>
                    </CardHeader>
                    <CardContent className="flex flex-wrap items-center gap-4 pt-0 text-xs text-muted-foreground">
                      {a.opportunities?.location && <span className="flex items-center gap-1"><MapPin className="h-3 w-3" /> {a.opportunities.location}</span>}
                      <span className="flex items-center gap-1"><Calendar className="h-3 w-3" /> Applied {new Date(a.created_at).toLocaleDateString()}</span>
                    </CardContent>
                  </div>
                </div>
              </Card>
            ))}
          </div>
        )}
    </div>
  );
}
