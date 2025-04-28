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

// Password-only login schema
const superAdminLoginSchema = z.object({
  password: z.string().min(1, "Password is required"),
});

// Ward-specific login schema 
const wardLoginSchema = z.object({
  wardAccessCode: z.string().min(1, "Ward access code is required"),
  password: z.string().min(1, "Password is required"),
});

export default function AuthPage() {
  const { user, loginMutation, wardLoginMutation } = useAuth();
  const [location] = useLocation();
  const [authTab, setAuthTab] = useState<"superadmin" | "ward">("superadmin");
  
  // Get the ward access code from URL if present
  const wardAccessCodeFromUrl = new URLSearchParams(window.location.search).get('ward');
  
  // Form for main superadmin login (password only)
  const superAdminForm = useForm<z.infer<typeof superAdminLoginSchema>>({
    resolver: zodResolver(superAdminLoginSchema),
    defaultValues: {
      password: "",
    },
  });

  // Form for ward-specific login
  const wardLoginForm = useForm<z.infer<typeof wardLoginSchema>>({
    resolver: zodResolver(wardLoginSchema),
    defaultValues: {
      wardAccessCode: wardAccessCodeFromUrl || "",
      password: "",
    },
  });

  async function onSuperAdminLoginSubmit(values: z.infer<typeof superAdminLoginSchema>) {
    loginMutation.mutate(values);
  }
  
  async function onWardLoginSubmit(values: z.infer<typeof wardLoginSchema>) {
    wardLoginMutation.mutate(values);
  }

  // Redirect if already logged in
  if (user) {
    return <Redirect to="/admin" />;
  }
  
  // If ward code is in URL, default to ward login tab
  if (wardAccessCodeFromUrl && authTab !== "ward") {
    setAuthTab("ward");
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
            <Tabs value={authTab} onValueChange={(v) => setAuthTab(v as "superadmin" | "ward")} className="w-full">
              <TabsList className="grid w-full grid-cols-2">
                <TabsTrigger value="superadmin">Super Admin</TabsTrigger>
                <TabsTrigger value="ward">Ward Admin</TabsTrigger>
              </TabsList>
              
              {/* SuperAdmin Login Form */}
              <TabsContent value="superadmin" className="mt-4">
                <Form {...superAdminForm}>
                  <form onSubmit={superAdminForm.handleSubmit(onSuperAdminLoginSubmit)} className="space-y-4">
                    <FormField
                      control={superAdminForm.control}
                      name="password"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Super Admin Password</FormLabel>
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
                        "Sign In as Super Admin"
                      )}
                    </Button>
                  </form>
                </Form>
              </TabsContent>
              
              {/* Ward Admin Login Form */}
              <TabsContent value="ward" className="mt-4">
                <Form {...wardLoginForm}>
                  <form onSubmit={wardLoginForm.handleSubmit(onWardLoginSubmit)} className="space-y-4">
                    <FormField
                      control={wardLoginForm.control}
                      name="wardAccessCode"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Ward Access Code</FormLabel>
                          <FormControl>
                            <Input placeholder="Enter ward access code" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={wardLoginForm.control}
                      name="password"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Ward Admin Password</FormLabel>
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
                        "Sign In as Ward Admin"
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