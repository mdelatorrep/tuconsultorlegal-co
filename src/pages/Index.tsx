import { useState, useEffect } from "react";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import ChatWidget from "@/components/ChatWidget";
import HomePage from "@/components/HomePage";
import PersonasPage from "@/components/PersonasPage";
import DocumentPaymentPage from "@/components/DocumentPaymentPage";
import DocumentStatusPage from "@/components/DocumentStatusPage";
import LawyerDashboardPage from "@/components/LawyerDashboardPage";
import EmptyPage from "@/components/EmptyPage";
import BlogPage from "@/components/BlogPage";
import BlogArticlePage from "@/components/BlogArticlePage";
import PrivacyPolicyPage from "@/components/PrivacyPolicyPage";
import TermsAndConditionsPage from "@/components/TermsAndConditionsPage";

export default function Index() {
  const [currentPage, setCurrentPage] = useState("home");
  const [chatOpen, setChatOpen] = useState(false);
  const [chatMessage, setChatMessage] = useState<string>("");

  // Handle browser navigation
  useEffect(() => {
    const handlePopState = () => {
      const hash = window.location.hash.replace("#", "") || "home";
      setCurrentPage(hash);
    };

    // Set initial page from URL
    const initialHash = window.location.hash.replace("#", "") || "home";
    setCurrentPage(initialHash);

    // Listen for browser back/forward
    window.addEventListener("popstate", handlePopState);
    return () => window.removeEventListener("popstate", handlePopState);
  }, []);

  const handleNavigate = (page: string) => {
    setCurrentPage(page);
    window.history.pushState(null, "", `#${page}`);
    window.scrollTo(0, 0);
  };

  const handleOpenChat = (message?: string) => {
    if (message) {
      setChatMessage(message);
    }
    setChatOpen(true);
  };

  const handleToggleChat = () => {
    setChatOpen(!chatOpen);
    if (chatOpen) {
      setChatMessage("");
    }
  };

  const renderCurrentPage = () => {
    switch (currentPage) {
      case "home":
        return <HomePage onOpenChat={handleOpenChat} />;
      case "personas":
        return <PersonasPage onOpenChat={handleOpenChat} onNavigate={handleNavigate} />;
      case "empresas":
        return (
          <EmptyPage
            title="Impulso Legal para tu Empresa"
            subtitle="Soluciones legales diseñadas para PyMEs, startups y emprendedores. Formaliza, protege y haz crecer tu negocio con seguridad jurídica."
          />
        );
      case "precios":
        return (
          <EmptyPage
            title="Planes y Precios Flexibles"
            subtitle="Elige el plan que mejor se adapte a tus necesidades. Sin contratos a largo plazo, sin costos ocultos."
          />
        );
      case "blog":
        return <BlogPage onOpenChat={handleOpenChat} onNavigate={handleNavigate} />;
      case "blog-articulo-arriendo":
        return <BlogArticlePage articleId="arriendo" onOpenChat={handleOpenChat} onNavigate={handleNavigate} />;
      case "blog-articulo-despido":
        return <BlogArticlePage articleId="despido" onOpenChat={handleOpenChat} onNavigate={handleNavigate} />;
      case "blog-articulo-vehiculo":
        return <BlogArticlePage articleId="vehiculo" onOpenChat={handleOpenChat} onNavigate={handleNavigate} />;
      case "contacto":
        return (
          <EmptyPage
            title="Contáctanos"
            subtitle="¿Tienes preguntas sobre nuestros servicios o necesitas soporte? Estamos aquí para ayudarte."
          />
        );
      case "documento-pago":
        return <DocumentPaymentPage onOpenChat={handleOpenChat} />;
      case "estado-documento":
        return <DocumentStatusPage onOpenChat={handleOpenChat} />;
      case "abogados":
        return <LawyerDashboardPage onOpenChat={handleOpenChat} />;
      case "terminos":
        return <TermsAndConditionsPage onOpenChat={handleOpenChat} />;
      case "privacidad":
        return <PrivacyPolicyPage onOpenChat={handleOpenChat} />;
      default:
        return <HomePage onOpenChat={handleOpenChat} />;
    }
  };

  return (
    <div className="min-h-screen bg-background">
      <Header
        currentPage={currentPage}
        onNavigate={handleNavigate}
        onOpenChat={handleOpenChat}
      />
      
      <main className="page-enter page-enter-active">
        {renderCurrentPage()}
      </main>

      <Footer onNavigate={handleNavigate} />

      <ChatWidget
        isOpen={chatOpen}
        onToggle={handleToggleChat}
        initialMessage={chatMessage}
      />
    </div>
  );
}