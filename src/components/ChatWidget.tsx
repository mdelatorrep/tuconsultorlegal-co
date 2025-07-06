import { useState, useEffect } from "react";
import { Button } from "./ui/button";
import { MessageCircle, X, AlertCircle } from "lucide-react";

interface ChatWidgetProps {
  isOpen: boolean;
  onToggle: () => void;
  initialMessage?: string;
}

export default function ChatWidget({ isOpen, onToggle, initialMessage }: ChatWidgetProps) {
  const [iframeError, setIframeError] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const iframeSrc = "https://buildera.app.n8n.cloud/webhook/a9c21cdd-8709-416a-a9c1-3b615b7e9f6b/chat";

  const handleIframeLoad = () => {
    setIsLoading(false);
    setIframeError(false);
  };

  const handleIframeError = () => {
    setIsLoading(false);
    setIframeError(true);
  };

  // Reset loading state when chat opens
  useEffect(() => {
    if (isOpen) {
      setIsLoading(true);
      setIframeError(false);
    }
  }, [isOpen]);

  // Timeout para detectar si el iframe no carga en 10 segundos
  useEffect(() => {
    if (isOpen && isLoading) {
      const timeout = setTimeout(() => {
        if (isLoading) {
          setIsLoading(false);
          setIframeError(true);
        }
      }, 10000);
      
      return () => clearTimeout(timeout);
    }
  }, [isOpen, isLoading]);

  if (!isOpen) {
    return (
      <button
        onClick={onToggle}
        className="fixed bottom-6 right-6 w-16 h-16 bg-primary hover:bg-primary-light text-primary-foreground rounded-full shadow-hero flex items-center justify-center transition-bounce z-[9999]"
      >
        <MessageCircle size={28} />
      </button>
    );
  }

  return (
    <div
      className="fixed bottom-6 right-6 w-full max-w-md h-96 max-h-[80vh] bg-card rounded-lg shadow-hero flex flex-col z-[9999] border"
      style={{ zIndex: 9999 }}
    >
    {/* Iframe con el chat embebido */}
      <div className="flex-1 overflow-hidden">
        {iframeError ? (
          <div className="flex flex-col items-center justify-center h-full p-6 text-center">
            <AlertCircle className="w-12 h-12 text-destructive mb-4" />
            <h4 className="font-semibold text-lg mb-2">Servicio no disponible</h4>
            <p className="text-muted-foreground mb-4">
              El chat no está disponible en este momento. Por favor, inténtalo más tarde.
            </p>
            <Button 
              variant="outline" 
              onClick={() => {
                setIframeError(false);
                setIsLoading(true);
              }}
              className="text-sm"
            >
              Reintentar
            </Button>
          </div>
        ) : (
          <>
            {isLoading && (
              <div className="flex items-center justify-center h-full">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
              </div>
            )}
            <iframe
              src={iframeSrc}
              title="LexiLegal Chat"
              className="w-full h-full"
              style={{ 
                border: "none", 
                borderRadius: "0 0 0.5rem 0.5rem",
                display: isLoading ? "none" : "block"
              }}
              onLoad={handleIframeLoad}
              onError={handleIframeError}
              sandbox="allow-scripts allow-same-origin allow-forms allow-popups allow-top-navigation-by-user-activation"
              referrerPolicy="no-referrer-when-downgrade"
              allow="microphone; camera; geolocation; payment; fullscreen"
            />
          </>
        )}
      </div>
    </div>
  );
}
