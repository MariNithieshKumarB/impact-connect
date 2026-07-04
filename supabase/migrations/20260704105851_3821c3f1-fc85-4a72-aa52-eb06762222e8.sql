
-- Role enum
CREATE TYPE public.user_role AS ENUM ('volunteer', 'ngo');
CREATE TYPE public.opportunity_status AS ENUM ('open', 'closed', 'draft');
CREATE TYPE public.application_status AS ENUM ('pending', 'accepted', 'rejected', 'withdrawn');

-- updated_at helper
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN NEW.updated_at = now(); RETURN NEW; END;
$$ LANGUAGE plpgsql SET search_path = public;

-- PROFILES
CREATE TABLE public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  role public.user_role NOT NULL,
  full_name TEXT NOT NULL DEFAULT '',
  avatar TEXT,
  location TEXT,
  bio TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT ON public.profiles TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.profiles TO authenticated;
GRANT ALL ON public.profiles TO service_role;
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
CREATE POLICY "profiles_read_all" ON public.profiles FOR SELECT USING (true);
CREATE POLICY "profiles_insert_own" ON public.profiles FOR INSERT TO authenticated WITH CHECK (auth.uid() = id);
CREATE POLICY "profiles_update_own" ON public.profiles FOR UPDATE TO authenticated USING (auth.uid() = id) WITH CHECK (auth.uid() = id);
CREATE POLICY "profiles_delete_own" ON public.profiles FOR DELETE TO authenticated USING (auth.uid() = id);
CREATE TRIGGER profiles_updated_at BEFORE UPDATE ON public.profiles FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Helper to read role safely from RLS policies
CREATE OR REPLACE FUNCTION public.get_user_role(_user_id UUID)
RETURNS public.user_role
LANGUAGE SQL STABLE SECURITY DEFINER SET search_path = public
AS $$ SELECT role FROM public.profiles WHERE id = _user_id $$;

