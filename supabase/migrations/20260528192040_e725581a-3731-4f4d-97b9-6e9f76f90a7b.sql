
-- webhook_sales: remove public access, admins read; inserts via service role (edge function)
DROP POLICY IF EXISTS "Allow public insert webhook_sales" ON public.webhook_sales;
DROP POLICY IF EXISTS "Allow public read webhook_sales" ON public.webhook_sales;
REVOKE ALL ON public.webhook_sales FROM anon;
CREATE POLICY "Admins can read webhook_sales"
  ON public.webhook_sales FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(), 'admin'::app_role));

-- ad_videos table: public read only; admin write
DROP POLICY IF EXISTS "Allow public delete ad_videos" ON public.ad_videos;
DROP POLICY IF EXISTS "Allow public insert ad_videos" ON public.ad_videos;
DROP POLICY IF EXISTS "Allow public update ad_videos" ON public.ad_videos;
CREATE POLICY "Admins can insert ad_videos"
  ON public.ad_videos FOR INSERT TO authenticated
  WITH CHECK (public.has_role(auth.uid(), 'admin'::app_role));
CREATE POLICY "Admins can update ad_videos"
  ON public.ad_videos FOR UPDATE TO authenticated
  USING (public.has_role(auth.uid(), 'admin'::app_role));
CREATE POLICY "Admins can delete ad_videos"
  ON public.ad_videos FOR DELETE TO authenticated
  USING (public.has_role(auth.uid(), 'admin'::app_role));

-- ad-videos storage bucket: public read only; admin write
DROP POLICY IF EXISTS "Allow public delete ad-videos" ON storage.objects;
DROP POLICY IF EXISTS "Allow public insert ad-videos" ON storage.objects;
CREATE POLICY "Admins can upload ad-videos"
  ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'ad-videos' AND public.has_role(auth.uid(), 'admin'::app_role));
CREATE POLICY "Admins can update ad-videos"
  ON storage.objects FOR UPDATE TO authenticated
  USING (bucket_id = 'ad-videos' AND public.has_role(auth.uid(), 'admin'::app_role));
CREATE POLICY "Admins can delete ad-videos"
  ON storage.objects FOR DELETE TO authenticated
  USING (bucket_id = 'ad-videos' AND public.has_role(auth.uid(), 'admin'::app_role));

-- campaign_configs: admin only
DROP POLICY IF EXISTS "auth_all_campaign_configs" ON public.campaign_configs;
CREATE POLICY "Admins manage campaign_configs"
  ON public.campaign_configs FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (public.has_role(auth.uid(), 'admin'::app_role));

-- ai_analysis_logs: admin only
DROP POLICY IF EXISTS "auth_all_ai_analysis_logs" ON public.ai_analysis_logs;
CREATE POLICY "Admins manage ai_analysis_logs"
  ON public.ai_analysis_logs FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (public.has_role(auth.uid(), 'admin'::app_role));

-- ai_training_data: admin only
DROP POLICY IF EXISTS "auth_all_ai_training_data" ON public.ai_training_data;
CREATE POLICY "Admins manage ai_training_data"
  ON public.ai_training_data FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (public.has_role(auth.uid(), 'admin'::app_role));

-- optimization_suggestions: admin only
DROP POLICY IF EXISTS "auth_all_optimization_suggestions" ON public.optimization_suggestions;
CREATE POLICY "Admins manage optimization_suggestions"
  ON public.optimization_suggestions FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (public.has_role(auth.uid(), 'admin'::app_role));

-- whatsapp_conversations: admin only
DROP POLICY IF EXISTS "auth_all_whatsapp_conversations" ON public.whatsapp_conversations;
CREATE POLICY "Admins manage whatsapp_conversations"
  ON public.whatsapp_conversations FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (public.has_role(auth.uid(), 'admin'::app_role));

-- zapi_config: admin only (contains API tokens)
DROP POLICY IF EXISTS "auth_all_zapi_config" ON public.zapi_config;
CREATE POLICY "Admins manage zapi_config"
  ON public.zapi_config FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (public.has_role(auth.uid(), 'admin'::app_role));

-- Fix mutable search_path on update_updated_at_column
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $function$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$function$;
