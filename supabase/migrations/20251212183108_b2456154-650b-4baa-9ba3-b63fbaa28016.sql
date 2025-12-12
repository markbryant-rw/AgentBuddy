-- Add beacon_property_slug column to properties table
-- This creates the cross-reference: AgentBuddy properties.beacon_property_slug ↔ Beacon properties.property_slug

ALTER TABLE properties 
ADD COLUMN IF NOT EXISTS beacon_property_slug TEXT;

-- Create index for efficient lookups by beacon slug
CREATE INDEX IF NOT EXISTS idx_properties_beacon_slug 
ON properties(beacon_property_slug) 
WHERE beacon_property_slug IS NOT NULL;

-- Add comment for documentation
COMMENT ON COLUMN properties.beacon_property_slug IS 'Cross-reference to Beacon property_slug - enables property-level linking across all report types';