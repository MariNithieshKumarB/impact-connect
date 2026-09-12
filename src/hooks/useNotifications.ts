import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useProfile } from "./useProfile";

export interface AppNotification {
  id: string;
  kind: string;
  title: string;
  body: string | null;
  link: string | null;
  read_at: string | null;
  created_at: string;
}

export function useNotifications() {
  const { data: profile } = useProfile();
  const qc = useQueryClient();

  const query = useQuery({
    enabled: !!profile?.id,
    queryKey: ["notifications", profile?.id],
    queryFn: async (): Promise<AppNotification[]> => {
      const { data, error } = await supabase
        .from("notifications")
        .select("id, kind, title, body, link, read_at, created_at")
        .order("created_at", { ascending: false })
        .limit(30);
      if (error) throw error;
      return (data ?? []) as AppNotification[];
    },
  });

  useEffect(() => {
    if (!profile?.id) return;
    const channel = supabase
      .channel(`notifications-${profile.id}`)
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "notifications", filter: `recipient_id=eq.${profile.id}` },
        () => qc.invalidateQueries({ queryKey: ["notifications"] }),
      )
      .subscribe();
    return () => {
      void supabase.removeChannel(channel);
    };
  }, [profile?.id, qc]);

  const unread = (query.data ?? []).filter((n) => !n.read_at).length;

  const markRead = async (id: string) => {
    await supabase.from("notifications").update({ read_at: new Date().toISOString() }).eq("id", id);
    qc.invalidateQueries({ queryKey: ["notifications"] });
  };

  const markAllRead = async () => {
    const ids = (query.data ?? []).filter((n) => !n.read_at).map((n) => n.id);
    if (!ids.length) return;
    await supabase.from("notifications").update({ read_at: new Date().toISOString() }).in("id", ids);
    qc.invalidateQueries({ queryKey: ["notifications"] });
  };

  return { ...query, unread, markRead, markAllRead };
}
