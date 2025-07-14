-- Add is_read field to contact_messages table
ALTER TABLE public.contact_messages 
ADD COLUMN is_read boolean NOT NULL DEFAULT false;