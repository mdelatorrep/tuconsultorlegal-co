-- Create profiles table for regular users
CREATE TABLE public.user_profiles (
  id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE PRIMARY KEY,
  full_name TEXT NOT NULL,
  email TEXT NOT NULL,
  phone TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.user_profiles ENABLE ROW LEVEL SECURITY;

-- Create policies for user profiles
CREATE POLICY "Users can view their own profile"
ON public.user_profiles
FOR SELECT
USING (auth.uid() = id);

CREATE POLICY "Users can update their own profile" 
ON public.user_profiles
FOR UPDATE
USING (auth.uid() = id);

CREATE POLICY "Users can insert their own profile"
ON public.user_profiles
FOR INSERT
WITH CHECK (auth.uid() = id);

-- Create function to update user_profiles.updated_at
CREATE OR REPLACE FUNCTION public.update_user_profiles_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Create trigger for user_profiles
CREATE TRIGGER update_user_profiles_updated_at
BEFORE UPDATE ON public.user_profiles
FOR EACH ROW
EXECUTE FUNCTION public.update_user_profiles_updated_at();

-- Add user_id to document_tokens for tracking which user created it
ALTER TABLE public.document_tokens 
ADD COLUMN user_id UUID REFERENCES auth.users(id);

-- Update RLS policies for document_tokens to allow users to see their own documents
CREATE POLICY "Users can view their own document tokens"
ON public.document_tokens
FOR SELECT
USING (auth.uid() = user_id OR user_id IS NULL);

CREATE POLICY "Users can create document tokens"
ON public.document_tokens  
FOR INSERT
WITH CHECK (auth.uid() = user_id OR user_id IS NULL);

-- Update existing handle_new_user function to handle both lawyers and regular users
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  -- Check if this is a lawyer user
  IF NEW.raw_user_meta_data ? 'is_lawyer' 
     AND (NEW.raw_user_meta_data ->> 'is_lawyer')::boolean 
     AND NOT EXISTS (SELECT 1 FROM public.lawyer_profiles WHERE id = NEW.id) THEN
    
    -- Create lawyer profile
    INSERT INTO public.lawyer_profiles (
      id, 
      full_name, 
      email,
      can_create_agents,
      can_create_blogs,
      can_use_ai_tools,
      is_active
    )
    VALUES (
      NEW.id, 
      COALESCE(NEW.raw_user_meta_data ->> 'full_name', NEW.email, 'Usuario'),
      NEW.email,
      COALESCE((NEW.raw_user_meta_data ->> 'can_create_agents')::boolean, false),
      COALESCE((NEW.raw_user_meta_data ->> 'can_create_blogs')::boolean, false),
      COALESCE((NEW.raw_user_meta_data ->> 'can_use_ai_tools')::boolean, false),
      true
    );
      
    RAISE LOG 'Lawyer profile created for user: % (email: %)', NEW.id, NEW.email;
  ELSE
    -- Create regular user profile (only if not a lawyer and profile doesn't exist)
    IF NOT EXISTS (SELECT 1 FROM public.user_profiles WHERE id = NEW.id) THEN
      INSERT INTO public.user_profiles (
        id,
        full_name,
        email
      )
      VALUES (
        NEW.id,
        COALESCE(NEW.raw_user_meta_data ->> 'full_name', split_part(NEW.email, '@', 1)),
        NEW.email
      );
      
      RAISE LOG 'User profile created for user: % (email: %)', NEW.id, NEW.email;
    END IF;
  END IF;
  
  RETURN NEW;
EXCEPTION
  WHEN OTHERS THEN
    RAISE LOG 'Error creating profile for % (email: %): %', NEW.id, NEW.email, SQLERRM;
    RETURN NEW; -- Don't fail authentication due to profile errors
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;