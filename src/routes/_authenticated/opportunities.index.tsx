import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useProfile } from "@/hooks/useProfile";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { MapPin, Calendar, Users, Search } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

export const Route = createFileRoute("/_authenticated/opportunities")({
  component: OpportunitiesList,
});

function OpportunitiesList() {
  const { data: profile } = useProfile();
  const qc = useQueryClient();
  const [q, setQ] = useState("");

  const { data: opps, isLoading } = useQuery({
    queryKey: ["all-opps"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("opportunities")
        .select("*, ngos(organization_name, focus_area)")
        .eq("status", "open")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data;
    },
  });

  const { data: myApps } = useQuery({
    enabled: !!profile && profile.role === "volunteer",
    queryKey: ["my-app-ids", profile?.id],
    queryFn: async () => {
      const { data } = await supabase.from("applications").select("opportunity_id").eq("volunteer_id", profile!.id);
      return new Set((data ?? []).map((a) => a.opportunity_id));
    },
  });

  const apply = async (id: string) => {
    if (!profile) return;
    const { error } = await supabase.from("applications").insert({ opportunity_id: id, volunteer_id: profile.id });
    if (error) return toast.error(error.message);
    toast.success("Application sent!");
    qc.invalidateQueries({ queryKey: ["my-app-ids"] });
  };

  const filtered = (opps ?? []).filter((o) => {
    const s = q.toLowerCase();
    return !s || o.title.toLowerCase().includes(s) || o.description.toLowerCase().includes(s) || (o.location ?? "").toLowerCase().includes(s);
  });

  return (
    <div className="mx-auto max-w-6xl space-y-6">
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div>
          <h1 className="font-display text-3xl font-bold">Opportunities</h1>
          <p className="text-muted-foreground">Discover open opportunities from verified NGOs.</p>
        </div>
        <div className="relative w-full md:w-72">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search opportunities…" className="pl-9" />
        </div>
      </div>

      {isLoading ? (
        <p className="text-muted-foreground">Loading…</p>
      ) : filtered.length === 0 ? (
        <Card className="glass border-border/50"><CardContent className="p-12 text-center text-muted-foreground">No opportunities yet — check back soon.</CardContent></Card>
      ) : (
        <div className="grid gap-4 md:grid-cols-2">
          {filtered.map((o: any) => {
            const applied = myApps?.has(o.id);
            return (
              <Card key={o.id} className="glass group border-border/50 transition-all hover:-translate-y-1 hover:border-primary/40">
                <CardHeader>
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <CardTitle className="truncate text-lg">{o.title}</CardTitle>
                      <div className="mt-1 text-sm text-muted-foreground">{o.ngos?.organization_name}</div>
                    </div>
                    {o.ngos?.focus_area && <Badge variant="secondary" className="shrink-0">{o.ngos.focus_area}</Badge>}
                  </div>
                </CardHeader>
                <CardContent className="space-y-4">
                  <p className="line-clamp-3 text-sm text-muted-foreground">{o.description}</p>
                  <div className="flex flex-wrap gap-1.5">
                    {(o.required_skills ?? []).slice(0, 5).map((s: string) => (
                      <Badge key={s} variant="outline" className="border-primary/30">{s}</Badge>
                    ))}
                  </div>
                  <div className="flex flex-wrap gap-4 text-xs text-muted-foreground">
                    {o.location && <span className="flex items-center gap-1"><MapPin className="h-3 w-3" /> {o.location}</span>}
                    {o.deadline && <span className="flex items-center gap-1"><Calendar className="h-3 w-3" /> {new Date(o.deadline).toLocaleDateString()}</span>}
                    <span className="flex items-center gap-1"><Users className="h-3 w-3" /> {o.volunteers_needed} needed</span>
                  </div>
                  {profile?.role === "volunteer" && (
                    <Button
                      onClick={() => apply(o.id)}
                      disabled={applied}
                      className="w-full bg-gradient-to-r from-primary to-primary-glow text-white disabled:opacity-60"
                    >
                      {applied ? "Applied ✓" : "Apply Now"}
                    </Button>
                  )}
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
