import { useState, useEffect } from "react";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import ChatWidget from "@/components/ChatWidget";
import HomePage from "@/components/HomePage";
import PersonasPage from "@/components/PersonasPage";
import EmpresasPage from "@/components/EmpresasPage";
import UnifiedDocumentPage from "@/components/UnifiedDocumentPage";
import LawyerDashboardPage from "@/components/LawyerDashboardPage";
import EmptyPage from "@/components/EmptyPage";
import BlogPage from "@/components/BlogPage";
import BlogArticlePage from "@/components/BlogArticlePage";
import PrivacyPolicyPage from "@/components/PrivacyPolicyPage";
import TermsAndConditionsPage from "@/components/TermsAndConditionsPage";

import PricingPage from "@/components/PricingPage";
import ContactPage from "@/components/ContactPage";

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

    // Check URL parameters for special views
    const urlParams = new URLSearchParams(window.location.search);
    const view = urlParams.get('view');
    const trackingCode = urlParams.get('code');
    const boldTxStatus = urlParams.get('bold-tx-status');
    const boldOrderId = urlParams.get('bold-order-id');
    
    // If requesting token view, show the request form
    if (view === 'request-token') {
      setCurrentPage("request-token");
      return;
    }
    
    // If Bold payment parameters are present, redirect to document page
    if (trackingCode && (boldTxStatus || boldOrderId)) {
      setCurrentPage("documento");
      window.history.replaceState(null, "", `#documento${window.location.search}`);
      return;
    }

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
    // Check for dynamic blog article routes first
    if (currentPage.startsWith("blog-articulo-")) {
      const slug = currentPage.replace("blog-articulo-", "");
      return <BlogArticlePage articleId={slug} onOpenChat={handleOpenChat} onNavigate={handleNavigate} />;
    }

    switch (currentPage) {
      case "home":
        return <HomePage onOpenChat={handleOpenChat} onNavigate={handleNavigate} />;
      case "personas":
        return <PersonasPage onOpenChat={handleOpenChat} onNavigate={handleNavigate} />;
      case "empresas":
        return <EmpresasPage onOpenChat={handleOpenChat} onNavigate={handleNavigate} />;
      case "precios":
        return <PricingPage onOpenChat={handleOpenChat} onNavigate={handleNavigate} />;
      case "blog":
        return <BlogPage onOpenChat={handleOpenChat} onNavigate={handleNavigate} />;
      case "contacto":
        return <ContactPage onOpenChat={handleOpenChat} onNavigate={handleNavigate} />;
      case "documento":
      case "documento-pago":
      case "estado-documento":
        return <UnifiedDocumentPage onOpenChat={handleOpenChat} />;
      case "abogados":
        return <LawyerDashboardPage onOpenChat={handleOpenChat} />;
      case "terminos":
        return <TermsAndConditionsPage onOpenChat={handleOpenChat} />;
      case "privacidad":
        return <PrivacyPolicyPage onOpenChat={handleOpenChat} />;
      default:
        return <HomePage onOpenChat={handleOpenChat} onNavigate={handleNavigate} />;
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