-- VOLUNTEERS
CREATE TABLE public.volunteers (
  profile_id UUID PRIMARY KEY REFERENCES public.profiles(id) ON DELETE CASCADE,
  skills TEXT[] NOT NULL DEFAULT '{}',
  interests TEXT[] NOT NULL DEFAULT '{}',
  availability TEXT,
  experience TEXT,
  preferred_location TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT ON public.volunteers TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.volunteers TO authenticated;
GRANT ALL ON public.volunteers TO service_role;
ALTER TABLE public.volunteers ENABLE ROW LEVEL SECURITY;
CREATE POLICY "volunteers_read_all" ON public.volunteers FOR SELECT USING (true);
CREATE POLICY "volunteers_write_own" ON public.volunteers FOR ALL TO authenticated
  USING (auth.uid() = profile_id) WITH CHECK (auth.uid() = profile_id);
CREATE TRIGGER volunteers_updated_at BEFORE UPDATE ON public.volunteers FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- NGOS
CREATE TABLE public.ngos (
  profile_id UUID PRIMARY KEY REFERENCES public.profiles(id) ON DELETE CASCADE,
  organization_name TEXT NOT NULL DEFAULT '',
  mission TEXT,
  focus_area TEXT,
  address TEXT,
  contact_email TEXT,
  website TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT ON public.ngos TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.ngos TO authenticated;
GRANT ALL ON public.ngos TO service_role;
ALTER TABLE public.ngos ENABLE ROW LEVEL SECURITY;
CREATE POLICY "ngos_read_all" ON public.ngos FOR SELECT USING (true);
CREATE POLICY "ngos_write_own" ON public.ngos FOR ALL TO authenticated
  USING (auth.uid() = profile_id) WITH CHECK (auth.uid() = profile_id);
CREATE TRIGGER ngos_updated_at BEFORE UPDATE ON public.ngos FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- OPPORTUNITIES
CREATE TABLE public.opportunities (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  ngo_id UUID NOT NULL REFERENCES public.ngos(profile_id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  description TEXT NOT NULL DEFAULT '',
  required_skills TEXT[] NOT NULL DEFAULT '{}',
  location TEXT,
  volunteers_needed INT NOT NULL DEFAULT 1,
  deadline DATE,
  status public.opportunity_status NOT NULL DEFAULT 'open',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT ON public.opportunities TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.opportunities TO authenticated;
GRANT ALL ON public.opportunities TO service_role;
ALTER TABLE public.opportunities ENABLE ROW LEVEL SECURITY;
CREATE POLICY "opportunities_read_all" ON public.opportunities FOR SELECT USING (true);
CREATE POLICY "opportunities_insert_own_ngo" ON public.opportunities FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = ngo_id AND public.get_user_role(auth.uid()) = 'ngo');
CREATE POLICY "opportunities_update_own_ngo" ON public.opportunities FOR UPDATE TO authenticated
  USING (auth.uid() = ngo_id) WITH CHECK (auth.uid() = ngo_id);
CREATE POLICY "opportunities_delete_own_ngo" ON public.opportunities FOR DELETE TO authenticated
  USING (auth.uid() = ngo_id);
CREATE INDEX opportunities_ngo_idx ON public.opportunities(ngo_id);
CREATE INDEX opportunities_status_idx ON public.opportunities(status);
CREATE TRIGGER opportunities_updated_at BEFORE UPDATE ON public.opportunities FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- APPLICATIONS
CREATE TABLE public.applications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  opportunity_id UUID NOT NULL REFERENCES public.opportunities(id) ON DELETE CASCADE,
  volunteer_id UUID NOT NULL REFERENCES public.volunteers(profile_id) ON DELETE CASCADE,
  status public.application_status NOT NULL DEFAULT 'pending',
  message TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (opportunity_id, volunteer_id)
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.applications TO authenticated;
GRANT ALL ON public.applications TO service_role;
ALTER TABLE public.applications ENABLE ROW LEVEL SECURITY;

-- volunteer sees own; ngo sees applications on their opportunities
CREATE POLICY "applications_select_own_volunteer" ON public.applications FOR SELECT TO authenticated
  USING (auth.uid() = volunteer_id);
CREATE POLICY "applications_select_ngo_owner" ON public.applications FOR SELECT TO authenticated
  USING (EXISTS (SELECT 1 FROM public.opportunities o WHERE o.id = opportunity_id AND o.ngo_id = auth.uid()));
CREATE POLICY "applications_insert_own_volunteer" ON public.applications FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = volunteer_id AND public.get_user_role(auth.uid()) = 'volunteer');
CREATE POLICY "applications_update_own_volunteer" ON public.applications FOR UPDATE TO authenticated
  USING (auth.uid() = volunteer_id) WITH CHECK (auth.uid() = volunteer_id);
CREATE POLICY "applications_update_ngo_owner" ON public.applications FOR UPDATE TO authenticated
  USING (EXISTS (SELECT 1 FROM public.opportunities o WHERE o.id = opportunity_id AND o.ngo_id = auth.uid()))
  WITH CHECK (EXISTS (SELECT 1 FROM public.opportunities o WHERE o.id = opportunity_id AND o.ngo_id = auth.uid()));
CREATE POLICY "applications_delete_own_volunteer" ON public.applications FOR DELETE TO authenticated
  USING (auth.uid() = volunteer_id);
CREATE INDEX applications_opp_idx ON public.applications(opportunity_id);
CREATE INDEX applications_vol_idx ON public.applications(volunteer_id);
CREATE TRIGGER applications_updated_at BEFORE UPDATE ON public.applications FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Auto-create profile (and role-specific row) on signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
DECLARE
  v_role public.user_role;
  v_name TEXT;
BEGIN
  v_role := COALESCE(NULLIF(NEW.raw_user_meta_data->>'role', ''), 'volunteer')::public.user_role;
  v_name := COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.raw_user_meta_data->>'name', split_part(NEW.email, '@', 1), '');

  INSERT INTO public.profiles (id, role, full_name)
  VALUES (NEW.id, v_role, v_name)
  ON CONFLICT (id) DO NOTHING;

  IF v_role = 'volunteer' THEN
    INSERT INTO public.volunteers (profile_id) VALUES (NEW.id) ON CONFLICT DO NOTHING;
  ELSE
    INSERT INTO public.ngos (profile_id, organization_name) VALUES (NEW.id, v_name) ON CONFLICT DO NOTHING;
  END IF;

  RETURN NEW;
END;
$$;

CREATE TRIGGER on_auth_user_created
AFTER INSERT ON auth.users
FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();
