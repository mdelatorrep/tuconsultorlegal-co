import { supabase } from '@/integrations/supabase/client';

interface LogTermsAcceptanceParams {
  user_id?: string;
  user_type: 'user' | 'lawyer' | 'anonymous';
  user_email: string;
  user_name?: string;
  acceptance_type: 'registration' | 'document_creation' | 'subscription' | 'profile_update';
  acceptance_context?: string;
  terms_version?: string;
  privacy_policy_version?: string;
  data_processing_consent: boolean;
  intellectual_property_consent?: boolean;
  marketing_consent?: boolean;
  metadata?: Record<string, any>;
}

export const useTermsAudit = () => {
  /**
   * Registra la aceptación de términos y condiciones
   * CRÍTICO: Cumplimiento regulatorio - No eliminar
   */
  const logTermsAcceptance = async (params: LogTermsAcceptanceParams): Promise<boolean> => {
    try {
      console.log('📝 Logging terms acceptance:', params.acceptance_type, 'for', params.user_email);
      
      const { data, error } = await supabase.functions.invoke('log-terms-acceptance', {
        body: params
      });

      if (error) {
        console.error('❌ Error logging terms acceptance:', error);
        return false;
      }

      console.log('✅ Terms acceptance logged successfully:', data);
      return true;
    } catch (error) {
      console.error('❌ Exception logging terms acceptance:', error);
      return false;
    }
  };

  /**
   * Registra aceptación durante registro de usuario
   */
  const logRegistrationTerms = async (
    userType: 'user' | 'lawyer',
    email: string,
    fullName: string,
    userId?: string,
    dataConsent: boolean = true,
    ipConsent?: boolean,
    marketingConsent: boolean = false
  ): Promise<boolean> => {
    return logTermsAcceptance({
      user_id: userId,
      user_type: userType,
      user_email: email,
      user_name: fullName,
      acceptance_type: 'registration',
      acceptance_context: `${userType} registration`,
      data_processing_consent: dataConsent,
      intellectual_property_consent: ipConsent,
      marketing_consent: marketingConsent,
      metadata: {
        source: 'registration_form',
        timestamp: new Date().toISOString()
      }
    });
  };

  /**
   * Registra aceptación durante creación de documento
   */
  const logDocumentCreationTerms = async (
    email: string,
    documentType: string,
    agentId?: string,
    userId?: string,
    userName?: string
  ): Promise<boolean> => {
    return logTermsAcceptance({
      user_id: userId,
      user_type: userId ? 'user' : 'anonymous',
      user_email: email,
      user_name: userName,
      acceptance_type: 'document_creation',
      acceptance_context: `Document creation: ${documentType}`,
      data_processing_consent: true,
      metadata: {
        document_type: documentType,
        agent_id: agentId,
        source: 'document_flow',
        timestamp: new Date().toISOString()
      }
    });
  };

  /**
   * Registra aceptación durante suscripción
   */
  const logSubscriptionTerms = async (
    lawyerId: string,
    email: string,
    lawyerName: string,
    planId: string,
    dataConsent: boolean = true,
    ipConsent: boolean = true
  ): Promise<boolean> => {
    return logTermsAcceptance({
      user_id: lawyerId,
      user_type: 'lawyer',
      user_email: email,
      user_name: lawyerName,
      acceptance_type: 'subscription',
      acceptance_context: `Subscription to plan: ${planId}`,
      data_processing_consent: dataConsent,
      intellectual_property_consent: ipConsent,
      metadata: {
        plan_id: planId,
        source: 'subscription_flow',
        timestamp: new Date().toISOString()
      }
    });
  };

  return {
    logTermsAcceptance,
    logRegistrationTerms,
    logDocumentCreationTerms,
    logSubscriptionTerms
  };
};
