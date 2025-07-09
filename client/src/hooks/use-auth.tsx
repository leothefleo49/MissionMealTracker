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

// Define user roles to match the backend
type UserRole = "ultra_admin" | "region_admin" | "mission_admin" | "stake_admin" | "ward_admin" | "missionary";

interface AuthUser {
  id: number;
  username: string;
  role: UserRole;
  regionId?: number | null;
  missionId?: number | null;
  stakeId?: number | null;
}

type AuthContextType = {
  user: AuthUser | null;
  isLoading: boolean;
  error: Error | null;
  loginMutation: UseMutationResult<AuthUser, Error, LoginData>;
  logoutMutation: UseMutationResult<void, Error, void>;
  userWards: Ward[] | null;
  selectedWard: Ward | null;
  setSelectedWard: (ward: Ward | null) => void;
};

type LoginData = {
  username?: string;
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
        return await res.json();
      } catch (error) {
        return null;
      }
    },
    enabled: authInitialized,
  });

  const { data: userWards } = useQuery<Ward[], Error>({
    queryKey: ["/api/admin/wards"],
    queryFn: getQueryFn({ on401: "returnNull" }),
    enabled: !!user && user.role !== ROLES.MISSIONARY, // Enable for all admin roles
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
      queryClient.setQueryData(["/api/user"], loggedInUser);
      // Invalidate wards query to fetch wards associated with the new admin
      if (loggedInUser.role !== ROLES.MISSIONARY) {
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