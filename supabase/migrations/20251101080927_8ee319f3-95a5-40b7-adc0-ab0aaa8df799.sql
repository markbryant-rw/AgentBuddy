-- Add visibility_level column to service_providers table
ALTER TABLE service_providers 
ADD COLUMN visibility_level TEXT NOT NULL DEFAULT 'office' 
CHECK (visibility_level IN ('office', 'team', 'private'));

-- Add index for better query performance when filtering by visibility
CREATE INDEX idx_service_providers_visibility 
ON service_providers(visibility_level);

-- Add comment for documentation
COMMENT ON COLUMN service_providers.visibility_level IS 
'Controls who can see this provider: office (everyone in office), team (team members only), private (creator only)';