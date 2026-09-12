-- 1. Prevent duplicate applications
CREATE UNIQUE INDEX IF NOT EXISTS applications_unique_volunteer_opportunity
  ON public.applications (opportunity_id, volunteer_id);

-- 2. Notifications
CREATE TABLE IF NOT EXISTS public.notifications (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  recipient_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  kind text NOT NULL DEFAULT 'info',
  title text NOT NULL,
  body text,
  link text,
  read_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS notifications_recipient_idx ON public.notifications (recipient_id, created_at DESC);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.notifications TO authenticated;
GRANT ALL ON public.notifications TO service_role;
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;
CREATE POLICY notifications_select_own ON public.notifications FOR SELECT TO authenticated USING (auth.uid() = recipient_id);
CREATE POLICY notifications_update_own ON public.notifications FOR UPDATE TO authenticated USING (auth.uid() = recipient_id) WITH CHECK (auth.uid() = recipient_id);
CREATE POLICY notifications_delete_own ON public.notifications FOR DELETE TO authenticated USING (auth.uid() = recipient_id);

-- 3. Saved opportunities
CREATE TABLE IF NOT EXISTS public.saved_opportunities (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  volunteer_id uuid NOT NULL REFERENCES public.volunteers(profile_id) ON DELETE CASCADE,
  opportunity_id uuid NOT NULL REFERENCES public.opportunities(id) ON DELETE CASCADE,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (volunteer_id, opportunity_id)
);
GRANT SELECT, INSERT, DELETE ON public.saved_opportunities TO authenticated;
GRANT ALL ON public.saved_opportunities TO service_role;
ALTER TABLE public.saved_opportunities ENABLE ROW LEVEL SECURITY;
CREATE POLICY saved_manage_own ON public.saved_opportunities FOR ALL TO authenticated
  USING (auth.uid() = volunteer_id) WITH CHECK (auth.uid() = volunteer_id);

-- 4. Application status history
CREATE TABLE IF NOT EXISTS public.application_status_history (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  application_id uuid NOT NULL REFERENCES public.applications(id) ON DELETE CASCADE,
  old_status public.application_status,
  new_status public.application_status NOT NULL,
  changed_by uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
  note text,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS ash_application_idx ON public.application_status_history (application_id, created_at);
GRANT SELECT ON public.application_status_history TO authenticated;
GRANT ALL ON public.application_status_history TO service_role;
ALTER TABLE public.application_status_history ENABLE ROW LEVEL SECURITY;
CREATE POLICY ash_select_participants ON public.application_status_history FOR SELECT TO authenticated
  USING (EXISTS (
    SELECT 1 FROM public.applications a
    JOIN public.opportunities o ON o.id = a.opportunity_id
    WHERE a.id = application_status_history.application_id
      AND (a.volunteer_id = auth.uid() OR o.ngo_id = auth.uid())
  ));

-- 5. Impact submissions
CREATE TABLE IF NOT EXISTS public.impact_submissions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  application_id uuid NOT NULL REFERENCES public.applications(id) ON DELETE CASCADE,
  volunteer_id uuid NOT NULL REFERENCES public.volunteers(profile_id) ON DELETE CASCADE,
  hours_contributed numeric NOT NULL DEFAULT 0,
  people_reached integer NOT NULL DEFAULT 0,
  summary text NOT NULL DEFAULT '',
  verified boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS impact_application_idx ON public.impact_submissions (application_id);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.impact_submissions TO authenticated;
GRANT ALL ON public.impact_submissions TO service_role;
ALTER TABLE public.impact_submissions ENABLE ROW LEVEL SECURITY;
CREATE POLICY impact_volunteer_manage ON public.impact_submissions FOR ALL TO authenticated
  USING (auth.uid() = volunteer_id) WITH CHECK (auth.uid() = volunteer_id);
CREATE POLICY impact_ngo_select ON public.impact_submissions FOR SELECT TO authenticated
  USING (EXISTS (
    SELECT 1 FROM public.applications a
    JOIN public.opportunities o ON o.id = a.opportunity_id
    WHERE a.id = impact_submissions.application_id AND o.ngo_id = auth.uid()
  ));
CREATE POLICY impact_ngo_verify ON public.impact_submissions FOR UPDATE TO authenticated
  USING (EXISTS (
    SELECT 1 FROM public.applications a
    JOIN public.opportunities o ON o.id = a.opportunity_id
    WHERE a.id = impact_submissions.application_id AND o.ngo_id = auth.uid()
  ))
  WITH CHECK (EXISTS (
    SELECT 1 FROM public.applications a
    JOIN public.opportunities o ON o.id = a.opportunity_id
    WHERE a.id = impact_submissions.application_id AND o.ngo_id = auth.uid()
  ));
CREATE TRIGGER impact_submissions_updated_at BEFORE UPDATE ON public.impact_submissions
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- 6. Validate applications before insert
CREATE OR REPLACE FUNCTION public.validate_application()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE o public.opportunities;
BEGIN
  SELECT * INTO o FROM public.opportunities WHERE id = NEW.opportunity_id;
  IF o.id IS NULL THEN
    RAISE EXCEPTION 'This opportunity no longer exists.';
  END IF;
  IF o.status <> 'open' THEN
    RAISE EXCEPTION 'This opportunity is closed for applications.';
  END IF;
  IF o.deadline IS NOT NULL AND o.deadline < CURRENT_DATE THEN
    RAISE EXCEPTION 'The deadline for this opportunity has passed.';
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS applications_validate ON public.applications;
CREATE TRIGGER applications_validate BEFORE INSERT ON public.applications
  FOR EACH ROW EXECUTE FUNCTION public.validate_application();

-- 7. Notify + record history
CREATE OR REPLACE FUNCTION public.on_application_created()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE v_ngo uuid; v_title text; v_name text;
BEGIN
  SELECT o.ngo_id, o.title INTO v_ngo, v_title FROM public.opportunities o WHERE o.id = NEW.opportunity_id;
  SELECT full_name INTO v_name FROM public.profiles WHERE id = NEW.volunteer_id;

  INSERT INTO public.application_status_history (application_id, old_status, new_status, changed_by)
  VALUES (NEW.id, NULL, NEW.status, NEW.volunteer_id);

  IF v_ngo IS NOT NULL THEN
    INSERT INTO public.notifications (recipient_id, kind, title, body, link)
    VALUES (v_ngo, 'application',
      'New application received',
      COALESCE(NULLIF(v_name, ''), 'A volunteer') || ' applied to "' || COALESCE(v_title, 'your opportunity') || '".',
      '/applicants');
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS applications_created_notify ON public.applications;
CREATE TRIGGER applications_created_notify AFTER INSERT ON public.applications
  FOR EACH ROW EXECUTE FUNCTION public.on_application_created();

CREATE OR REPLACE FUNCTION public.on_application_status_changed()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE v_title text; v_org text; v_msg text;
BEGIN
  IF NEW.status = OLD.status THEN RETURN NEW; END IF;

  SELECT o.title, n.organization_name INTO v_title, v_org
  FROM public.opportunities o
  LEFT JOIN public.ngos n ON n.profile_id = o.ngo_id
  WHERE o.id = NEW.opportunity_id;

  INSERT INTO public.application_status_history (application_id, old_status, new_status, changed_by)
  VALUES (NEW.id, OLD.status, NEW.status, auth.uid());

  v_msg := CASE NEW.status
    WHEN 'accepted' THEN 'You have been accepted for "' || COALESCE(v_title, 'an opportunity') || '".'
    WHEN 'rejected' THEN 'Your application for "' || COALESCE(v_title, 'an opportunity') || '" was not selected this time.'
    WHEN 'shortlisted' THEN 'You have been shortlisted for "' || COALESCE(v_title, 'an opportunity') || '".'
    WHEN 'completed' THEN 'Your work on "' || COALESCE(v_title, 'an opportunity') || '" was marked complete.'
    WHEN 'withdrawn' THEN 'You withdrew your application for "' || COALESCE(v_title, 'an opportunity') || '".'
    ELSE 'Your application for "' || COALESCE(v_title, 'an opportunity') || '" is back under review.'
  END;

  IF NEW.status = 'withdrawn' THEN
    INSERT INTO public.notifications (recipient_id, kind, title, body, link)
    SELECT o.ngo_id, 'application', 'Application withdrawn',
      COALESCE(NULLIF(p.full_name, ''), 'A volunteer') || ' withdrew from "' || COALESCE(v_title, 'your opportunity') || '".',
      '/applicants'
    FROM public.opportunities o
    LEFT JOIN public.profiles p ON p.id = NEW.volunteer_id
    WHERE o.id = NEW.opportunity_id AND o.ngo_id IS NOT NULL;
  ELSE
    INSERT INTO public.notifications (recipient_id, kind, title, body, link)
    VALUES (NEW.volunteer_id, 'status', 'Application update from ' || COALESCE(NULLIF(v_org, ''), 'an organization'), v_msg, '/applications');
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS applications_status_notify ON public.applications;
CREATE TRIGGER applications_status_notify AFTER UPDATE OF status ON public.applications
  FOR EACH ROW EXECUTE FUNCTION public.on_application_status_changed();

-- 8. Realtime
ALTER TABLE public.applications REPLICA IDENTITY FULL;
ALTER TABLE public.opportunities REPLICA IDENTITY FULL;
ALTER TABLE public.notifications REPLICA IDENTITY FULL;
ALTER TABLE public.saved_opportunities REPLICA IDENTITY FULL;

DO $$
BEGIN
  BEGIN ALTER PUBLICATION supabase_realtime ADD TABLE public.applications; EXCEPTION WHEN duplicate_object THEN NULL; END;
  BEGIN ALTER PUBLICATION supabase_realtime ADD TABLE public.opportunities; EXCEPTION WHEN duplicate_object THEN NULL; END;
  BEGIN ALTER PUBLICATION supabase_realtime ADD TABLE public.notifications; EXCEPTION WHEN duplicate_object THEN NULL; END;
  BEGIN ALTER PUBLICATION supabase_realtime ADD TABLE public.saved_opportunities; EXCEPTION WHEN duplicate_object THEN NULL; END;
END $$;