import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { Provider } from "react-redux";
import { store } from "@/store/store";
import { RouteScrollToTop } from "@/components/RouteScrollToTop";
import { dashboardRegistry } from "@/dashboards/registry";
import { useAppDispatch, useAppSelector } from "@/store/hooks";
import { fetchSubscriptions } from "@/store/slices/subscriptionSlice";
import { fetchSubCategories } from "@/store/slices/categorySlice";
import { useEffect } from "react";
import Index from "./pages/Index";
import SignUp from "./pages/SignUp";
import ForgotPassword from "./pages/ForgotPassword";
import Dashboard from "./pages/Dashboard";
import DatasetDetail from "./pages/DatasetDetail";
import MyAccount from "./pages/MyAccount";
import Terms from "./pages/Terms";
import Disclaimer from "./pages/Disclaimer";
import NotFound from "./pages/NotFound";

import DashboardGuard from "./components/DashboardGuard";
import AuthGuard from "./components/AuthGuard";

const queryClient = new QueryClient();

const AppContent = () => {
  const dispatch = useAppDispatch();
  const auth = useAppSelector((state: any) => state.auth);
  const user = auth?.user;
  const isAuthenticated = auth?.isAuthenticated;

  useEffect(() => {
    if (isAuthenticated && user?.id) {
      dispatch(fetchSubscriptions(user.id));
      dispatch(fetchSubCategories("all"));
    }
  }, [isAuthenticated, user?.id, dispatch]);

  return (
    <TooltipProvider>
      <Sonner />
      <BrowserRouter>
        <RouteScrollToTop />
        <Routes>
          <Route path="/" element={<Index />} />
          <Route path="/signup" element={<SignUp />} />
          <Route path="/forgot-password" element={<ForgotPassword />} />

          <Route
            path="/dashboard"
            element={
              <AuthGuard>
                <Dashboard />
              </AuthGuard>
            }
          />
          <Route
            path="/my-account"
            element={
              <AuthGuard>
                <MyAccount />
              </AuthGuard>
            }
          />
          <Route
            path="/dataset/:slug"
            element={
              <AuthGuard>
                <DatasetDetail />
              </AuthGuard>
            }
          />

          <Route path="/terms" element={<Terms />} />
          <Route path="/disclaimer" element={<Disclaimer />} />

          {/* Auto-discovered dashboard routes protected by DashboardGuard */}
          {dashboardRegistry.map(({ routePath, component: Component }) => (
            <Route
              key={routePath}
              path={routePath}
              element={
                <DashboardGuard routePath={routePath}>
                  <Component />
                </DashboardGuard>
              }
            />
          ))}

          {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
          <Route path="*" element={<NotFound />} />
        </Routes>
      </BrowserRouter>
    </TooltipProvider>
  );
};

const App = () => (
  <Provider store={store}>
    <QueryClientProvider client={queryClient}>
      <AppContent />
    </QueryClientProvider>
  </Provider>
);

export default App;
