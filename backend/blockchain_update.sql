-- Update schema to support blockchain integration
ALTER TABLE public.drives ADD COLUMN IF NOT EXISTS blockchain_id INTEGER;
ALTER TABLE public.milestones ADD COLUMN IF NOT EXISTS blockchain_index INTEGER;
ALTER TABLE public.donations ADD COLUMN IF NOT EXISTS blockchain_tx_hash TEXT;
