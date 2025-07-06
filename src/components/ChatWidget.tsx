import React, { useEffect } from "react";
import "@n8n/chat/style.css";
import { createChat } from "@n8n/chat";
import { Button } from "./ui/button";
import { MessageCircle, X } from "lucide-react";

interface ChatWidgetProps {
  isOpen: boolean;
  onToggle: () => void;
}

const CHAT_WEBHOOK_URL =
  "https://buildera.app.n8n.cloud/webhook/a9c21cdd-8709-416a-a9c1-3b615b7e9f6b/chat";

export default function ChatWidget({ isOpen, onToggle }: ChatWidgetProps) {
  useEffect(() => {
    if (isOpen) {
      createChat({
        webhookUrl: CHAT_WEBHOOK_URL,
        target: "#n8n-chat-container",
        mode: "fullscreen",
        defaultLanguage: "en",
        i18n: {
          en: {
            title: "LexiLegal Asistente ⚖️",
            subtitle: "Asesor Jurídico Inteligente",
            inputPlaceholder: "Escribe tu consulta...",
            getStarted: "Iniciar Conversación",
            footer: "",
          },
        },
        poweredBy: false,
      });
    }
  }, [isOpen]);

  // Botón flotante cuando el chat está cerrado
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

  // Ventana de chat embebida con header personalizado
  return (
    <div className="fixed bottom-6 right-6 w-full max-w-md h-96 max-h-[80vh] bg-card rounded-lg shadow-hero flex flex-col border z-[9999]">
      {/* Header */}
      <div className="bg-primary text-primary-foreground p-4 rounded-t-lg flex justify-between items-center">
        <div>
          <h3 className="font-bold text-lg">LexiLegal Asistente ⚖️</h3>
          <p className="text-sm text-primary-foreground/80">
            Asesor Jurídico Inteligente
          </p>
        </div>
        <button
          onClick={onToggle}
          className="text-primary-foreground/80 hover:text-primary-foreground transition-smooth"
        >
          <X size={24} />
        </button>
      </div>

      {/* Contenedor donde n8n/chat inyecta la UI */}
      <div
        id="n8n-chat-container"
        className="flex-1 overflow-hidden"
        style={{ borderRadius: "0 0 0.5rem 0.5rem" }}
      />
    </div>
  );
}
