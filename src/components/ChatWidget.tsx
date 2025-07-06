
import { useState, useEffect, useRef } from "react";
import { Button } from "./ui/button";
import { Scale, X, AlertCircle } from "lucide-react";
import { createChat } from '@n8n/chat';

interface ChatWidgetProps {
  isOpen: boolean;
  onToggle: () => void;
  initialMessage?: string;
}

export default function ChatWidget({ isOpen, onToggle, initialMessage }: ChatWidgetProps) {
  const [iframeError, setIframeError] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const chatContainer = useRef<HTMLDivElement>(null);
  const chatInstance = useRef<any>(null);

  // Initialize n8n chat when component mounts and chat opens
  useEffect(() => {
    if (isOpen && chatContainer.current && !chatInstance.current) {
      try {
        setIsLoading(true);
        
        chatInstance.current = createChat({
          webhookUrl: 'https://buildera.app.n8n.cloud/webhook/a9c21cdd-8709-416a-a9c1-3b615b7e9f6b/chat',
          webhookConfig: {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
          },
          target: chatContainer.current,
          
          // Modo fullscreen sin elementos adicionales
          mode: 'fullscreen',

          // Claves que se enviarán al webhook.
          chatInputKey: 'chatInput',
          chatSessionKey: 'sessionId',

          // Permite que los usuarios continúen su conversación si recargan la página.
          loadPreviousSession: true,
          
          metadata: {},

          // Ocultar pantalla de bienvenida para evitar duplicados
          showWelcomeScreen: false,

          // Establece el idioma por defecto a español.
          defaultLanguage: 'en',

          // Sin mensajes iniciales para evitar duplicación
          initialMessages: [],

          // Textos de la interfaz del chat en español.
          i18n: {
            en: {
              title: 'Lexi, tu Asistente Legal ⚖️',
              subtitle: 'Resuelve tus dudas o crea documentos legales al instante.',
              footer: 'Con tecnología de tuconsultorlegal.co',
              getStarted: 'Nueva Conversación',
              inputPlaceholder: 'Escribe tu consulta legal aquí...',
              closeButtonTooltip: 'Cerrar chat',
            },
          },

          // Estilos personalizados para que coincida con la web
          theme: {
            '--chat--color-primary': 'hsl(233 49% 46%)',
            '--chat--color-secondary': 'hsl(13 87% 58%)',
            '--chat--header--background': 'linear-gradient(135deg, hsl(233 49% 46%) 0%, hsl(233 60% 60%) 100%)',
            '--chat--message--user--background': 'hsl(13 87% 58%)',
            '--chat--font-family': "'Montserrat', sans-serif",
            '--chat--border-radius': '0.75rem',
            '--chat--spacing': '1rem',
            '--chat--input--background': 'hsl(0 0% 100%)',
            '--chat--input--border': 'hsl(0 0% 85%)',
          }
        });

        // Handle successful initialization
        setTimeout(() => {
          setIsLoading(false);
          setIframeError(false);
        }, 1000);

      } catch (error) {
        console.error('Error initializing n8n chat:', error);
        setIsLoading(false);
        setIframeError(true);
      }
    }
  }, [isOpen]);

  // Cleanup chat instance when component unmounts or closes
  useEffect(() => {
    if (!isOpen && chatInstance.current) {
      try {
        if (chatInstance.current.destroy) {
          chatInstance.current.destroy();
        }
        chatInstance.current = null;
      } catch (error) {
        console.error('Error cleaning up chat:', error);
      }
    }
  }, [isOpen]);

  // Reset states when chat opens
  useEffect(() => {
    if (isOpen) {
      setIsLoading(true);
      setIframeError(false);
    }
  }, [isOpen]);

  if (!isOpen) {
    return (
      <button
        onClick={onToggle}
        className="fixed bottom-6 right-6 w-16 h-16 bg-primary hover:bg-primary-light text-primary-foreground rounded-full shadow-hero flex items-center justify-center transition-bounce z-[9999] md:w-20 md:h-20"
        aria-label="Abrir chat de asistencia legal"
      >
        <Scale size={28} className="md:w-8 md:h-8" />
      </button>
    );
  }

  return (
    <div
      className="fixed bottom-4 right-4 left-4 md:left-auto md:right-6 md:bottom-6 w-auto md:w-96 h-[calc(100vh-2rem)] md:h-[500px] max-h-[80vh] bg-card rounded-lg shadow-hero flex flex-col z-[9999] border"
      style={{ zIndex: 9999 }}
    >
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b bg-gradient-to-r from-primary to-primary-light text-primary-foreground rounded-t-lg">
        <div className="flex items-center space-x-3">
          <div className="w-8 h-8 bg-white/20 rounded-full flex items-center justify-center">
            ⚖️
          </div>
          <div>
            <h3 className="font-semibold text-sm md:text-base">Lexi, tu Asistente Legal</h3>
            <p className="text-xs opacity-90">tuconsultorlegal.co</p>
          </div>
        </div>
        <Button
          variant="ghost"
          size="sm"
          onClick={onToggle}
          className="text-primary-foreground hover:bg-white/20 p-1 h-8 w-8"
        >
          <X size={16} />
        </Button>
      </div>

      {/* Chat Content */}
      <div className="flex-1 overflow-hidden">
        {iframeError ? (
          <div className="flex flex-col items-center justify-center h-full p-6 text-center">
            <AlertCircle className="w-12 h-12 text-destructive mb-4" />
            <h4 className="font-semibold text-lg mb-2">Servicio no disponible</h4>
            <p className="text-muted-foreground mb-4 text-sm">
              El chat no está disponible en este momento. Por favor, inténtalo más tarde.
            </p>
            <Button 
              variant="outline" 
              onClick={() => {
                setIframeError(false);
                setIsLoading(true);
                chatInstance.current = null;
              }}
              className="text-sm"
            >
              Reintentar
            </Button>
          </div>
        ) : (
          <>
            {isLoading && (
              <div className="flex flex-col items-center justify-center h-full p-6">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mb-4"></div>
                <p className="text-sm text-muted-foreground">Conectando con Lexi...</p>
              </div>
            )}
            <div 
              ref={chatContainer}
              className="w-full h-full"
              style={{ 
                display: isLoading ? "none" : "block",
                borderRadius: "0 0 0.75rem 0.75rem"
              }}
            />
          </>
        )}
      </div>
    </div>
  );
}
