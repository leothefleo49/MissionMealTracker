import { Switch, Route } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { AuthProvider } from "@/hooks/use-auth";
import { ProtectedRoute } from "@/lib/protected-route";
import NotFound from "@/pages/not-found";
import HomePage from "@/pages/home-page";
import Admin from "@/pages/admin";
import MissionaryPortal from "@/pages/missionary-portal";
import MissionaryRegister from "@/pages/missionary-register";
import MissionaryForgotPassword from "@/pages/missionary-forgot-password";
import AuthPage from "@/pages/auth-page";
import WardPage from "@/pages/ward-page";

function Router() {
  return (
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
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
        <TooltipProvider>
          <AuthProvider>
            <Toaster />
            <Router />
          </AuthProvider>
        </TooltipProvider>
    </QueryClientProvider>
  );
}

export default App;