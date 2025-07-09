import { Switch, Route, useLocation, Redirect } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider, useQuery } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { ThemeProvider } from "next-themes";
import { AuthProvider } from "@/hooks/use-auth";
import { ProtectedRoute } from "@/lib/protected-route";
import NotFound from "@/pages/not-found";
import HomePage from "@/pages/home-page";
import Admin from "@/pages/admin";
import MissionaryPortal from "@/pages/missionary-portal";
import MissionaryRegister from "@/pages/missionary-register";
import MissionaryForgotPassword from "@/pages/missionary-forgot-password";
import AuthPage from "@/pages/auth-page";
import CongregationPage from "@/pages/congregation-page";
import SetupPage from "@/pages/setup-page";
import { useEffect } from "react";

function AppRouter() {
  const { data, isLoading, error } = useQuery<{ isSetupMode: boolean }>({
    queryKey: ['/api/auth/is-setup'],
    queryFn: async () => {
        const res = await fetch('/api/auth/is-setup');
        if (!res.ok) {
            throw new Error('Could not fetch setup status');
        }
        return res.json();
    },
    retry: 1, // Retry once on failure
  });
  const [location, setLocation] = useLocation();

  useEffect(() => {
    // If we are not in setup mode and somehow on the setup page, redirect to home
    if (data && !data.isSetupMode && location === '/setup') {
      setLocation('/');
    }
    // If we are in setup mode and not on the setup page, redirect to it
    else if (data && data.isSetupMode && location !== '/setup') {
      setLocation('/setup');
    }
  }, [data, location, setLocation]);

  if (isLoading) {
    return (
        <div className="min-h-screen flex items-center justify-center">
            <div>Loading application...</div>
        </div>
    );
  }

  if (error) {
    return (
        <div className="min-h-screen flex items-center justify-center text-red-600">
            <div>Error: Could not connect to the server. Please ensure the server is running and refresh the page.</div>
        </div>
    )
  }

  // If in setup mode, only the setup route is available
  if (data?.isSetupMode) {
      return (
          <Switch>
            <Route path="/setup" component={SetupPage} />
            <Route>
                <Redirect to="/setup" />
            </Route>
          </Switch>
      )
  }

  // Normal application routing
  return (
    <Switch>
      <Route path="/" component={HomePage} />
      <Route path="/auth" component={AuthPage} />
      <Route path="/missionary-register" component={MissionaryRegister} />
      <Route path="/missionary-register/:accessCode" component={MissionaryRegister} />
      <Route path="/missionary-forgot-password/:accessCode" component={MissionaryForgotPassword} />
      <Route path="/missionary-portal" component={MissionaryPortal} />
      <ProtectedRoute path="/admin" component={Admin} />
      <Route path="/congregation/:accessCode" component={CongregationPage} />
      <Route path="/missionary-portal/:accessCode" component={MissionaryPortal} />
      <Route path="/setup">
        <Redirect to="/" />
      </Route>
      <Route component={NotFound} />
    </Switch>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <ThemeProvider attribute="class" defaultTheme="light">
        <TooltipProvider>
          <AuthProvider>
            <Toaster />
            <AppRouter />
          </AuthProvider>
        </TooltipProvider>
      </ThemeProvider>
    </QueryClientProvider>
  );
}

export default App;