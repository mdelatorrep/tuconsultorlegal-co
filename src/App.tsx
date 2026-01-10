import React from "react";
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import Index from "./pages/Index";
import NotFound from "./pages/NotFound";
import AdminPage from "./components/AdminPage";
import LawyerAuthPage from "./components/LawyerAuthPage";
import LawyerPublicProfilePage from "./components/LawyerPublicProfilePage";
import DemoScreenshotsPage from "./components/DemoScreenshotsPage";
import DemoResearchMockup from "./components/demo/DemoResearchMockup";
import DemoAnalysisMockup from "./components/demo/DemoAnalysisMockup";
import DemoDraftingMockup from "./components/demo/DemoDraftingMockup";
import DemoStrategyMockup from "./components/demo/DemoStrategyMockup";
import DemoCRMMockup from "./components/demo/DemoCRMMockup";
import DemoAgentsMockup from "./components/demo/DemoAgentsMockup";
import { SubscriptionSuccessPage } from "./components/SubscriptionSuccessPage";
import { SubscriptionErrorPage } from "./components/SubscriptionErrorPage";
import { ClientPortalAccessPage } from "./components/client-portal/ClientPortalAccessPage";
import { useAuthManager } from "@/hooks/useAuthManager";
import { useLogRocket } from "@/hooks/useLogRocket";
import { useUserTracking } from "@/hooks/useUserTracking";

const queryClient = new QueryClient();

const AppContent = () => {
  // Inicializar el gestor de autenticación para limpieza automática
  useAuthManager();
  
  // Inicializar LogRocket para monitoreo de UX
  useLogRocket();
  
  // Inicializar tracking para usuarios anónimos
  const { trackAnonymousUser, trackPageVisit } = useUserTracking();
  
  // Track anonymous user on app load
  React.useEffect(() => {
    trackAnonymousUser({
      firstVisit: new Date().toISOString(),
      userAgent: navigator.userAgent,
      language: navigator.language
    });
    
    trackPageVisit(window.location.pathname, {
      referrer: document.referrer
    });
  }, [trackAnonymousUser, trackPageVisit]);
  
  return (
    <>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<Index />} />
          <Route path="/admin" element={<AdminPage />} />
          <Route path="/auth-abogados" element={<LawyerAuthPage />} />
          <Route path="/perfil/:slug" element={<LawyerPublicProfilePage />} />
          <Route path="/documento/:token" element={<Index />} />
          <Route path="/demo-screenshots" element={<DemoScreenshotsPage />} />
          <Route path="/demo/research" element={<DemoResearchMockup />} />
          <Route path="/demo/analysis" element={<DemoAnalysisMockup />} />
          <Route path="/demo/drafting" element={<DemoDraftingMockup />} />
          <Route path="/demo/strategy" element={<DemoStrategyMockup />} />
          <Route path="/demo/crm" element={<DemoCRMMockup />} />
          <Route path="/demo/agents" element={<DemoAgentsMockup />} />
          <Route path="/subscription-success" element={<SubscriptionSuccessPage />} />
          <Route path="/subscription-error" element={<SubscriptionErrorPage />} />
          <Route path="/portal/:token" element={<ClientPortalAccessPage />} />
          {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
          <Route path="*" element={<NotFound />} />
        </Routes>
      </BrowserRouter>
    </>
  );
};

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <AppContent />
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
