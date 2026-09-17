import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useProfile } from "@/hooks/useProfile";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { MapPin, Calendar, Users, Search, SlidersHorizontal } from "lucide-react";
import { useMemo, useState } from "react";
import { toast } from "sonner";
import { AISuggestButton } from "@/components/AISuggestButton";
import { computeMatch } from "@/lib/matching";
import { MatchBadge, MatchDetails } from "@/components/MatchBadge";
import { categoryImage } from "@/lib/category-image";

export const Route = createFileRoute("/_authenticated/opportunities/")({
  component: OpportunitiesList,
});

function OpportunitiesList() {
  const { data: profile } = useProfile();
  const qc = useQueryClient();
  const [q, setQ] = useState("");
  const [skill, setSkill] = useState("");
  const [loc, setLoc] = useState("");
  const [cause, setCause] = useState<string>("all");
  const [availability, setAvailability] = useState<string>("all");
  const [sortBy, setSortBy] = useState<"match" | "recent">("match");
  const [savedOnly, setSavedOnly] = useState(false);

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

  const { data: me } = useQuery({
    enabled: !!profile && profile.role === "volunteer",
    queryKey: ["me-volunteer", profile?.id],
    queryFn: async () => {
      const { data } = await supabase.from("volunteers").select("*").eq("profile_id", profile!.id).maybeSingle();
      return data;
    },
  });

  const { data: myApps } = useQuery({
    enabled: !!profile && profile.role === "volunteer",
    queryKey: ["my-app-ids", profile?.id],
    queryFn: async () => {
      const { data } = await supabase.from("applications").select("opportunity_id, status").eq("volunteer_id", profile!.id);
      return new Map((data ?? []).map((a) => [a.opportunity_id, a.status]));
    },
  });

  const { data: saved } = useQuery({
    enabled: !!profile && profile.role === "volunteer",
    queryKey: ["saved-opps", profile?.id],
    queryFn: async () => {
      const { data } = await supabase.from("saved_opportunities").select("opportunity_id").eq("volunteer_id", profile!.id);
      return new Set((data ?? []).map((s) => s.opportunity_id));
    },
  });

  const [applying, setApplying] = useState<string | null>(null);

  const friendly = (msg: string) => {
    if (msg.includes("applications_unique_volunteer_opportunity") || msg.includes("duplicate key"))
      return "You've already applied to this opportunity.";
    if (msg.includes("closed for applications")) return "This opportunity is closed for applications.";
    if (msg.includes("deadline")) return "The deadline for this opportunity has passed.";
    if (msg.includes("no longer exists")) return "This opportunity is no longer available.";
    return msg;
  };

  const apply = async (id: string) => {
    if (!profile) return;
    setApplying(id);
    const { error } = await supabase.from("applications").insert({ opportunity_id: id, volunteer_id: profile.id });
    setApplying(null);
    if (error) return toast.error(friendly(error.message));
    toast.success("Application sent — the organization has been notified.");
    qc.invalidateQueries({ queryKey: ["my-app-ids"] });
    qc.invalidateQueries({ queryKey: ["my-apps"] });
    qc.invalidateQueries({ queryKey: ["vol-stats"] });
  };

  const toggleSave = async (id: string) => {
    if (!profile) return;
    if (saved?.has(id)) {
      const { error } = await supabase.from("saved_opportunities").delete().eq("volunteer_id", profile.id).eq("opportunity_id", id);
      if (error) return toast.error(error.message);
      toast.success("Removed from saved");
    } else {
      const { error } = await supabase.from("saved_opportunities").insert({ volunteer_id: profile.id, opportunity_id: id });
      if (error) return toast.error(error.message);
      toast.success("Saved for later");
    }
    qc.invalidateQueries({ queryKey: ["saved-opps"] });
  };

  const causes = useMemo(() => {
    const set = new Set<string>();
    (opps ?? []).forEach((o: any) => o.ngos?.focus_area && set.add(o.ngos.focus_area));
    return [...set].sort();
  }, [opps]);

  const enriched = useMemo(() => {
    const s = q.toLowerCase();
    const sk = skill.toLowerCase().trim();
    const lo = loc.toLowerCase().trim();
    const list = (opps ?? [])
      .filter((o: any) => {
        const matchesQ = !s || o.title.toLowerCase().includes(s) || o.description.toLowerCase().includes(s) || (o.location ?? "").toLowerCase().includes(s);
        const matchesSkill = !sk || (o.required_skills ?? []).some((r: string) => r.toLowerCase().includes(sk));
        const matchesLoc = !lo || (o.location ?? "").toLowerCase().includes(lo);
        const matchesCause = cause === "all" || o.ngos?.focus_area === cause;
        const matchesSaved = !savedOnly || !!saved?.has(o.id);
        return matchesQ && matchesSkill && matchesLoc && matchesCause && matchesSaved;
      })
      .map((o: any) => ({
        ...o,
        match: profile?.role === "volunteer" && me
          ? computeMatch(
              { ...me, location: profile?.location },
              { title: o.title, description: o.description, required_skills: o.required_skills, location: o.location, ngos: o.ngos },
            )
          : null,
      }));

    if (availability !== "all" && profile?.role === "volunteer" && me?.availability) {
      // filter opportunities the volunteer is available for — availability is on the volunteer, not opportunity,
      // so we soft-filter by matching keyword the volunteer set (e.g. weekends).
      const key = availability.toLowerCase();
      if (!me.availability.toLowerCase().includes(key)) {
        // volunteer's saved availability doesn't include selected — return empty ranked
        return [];
      }
    }

    if (sortBy === "match") {
      list.sort((a: any, b: any) => (b.match?.score ?? 0) - (a.match?.score ?? 0));
    }
    return list;
  }, [opps, q, skill, loc, cause, availability, sortBy, profile, me, savedOnly, saved]);

  return (
    <div className="mx-auto max-w-6xl space-y-6">
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div>
          <h1 className="font-display text-3xl font-bold">Opportunities</h1>
          <p className="text-muted-foreground">
            {profile?.role === "volunteer" ? "Ranked by your AI match score." : "Discover open opportunities from verified NGOs."}
          </p>
        </div>
        <div className="flex w-full flex-col gap-2 md:w-auto md:flex-row md:items-center">
          <div className="relative w-full md:w-72">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search opportunities…" className="pl-9" />
          </div>
          <AISuggestButton field="search" mode="pick" role={profile?.role}
            context={`User interests hint: ${q}`}
            onApply={(v) => setQ(v)} label="AI smart search" />
        </div>
      </div>

      <Card className="glass border-border/50">
        <CardContent className="grid gap-3 p-4 md:grid-cols-5">
          <div className="md:col-span-1 flex items-center gap-2 text-xs font-medium text-muted-foreground">
            <SlidersHorizontal className="h-3.5 w-3.5" /> Smart filters
          </div>
          <Input placeholder="Skill (e.g. Teaching)" value={skill} onChange={(e) => setSkill(e.target.value)} />
          <Input placeholder="Location" value={loc} onChange={(e) => setLoc(e.target.value)} />
          <Select value={cause} onValueChange={setCause}>
            <SelectTrigger><SelectValue placeholder="Cause" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All causes</SelectItem>
              {causes.map((c) => <SelectItem key={c} value={c}>{c}</SelectItem>)}
            </SelectContent>
          </Select>
          <div className="flex gap-2">
            <Select value={availability} onValueChange={setAvailability}>
              <SelectTrigger><SelectValue placeholder="Availability" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Any time</SelectItem>
                <SelectItem value="weekend">Weekends</SelectItem>
                <SelectItem value="weekday">Weekdays</SelectItem>
                <SelectItem value="evening">Evenings</SelectItem>
                <SelectItem value="flexible">Flexible</SelectItem>
              </SelectContent>
            </Select>
            <Select value={sortBy} onValueChange={(v) => setSortBy(v as "match" | "recent")}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="match">Best match</SelectItem>
                <SelectItem value="recent">Most recent</SelectItem>
              </SelectContent>
            </Select>
          </div>
          {profile?.role === "volunteer" && (
            <div className="md:col-span-5">
              <Button
                type="button"
                variant={savedOnly ? "default" : "outline"}
                size="sm"
                onClick={() => setSavedOnly((v) => !v)}
                aria-pressed={savedOnly}
              >
                <Bookmark className={savedOnly ? "mr-1.5 h-3.5 w-3.5 fill-current" : "mr-1.5 h-3.5 w-3.5"} />
                {savedOnly ? "Showing saved only" : `Saved (${saved?.size ?? 0})`}
              </Button>
            </div>
          )}
        </CardContent>
      </Card>

      {isLoading ? (
        <p className="text-muted-foreground">Loading…</p>
      ) : enriched.length === 0 ? (
        <Card className="glass border-border/50"><CardContent className="p-12 text-center text-muted-foreground">No opportunities match your filters.</CardContent></Card>
      ) : (
        <div className="grid gap-4 md:grid-cols-2">
          {enriched.map((o: any) => {
            const applied = myApps?.has(o.id);
            return (
              <Card key={o.id} className="glass group overflow-hidden border-border/50 transition-all hover:-translate-y-1 hover:border-primary/40">
                <div className="relative h-36 w-full overflow-hidden">
                  <img
                    src={categoryImage(o.title, o.ngos?.focus_area, o.description)}
                    alt=""
                    loading="lazy"
                    className="h-full w-full object-cover transition-transform duration-700 group-hover:scale-110"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-background via-background/50 to-transparent" />
                  {o.ngos?.focus_area && (
                    <Badge variant="secondary" className="absolute left-3 top-3 backdrop-blur">{o.ngos.focus_area}</Badge>
                  )}
                  {o.match && (
                    <div className="absolute right-3 top-3"><MatchBadge match={o.match} compact /></div>
                  )}
                </div>
                <CardHeader className="pb-2">
                  <CardTitle className="truncate text-lg">{o.title}</CardTitle>
                  <div className="text-sm text-muted-foreground">{o.ngos?.organization_name}</div>
                </CardHeader>
                <CardContent className="space-y-3">
                  <p className="line-clamp-2 text-sm text-muted-foreground">{o.description}</p>
                  <div className="flex flex-wrap gap-1.5">
                    {(o.required_skills ?? []).slice(0, 5).map((s: string) => (
                      <Badge key={s} variant="outline" className="border-primary/30">{s}</Badge>
                    ))}
                  </div>
                  {o.match && <MatchDetails match={o.match} />}
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
