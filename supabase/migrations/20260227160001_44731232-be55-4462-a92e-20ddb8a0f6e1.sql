
-- Create storage bucket for ad videos
INSERT INTO storage.buckets (id, name, public) VALUES ('ad-videos', 'ad-videos', true);

-- Allow anyone to upload/read/delete from ad-videos bucket (internal dashboard)
CREATE POLICY "Allow public read ad-videos" ON storage.objects FOR SELECT USING (bucket_id = 'ad-videos');
CREATE POLICY "Allow public insert ad-videos" ON storage.objects FOR INSERT WITH CHECK (bucket_id = 'ad-videos');
CREATE POLICY "Allow public delete ad-videos" ON storage.objects FOR DELETE USING (bucket_id = 'ad-videos');

-- Table to map ads to their video files
CREATE TABLE public.ad_videos (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  ad_name TEXT NOT NULL,
  video_url TEXT NOT NULL,
  file_name TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.ad_videos ENABLE ROW LEVEL SECURITY;

-- Public access for internal dashboard
CREATE POLICY "Allow public read ad_videos" ON public.ad_videos FOR SELECT USING (true);
CREATE POLICY "Allow public insert ad_videos" ON public.ad_videos FOR INSERT WITH CHECK (true);
CREATE POLICY "Allow public delete ad_videos" ON public.ad_videos FOR DELETE USING (true);
CREATE POLICY "Allow public update ad_videos" ON public.ad_videos FOR UPDATE USING (true);
