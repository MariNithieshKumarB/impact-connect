import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useProfile } from "@/hooks/useProfile";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { Loader2 } from "lucide-react";

export const Route = createFileRoute("/_authenticated/opportunities/new")({
  component: NewOpportunity,
});

function NewOpportunity() {
  const { data: profile } = useProfile();
  const nav = useNavigate();
  const [form, setForm] = useState({
    title: "", description: "", required_skills: "", location: "", volunteers_needed: 1, deadline: "",
  });
  const [saving, setSaving] = useState(false);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!profile) return;
    if (profile.role !== "ngo") return toast.error("Only NGOs can create opportunities");
    setSaving(true);
    const { error } = await supabase.from("opportunities").insert({
      ngo_id: profile.id,
      title: form.title,
      description: form.description,
      required_skills: form.required_skills.split(",").map((s) => s.trim()).filter(Boolean),
      location: form.location || null,
      volunteers_needed: Number(form.volunteers_needed) || 1,
      deadline: form.deadline || null,
      status: "open",
    });
    setSaving(false);
    if (error) return toast.error(error.message);
    toast.success("Opportunity published!");
    nav({ to: "/opportunities/manage" });
  };

  return (
    <div className="mx-auto max-w-2xl">
      <h1 className="mb-6 font-display text-3xl font-bold">Create Opportunity</h1>
      <Card className="glass border-border/50">
        <CardHeader><CardTitle>New Opportunity Details</CardTitle></CardHeader>
        <CardContent>
          <form onSubmit={submit} className="space-y-4">
            <div>
              <Label>Title</Label>
              <Input required value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} placeholder="e.g. Weekend Reading Coach" />
            </div>
            <div>
              <Label>Description</Label>
              <Textarea required rows={5} value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} />
            </div>
            <div>
              <Label>Required Skills (comma separated)</Label>
              <Input value={form.required_skills} onChange={(e) => setForm({ ...form, required_skills: e.target.value })} placeholder="Teaching, Patience, English" />
            </div>
            <div className="grid gap-4 md:grid-cols-3">
              <div>
                <Label>Location</Label>
                <Input value={form.location} onChange={(e) => setForm({ ...form, location: e.target.value })} />
              </div>
              <div>
                <Label>Volunteers Needed</Label>
                <Input type="number" min={1} value={form.volunteers_needed} onChange={(e) => setForm({ ...form, volunteers_needed: Number(e.target.value) })} />
              </div>
              <div>
                <Label>Deadline</Label>
                <Input type="date" value={form.deadline} onChange={(e) => setForm({ ...form, deadline: e.target.value })} />
              </div>
            </div>
            <Button type="submit" disabled={saving} className="bg-gradient-to-r from-primary to-primary-glow text-white">
              {saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />} Publish Opportunity
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
