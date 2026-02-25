-- Add user_type column to profiles
ALTER TABLE public.profiles 
ADD COLUMN user_type text DEFAULT NULL;

-- Add check constraint for valid values
ALTER TABLE public.profiles 
ADD CONSTRAINT profiles_user_type_check 
CHECK (user_type IN ('creator', 'business', 'personal') OR user_type IS NULL);