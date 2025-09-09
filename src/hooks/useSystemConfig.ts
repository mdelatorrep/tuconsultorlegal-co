import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

interface SystemConfig {
  id: string;
  config_key: string;
  config_value: any;
  description?: string;
  created_at: string;
  updated_at: string;
}

export const useSystemConfig = () => {
  const [configs, setConfigs] = useState<SystemConfig[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const { toast } = useToast();

  // Fetch all system configurations
  const fetchConfigs = async () => {
    try {
      setIsLoading(true);
      console.log('🔧 Fetching system configurations...');
      
      const { data, error } = await supabase
        .from('system_config')
        .select('*')
        .order('config_key');

      if (error) {
        console.error('❌ Error fetching system configs:', error);
        throw error;
      }

      console.log('✅ System configurations loaded:', data);
      if (data) {
        setConfigs(data);
      }
    } catch (error) {
      console.error('💥 Error fetching configurations:', error);
      toast({
        title: "Error",
        description: "Error al cargar las configuraciones del sistema",
        variant: "destructive"
      });
    } finally {
      setIsLoading(false);
    }
  };

  // Update a specific configuration
  const updateConfig = async (configKey: string, configValue: any) => {
    try {
      setIsLoading(true);
      console.log(`🔧 Updating config: ${configKey}`, configValue);

      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        throw new Error('No authenticated session');
      }

      const { data, error } = await supabase.functions.invoke('update-system-config', {
        body: { configKey, configValue },
        headers: {
          Authorization: `Bearer ${session.access_token}`,
        },
      });

      if (error) {
        console.error('❌ Error updating config:', error);
        throw error;
      }

      console.log('✅ Configuration updated successfully:', data);
      
      toast({
        title: "Configuración actualizada",
        description: "La configuración del sistema se ha actualizado correctamente",
      });

      // Refresh configurations
      await fetchConfigs();
      
      return data;
    } catch (error) {
      console.error('💥 Error updating configuration:', error);
      toast({
        title: "Error",
        description: "Error al actualizar la configuración del sistema",
        variant: "destructive"
      });
      throw error;
    } finally {
      setIsLoading(false);
    }
  };

  // Get a specific configuration value
  const getConfigValue = (configKey: string, defaultValue: any = null) => {
    const config = configs.find(c => c.config_key === configKey);
    return config ? config.config_value : defaultValue;
  };

  // Check if AI tools are enabled independent of subscription
  const isAiToolsIndependentEnabled = (): boolean => {
    const config = getConfigValue('ai_tools_independent_subscription', { enabled: false });
    return config?.enabled === true;
  };

  useEffect(() => {
    fetchConfigs();
  }, []);

  return {
    configs,
    isLoading,
    fetchConfigs,
    updateConfig,
    getConfigValue,
    isAiToolsIndependentEnabled
  };
};