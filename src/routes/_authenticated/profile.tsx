import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useProfile } from "@/hooks/useProfile";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import { Loader2 } from "lucide-react";
import { AISuggestButton } from "@/components/AISuggestButton";

export const Route = createFileRoute("/_authenticated/profile")({
  component: ProfilePage,
});

function ProfilePage() {
  const { data: profile } = useProfile();
  const qc = useQueryClient();
  const isNgo = profile?.role === "ngo";

  const extra = useQuery({
    enabled: !!profile,
    queryKey: ["profile-extra", profile?.id, profile?.role],
    queryFn: async () => {
      if (!profile) return null;
      if (isNgo) {
        const { data } = await supabase.from("ngos").select("*").eq("profile_id", profile.id).maybeSingle();
        return data;
      } else {
        const { data } = await supabase.from("volunteers").select("*").eq("profile_id", profile.id).maybeSingle();
        return data;
      }
    },
  });

  const [form, setForm] = useState<any>({});
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (profile) {
      setForm({
        full_name: profile.full_name,
        location: profile.location ?? "",
        bio: profile.bio ?? "",
        ...(extra.data ?? {}),
        skills: (extra.data as any)?.skills?.join(", ") ?? "",
        interests: (extra.data as any)?.interests?.join(", ") ?? "",
      });
    }
  }, [profile, extra.data]);

  const save = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!profile) return;
    setSaving(true);
    const { error: pErr } = await supabase
      .from("profiles")
      .update({ full_name: form.full_name, location: form.location, bio: form.bio })
      .eq("id", profile.id);
    if (pErr) { setSaving(false); return toast.error(pErr.message); }

    if (isNgo) {
      const { error } = await supabase.from("ngos").upsert({
        profile_id: profile.id,
        organization_name: form.organization_name ?? form.full_name,
        mission: form.mission,
        focus_area: form.focus_area,
        address: form.address,
        contact_email: form.contact_email,
        website: form.website,
      });
      if (error) { setSaving(false); return toast.error(error.message); }
    } else {
      const skills = String(form.skills || "").split(",").map((s) => s.trim()).filter(Boolean);
      const interests = String(form.interests || "").split(",").map((s) => s.trim()).filter(Boolean);
      const { error } = await supabase.from("volunteers").upsert({
        profile_id: profile.id,
        skills, interests,
        availability: form.availability,
        experience: form.experience,
        preferred_location: form.preferred_location,
      });
      if (error) { setSaving(false); return toast.error(error.message); }
    }
    setSaving(false);
    qc.invalidateQueries();
    toast.success("Profile saved");
  };

  return (
    <div className="mx-auto max-w-3xl">
      <h1 className="mb-6 font-display text-3xl font-bold">Your Profile</h1>
      <Card className="glass border-border/50">
        <CardHeader><CardTitle>{isNgo ? "Organization Details" : "Volunteer Details"}</CardTitle></CardHeader>
        <CardContent>
          <form onSubmit={save} className="space-y-4">
            <div className="grid gap-4 md:grid-cols-2">
              <div>
                <Label>{isNgo ? "Organization Name" : "Full Name"}</Label>
                <Input value={form.full_name ?? ""} onChange={(e) => setForm({ ...form, full_name: e.target.value })} />
              </div>
              <div>
                <Label>Location</Label>
                <Input value={form.location ?? ""} onChange={(e) => setForm({ ...form, location: e.target.value })} />
              </div>
            </div>
            <div>
              <Label>{isNgo ? "About your organization" : "Bio"}</Label>
              <Textarea rows={3} value={form.bio ?? ""} onChange={(e) => setForm({ ...form, bio: e.target.value })} />
            </div>

            {isNgo ? (
              <>
                <div>
                  <Label>Mission</Label>
                  <Textarea rows={3} value={form.mission ?? ""} onChange={(e) => setForm({ ...form, mission: e.target.value })} />
                </div>
                <div className="grid gap-4 md:grid-cols-2">
                  <div>
                    <div className="mb-1 flex items-center justify-between">
                      <Label>Focus Area</Label>
                      <AISuggestButton field="focus_area" role="ngo"
                        context={`Org: ${form.full_name}. Mission: ${form.mission}`}
                        currentValue={form.focus_area ?? ""}
                        onApply={(v) => setForm({ ...form, focus_area: v })} />
                    </div>
                    <Input placeholder="Education, Environment…" value={form.focus_area ?? ""} onChange={(e) => setForm({ ...form, focus_area: e.target.value })} />
                  </div>
                  <div>
                    <Label>Contact Email</Label>
                    <Input type="email" value={form.contact_email ?? ""} onChange={(e) => setForm({ ...form, contact_email: e.target.value })} />
                  </div>
                  <div>
                    <div className="mb-1 flex items-center justify-between">
                      <Label>Address</Label>
                      <AISuggestButton field="location" role="ngo" mode="pick"
                        context={`Org: ${form.full_name}. Location hint: ${form.location}`}
                        onApply={(v) => setForm({ ...form, address: v })} label="AI suggest" />
                    </div>
                    <Input value={form.address ?? ""} onChange={(e) => setForm({ ...form, address: e.target.value })} />
                  </div>
                  <div>
                    <Label>Website</Label>
                    <Input value={form.website ?? ""} onChange={(e) => setForm({ ...form, website: e.target.value })} />
                  </div>
                </div>
              </>
            ) : (
              <>
                <div className="grid gap-4 md:grid-cols-2">
                  <div>
                    <div className="mb-1 flex items-center justify-between">
                      <Label>Skills (comma separated)</Label>
                      <AISuggestButton field="skills" role="volunteer"
                        context={`Bio: ${form.bio}. Interests: ${form.interests}. Experience: ${form.experience}`}
                        currentValue={form.skills ?? ""}
                        onApply={(v) => setForm({ ...form, skills: v })} />
                    </div>
                    <Input value={form.skills ?? ""} onChange={(e) => setForm({ ...form, skills: e.target.value })} placeholder="Teaching, Web Dev, Photography" />
                  </div>
                  <div>
                    <div className="mb-1 flex items-center justify-between">
                      <Label>Interests (comma separated)</Label>
                      <AISuggestButton field="interests" role="volunteer"
                        context={`Bio: ${form.bio}. Skills: ${form.skills}`}
                        currentValue={form.interests ?? ""}
                        onApply={(v) => setForm({ ...form, interests: v })} />
                    </div>
                    <Input value={form.interests ?? ""} onChange={(e) => setForm({ ...form, interests: e.target.value })} placeholder="Education, Climate, Health" />
                  </div>
                  <div>
                    <div className="mb-1 flex items-center justify-between">
                      <Label>Availability</Label>
                      <AISuggestButton field="availability" role="volunteer" mode="pick"
                        context={`Skills: ${form.skills}`}
                        onApply={(v) => setForm({ ...form, availability: v })} />
                    </div>
                    <Input value={form.availability ?? ""} onChange={(e) => setForm({ ...form, availability: e.target.value })} placeholder="Weekends, ~5 hrs/wk" />
                  </div>
                  <div>
                    <div className="mb-1 flex items-center justify-between">
                      <Label>Preferred Location</Label>
                      <AISuggestButton field="location" role="volunteer" mode="pick"
                        context={`Current location: ${form.location}. Interests: ${form.interests}`}
                        onApply={(v) => setForm({ ...form, preferred_location: v })} />
                    </div>
                    <Input value={form.preferred_location ?? ""} onChange={(e) => setForm({ ...form, preferred_location: e.target.value })} />
                  </div>
                </div>
                <div>
                  <div className="mb-1 flex items-center justify-between">
                    <Label>Experience</Label>
                    <AISuggestButton field="experience" role="volunteer" mode="replace-text"
                      context={`Name: ${form.full_name}. Skills: ${form.skills}. Interests: ${form.interests}`}
                      onApply={(v) => setForm({ ...form, experience: v })} label="AI draft experience" />
                  </div>
                  <Textarea rows={3} value={form.experience ?? ""} onChange={(e) => setForm({ ...form, experience: e.target.value })} />
                </div>
              </>
            )}

            <Button type="submit" disabled={saving} className="bg-gradient-to-r from-primary to-primary-glow text-white">
              {saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />} Save Profile
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
