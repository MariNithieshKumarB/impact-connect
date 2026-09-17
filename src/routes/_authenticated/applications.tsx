import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useProfile } from "@/hooks/useProfile";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useMemo, useState } from "react";
import { toast } from "sonner";
import { Calendar, MapPin, Compass, CheckCircle2, Circle, Clock, XCircle, Undo2, Sprout, History } from "lucide-react";
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
  const qc = useQueryClient();
  const [filter, setFilter] = useState("all");
  const { data, isLoading } = useQuery({
    enabled: !!profile,
    queryKey: ["my-apps", profile?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("applications")
        .select("*, opportunities(title, location, description, ngos(organization_name, focus_area)), application_status_history(old_status, new_status, created_at), impact_submissions(id, hours_contributed, people_reached, summary, verified)")
        .eq("volunteer_id", profile!.id)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data;
    },
  });

  const withdraw = async (id: string) => {
    if (!confirm("Withdraw this application? The organization will be notified.")) return;
    const { error } = await supabase.from("applications").update({ status: "withdrawn" }).eq("id", id);
    if (error) return toast.error(error.message);
    toast.success("Application withdrawn");
    qc.invalidateQueries({ queryKey: ["my-apps"] });
    qc.invalidateQueries({ queryKey: ["my-app-ids"] });
    qc.invalidateQueries({ queryKey: ["vol-stats"] });
  };

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
            <SelectItem value="shortlisted">Shortlisted</SelectItem>
            <SelectItem value="accepted">Accepted</SelectItem>
            <SelectItem value="rejected">Rejected</SelectItem>
            <SelectItem value="completed">Completed</SelectItem>
            <SelectItem value="withdrawn">Withdrawn</SelectItem>
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
                    <CardContent className="space-y-3 pt-0">
                      <div className="flex flex-wrap items-center gap-4 text-xs text-muted-foreground">
                        {a.opportunities?.location && <span className="flex items-center gap-1"><MapPin className="h-3 w-3" /> {a.opportunities.location}</span>}
                        <span className="flex items-center gap-1"><Calendar className="h-3 w-3" /> Applied {new Date(a.created_at).toLocaleDateString()}</span>
                      </div>
                      <Timeline status={a.status} appliedAt={a.created_at} updatedAt={a.updated_at} />

                      {!!a.application_status_history?.length && (
                        <details className="rounded-lg border border-border/40 bg-background/40 p-3">
                          <summary className="flex cursor-pointer items-center gap-2 text-xs font-medium text-muted-foreground">
                            <History className="h-3 w-3 text-primary" /> Status history ({a.application_status_history.length})
                          </summary>
                          <ul className="mt-2 space-y-1">
                            {[...a.application_status_history]
                              .sort((x: any, y: any) => +new Date(x.created_at) - +new Date(y.created_at))
                              .map((h: any, i: number) => (
                                <li key={i} className="text-xs text-muted-foreground">
                                  {new Date(h.created_at).toLocaleString()} —{" "}
                                  {h.old_status ? `${h.old_status} → ${h.new_status}` : `submitted as ${h.new_status}`}
                                </li>
                              ))}
                          </ul>
                        </details>
                      )}

                      {a.impact_submissions?.[0] && (
                        <div className="rounded-lg border border-secondary/40 bg-secondary/5 p-3 text-xs">
                          <div className="font-medium text-secondary">
                            Impact reported {a.impact_submissions[0].verified ? "· verified by the organization" : "· awaiting verification"}
                          </div>
                          <div className="mt-1 text-muted-foreground">
                            {a.impact_submissions[0].hours_contributed} hours · {a.impact_submissions[0].people_reached} people reached
                          </div>
                          {a.impact_submissions[0].summary && <p className="mt-1 text-muted-foreground">{a.impact_submissions[0].summary}</p>}
                        </div>
                      )}

                      <div className="flex flex-wrap gap-2">
                        {(a.status === "pending" || a.status === "shortlisted") && (
                          <Button variant="outline" size="sm" onClick={() => withdraw(a.id)}>
                            <Undo2 className="mr-1 h-3.5 w-3.5" /> Withdraw
                          </Button>
                        )}
                        {(a.status === "accepted" || a.status === "completed") && !a.impact_submissions?.[0] && (
                          <ImpactDialog applicationId={a.id} volunteerId={a.volunteer_id} />
                        )}
                      </div>
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

