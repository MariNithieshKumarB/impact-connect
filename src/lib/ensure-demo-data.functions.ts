import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

const NGO_DEMO_OPPS = [
  {
    title: "Community Reading Coach",
    description: "Support underprivileged children with weekly reading sessions. Help build confidence and literacy through one-on-one coaching.",
    required_skills: ["Teaching", "Patience", "English", "Communication"],
    location: "Bengaluru, India",
    volunteers_needed: 5,
  },
  {
    title: "Beach Cleanup Coordinator",
    description: "Lead weekend beach cleanup drives with local volunteers. Coordinate logistics, safety briefings, and waste segregation.",
    required_skills: ["Leadership", "Environment", "Event Management"],
    location: "Chennai, India",
    volunteers_needed: 10,
  },
  {
    title: "Digital Skills Mentor",
    description: "Teach basic computer and internet skills to senior citizens and first-generation learners in weekend workshops.",
    required_skills: ["Computer Literacy", "Teaching", "Patience"],
    location: "Remote / Hybrid",
    volunteers_needed: 6,
  },
];

export const ensureUserDemoData = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { supabase, userId } = context;

    const { data: profile } = await supabase
      .from("profiles")
      .select("id, role, full_name")
      .eq("id", userId)
      .maybeSingle();
    if (!profile) return { ok: false, reason: "no-profile" };

    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    if (profile.role === "ngo") {
      const { count } = await supabaseAdmin
        .from("opportunities")
        .select("id", { count: "exact", head: true })
        .eq("ngo_id", userId);
      if ((count ?? 0) > 0) return { ok: true, seeded: false };

      // Ensure NGO row exists
      await supabaseAdmin
        .from("ngos")
        .upsert({ profile_id: userId, organization_name: profile.full_name || "Your Organization" }, { onConflict: "profile_id" });

      const { data: opps, error: oppErr } = await supabaseAdmin
        .from("opportunities")
        .insert(NGO_DEMO_OPPS.map((o) => ({ ...o, ngo_id: userId, status: "open" as const })))
        .select("id");
      if (oppErr || !opps) return { ok: false, reason: oppErr?.message };

      const { data: vols } = await supabaseAdmin
        .from("volunteers")
        .select("profile_id")
        .limit(12);
      const volIds = (vols ?? []).map((v) => v.profile_id);
      if (volIds.length) {
        const statuses: Array<"pending" | "accepted" | "rejected"> = [
          "pending", "pending", "pending", "accepted", "accepted", "rejected",
          "pending", "accepted", "pending", "pending", "accepted", "rejected",
        ];
        const rows: any[] = [];
        opps.forEach((o, oi) => {
          volIds.forEach((vid, vi) => {
            if ((oi + vi) % 2 === 0) {
              rows.push({
                opportunity_id: o.id,
                volunteer_id: vid,
                status: statuses[(oi * 4 + vi) % statuses.length],
                message: "I'd love to contribute my skills to this cause.",
              });
            }
          });
        });
        if (rows.length) {
          await supabaseAdmin.from("applications").upsert(rows, {
            onConflict: "opportunity_id,volunteer_id",
            ignoreDuplicates: true,
          });
        }
      }
      return { ok: true, seeded: true };
    }

    if (profile.role === "volunteer") {
      const { count } = await supabaseAdmin
        .from("applications")
        .select("id", { count: "exact", head: true })
        .eq("volunteer_id", userId);
      if ((count ?? 0) > 0) return { ok: true, seeded: false };

      // Ensure volunteer row exists (needed for FK)
      await supabaseAdmin
        .from("volunteers")
        .upsert(
          {
            profile_id: userId,
            skills: ["Communication", "Teaching", "Teamwork"],
            interests: ["Education", "Environment", "Community"],
            availability: "Weekends, ~6 hrs/wk",
          },
          { onConflict: "profile_id", ignoreDuplicates: true },
        );

      const { data: opps } = await supabaseAdmin
        .from("opportunities")
        .select("id")
        .eq("status", "open")
        .limit(6);
      if (!opps?.length) return { ok: true, seeded: false };

      const statuses: Array<"pending" | "accepted" | "rejected"> = [
        "accepted", "pending", "pending", "rejected", "accepted", "pending",
      ];
      const rows = opps.map((o, i) => ({
        opportunity_id: o.id,
        volunteer_id: userId,
        status: statuses[i % statuses.length],
        message: "Excited to help with this initiative!",
      }));
      await supabaseAdmin.from("applications").upsert(rows, {
        onConflict: "opportunity_id,volunteer_id",
        ignoreDuplicates: true,
      });
      return { ok: true, seeded: true };
    }

    return { ok: true, seeded: false };
  });
