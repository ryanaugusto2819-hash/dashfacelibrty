
CREATE TABLE public.campaign_budget_history (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  campaign_id text NOT NULL,
  ad_name text,
  previous_budget numeric,
  new_budget numeric NOT NULL,
  user_id uuid NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_cbh_campaign_user_created
  ON public.campaign_budget_history (campaign_id, user_id, created_at DESC);

GRANT SELECT, INSERT ON public.campaign_budget_history TO authenticated;
GRANT ALL ON public.campaign_budget_history TO service_role;

ALTER TABLE public.campaign_budget_history ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins read own budget history"
  ON public.campaign_budget_history FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(), 'admin'::app_role) AND user_id = auth.uid());

CREATE POLICY "Admins insert own budget history"
  ON public.campaign_budget_history FOR INSERT TO authenticated
  WITH CHECK (public.has_role(auth.uid(), 'admin'::app_role) AND user_id = auth.uid());
