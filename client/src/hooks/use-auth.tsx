import { createContext, ReactNode, useContext, useState, useEffect } from "react";
import {
  useQuery,
  useMutation,
  UseMutationResult,
} from "@tanstack/react-query";
import { Ward } from "@shared/schema";
import { apiRequest, queryClient, getQueryFn } from "../lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { useLocation } from "wouter";

interface AuthUser {
  id: number;
  username: string;
  // New hierarchical roles
  isUltraAdmin: boolean;
  isRegionAdmin: boolean;
  isMissionAdmin: boolean;
  isStakeAdmin: boolean;
  // isAdmin is a convenience flag, true if any higher-tier admin role is true or if a ward admin
  isAdmin: boolean;
}

type AuthContextType = {
  user: AuthUser | null;
  isLoading: boolean;
  error: Error | null;
  loginMutation: UseMutationResult<AuthUser, Error, LoginData>;
  wardLoginMutation: UseMutationResult<AuthUser, Error, WardLoginData>;
  logoutMutation: UseMutationResult<void, Error, void>;
  userWards: Ward[] | null;
  selectedWard: Ward | null;
  setSelectedWard: (ward: Ward | null) => void;
};

type LoginData = {
  username?: string;
  password: string;
};

type WardLoginData = {
  wardAccessCode: string;
  password: string;
};

export const AuthContext = createContext<AuthContextType | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const { toast } = useToast();
  const [, setLocation] = useLocation();
  const [authInitialized, setAuthInitialized] = useState(false);
  const [selectedWard, setSelectedWard] = useState<Ward | null>(null);

  const {
    data: user,
    error,
    isLoading,
  } = useQuery<AuthUser | null, Error>({
    queryKey: ["/api/user"],
    queryFn: async () => {
      try {
        const res = await fetch("/api/user");
        if (res.status === 401) return null;
        if (!res.ok) throw new Error("Failed to fetch user");
        const userData = await res.json();
        // Manually set isAdmin based on the new roles received from the server
        const isAdmin = userData.isUltraAdmin || userData.isRegionAdmin || userData.isMissionAdmin || userData.isStakeAdmin || (userData.wardAccessCode && userData.username.startsWith('ward_admin_'));
        return { ...userData, isAdmin };
      } catch (error) {
        return null;
      }
    },
    enabled: authInitialized,
  });

  const { data: userWards } = useQuery<Ward[], Error>({
    queryKey: ["/api/admin/wards"],
    queryFn: getQueryFn({ on401: "returnNull" }),
    // Only enable if user is authenticated and has any admin role
    enabled: !!user && (user.isUltraAdmin || user.isRegionAdmin || user.isMissionAdmin || user.isStakeAdmin || user.isAdmin),
  });

  useEffect(() => {
    setAuthInitialized(true);
  }, []);

  useEffect(() => {
    if (userWards && userWards.length > 0 && !selectedWard) {
      setSelectedWard(userWards[0]);
    }
  }, [userWards, selectedWard]);

  const loginMutation = useMutation({
    mutationFn: async (credentials: LoginData) => {
      const res = await apiRequest("POST", "/api/login", credentials);
      if (!res.ok) {
        const error = await res.json();
        throw new Error(error.message || "Invalid login credentials");
      }
      return await res.json();
    },
    onSuccess: (loggedInUser: AuthUser) => {
      // Ensure the isAdmin flag is correctly set on the client side based on new roles
      const isAdmin = loggedInUser.isUltraAdmin || loggedInUser.isRegionAdmin || loggedInUser.isMissionAdmin || loggedInUser.isStakeAdmin;
      queryClient.setQueryData(["/api/user"], { ...loggedInUser, isAdmin });

      if (isAdmin) {
        queryClient.invalidateQueries({ queryKey: ["/api/admin/wards"] });
      }
      toast({
        title: "Login successful",
        description: `Welcome back, ${loggedInUser.username}!`,
        variant: "default",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Login failed",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const wardLoginMutation = useMutation({
    mutationFn: async (credentials: WardLoginData) => {
      const res = await apiRequest("POST", "/api/ward-login", credentials);
      if (!res.ok) {
        const error = await res.json();
        throw new Error(error.message || "Invalid ward access code or password");
      }
      return await res.json();
    },
    onSuccess: (loggedInUser: AuthUser & { wardAccessCode: string }) => {
      // For ward admins, isAdmin is always true
      queryClient.setQueryData(["/api/user"], { ...loggedInUser, isAdmin: true });
      queryClient.invalidateQueries({ queryKey: ["/api/admin/wards"] });
      toast({
        title: "Ward login successful",
        description: "You've successfully logged in as a ward admin",
        variant: "default",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Ward login failed",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const logoutMutation = useMutation({
    mutationFn: async () => {
      await apiRequest("POST", "/api/logout");
    },
    onSuccess: () => {
      queryClient.setQueryData(["/api/user"], null);
      setSelectedWard(null);
      toast({
        title: "Logged out",
        description: "You have been successfully logged out.",
        variant: "default",
      });
      setLocation("/");
    },
    onError: (error: Error) => {
      toast({
        title: "Logout failed",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  return (
    <AuthContext.Provider
      value={{
        user,
        isLoading,
        error,
        loginMutation,
        wardLoginMutation,
        logoutMutation,
        userWards: userWards ?? null,
        selectedWard,
        setSelectedWard,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
}