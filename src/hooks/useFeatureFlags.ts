import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';

export const useFeatureFlags = () => {
  const [flags, setFlags] = useState<Record<string, boolean>>({});
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchFlags = async () => {
      const { data, error } = await supabase
        .from('system_config')
        .select('config_value')
        .eq('config_key', 'feature_flags_sidebar')
        .single();

      if (!error && data) {
        const val = typeof data.config_value === 'string' ? JSON.parse(data.config_value) : data.config_value;
        setFlags(val);
      }
      setLoading(false);
    };

    fetchFlags();

    // Subscribe to changes
    const channel = supabase
      .channel('feature-flags-changes')
      .on('postgres_changes', {
        event: 'UPDATE',
        schema: 'public',
        table: 'system_config',
        filter: 'config_key=eq.feature_flags_sidebar',
      }, (payload) => {
        const val = payload.new.config_value;
        setFlags(typeof val === 'string' ? JSON.parse(val) : val);
      })
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, []);

  const isEnabled = (key: string): boolean => {
    return flags[key] ?? true; // default to enabled if not configured
  };

  return { flags, loading, isEnabled };
};
