import React, { useEffect, useRef } from "react";
import "@n8n/chat/style.css";
import { createChat } from "@n8n/chat";
import { Button } from "./ui/button";
import { MessageCircle, X, Scale } from "lucide-react";

interface ChatWidgetProps {
  isOpen: boolean;
  onToggle: () => void;
  initialMessage?: string;
}

const CHAT_WEBHOOK_URL =
  "https://buildera.app.n8n.cloud/webhook/a9c21cdd-8709-416a-a9c1-3b615b7e9f6b/chat";

export default function ChatWidget({ isOpen, onToggle, initialMessage }: ChatWidgetProps) {
  const chatRef = useRef<any>(null);

  useEffect(() => {
    if (isOpen) {
      const chat = createChat({
        webhookUrl: CHAT_WEBHOOK_URL,
        target: "#n8n-chat-container",
        mode: "fullscreen",
        defaultLanguage: "en",
        i18n: {
          en: {
            title: "LexiLegal Asistente ⚖️",
            subtitle: "Asesor Jurídico Inteligente",
            inputPlaceholder: "Escribe tu consulta legal aquí...",
            getStarted: "¡Hola! Soy tu asistente legal. ¿En qué puedo ayudarte hoy?",
            footer: "",
            closeButtonTooltip: "Cerrar chat",
          },
        },
      });
      chatRef.current = chat;
    }
  }, [isOpen, initialMessage]);

  // Botón flotante mejorado cuando el chat está cerrado
  if (!isOpen) {
    return (
      <div className="fixed bottom-6 right-6 z-[9999] group">
        <button
          onClick={onToggle}
          className="relative w-16 h-16 bg-gradient-to-br from-primary to-primary/80 hover:from-primary-light hover:to-primary text-primary-foreground rounded-full shadow-hero flex items-center justify-center transition-all duration-300 hover:scale-110 hover:shadow-glow animate-pulse"
        >
          <div className="absolute inset-0 rounded-full bg-primary/20 animate-ping"></div>
          <Scale size={24} className="relative z-10 group-hover:rotate-12 transition-transform duration-300" />
          <MessageCircle size={16} className="absolute top-1 right-1 bg-accent text-accent-foreground rounded-full p-1" />
        </button>
        
        {/* Tooltip */}
        <div className="absolute bottom-full right-0 mb-2 px-3 py-2 bg-popover text-popover-foreground text-sm rounded-lg shadow-lg opacity-0 group-hover:opacity-100 transition-opacity duration-200 whitespace-nowrap">
          Consulta Legal Gratuita
          <div className="absolute top-full right-4 border-4 border-transparent border-t-popover"></div>
        </div>
      </div>
    );
  }

  // Ventana de chat embebida con header personalizado mejorado
  return (
    <div className="fixed bottom-6 right-6 w-full max-w-md h-[500px] max-h-[80vh] bg-card rounded-xl shadow-2xl flex flex-col border border-border/50 backdrop-blur-sm z-[9999] animate-in slide-in-from-bottom-4 fade-in-0 duration-300">
      {/* Header mejorado */}
      <div className="bg-gradient-to-r from-primary via-primary to-primary-light text-primary-foreground p-4 rounded-t-xl flex justify-between items-center relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-r from-primary/20 to-transparent"></div>
        <div className="relative z-10 flex items-center gap-3">
          <div className="w-8 h-8 bg-primary-foreground/20 rounded-full flex items-center justify-center">
            <Scale size={16} className="text-primary-foreground" />
          </div>
          <div>
            <h3 className="font-bold text-lg flex items-center gap-2">
              LexiLegal Asistente
            </h3>
            <p className="text-sm text-primary-foreground/90 font-medium">
              Tu Asesor Jurídico 24/7
            </p>
          </div>
        </div>
        <button
          onClick={onToggle}
          className="relative z-10 w-8 h-8 rounded-full bg-primary-foreground/20 hover:bg-primary-foreground/30 text-primary-foreground flex items-center justify-center transition-all duration-200 hover:scale-110"
        >
          <X size={18} />
        </button>
      </div>

      {/* Contenedor donde n8n/chat inyecta la UI */}
      <div
        id="n8n-chat-container"
        className="flex-1 overflow-hidden bg-background/95"
        style={{ borderRadius: "0 0 0.75rem 0.75rem" }}
      />
    </div>
  );
}
