import { useState } from "react";
import { useAuth } from "@/hooks/use-auth";
import { Redirect, useLocation } from "wouter";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import * as z from "zod";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Calendar, Lock } from "lucide-react";

// Admin login schema
const adminLoginSchema = z.object({
  username: z.string().min(1, "Username is required"),
  password: z.string().min(1, "Password is required"),
});

// Congregation-specific login schema
const congregationLoginSchema = z.object({
  congregationAccessCode: z.string().min(1, "Congregation access code is required"),
  password: z.string().min(1, "Password is required"),
});

export default function AuthPage() {
  const { user, loginMutation, wardLoginMutation } = useAuth();
  const [location] = useLocation();
  const [authTab, setAuthTab] = useState<"admin" | "congregation">("admin");

  // Get the congregation access code from URL if present
  const congregationAccessCodeFromUrl = new URLSearchParams(window.location.search).get('congregation');

  // Form for main admin login
  const adminForm = useForm<z.infer<typeof adminLoginSchema>>({
    resolver: zodResolver(adminLoginSchema),
    defaultValues: {
      username: "",
      password: "",
    },
  });

  // Form for congregation-specific login
  const congregationLoginForm = useForm<z.infer<typeof congregationLoginSchema>>({
    resolver: zodResolver(congregationLoginSchema),
    defaultValues: {
      congregationAccessCode: congregationAccessCodeFromUrl || "",
      password: "",
    },
  });

  async function onAdminLoginSubmit(values: z.infer<typeof adminLoginSchema>) {
    loginMutation.mutate(values);
  }

  async function onCongregationLoginSubmit(values: z.infer<typeof congregationLoginSchema>) {
    // Note: The mutation is still named wardLoginMutation from the useAuth hook, but it points to the correct endpoint.
    wardLoginMutation.mutate({ wardAccessCode: values.congregationAccessCode, password: values.password });
  }

  // Redirect if already logged in
  if (user) {
    return <Redirect to="/admin" />;
  }

  // If congregation code is in URL, default to congregation login tab
  if (congregationAccessCodeFromUrl && authTab !== "congregation") {
    setAuthTab("congregation");
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 p-4">
      <div className="max-w-md w-full">
        <div className="text-center mb-6">
          <div className="flex justify-center mb-2">
            <Calendar className="h-12 w-12 text-primary" />
          </div>
          <h1 className="text-2xl font-bold text-gray-900">Missionary Meal Calendar</h1>
          <p className="text-sm text-gray-600 mt-1">Admin Access</p>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Admin Login</CardTitle>
            <CardDescription>
              Sign in to access the missionary administration panel.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Tabs value={authTab} onValueChange={(v) => setAuthTab(v as "admin" | "congregation")} className="w-full">
              <TabsList className="grid w-full grid-cols-2">
                <TabsTrigger value="admin">Admin</TabsTrigger>
                <TabsTrigger value="congregation">Congregation Admin</TabsTrigger>
              </TabsList>

              {/* Admin Login Form */}
              <TabsContent value="admin" className="mt-4">
                <Form {...adminForm}>
                  <form onSubmit={adminForm.handleSubmit(onAdminLoginSubmit)} className="space-y-4">
                    <FormField
                      control={adminForm.control}
                      name="username"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Username</FormLabel>
                          <FormControl>
                            <Input placeholder="Enter your username" {...field} />
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
                      className="w-full"
                      disabled={loginMutation.isPending}
                    >
                      {loginMutation.isPending ? (
                        <>
                          <Lock className="mr-2 h-4 w-4 animate-spin" />
                          Logging in...
                        </>
                      ) : (
                        "Sign In as Admin"
                      )}
                    </Button>
                  </form>
                </Form>
              </TabsContent>

              {/* Congregation Admin Login Form */}
              <TabsContent value="congregation" className="mt-4">
                <Form {...congregationLoginForm}>
                  <form onSubmit={congregationLoginForm.handleSubmit(onCongregationLoginSubmit)} className="space-y-4">
                    <FormField
                      control={congregationLoginForm.control}
                      name="congregationAccessCode"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Congregation Access Code</FormLabel>
                          <FormControl>
                            <Input placeholder="Enter congregation access code" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={congregationLoginForm.control}
                      name="password"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Congregation Admin Password</FormLabel>
                          <FormControl>
                            <Input type="password" placeholder="••••••••" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <Button
                      type="submit"
                      className="w-full"
                      disabled={wardLoginMutation?.isPending}
                    >
                      {wardLoginMutation?.isPending ? (
                        <>
                          <Lock className="mr-2 h-4 w-4 animate-spin" />
                          Logging in...
                        </>
                      ) : (
                        "Sign In as Congregation Admin"
                      )}
                    </Button>
                  </form>
                </Form>
              </TabsContent>
            </Tabs>
          </CardContent>
          <CardFooter className="border-t pt-6 flex justify-between">
            <Button variant="outline" onClick={() => window.location.href = "/"}>
              Back to Calendar
            </Button>
          </CardFooter>
        </Card>
      </div>
    </div>
  );
}