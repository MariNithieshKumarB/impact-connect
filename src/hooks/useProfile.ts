import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "./useAuth";

export type UserRole = "volunteer" | "ngo";

export interface Profile {
  id: string;
  role: UserRole;
  full_name: string;
  avatar: string | null;
  location: string | null;
  bio: string | null;
}

export function useProfile() {
  const { user, loading: authLoading } = useAuth();
  const query = useQuery({
    queryKey: ["profile", user?.id],
    enabled: !!user?.id,
    queryFn: async (): Promise<Profile | null> => {
      const { data, error } = await supabase
        .from("profiles")
        .select("id, role, full_name, avatar, location, bio")
        .eq("id", user!.id)
        .maybeSingle();
      if (error) throw error;
      return data as Profile | null;
    },
  });
  return { ...query, authLoading, user };
}
