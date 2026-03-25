
CREATE TABLE public.webhook_sales (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  date DATE NOT NULL DEFAULT CURRENT_DATE,
  creative TEXT NOT NULL DEFAULT '',
  campaign TEXT NOT NULL DEFAULT '',
  revenue NUMERIC NOT NULL DEFAULT 0,
  country TEXT NOT NULL DEFAULT '',
  sales INTEGER NOT NULL DEFAULT 1
);

ALTER TABLE public.webhook_sales ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow public read webhook_sales" ON public.webhook_sales FOR SELECT TO public USING (true);
CREATE POLICY "Allow public insert webhook_sales" ON public.webhook_sales FOR INSERT TO public WITH CHECK (true);
