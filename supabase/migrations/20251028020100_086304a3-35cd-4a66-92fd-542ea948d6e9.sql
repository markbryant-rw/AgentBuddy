-- Remove old row-level preferences
ALTER TABLE user_preferences 
DROP COLUMN IF EXISTS collapsed_hub_row_1,
DROP COLUMN IF EXISTS collapsed_hub_row_2;

-- Add new card-level preferences
ALTER TABLE user_preferences 
ADD COLUMN IF NOT EXISTS collapsed_hub_tasks boolean DEFAULT false,
ADD COLUMN IF NOT EXISTS collapsed_hub_messages boolean DEFAULT false,
ADD COLUMN IF NOT EXISTS collapsed_hub_digest boolean DEFAULT false,
ADD COLUMN IF NOT EXISTS collapsed_hub_performance boolean DEFAULT false;