-- Create lawyer_notifications table for unified in-app notifications
CREATE TABLE public.lawyer_notifications (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  lawyer_id UUID NOT NULL REFERENCES public.lawyer_profiles(id) ON DELETE CASCADE,
  notification_type TEXT NOT NULL,
  title TEXT NOT NULL,
  message TEXT NOT NULL,
  entity_type TEXT, -- 'document', 'lead', 'process', 'credit', 'calendar', 'system'
  entity_id UUID,
  action_url TEXT,
  priority TEXT NOT NULL DEFAULT 'normal', -- 'low', 'normal', 'high', 'urgent'
  is_read BOOLEAN NOT NULL DEFAULT false,
  read_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create notification_preferences table
CREATE TABLE public.notification_preferences (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  lawyer_id UUID NOT NULL REFERENCES public.lawyer_profiles(id) ON DELETE CASCADE,
  notification_type TEXT NOT NULL,
  email_enabled BOOLEAN NOT NULL DEFAULT true,
  in_app_enabled BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(lawyer_id, notification_type)
);

-- Create indexes for performance
CREATE INDEX idx_lawyer_notifications_lawyer_id ON public.lawyer_notifications(lawyer_id);
CREATE INDEX idx_lawyer_notifications_is_read ON public.lawyer_notifications(lawyer_id, is_read);
CREATE INDEX idx_lawyer_notifications_created_at ON public.lawyer_notifications(created_at DESC);
CREATE INDEX idx_lawyer_notifications_type ON public.lawyer_notifications(notification_type);
CREATE INDEX idx_notification_preferences_lawyer_id ON public.notification_preferences(lawyer_id);

-- Enable RLS
ALTER TABLE public.lawyer_notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.notification_preferences ENABLE ROW LEVEL SECURITY;

-- RLS policies for lawyer_notifications
CREATE POLICY "Lawyers can view their own notifications"
ON public.lawyer_notifications FOR SELECT
USING (auth.uid() = lawyer_id);

CREATE POLICY "Lawyers can update their own notifications"
ON public.lawyer_notifications FOR UPDATE
USING (auth.uid() = lawyer_id)
WITH CHECK (auth.uid() = lawyer_id);

CREATE POLICY "Service role can manage all notifications"
ON public.lawyer_notifications FOR ALL
USING (auth.role() = 'service_role')
WITH CHECK (auth.role() = 'service_role');

-- RLS policies for notification_preferences
CREATE POLICY "Lawyers can view their own preferences"
ON public.notification_preferences FOR SELECT
USING (auth.uid() = lawyer_id);

CREATE POLICY "Lawyers can manage their own preferences"
ON public.notification_preferences FOR ALL
USING (auth.uid() = lawyer_id)
WITH CHECK (auth.uid() = lawyer_id);

CREATE POLICY "Service role can manage all preferences"
ON public.notification_preferences FOR ALL
USING (auth.role() = 'service_role')
WITH CHECK (auth.role() = 'service_role');

-- Trigger to update updated_at on notification_preferences
CREATE TRIGGER update_notification_preferences_updated_at
BEFORE UPDATE ON public.notification_preferences
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Enable realtime for lawyer_notifications
ALTER PUBLICATION supabase_realtime ADD TABLE public.lawyer_notifications;

-- Insert default notification types for new lawyers
CREATE OR REPLACE FUNCTION public.initialize_lawyer_notification_preferences()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  INSERT INTO public.notification_preferences (lawyer_id, notification_type, email_enabled, in_app_enabled)
  VALUES
    (NEW.id, 'new_lead', true, true),
    (NEW.id, 'document_status', true, true),
    (NEW.id, 'process_update', true, true),
    (NEW.id, 'credit_low', true, true),
    (NEW.id, 'credit_recharge', true, true),
    (NEW.id, 'sla_alert', true, true),
    (NEW.id, 'calendar_reminder', true, true),
    (NEW.id, 'system', false, true)
  ON CONFLICT (lawyer_id, notification_type) DO NOTHING;
  
  RETURN NEW;
END;
$$;

-- Trigger to initialize preferences when lawyer is created
CREATE TRIGGER initialize_notification_preferences_trigger
AFTER INSERT ON public.lawyer_profiles
FOR EACH ROW
EXECUTE FUNCTION public.initialize_lawyer_notification_preferences();

-- Function to create notification and check preferences
CREATE OR REPLACE FUNCTION public.create_lawyer_notification(
  p_lawyer_id UUID,
  p_notification_type TEXT,
  p_title TEXT,
  p_message TEXT,
  p_entity_type TEXT DEFAULT NULL,
  p_entity_id UUID DEFAULT NULL,
  p_action_url TEXT DEFAULT NULL,
  p_priority TEXT DEFAULT 'normal'
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_in_app_enabled BOOLEAN;
  v_notification_id UUID;
BEGIN
  -- Check if in-app notifications are enabled for this type
  SELECT in_app_enabled INTO v_in_app_enabled
  FROM notification_preferences
  WHERE lawyer_id = p_lawyer_id AND notification_type = p_notification_type;
  
  -- Default to true if no preference exists
  IF v_in_app_enabled IS NULL THEN
    v_in_app_enabled := true;
  END IF;
  
  -- Create notification if enabled
  IF v_in_app_enabled THEN
    INSERT INTO lawyer_notifications (
      lawyer_id, notification_type, title, message, 
      entity_type, entity_id, action_url, priority
    ) VALUES (
      p_lawyer_id, p_notification_type, p_title, p_message,
      p_entity_type, p_entity_id, p_action_url, p_priority
    ) RETURNING id INTO v_notification_id;
  END IF;
  
  RETURN v_notification_id;
END;
$$;