import { useState } from "react";
import { useLocation, useParams } from "wouter";
import { useAuth } from "@/hooks/use-auth";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Bell, ArrowLeft, Key, User, Briefcase } from "lucide-react";

const missionaryLoginSchema = z.object({
  email: z
    .string()
    .email("Invalid email")
    .refine(
      (email) => email.endsWith("@missionary.org"),
      "Email must be a @missionary.org address",
    ),
  password: z.string().min(1, "Password is required"),
});

const adminLoginSchema = z.object({
  username: z.string().min(1, "Username is required"),
  password: z.string().min(1, "Password is required"),
});

export default function MissionaryPortal() {
  const { accessCode } = useParams();
  const [, setLocation] = useLocation();
  const { loginMutation, wardLoginMutation } = useAuth();

  const missionaryForm = useForm<z.infer<typeof missionaryLoginSchema>>({
    resolver: zodResolver(missionaryLoginSchema),
    defaultValues: { email: "", password: "" },
  });

  const adminForm = useForm<z.infer<typeof adminLoginSchema>>({
    resolver: zodResolver(adminLoginSchema),
    defaultValues: { username: "", password: "" },
  });

  const onMissionarySubmit = (values: z.infer<typeof missionaryLoginSchema>) => {
    // This will be a new mutation in useAuth for missionary portal login
    // For now, we can log it.
    console.log("Missionary login", values);
  };

  const onAdminSubmit = (values: z.infer<typeof adminLoginSchema>) => {
    loginMutation.mutate(values);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100">
      <header className="bg-white shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 flex justify-between items-center">
          <div className="flex items-center">
            <Bell className="h-8 w-8 text-primary mr-3" />
            <h1 className="text-xl font-bold text-gray-900">
              Missionary Portal
            </h1>
          </div>
          <Button variant="ghost" onClick={() => setLocation("/")}>
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back to Home
          </Button>
        </div>
      </header>

      <main className="flex-grow py-12">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 grid md:grid-cols-2 gap-8">
          {/* Missionary Sign-In & Registration */}
          <Card className="border-2 border-blue-200 shadow-lg">
            <CardHeader>
              <CardTitle className="flex items-center text-blue-700">
                <User className="h-6 w-6 mr-2" />
                Missionary Access
              </CardTitle>
              <CardDescription>
                Sign in to view your meal calendar and manage preferences.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Form {...missionaryForm}>
                <form
                  onSubmit={missionaryForm.handleSubmit(onMissionarySubmit)}
                  className="space-y-4"
                >
                  <FormField
                    control={missionaryForm.control}
                    name="email"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Missionary Email</FormLabel>
                        <FormControl>
                          <Input
                            type="email"
                            placeholder="firstname.lastname@missionary.org"
                            {...field}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={missionaryForm.control}
                    name="password"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Password</FormLabel>
                        <FormControl>
                          <Input type="password" placeholder="••••••••" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <Button
                    type="submit"
                    className="w-full bg-blue-600 hover:bg-blue-700"
                    disabled={loginMutation.isPending}
                  >
                    {loginMutation.isPending ? "Signing in..." : "Sign In"}
                  </Button>
                </form>
              </Form>
              <div className="mt-4 text-center text-sm space-y-2">
                <Button
                  variant="link"
                  className="p-0 h-auto"
                  onClick={() =>
                    setLocation(`/missionary-register/${accessCode || ""}`)
                  }
                >
                  Don't have an account? Register here
                </Button>
                <Button
                  variant="link"
                  className="p-0 h-auto"
                  onClick={() =>
                    setLocation(
                      `/missionary-forgot-password/${accessCode || ""}`,
                    )
                  }
                >
                  Forgot your password?
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* Admin Login */}
          <Card className="border-2 border-slate-200 shadow-lg">
            <CardHeader>
              <CardTitle className="flex items-center text-slate-700">
                <Briefcase className="h-6 w-6 mr-2" />
                Admin Missionary Management
              </CardTitle>
              <CardDescription>
                Ward and Super Admins can sign in here to manage missionaries.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Form {...adminForm}>
                <form
                  onSubmit={adminForm.handleSubmit(onAdminSubmit)}
                  className="space-y-4"
                >
                  <FormField
                    control={adminForm.control}
                    name="username"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Admin Username or Email</FormLabel>
                        <FormControl>
                          <Input placeholder="Enter username or email" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={adminForm.control}
                    name="password"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Admin Password</FormLabel>
                        <FormControl>
                          <Input type="password" placeholder="••••••••" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <Button
                    type="submit"
                    className="w-full bg-slate-600 hover:bg-slate-700"
                    disabled={loginMutation.isPending}
                  >
                    {loginMutation.isPending
                      ? "Signing in..."
                      : "Admin Sign In"}
                  </Button>
                </form>
              </Form>
            </CardContent>
          </Card>
        </div>
      </main>
    </div>
  );
}