import { useState, useEffect } from "react";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import HomePage from "@/components/HomePage";
import PersonasPage from "@/components/PersonasPage";
import EmpresasPage from "@/components/EmpresasPage";
import LawyerLandingPage from "@/components/LawyerLandingPage";
import ContactPage from "@/components/ContactPage";
import BlogPage from "@/components/BlogPage";
import BlogArticlePage from "@/components/BlogArticlePage";
import PricingPage from "@/components/PricingPage";
import PrivacyPolicyPage from "@/components/PrivacyPolicyPage";
import TermsAndConditionsPage from "@/components/TermsAndConditionsPage";
import CertificationVerificationPage from "@/components/CertificationVerificationPage";
import ChatWidget from "@/components/ChatWidget";
import DocumentFormFlow from "@/components/DocumentFormFlow";
import DocumentCreationSuccess from "@/components/DocumentCreationSuccess";
import UnifiedDocumentPage from "@/components/UnifiedDocumentPage";
import LegalConsultationChat from "@/components/LegalConsultationChat";
import UserAuthPage from "@/components/UserAuthPage";
import EnhancedUserDashboard from "@/components/EnhancedUserDashboard";
import UserTypeSelector from "@/components/UserTypeSelector";
import LawyerDashboardPage from "@/components/LawyerDashboardPage";
import ComingSoonPage from "@/components/ComingSoonPage";
import { LawyerAuthProvider } from "@/components/LawyerAuthProvider";
import { LogRocketProvider } from "@/components/LogRocketProvider";
import { PWAInstallPrompt } from "@/components/PWAInstallPrompt";
import { OfflineIndicator } from "@/components/OfflineIndicator";
import { useUserAuth } from "@/hooks/useUserAuth";
import IntellectualPropertyPage from "@/components/IntellectualPropertyPage";
import { useAuthTypeDetection } from "@/hooks/useAuthTypeDetection";
import { supabase } from "@/integrations/supabase/client";

