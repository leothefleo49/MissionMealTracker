// client/src/App.tsx
import React from "react";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { QueryClientProvider } from "@tanstack/react-query";
import { queryClient } from "./lib/queryClient";
import { Toaster } from "@/components/ui/toaster";
import { AuthProvider } from "./hooks/use-auth";
import { ProtectedRoute } from "./lib/protected-route"; // Corrected: Changed to named import
import NotFound from "@/pages/not-found"; // Default export
import HomePage from "@/pages/home-page"; // Default import
import { AdminPage } from "@/pages/admin"; // Named import
import MissionaryPortal from "@/pages/missionary-portal"; // Default import
import MissionaryRegister from "@/pages/missionary-register"; // Default import
import MissionaryForgotPassword from "./pages/missionary-forgot-password"; // Default export
import SetupPage from "./pages/setup-page"; // Default export
import AuthPage from "./pages/auth-page"; // Default export
import CongregationPage from "./pages/congregation-page"; // Default import


import "./index.css";

export function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <BrowserRouter>
          <Routes>
            {/* Public Routes */}
            <Route path="/" element={<HomePage />} />
            <Route path="/auth" element={<AuthPage />} />
            <Route path="/setup" element={<SetupPage />} />
            <Route path="/missionary-portal" element={<MissionaryPortal />} />
            <Route path="/missionary-register" element={<MissionaryRegister />} />
            <Route path="/missionary-forgot-password" element={<MissionaryForgotPassword />} />
            <Route path="/congregation/:accessCode" element={<CongregationPage />} />


            {/* Protected Routes */}
            <Route element={<ProtectedRoute />}>
              <Route path="/admin" element={<AdminPage />} />
            </Route>

            {/* Catch-all for 404 */}
            <Route path="*" element={<NotFound />} />
          </Routes>
        </BrowserRouter>
        <Toaster />
      </AuthProvider>
    </QueryClientProvider>
  );
}