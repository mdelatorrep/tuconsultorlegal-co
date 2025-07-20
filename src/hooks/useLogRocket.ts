import { useEffect } from 'react';
import LogRocket from 'logrocket';

interface LogRocketConfig {
  appId: string;
  enabled?: boolean;
  environment?: 'development' | 'staging' | 'production';
}

interface UserIdentity {
  id: string;
  name?: string;
  email?: string;
  role?: string;
  subscriptionType?: string;
}

export const useLogRocket = () => {
  useEffect(() => {
    // Solo inicializar LogRocket en producción o cuando esté explícitamente habilitado
    const isProduction = import.meta.env.PROD;
    const logRocketAppId = import.meta.env.VITE_LOGROCKET_APP_ID || 'tu_app_id_aqui';
    
    if (isProduction && logRocketAppId && logRocketAppId !== 'tu_app_id_aqui') {
      initializeLogRocket({
        appId: logRocketAppId,
        enabled: true,
        environment: 'production'
      });
    }
  }, []);

  const initializeLogRocket = (config: LogRocketConfig) => {
    try {
      console.log('Initializing LogRocket...', config);
      
      LogRocket.init(config.appId, {
        // Configuraciones de red
        network: {
          requestSanitizer: (request) => {
            // Sanitizar datos sensibles en requests
            if (request.headers && request.headers.authorization) {
              request.headers.authorization = '[HIDDEN]';
            }
            
            // Ocultar tokens y claves API
            if (request.body) {
              try {
                const body = JSON.parse(request.body);
                if (body.password) body.password = '[HIDDEN]';
                if (body.token) body.token = '[HIDDEN]';
                if (body.api_key) body.api_key = '[HIDDEN]';
                request.body = JSON.stringify(body);
              } catch (e) {
                // Si no es JSON válido, dejarlo como está
              }
            }
            
            return request;
          },
          
          responseSanitizer: (response) => {
            // Sanitizar respuestas sensibles
            if (response.body) {
              try {
                const body = JSON.parse(response.body);
                if (body.access_token) body.access_token = '[HIDDEN]';
                if (body.refresh_token) body.refresh_token = '[HIDDEN]';
                if (body.password) body.password = '[HIDDEN]';
                response.body = JSON.stringify(body);
              } catch (e) {
                // Si no es JSON válido, dejarlo como está
              }
            }
            return response;
          }
        },
        
        // Configuraciones de consola
        console: {
          shouldAggregateConsoleErrors: true,
          isEnabled: {
            log: true,
            info: true,
            warn: true,
            error: true,
            debug: config.environment === 'development'
          }
        },
        
        // Configuraciones de DOM
        dom: {
          inputSanitizer: true,
          textSanitizer: true,
          baseHref: window.location.origin
        },
        
        // Configuraciones adicionales
        release: config.environment || 'production',
        
        // Configurar captura de errores
        shouldCaptureIP: false, // Para cumplir con GDPR
        
        // Configuraciones de privacidad
        browser: {
          urlSanitizer: (url) => {
            // Remover tokens de URL si existen
            return url.replace(/([?&])(token|key|secret)=[^&]*/gi, '$1$2=[HIDDEN]');
          }
        }
      });

      // Configurar metadata útiles para el ambiente legal
      LogRocket.getSessionURL((sessionURL) => {
        console.log('LogRocket session URL:', sessionURL);
      });
      
      console.log('LogRocket initialized successfully');
      
    } catch (error) {
      console.error('Error initializing LogRocket:', error);
    }
  };

  const identifyUser = (user: UserIdentity) => {
    try {
      LogRocket.identify(user.id, {
        name: user.name,
        email: user.email,
        role: user.role,
        subscriptionType: user.subscriptionType,
        // Agregar más metadata relevante para el contexto legal
        platform: 'web',
        userAgent: navigator.userAgent
      });
      
      console.log('User identified in LogRocket:', user.id);
    } catch (error) {
      console.error('Error identifying user in LogRocket:', error);
    }
  };

  const trackEvent = (eventName: string, properties?: Record<string, any>) => {
    try {
      LogRocket.track(eventName, {
        ...properties,
        page: window.location.pathname
      });
      
      console.log('Event tracked in LogRocket:', eventName, properties);
    } catch (error) {
      console.error('Error tracking event in LogRocket:', error);
    }
  };

  const trackLegalEvent = (eventType: 'document_generated' | 'consultation_started' | 'payment_completed' | 'agent_interaction', data?: Record<string, any>) => {
    trackEvent(`legal_${eventType}`, {
      ...data,
      category: 'legal_operations',
      source: 'tuconsultorlegal'
    });
  };

  const captureException = (error: Error, extra?: Record<string, any>) => {
    try {
      LogRocket.captureException(error, {
        extra: {
          ...extra,
          page: window.location.pathname
        }
      });
      
      console.log('Exception captured in LogRocket:', error.message);
    } catch (logError) {
      console.error('Error capturing exception in LogRocket:', logError);
    }
  };

  const startSession = (sessionName?: string) => {
    try {
      if (sessionName) {
        console.log('Starting session with name:', sessionName);
      }
      
      // Iniciar una nueva sesión
      LogRocket.startNewSession();
      console.log('New LogRocket session started:', sessionName);
    } catch (error) {
      console.error('Error starting LogRocket session:', error);
    }
  };

  return {
    identifyUser,
    trackEvent,
    trackLegalEvent,
    captureException,
    startSession,
    // Exponer LogRocket directamente para casos avanzados
    LogRocket
  };
};

// Hook específico para rastrear interacciones legales
export const useLegalTracking = () => {
  const { trackLegalEvent, trackEvent } = useLogRocket();

  const trackDocumentGeneration = (documentType: string, success: boolean, metadata?: Record<string, any>) => {
    trackLegalEvent('document_generated', {
      documentType,
      success,
      ...metadata
    });
  };

  const trackConsultationStart = (consultationType: 'personal' | 'business', advisor?: string) => {
    trackLegalEvent('consultation_started', {
      consultationType,
      advisor,
      timestamp: new Date().toISOString()
    });
  };

  const trackPayment = (amount: number, currency: string, paymentMethod: string, documentType?: string) => {
    trackLegalEvent('payment_completed', {
      amount,
      currency,
      paymentMethod,
      documentType
    });
  };

  const trackAgentInteraction = (agentType: string, interactionType: 'chat' | 'document_review' | 'legal_advice', metadata?: Record<string, any>) => {
    trackLegalEvent('agent_interaction', {
      agentType,
      interactionType,
      ...metadata
    });
  };

  const trackUserJourney = (step: string, page: string, metadata?: Record<string, any>) => {
    trackEvent('user_journey', {
      step,
      page,
      ...metadata,
      category: 'user_experience'
    });
  };

  return {
    trackDocumentGeneration,
    trackConsultationStart,
    trackPayment,
    trackAgentInteraction,
    trackUserJourney
  };
};