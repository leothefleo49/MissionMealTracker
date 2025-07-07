import { Suspense, lazy } from "react";
import { Switch, Route } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { ThemeProvider } from "next-themes";
import { AuthProvider } from "@/hooks/use-auth";
import { ProtectedRoute } from "@/lib/protected-route";
import NotFound from "@/pages/not-found";

// Lazy load pages for better performance
const HomePage = lazy(() => import("@/pages/home-page"));
const Admin = lazy(() => import("@/pages/admin"));
const MissionaryPortal = lazy(() => import("@/pages/missionary-portal"));
const MissionaryRegister = lazy(() => import("@/pages/missionary-register"));
const MissionaryForgotPassword = lazy(() => import("@/pages/missionary-forgot-password"));
const AuthPage = lazy(() => import("@/pages/auth-page"));
const WardPage = lazy(() => import("@/pages/ward-page"));

function Router() {
  return (
    <Suspense fallback={<div>Loading...</div>}>
      <Switch>
        <Route path="/" component={HomePage} />
        <Route path="/auth" component={AuthPage} />
        <Route path="/missionary-register" component={MissionaryRegister} />
        <Route path="/missionary-register/:accessCode" component={MissionaryRegister} />
        <Route path="/missionary-forgot-password/:accessCode" component={MissionaryForgotPassword} />
        <Route path="/missionary-portal" component={MissionaryPortal} />
        <ProtectedRoute path="/admin" component={Admin} />
        <Route path="/ward/:accessCode" component={WardPage} />
        <Route path="/missionary-portal/:accessCode" component={MissionaryPortal} />
        <Route component={NotFound} />
      </Switch>
    </Suspense>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <ThemeProvider attribute="class" defaultTheme="light">
        <TooltipProvider>
          <AuthProvider>
            <Toaster />
            <Router />
          </AuthProvider>
        </TooltipProvider>
      </ThemeProvider>
    </QueryClientProvider>
  );
}

export default App;