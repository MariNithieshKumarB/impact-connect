import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useProfile } from "@/hooks/useProfile";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import { Check, X, Clock, MapPin, Briefcase } from "lucide-react";
import { computeMatch } from "@/lib/matching";
import { MatchDetails } from "@/components/MatchBadge";
import { useMemo, useState } from "react";

export const Route = createFileRoute("/_authenticated/applicants")({
  validateSearch: (s: Record<string, unknown>) => ({
    opportunity: typeof s.opportunity === "string" ? s.opportunity : undefined,
  }),
  component: Applicants,
});

function Applicants() {
  const { data: profile } = useProfile();
  const { opportunity: oppFilter } = Route.useSearch();
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const qc = useQueryClient();

  const { data, isLoading } = useQuery({
    enabled: !!profile && profile.role === "ngo",
    queryKey: ["applicants", profile?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("applications")
        .select(
          "*, opportunities!inner(id, title, ngo_id, required_skills, location, description), volunteers(profile_id, skills, interests, availability, experience, preferred_location), profiles:volunteer_id(full_name, avatar, location)",
        )
        .eq("opportunities.ngo_id", profile!.id)
        .order("created_at", { ascending: false });
      if (error) throw error;
      const ranked = (data ?? []).map((a: any) => {
        const match = computeMatch(
          {
            skills: a.volunteers?.skills,
            interests: a.volunteers?.interests,
            availability: a.volunteers?.availability,
            experience: a.volunteers?.experience,
            preferred_location: a.volunteers?.preferred_location,
            location: a.profiles?.location,
          },
          {
            title: a.opportunities?.title,
            description: a.opportunities?.description,
            required_skills: a.opportunities?.required_skills,
            location: a.opportunities?.location,
          },
        );
        return { ...a, match };
      });
      ranked.sort((a: any, b: any) => b.match.score - a.match.score);
      return ranked;
    },
  });

  const filtered = useMemo(() => {
    let list = data ?? [];
    if (oppFilter) list = list.filter((a: any) => a.opportunities?.id === oppFilter);
    if (statusFilter !== "all") list = list.filter((a: any) => a.status === statusFilter);
    return list;
  }, [data, oppFilter, statusFilter]);

  const counts = useMemo(() => {
    const base = { total: 0, pending: 0, accepted: 0, rejected: 0 };
    (data ?? []).forEach((a: any) => {
      if (oppFilter && a.opportunities?.id !== oppFilter) return;
      base.total++;
      if (a.status in base) (base as any)[a.status]++;
    });
    return base;
  }, [data, oppFilter]);

  const update = async (id: string, status: "accepted" | "rejected" | "pending") => {
    const { error } = await supabase.from("applications").update({ status }).eq("id", id);
    if (error) return toast.error(error.message);
    toast.success(`Application ${status === "pending" ? "reset to pending" : status}`);
    qc.invalidateQueries({ queryKey: ["applicants"] });
    qc.invalidateQueries({ queryKey: ["ngo-stats"] });
    qc.invalidateQueries({ queryKey: ["analytics"] });
  };

  const oppTitle = oppFilter ? (data ?? []).find((a: any) => a.opportunities?.id === oppFilter)?.opportunities?.title : null;

  return (
    <div className="mx-auto max-w-5xl space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="font-display text-3xl font-bold">Applicants</h1>
          <p className="text-sm text-muted-foreground">
            {oppTitle ? <>Filtered to <span className="text-foreground">{oppTitle}</span> · </> : null}
            Ranked by AI match score — highest fit first.
          </p>
        </div>
        <div className="flex items-center gap-2">
          {oppFilter && <Button asChild variant="outline" size="sm"><Link to="/applicants" search={{ opportunity: undefined }}>Clear filter</Link></Button>}
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="w-40"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All statuses</SelectItem>
              <SelectItem value="pending">Pending</SelectItem>
              <SelectItem value="accepted">Accepted</SelectItem>
              <SelectItem value="rejected">Rejected</SelectItem>
            </SelectContent>
          </Select>
        </div>
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
          <Card className="glass border-border/50"><CardContent className="p-12 text-center text-muted-foreground">No applications match this view.</CardContent></Card>
        ) : (
          <div className="grid gap-4">
            {filtered.map((a: any) => (
              <Card key={a.id} className="glass border-border/50 transition-all hover:-translate-y-0.5 hover:border-primary/40">
                <CardHeader>
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div className="flex items-center gap-3">
                      <Avatar className="h-11 w-11">
                        {a.profiles?.avatar ? <img src={a.profiles.avatar} alt="" /> : null}
                        <AvatarFallback className="bg-gradient-to-br from-primary to-secondary text-xs text-white">
                          {a.profiles?.full_name?.slice(0, 2).toUpperCase() ?? "??"}
                        </AvatarFallback>
                      </Avatar>
                      <div>
                        <CardTitle className="text-base">{a.profiles?.full_name}</CardTitle>
                        <div className="mt-0.5 flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
                          <span>Applied to: {a.opportunities?.title}</span>
                          {a.profiles?.location && <span className="flex items-center gap-1"><MapPin className="h-3 w-3" /> {a.profiles.location}</span>}
                        </div>
                      </div>
                    </div>
                    <Badge
                      variant="outline"
                      className={
                        a.status === "accepted" ? "border-emerald-400/50 text-emerald-300" :
                        a.status === "rejected" ? "border-destructive/50 text-destructive" :
                        "border-amber-400/50 text-amber-300"
                      }
                    >
                      {a.status}
                    </Badge>
                  </div>
                </CardHeader>
                <CardContent className="space-y-3">
                  <MatchDetails match={a.match} />
                  {a.volunteers?.experience && (
                    <p className="flex items-start gap-2 text-xs text-muted-foreground">
                      <Briefcase className="mt-0.5 h-3 w-3 shrink-0 text-primary" />
                      <span className="line-clamp-2">{a.volunteers.experience}</span>
                    </p>
                  )}
                  <div className="flex flex-wrap gap-1.5">
                    {(a.volunteers?.skills ?? []).slice(0, 8).map((s: string) => (
                      <Badge key={s} variant="outline" className="border-primary/30">{s}</Badge>
                    ))}
                  </div>
                  {a.volunteers?.availability && <p className="text-xs text-muted-foreground">Availability: {a.volunteers.availability}</p>}
                  <div className="flex flex-wrap gap-2 pt-1">
                    <Button size="sm" disabled={a.status === "accepted"} onClick={() => update(a.id, "accepted")} className="bg-secondary text-secondary-foreground hover:bg-secondary/90 disabled:opacity-50">
                      <Check className="mr-1 h-3 w-3" /> Accept
                    </Button>
                    <Button size="sm" disabled={a.status === "pending"} variant="outline" onClick={() => update(a.id, "pending")}>
                      <Clock className="mr-1 h-3 w-3" /> Pending
                    </Button>
                    <Button size="sm" disabled={a.status === "rejected"} variant="outline" onClick={() => update(a.id, "rejected")} className="text-destructive hover:text-destructive disabled:opacity-50">
                      <X className="mr-1 h-3 w-3" /> Reject
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
    </div>
  );
}
