-- Vision Board graduates from the shared checklists table to a purpose-built
-- vision_cards table. Aspirations aren't tasks to "complete" — there is no
-- `completed` column here. A card is either a quote/affirmation (kind='quote',
-- text holds the words) or an image (kind='image', image_url holds the source).
-- `section` is the life area (Health, Career, Relationships, Travel, Money…),
-- `position` is the manual sort rank for future drag-arrange (P3).
CREATE TABLE IF NOT EXISTS public.vision_cards (
  id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  kind TEXT NOT NULL DEFAULT 'quote' CHECK (kind IN ('quote', 'image')),
  text TEXT,
  image_url TEXT,
  section TEXT,
  position INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.vision_cards ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can access own vision_cards" ON public.vision_cards;
CREATE POLICY "Users can access own vision_cards" ON public.vision_cards FOR ALL
  USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "SysOp read access" ON public.vision_cards;
CREATE POLICY "SysOp read access" ON public.vision_cards FOR SELECT
  USING (EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'sysop'));

CREATE INDEX IF NOT EXISTS vision_cards_user_idx
  ON public.vision_cards (user_id, position, created_at);
