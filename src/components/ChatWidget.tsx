import { useState } from "react";
import { Button } from "./ui/button";
import { MessageCircle, X, AlertCircle } from "lucide-react";

interface ChatWidgetProps {
  isOpen: boolean;
  onToggle: () => void;
}

export default function ChatWidget({ isOpen, onToggle }: ChatWidgetProps) {
  const [iframeError, setIframeError] = useState(false);
  const iframeSrc = "https://buildera.app.n8n.cloud/webhook/a9c21cdd-8709-416a-a9c1-3b615b7e9f6b/chat";

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
      {/* Header */}
      <div className="bg-primary text-primary-foreground p-4 rounded-t-lg flex justify-between items-center">
        <div>
          <h3 className="font-bold text-lg">LexiLegal Asistente ⚖️</h3>
          <p className="text-sm text-primary-foreground/80">Asesor Jurídico Inteligente</p>
        </div>
        <button
          onClick={onToggle}
          className="text-primary-foreground/80 hover:text-primary-foreground transition-smooth"
        >
          <X size={24} />
        </button>
      </div>

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
              onClick={() => setIframeError(false)}
              className="text-sm"
            >
              Reintentar
            </Button>
          </div>
        ) : (
          <iframe
            src={iframeSrc}
            title="LexiLegal Chat"
            className="w-full h-full"
            style={{ border: "none", borderRadius: "0 0 0.5rem 0.5rem" }}
            onError={() => setIframeError(true)}
          />
        )}
      </div>
    </div>
  );
}
