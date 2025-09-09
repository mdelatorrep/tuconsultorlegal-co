import React from "react";
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import Index from "./pages/Index";
import NotFound from "./pages/NotFound";
import AdminPage from "./components/AdminPage";
import { SubscriptionSuccessPage } from "./components/SubscriptionSuccessPage";
import { SubscriptionErrorPage } from "./components/SubscriptionErrorPage";
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
          <Route path="/subscription-success" element={<SubscriptionSuccessPage />} />
          <Route path="/subscription-error" element={<SubscriptionErrorPage />} />
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