export default function Index() {
  const { user, loading: authLoading, isAuthenticated } = useUserAuth();
  const { userType, loading: userTypeLoading } = useAuthTypeDetection();
  const [currentPage, setCurrentPage] = useState("home");
  const [selectedAgentId, setSelectedAgentId] = useState<string | null>(null);
  const [documentToken, setDocumentToken] = useState<string | null>(null);
  const [isChatOpen, setIsChatOpen] = useState(false);
  const [chatMessage, setChatMessage] = useState<string>("");
  const [consultationType, setConsultationType] = useState<'personal' | 'business'>('personal');
  const [selectedArticleSlug, setSelectedArticleSlug] = useState<string | null>(null);
  const [certificationCode, setCertificationCode] = useState<string | null>(null);
  const [showUserAuth, setShowUserAuth] = useState(false);
  const [showUserDashboard, setShowUserDashboard] = useState(false);
  const [showUserTypeSelector, setShowUserTypeSelector] = useState(false);
  const [selectedUserType, setSelectedUserType] = useState<'user' | 'business' | 'lawyer' | null>(null);

  // Handle browser navigation
  useEffect(() => {
    const handlePopState = () => {
      // Parse hash to separate route from query params
      const hash = window.location.hash.replace("#", "") || "home";
      const route = hash.split('?')[0]; // Get only the route part, ignore query params
      setCurrentPage(route);
    };

    // Check URL parameters for special views
    const urlParams = new URLSearchParams(window.location.search);
    const view = urlParams.get('view');
    const trackingCode = urlParams.get('code');
    const boldTxStatus = urlParams.get('bold-tx-status');
    const boldOrderId = urlParams.get('bold-order-id');
    
    // Check if URL path contains /documento/:token
    const pathParts = window.location.pathname.split('/');
    const isDocumentoRoute = pathParts[1] === 'documento' && pathParts[2];
    
    // If accessing /documento/:token, redirect to the unified document page with the token as parameter
    if (isDocumentoRoute) {
      const token = pathParts[2];
      setCurrentPage("documento");
      // Add token to URL params for UnifiedDocumentPage to read
      const newUrl = `${window.location.origin}/#documento?code=${token}`;
      window.history.replaceState(null, "", newUrl);
      return;
    }
    
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

    // Set initial page from URL - parse hash to separate route from query params
    const initialHash = window.location.hash.replace("#", "") || "home";
    const initialRoute = initialHash.split('?')[0]; // Get only the route part
    setCurrentPage(initialRoute);

    // Listen for browser back/forward
    window.addEventListener("popstate", handlePopState);
    return () => window.removeEventListener("popstate", handlePopState);
  }, []);

  const handleNavigate = (page: string, data?: any) => {
    console.log('Navigate to:', page, 'Auth:', isAuthenticated, 'UserType:', userType);
    
    // Handle user dashboard access - requires authentication
    if (page === "user-dashboard") {
      if (!isAuthenticated) {
        console.log('User not authenticated, showing type selector');
        setShowUserTypeSelector(true);
        return;
      }
      
      console.log('User authenticated, showing dashboard');
      setShowUserDashboard(true);
      return;
    }
    
    // Handle lawyer dashboard access
    if (page === "abogados") {
      setShowUserDashboard(false);
      setShowUserAuth(false);
      setShowUserTypeSelector(false);
      setCurrentPage("abogados");
      window.history.pushState(null, "", `#abogados`);
      return;
    }
    
    setCurrentPage(page);
    if (page === "personas" || page === "empresas") {
      setConsultationType(page === "personas" ? 'personal' : 'business');
    }
    if (data?.agentId) {
      setSelectedAgentId(data.agentId);
    }
    if (data?.articleSlug) {
      setSelectedArticleSlug(data.articleSlug);
    }
    if (data?.certificationCode) {
      setCertificationCode(data.certificationCode);
    }
    window.history.pushState(null, "", `#${page}`);
    window.scrollTo(0, 0);
  };

  const handleOpenChat = (message?: string) => {
    setChatMessage(message || "");
    setIsChatOpen(true);
  };

  const handleCloseChat = () => {
    setIsChatOpen(false);
    setChatMessage("");
  };

  const handleAuthSuccess = () => {
    setShowUserAuth(false);
    setShowUserTypeSelector(false);
    setSelectedUserType(null);
    // Don't set showUserDashboard yet - let the effect handle it based on userType
  };

  const handleBackFromAuth = () => {
    setShowUserAuth(false);
    setShowUserTypeSelector(true);
  };

  const handleBackFromDashboard = () => {
    setShowUserDashboard(false);
    setCurrentPage("home");
  };

  const handleUserTypeSelect = (type: 'user' | 'business' | 'lawyer') => {
    setSelectedUserType(type);
    setShowUserTypeSelector(false);
    
    if (type === 'lawyer') {
      handleNavigate('abogados');
    } else if (type === 'business') {
      handleNavigate('empresas');
    } else {
      setShowUserAuth(true);
    }
  };

  const handleBackFromUserType = () => {
    setShowUserTypeSelector(false);
    setSelectedUserType(null);
    setCurrentPage("home");
  };

  // Auto-redirect authenticated users to their correct dashboard
  useEffect(() => {
    if (!authLoading && !userTypeLoading && isAuthenticated && userType) {
      console.log('Auth detection:', { userType, currentPage, showUserDashboard, isAuthenticated });
      
      // If user is authenticated and is a lawyer, redirect to lawyer dashboard
      if (userType === 'lawyer' && currentPage !== 'abogados' && !showUserDashboard) {
        console.log('Redirecting lawyer to dashboard');
        handleNavigate('abogados');
      } 
      // If user is authenticated and is a regular user, show user dashboard when requested
      else if (userType === 'user' && showUserDashboard === false && currentPage === 'user-dashboard') {
        console.log('Showing user dashboard');
        setShowUserDashboard(true);
      }
      // If regular user tries to access lawyer dashboard, redirect to home
      else if (userType === 'user' && currentPage === 'abogados') {
        console.log('Regular user attempted to access lawyer area, redirecting');
        handleNavigate('home');
      }
    }
  }, [authLoading, userTypeLoading, isAuthenticated, userType, currentPage, showUserDashboard]);

  // Only show loading for protected routes
  if ((authLoading || userTypeLoading) && (showUserDashboard || currentPage === "abogados")) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-muted-foreground">Verificando acceso...</p>
        </div>
      </div>
    );
  }

  // Show user type selector
  if (showUserTypeSelector) {
    return (
      <LogRocketProvider>
        <UserTypeSelector
          onSelectType={handleUserTypeSelect}
          onBack={handleBackFromUserType}
        />
      </LogRocketProvider>
    );
  }

  // Show user authentication
  if (showUserAuth) {
    return (
      <LogRocketProvider>
        <UserAuthPage
          onBack={handleBackFromAuth}
          onAuthSuccess={handleAuthSuccess}
        />
      </LogRocketProvider>
    );
  }

  // Show user dashboard
  if (showUserDashboard) {
    return (
      <LogRocketProvider>
        <EnhancedUserDashboard
          onBack={handleBackFromDashboard}
          onOpenChat={handleOpenChat}
          onNavigate={handleNavigate}
        />
      </LogRocketProvider>
    );
  }

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
      case "auth":
        return (
          <UserAuthPage
            onBack={() => handleNavigate("home")}
            onAuthSuccess={handleAuthSuccess}
          />
        );
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
        return (
          <LawyerAuthProvider>
            <div className="min-h-screen">
              <LawyerDashboardPage onOpenChat={handleOpenChat} />
            </div>
          </LawyerAuthProvider>
        );
      case "terminos":
        return <TermsAndConditionsPage onOpenChat={handleOpenChat} />;
      case "privacidad":
        return <PrivacyPolicyPage onOpenChat={handleOpenChat} />;
      case "propiedad-intelectual":
        return <IntellectualPropertyPage onOpenChat={handleOpenChat} />;
      case "proximamente-empresas":
        return <ComingSoonPage onBack={() => handleNavigate("empresas")} type="business" title="Portal Empresarial" />;
    }
  };

  // ChatWidget solo visible para usuarios autenticados fuera de abogados y dashboard
  // El dashboard tiene su propio ChatWidget integrado
  const shouldShowChatWidget = 
    isAuthenticated && // Solo usuarios autenticados
    currentPage !== "abogados" && // No en portal de abogados
    !showUserDashboard; // No en el dashboard (tiene su propio chat)

  return (
    <LogRocketProvider>
      <OfflineIndicator />
      <PWAInstallPrompt />
      
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

        {shouldShowChatWidget && (
          <ChatWidget
            isOpen={isChatOpen}
            onToggle={() => setIsChatOpen(!isChatOpen)}
            initialMessage={chatMessage}
          />
        )}
      </div>
    </LogRocketProvider>
  );
}