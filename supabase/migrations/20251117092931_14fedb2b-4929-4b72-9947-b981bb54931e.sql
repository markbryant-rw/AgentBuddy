-- Fix the demo user's auth record
-- The issue is NULL values in email_change and potentially other columns

UPDATE auth.users
SET 
  email_change = '',
  phone = '',
  phone_change = ''
WHERE email = 'user@agentbuddy.co';