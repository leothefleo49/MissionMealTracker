// client/src/AppRouter.tsx
import {
  createBrowserRouter,
  createRoutesFromElements,
  Route,
} from "react-router-dom";
import HomePage from "./pages/home-page"; //
import AdminPage from "./pages/admin"; //
import AuthPage from "./pages/auth-page"; //
import MissionaryPortal from "./pages/missionary-portal"; //
import MissionaryRegister from "./pages/missionary-register"; //
import MissionaryForgotPassword from "./pages/missionary-forgot-password"; //
import WardPage from "./pages/ward-page"; //
import NotFound from "./pages/not-found"; //
import ProtectedRoute from "./lib/protected-route"; //

export const router = createBrowserRouter(
  createRoutesFromElements(
    <Route>
      <Route path="/" element={<HomePage />} />
      <Route path="/auth" element={<AuthPage />} />
      <Route path="/ward/:accessCode" element={<WardPage />} /> {/* Public ward page */}
      <Route path="/missionary-portal" element={<MissionaryPortal />} />
      <Route path="/missionary-register" element={<MissionaryRegister />} />
      <Route path="/missionary-forgot-password" element={<MissionaryForgotPassword />} />
      {/* Protected Admin Routes */}
      <Route path="/admin" element={<ProtectedRoute requiredRole="ward" />}> {/* Base admin route requires at least 'ward' role */}
        <Route index element={<AdminPage />} />
        {/* Add more specific admin sub-routes here if needed, e.g., /admin/users, /admin/meals */}
      </Route>
      {/* Catch-all route for 404 */}
      <Route path="*" element={<NotFound />} />
    </Route>
  )
);