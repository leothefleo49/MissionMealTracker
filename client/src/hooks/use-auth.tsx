import { createContext, ReactNode, useContext, useState, useEffect } from "react";
import {
  useQuery,
  useMutation,
  UseMutationResult,
} from "@tanstack/react-query";
import { Congregation, User } from "@shared/schema";
import { apiRequest, queryClient, getQueryFn } from "../lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { useLocation } from "wouter";

type AuthContextType = {
  user: User | null;
  isLoading: boolean;
  error: Error | null;
  loginMutation: UseMutationResult<User, Error, LoginData>;
  wardLoginMutation: UseMutationResult<User, Error, WardLoginData>;
  logoutMutation: UseMutationResult<void, Error, void>;
  userCongregations: Congregation[] | null;
  selectedCongregation: Congregation | null;
  setSelectedCongregation: (congregation: Congregation | null) => void;
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
  const [selectedCongregation, setSelectedCongregation] = useState<Congregation | null>(null);

  const {
    data: user,
    error,
    isLoading,
  } = useQuery<User | null, Error>({
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

  const { data: userCongregations } = useQuery<Congregation[], Error>({
    queryKey: ["/api/admin/congregations"],
    queryFn: getQueryFn({ on401: "returnNull" }),
    enabled: !!user,
  });

  useEffect(() => {
    setAuthInitialized(true);
  }, []);

  useEffect(() => {
    if (userCongregations && userCongregations.length > 0 && !selectedCongregation) {
      setSelectedCongregation(userCongregations[0]);
    }
  }, [userCongregations, selectedCongregation]);

  const loginMutation = useMutation({
    mutationFn: async (credentials: LoginData) => {
      const res = await apiRequest("POST", "/api/login", credentials);
      if (!res.ok) {
        const error = await res.json();
        throw new Error(error.message || "Invalid login credentials");
      }
      return await res.json();
    },
    onSuccess: (loggedInUser: User) => {
      queryClient.setQueryData(["/api/user"], loggedInUser);
      if (loggedInUser.role !== 'ward') {
        queryClient.invalidateQueries({ queryKey: ["/api/admin/congregations"] });
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
    onSuccess: (loggedInUser: User) => {
      queryClient.setQueryData(["/api/user"], loggedInUser);
      if (loggedInUser.role !== 'ward') {
        queryClient.invalidateQueries({ queryKey: ["/api/admin/congregations"] });
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
      setSelectedCongregation(null);
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
        userCongregations: userCongregations ?? null,
        selectedCongregation,
        setSelectedCongregation,
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