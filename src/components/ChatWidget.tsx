import { useState, useRef, useEffect } from "react";
import { Button } from "./ui/button";
import { MessageCircle, X, Send } from "lucide-react";

interface Message {
  text: string;
  sender: "user" | "bot";
  timestamp: number;
}

interface ChatWidgetProps {
  isOpen: boolean;
  onToggle: () => void;
  initialMessage?: string;
}

export default function ChatWidget({ isOpen, onToggle, initialMessage }: ChatWidgetProps) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [inputValue, setInputValue] = useState("");
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  useEffect(() => {
    if (isOpen && messages.length === 0) {
      // Initial bot message
      setMessages([
        {
          text: "👋 ¡Hola! Soy LexiLegal, tu asistente jurídico inteligente. ¿Cómo puedo ayudarte hoy?",
          sender: "bot",
          timestamp: Date.now(),
        },
      ]);

      // Add initial message if provided
      if (initialMessage) {
        setTimeout(() => {
          setMessages(prev => [
            ...prev,
            {
              text: initialMessage,
              sender: "user",
              timestamp: Date.now(),
            },
          ]);

          // Simulate bot response
          setTimeout(() => {
            setMessages(prev => [
              ...prev,
              {
                text: `Entendido. Estoy procesando tu solicitud sobre "${initialMessage.slice(0, 30)}...". Por favor, dame un momento.`,
                sender: "bot",
                timestamp: Date.now(),
              },
            ]);
          }, 1000);
        }, 500);
      }
    }
  }, [isOpen, initialMessage]);

  const handleSendMessage = () => {
    if (inputValue.trim()) {
      const userMessage: Message = {
        text: inputValue.trim(),
        sender: "user",
        timestamp: Date.now(),
      };

      setMessages(prev => [...prev, userMessage]);
      setInputValue("");

      // Simulate bot response
      setTimeout(() => {
        const botMessage: Message = {
          text: "Gracias por tu mensaje. Estoy analizando tu consulta. Recuerda que esta es una simulación. El agente de IA real procesaría tu solicitud aquí.",
          sender: "bot",
          timestamp: Date.now(),
        };
        setMessages(prev => [...prev, botMessage]);
      }, 1500);
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") {
      e.preventDefault();
      handleSendMessage();
    }
  };

  if (!isOpen) {
    return (
      <button
        onClick={onToggle}
        className="fixed bottom-6 right-6 w-16 h-16 bg-primary hover:bg-primary-light text-primary-foreground rounded-full shadow-hero flex items-center justify-center transition-bounce z-50"
      >
        <MessageCircle size={28} />
      </button>
    );
  }

  return (
    <div className="fixed bottom-6 right-6 w-full max-w-md h-96 max-h-[80vh] bg-card rounded-lg shadow-hero flex flex-col z-50 border">
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

      {/* Messages */}
      <div className="flex-1 p-4 bg-muted overflow-y-auto">
        {messages.map((message, index) => (
          <div
            key={index}
            className={`max-w-xs mb-4 ${message.sender === "user" ? "ml-auto" : ""}`}
          >
            <div
              className={`p-3 rounded-lg ${
                message.sender === "user"
                  ? "bg-primary text-primary-foreground"
                  : "bg-card text-card-foreground shadow-soft"
              }`}
            >
              {message.text}
            </div>
          </div>
        ))}
        <div ref={messagesEndRef} />
      </div>

      {/* Input */}
      <div className="p-4 bg-card border-t rounded-b-lg">
        <div className="relative">
          <input
            type="text"
            value={inputValue}
            onChange={(e) => setInputValue(e.target.value)}
            onKeyPress={handleKeyPress}
            placeholder="Escribe tu mensaje..."
            className="w-full pr-12 pl-4 py-3 border border-input rounded-lg focus:outline-none focus:ring-2 focus:ring-ring bg-background"
          />
          <button
            onClick={handleSendMessage}
            className="absolute right-2 top-1/2 -translate-y-1/2 bg-primary text-primary-foreground rounded-md p-2 hover:bg-primary-light transition-smooth"
          >
            <Send size={16} />
          </button>
        </div>
      </div>
    </div>
  );
}