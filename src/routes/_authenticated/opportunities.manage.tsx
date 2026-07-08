import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useProfile } from "@/hooks/useProfile";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Trash2, PowerOff, Power, Users, PlusCircle } from "lucide-react";
import { toast } from "sonner";
import { categoryImage } from "@/lib/category-image";

export const Route = createFileRoute("/_authenticated/opportunities/manage")({
  component: ManageOpportunities,
});

function ManageOpportunities() {
  const { data: profile } = useProfile();
  const qc = useQueryClient();
  const { data: opps, isLoading } = useQuery({
    enabled: !!profile,
    queryKey: ["ngo-opps", profile?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("opportunities")
        .select("*, applications(id)")
        .eq("ngo_id", profile!.id)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data;
    },
  });

  const toggle = async (id: string, current: string) => {
    const status = current === "open" ? "closed" : "open";
    const { error } = await supabase.from("opportunities").update({ status }).eq("id", id);
    if (error) return toast.error(error.message);
    qc.invalidateQueries({ queryKey: ["ngo-opps"] });
  };

  const remove = async (id: string) => {
    if (!confirm("Delete this opportunity?")) return;
    const { error } = await supabase.from("opportunities").delete().eq("id", id);
    if (error) return toast.error(error.message);
    toast.success("Deleted");
    qc.invalidateQueries({ queryKey: ["ngo-opps"] });
  };

  return (
    <div className="mx-auto max-w-5xl space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="font-display text-3xl font-bold">Manage Opportunities</h1>
          <p className="text-sm text-muted-foreground">Publish, close, and review applicants for every opportunity.</p>
        </div>
        <Button asChild className="bg-gradient-to-r from-primary to-primary-glow text-white">
          <Link to="/opportunities/new"><PlusCircle className="mr-2 h-4 w-4" /> New Opportunity</Link>
        </Button>
      </div>
      {isLoading ? <p className="text-muted-foreground">Loading…</p> :
        !opps?.length ? (
          <Card className="glass border-border/50">
            <CardContent className="flex flex-col items-center gap-3 p-12 text-center">
              <p className="text-muted-foreground">You haven't posted any opportunities yet.</p>
              <Button asChild className="bg-gradient-to-r from-primary to-primary-glow text-white">
                <Link to="/opportunities/new"><PlusCircle className="mr-2 h-4 w-4" /> Publish your first</Link>
              </Button>
            </CardContent>
          </Card>
        ) : (
          <div className="grid gap-4">
            {opps.map((o: any) => (
              <Card key={o.id} className="glass overflow-hidden border-border/50 transition-all hover:-translate-y-0.5 hover:border-primary/40">
                <div className="grid gap-0 md:grid-cols-[200px_1fr]">
                  <div className="relative h-32 md:h-full">
                    <img src={categoryImage(o.title, o.description)} alt="" loading="lazy" className="h-full w-full object-cover" />
                    <div className="absolute inset-0 bg-gradient-to-r from-background/50 via-transparent to-transparent" />
                  </div>
                  <div>
                    <CardHeader>
                      <div className="flex flex-wrap items-start justify-between gap-3">
                        <div className="min-w-0">
                          <CardTitle className="text-lg">{o.title}</CardTitle>
                          <div className="mt-2 flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
                            <Badge variant="outline" className={o.status === "open" ? "border-emerald-400/50 text-emerald-300" : "border-border/60"}>
                              {o.status}
                            </Badge>
                            <span className="flex items-center gap-1"><Users className="h-3 w-3" /> {o.applications?.length ?? 0} applicant(s)</span>
                            <span>· {o.volunteers_needed} needed</span>
                            {o.deadline && <span>· Deadline {new Date(o.deadline).toLocaleDateString()}</span>}
                          </div>
                        </div>
                        <div className="flex flex-wrap gap-2">
                          <Button asChild variant="outline" size="sm">
                            <Link to="/applicants" search={{ opportunity: o.id }}><Users className="mr-1 h-3.5 w-3.5" /> View Applicants</Link>
                          </Button>
                          <Button variant="outline" size="sm" onClick={() => toggle(o.id, o.status)}>
                            {o.status === "open" ? <><PowerOff className="mr-1 h-3.5 w-3.5" /> Close</> : <><Power className="mr-1 h-3.5 w-3.5" /> Reopen</>}
                          </Button>
                          <Button variant="outline" size="sm" onClick={() => remove(o.id)} className="text-destructive hover:text-destructive">
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </div>
                    </CardHeader>
                    <CardContent><p className="line-clamp-2 text-sm text-muted-foreground">{o.description}</p></CardContent>
                  </div>
                </div>
              </Card>
            ))}
          </div>
        )}
    </div>
  );
}
