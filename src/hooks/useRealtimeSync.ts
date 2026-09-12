import { useEffect } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useProfile } from "./useProfile";

const KEYS = [
  "vol-stats",
  "ngo-stats",
  "applicants",
  "analytics",
  "my-apps",
  "my-app-ids",
  "ngo-opps",
  "all-opps",
  "saved-opps",
];

/**
 * Keeps dashboards, applicant lists and analytics in sync with the shared
 * database: any insert/update/delete on applications or opportunities
 * refreshes the affected queries for every signed-in user in real time.
 */
export function useRealtimeSync() {
  const { data: profile } = useProfile();
  const qc = useQueryClient();

  useEffect(() => {
    if (!profile?.id) return;
    const invalidate = () => KEYS.forEach((k) => qc.invalidateQueries({ queryKey: [k] }));

    const channel = supabase
      .channel(`impact-sync-${profile.id}`)
      .on("postgres_changes", { event: "*", schema: "public", table: "applications" }, invalidate)
      .on("postgres_changes", { event: "*", schema: "public", table: "opportunities" }, invalidate)
      .subscribe();

    return () => {
      void supabase.removeChannel(channel);
    };
  }, [profile?.id, qc]);
}