function ImpactDialog({ applicationId, volunteerId }: { applicationId: string; volunteerId: string }) {
  const qc = useQueryClient();
  const [open, setOpen] = useState(false);
  const [hours, setHours] = useState("");
  const [people, setPeople] = useState("");
  const [summary, setSummary] = useState("");
  const [saving, setSaving] = useState(false);

  const submit = async () => {
    setSaving(true);
    const { error } = await supabase.from("impact_submissions").insert({
      application_id: applicationId,
      volunteer_id: volunteerId,
      hours_contributed: Number(hours) || 0,
      people_reached: Number(people) || 0,
      summary,
    });
    setSaving(false);
    if (error) return toast.error(error.message);
    toast.success("Impact report submitted");
    setOpen(false);
    qc.invalidateQueries({ queryKey: ["my-apps"] });
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button size="sm" className="bg-secondary text-secondary-foreground hover:bg-secondary/90">
          <Sprout className="mr-1 h-3.5 w-3.5" /> Report impact
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader><DialogTitle>Report your impact</DialogTitle></DialogHeader>
        <div className="grid gap-3">
          <div className="grid gap-1.5">
            <Label htmlFor="hours">Hours contributed</Label>
            <Input id="hours" type="number" min="0" value={hours} onChange={(e) => setHours(e.target.value)} placeholder="e.g. 12" />
          </div>
          <div className="grid gap-1.5">
            <Label htmlFor="people">People reached</Label>
            <Input id="people" type="number" min="0" value={people} onChange={(e) => setPeople(e.target.value)} placeholder="e.g. 40" />
          </div>
          <div className="grid gap-1.5">
            <Label htmlFor="summary">What did you do?</Label>
            <Textarea id="summary" value={summary} onChange={(e) => setSummary(e.target.value)} rows={4} placeholder="Short summary of your contribution…" />
          </div>
        </div>
        <DialogFooter>
          <Button onClick={submit} disabled={saving} className="bg-gradient-to-r from-primary to-primary-glow text-white">
            {saving ? "Submitting…" : "Submit report"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}



function Timeline({ status, appliedAt, updatedAt }: { status: string; appliedAt: string; updatedAt: string }) {
  const decided = status === "accepted" || status === "rejected" || status === "completed";
  const reviewing = status !== "pending";
  const steps = [
    { key: "submitted", label: "Submitted", date: appliedAt, done: true, icon: CheckCircle2, tone: "text-emerald-400" },
    { key: "review", label: "Under Review", date: reviewing ? updatedAt : null, done: reviewing, icon: reviewing ? CheckCircle2 : Clock, tone: reviewing ? "text-emerald-400" : "text-amber-300" },
    {
      key: "decision",
      label: status === "rejected" ? "Not Selected" : status === "accepted" ? "Accepted" : status === "completed" ? "Completed" : "Decision",
      date: decided ? updatedAt : null,
      done: decided,
      icon: status === "rejected" ? XCircle : decided ? CheckCircle2 : Circle,
      tone: status === "rejected" ? "text-destructive" : decided ? "text-emerald-400" : "text-muted-foreground",
    },
  ];
  return (
    <div className="rounded-lg border border-border/40 bg-background/40 p-3">
      <div className="flex items-center justify-between gap-2">
        {steps.map((s, i) => {
          const Icon = s.icon;
          return (
            <div key={s.key} className="flex flex-1 items-center gap-2">
              <div className="flex flex-col items-center">
                <Icon className={cn("h-4 w-4", s.tone)} />
                <div className="mt-1 text-[10px] font-medium">{s.label}</div>
                {s.date && <div className="text-[9px] text-muted-foreground">{new Date(s.date).toLocaleDateString()}</div>}
              </div>
              {i < steps.length - 1 && (
                <div className={cn("h-px flex-1", steps[i + 1].done ? "bg-emerald-400/60" : "bg-border/60")} />
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
