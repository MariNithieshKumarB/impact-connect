import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useProfile } from "@/hooks/useProfile";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

export const Route = createFileRoute("/_authenticated/applications")({
  component: MyApplications,
});

const statusColor: Record<string, string> = {
  pending: "bg-muted text-muted-foreground",
  accepted: "bg-secondary text-secondary-foreground",
  rejected: "bg-destructive/20 text-destructive",
  withdrawn: "bg-muted text-muted-foreground",
};

function MyApplications() {
  const { data: profile } = useProfile();
  const { data, isLoading } = useQuery({
    enabled: !!profile,
    queryKey: ["my-apps", profile?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("applications")
        .select("*, opportunities(title, location, ngos(organization_name))")
        .eq("volunteer_id", profile!.id)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data;
    },
  });

  return (
    <div className="mx-auto max-w-5xl space-y-6">
      <h1 className="font-display text-3xl font-bold">My Applications</h1>
      {isLoading ? <p className="text-muted-foreground">Loading…</p> :
        !data?.length ? (
          <Card className="glass border-border/50"><CardContent className="p-12 text-center text-muted-foreground">You haven't applied yet. Explore opportunities to get started.</CardContent></Card>
        ) : (
          <div className="grid gap-4">
            {data.map((a: any) => (
              <Card key={a.id} className="glass border-border/50">
                <CardHeader>
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div>
                      <CardTitle className="text-lg">{a.opportunities?.title}</CardTitle>
                      <div className="mt-1 text-sm text-muted-foreground">
                        {a.opportunities?.ngos?.organization_name} · {a.opportunities?.location ?? "Remote"}
                      </div>
                    </div>
                    <Badge className={statusColor[a.status] ?? ""}>{a.status}</Badge>
                  </div>
                </CardHeader>
                <CardContent className="text-xs text-muted-foreground">
                  Applied {new Date(a.created_at).toLocaleDateString()}
                </CardContent>
              </Card>
            ))}
          </div>
        )}
    </div>
  );
}
