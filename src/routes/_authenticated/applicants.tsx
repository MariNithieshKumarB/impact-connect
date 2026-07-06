import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useProfile } from "@/hooks/useProfile";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { toast } from "sonner";
import { Check, X } from "lucide-react";
import { computeMatch } from "@/lib/matching";
import { MatchDetails } from "@/components/MatchBadge";

export const Route = createFileRoute("/_authenticated/applicants")({
  component: Applicants,
});

function Applicants() {
  const { data: profile } = useProfile();
  const qc = useQueryClient();
  const { data, isLoading } = useQuery({
    enabled: !!profile && profile.role === "ngo",
    queryKey: ["applicants", profile?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("applications")
        .select(
          "*, opportunities!inner(id, title, ngo_id, required_skills, location, description), volunteers(profile_id, skills, interests, availability, experience, preferred_location), profiles:volunteer_id(full_name, location)",
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

  const update = async (id: string, status: "accepted" | "rejected") => {
    const { error } = await supabase.from("applications").update({ status }).eq("id", id);
    if (error) return toast.error(error.message);
    toast.success(`Application ${status}`);
    qc.invalidateQueries({ queryKey: ["applicants"] });
  };

  return (
    <div className="mx-auto max-w-5xl space-y-6">
      <div>
        <h1 className="font-display text-3xl font-bold">Applicants</h1>
        <p className="text-sm text-muted-foreground">Ranked by AI match score — highest fit first.</p>
      </div>
      {isLoading ? <p className="text-muted-foreground">Loading…</p> :
        !data?.length ? (
          <Card className="glass border-border/50"><CardContent className="p-12 text-center text-muted-foreground">No applications yet.</CardContent></Card>
        ) : (
          <div className="grid gap-4">
            {data.map((a: any) => (
              <Card key={a.id} className="glass border-border/50">
                <CardHeader>
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div className="flex items-center gap-3">
                      <Avatar className="h-10 w-10">
                        <AvatarFallback className="bg-gradient-to-br from-primary to-secondary text-white text-xs">
                          {a.profiles?.full_name?.slice(0, 2).toUpperCase() ?? "??"}
                        </AvatarFallback>
                      </Avatar>
                      <div>
                        <CardTitle className="text-base">{a.profiles?.full_name}</CardTitle>
                        <div className="text-xs text-muted-foreground">Applied to: {a.opportunities?.title}</div>
                      </div>
                    </div>
                    <Badge variant={a.status === "pending" ? "outline" : "default"} className={a.status === "accepted" ? "bg-secondary text-secondary-foreground" : ""}>
                      {a.status}
                    </Badge>
                  </div>
                </CardHeader>
                <CardContent className="space-y-3">
                  <MatchDetails match={a.match} />
                  <div className="flex flex-wrap gap-1.5">
                    {(a.volunteers?.skills ?? []).slice(0, 8).map((s: string) => (
                      <Badge key={s} variant="outline" className="border-primary/30">{s}</Badge>
                    ))}
                  </div>
                  {a.volunteers?.availability && <p className="text-xs text-muted-foreground">Availability: {a.volunteers.availability}</p>}
                  {a.status === "pending" && (
                    <div className="flex gap-2">
                      <Button size="sm" onClick={() => update(a.id, "accepted")} className="bg-secondary text-secondary-foreground hover:bg-secondary/90">
                        <Check className="mr-1 h-3 w-3" /> Accept
                      </Button>
                      <Button size="sm" variant="outline" onClick={() => update(a.id, "rejected")}>
                        <X className="mr-1 h-3 w-3" /> Reject
                      </Button>
                    </div>
                  )}
                </CardContent>
              </Card>
            ))}
          </div>
        )}
    </div>
  );
}
