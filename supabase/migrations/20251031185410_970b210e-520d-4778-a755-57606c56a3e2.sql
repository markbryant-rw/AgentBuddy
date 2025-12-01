-- Add default transaction role preferences to user_preferences table
ALTER TABLE user_preferences 
ADD COLUMN IF NOT EXISTS default_transaction_role_salesperson uuid REFERENCES profiles(id),
ADD COLUMN IF NOT EXISTS default_transaction_role_admin uuid REFERENCES profiles(id);

-- Add helpful comment
COMMENT ON COLUMN user_preferences.default_transaction_role_salesperson IS 'Default user to assign as salesperson when creating new transactions';
COMMENT ON COLUMN user_preferences.default_transaction_role_admin IS 'Default user to assign as admin when creating new transactions';