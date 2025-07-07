import { createContext, ReactNode, useContext, useState, useEffect } from "react";
import {
  useQuery,
  useMutation,
  UseMutationResult,
} from "@tanstack/react-query";
import { Ward } from "@shared/schema";
import { apiRequest, queryClient, getQueryFn } from "../lib/queryClient";
import { useToast } from "@/hooks/use-toast";

// Define User type here since the server may return additional properties
interface AuthUser {
  id: number;
  username: string;
  isAdmin: boolean;
  isSuperAdmin: boolean;
  isMissionAdmin: boolean;
  isStakeAdmin: boolean;
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
  const [authInitialized, setAuthInitialized] = useState(false);
  const [selectedWard, setSelectedWard] = useState<Ward | null>(null);

  // Get current authenticated user
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

  // Get user's wards if they are authenticated and an admin
  const { data: userWards } = useQuery<Ward[], Error>({
    queryKey: ["/api/admin/wards"],
    queryFn: getQueryFn({ on401: "returnNull" }),
    enabled: !!user?.isAdmin,
  });

  // Initialize auth state
  useEffect(() => {
    setAuthInitialized(true);
  }, []);

  // Set the first ward as selected when wards are first loaded
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

      // If the user is an admin, fetch their wards
      if (loggedInUser.isAdmin) {
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
    onSuccess: (loggedInUser: AuthUser) => {
      queryClient.setQueryData(["/api/user"], loggedInUser);

      // If the user is an admin, fetch their wards
      if (loggedInUser.isAdmin) {
        queryClient.invalidateQueries({ queryKey: ["/api/admin/wards"] });
      }

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