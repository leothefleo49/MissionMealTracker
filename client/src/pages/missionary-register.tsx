import { useState } from "react";
import { useLocation } from "wouter";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Bell, ArrowLeft, Mail, Lock, User, MapPin } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useMutation } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";

const registerSchema = z.object({
  name: z.string().min(2, "Name must be at least 2 characters"),
  emailAddress: z.string().email("Please enter a valid missionary email").refine(
    (email) => email.endsWith("@missionary.org"),
    "Email must be a @missionary.org address"
  ),
  type: z.enum(["elders", "sisters"], { required_error: "Please select missionary type" }),
  wardAccessCode: z.string().min(1, "Ward access code is required"),
  password: z.string().min(4, "Password must be at least 4 characters").max(20, "Keep it simple - maximum 20 characters"),
});

const verificationSchema = z.object({
  verificationCode: z.string().length(6, "Verification code must be 6 digits"),
});

type RegisterForm = z.infer<typeof registerSchema>;
type VerificationForm = z.infer<typeof verificationSchema>;
type MissionaryData = RegisterForm & { missionaryId?: number };

export default function MissionaryRegister() {
  const [, setLocation] = useLocation();
  const [mode, setMode] = useState<"login" | "register">("login");
  const [step, setStep] = useState<"register" | "verify" | "complete">("register");
  const [missionaryData, setMissionaryData] = useState<MissionaryData | null>(null);
  const { toast } = useToast();

  const registerForm = useForm<RegisterForm>({
    resolver: zodResolver(registerSchema),
    defaultValues: {
      name: "",
      emailAddress: "",
      type: undefined,
      wardAccessCode: "",
      password: "",
    },
  });

  const verificationForm = useForm<VerificationForm>({
    resolver: zodResolver(verificationSchema),
    defaultValues: {
      verificationCode: "",
    },
  });

  const registerMutation = useMutation({
    mutationFn: async (data: RegisterForm) => {
      // Register missionary with email verification
      const response = await apiRequest("POST", "/api/missionaries/register", data);
      return await response.json();
    },
    onSuccess: (response) => {
      setMissionaryData({ ...registerForm.getValues(), missionaryId: response.missionaryId });
      setStep("verify");
      toast({
        title: "Verification Email Sent",
        description: "Please check your @missionary.org email for a 6-digit verification code.",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Registration Failed",
        description: error.message || "Please check your information and try again.",
        variant: "destructive",
      });
    },
  });

  const verifyMutation = useMutation({
    mutationFn: async (data: VerificationForm) => {
      if (!missionaryData) throw new Error("No registration data found");
      
      return apiRequest("POST", "/api/missionaries/verify", {
        emailAddress: missionaryData.emailAddress,
        verificationCode: data.verificationCode,
        password: missionaryData.password,
      });
    },
    onSuccess: () => {
      setStep("complete");
      toast({
        title: "Registration Complete",
        description: "Your missionary account has been created successfully!",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Verification Failed",
        description: error.message || "Invalid verification code. Please try again.",
        variant: "destructive",
      });
    },
  });

  const onRegisterSubmit = (values: RegisterForm) => {
    registerMutation.mutate(values);
  };

  const onVerifySubmit = (values: VerificationForm) => {
    verifyMutation.mutate(values);
  };

  const handleBackToHome = () => {
    setLocation("/");
  };

  const handleAccessPortal = () => {
    if (missionaryData) {
      setLocation(`/missionary-portal/${missionaryData.wardAccessCode}`);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-amber-50 to-orange-100">
      {/* Header */}
      <header className="bg-white shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex justify-between items-center">
            <div className="flex items-center">
              <Bell className="h-8 w-8 text-primary mr-3" />
              <h1 className="text-xl font-bold text-gray-900">
                Missionary Portal
              </h1>
            </div>
            <Button variant="ghost" onClick={handleBackToHome}>
              <ArrowLeft className="mr-2 h-4 w-4" />
              Back to Home
            </Button>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-grow">
        <div className="max-w-md mx-auto px-4 sm:px-6 lg:px-8 py-12">
          {step === "register" && (
            <Card className="border-2 border-amber-200 bg-white shadow-lg">
              <CardHeader>
                <CardTitle className="flex items-center text-amber-700">
                  <User className="h-6 w-6 mr-2" />
                  Register as Missionary
                </CardTitle>
                <CardDescription>
                  Create your missionary account with email verification
                </CardDescription>
              </CardHeader>
              <CardContent>
                <Form {...registerForm}>
                  <form onSubmit={registerForm.handleSubmit(onRegisterSubmit)} className="space-y-4">
                    <FormField
                      control={registerForm.control}
                      name="name"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Full Name</FormLabel>
                          <FormControl>
                            <Input placeholder="Elder Smith / Sister Johnson" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={registerForm.control}
                      name="emailAddress"
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
                      control={registerForm.control}
                      name="type"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Missionary Type</FormLabel>
                          <Select onValueChange={field.onChange} value={field.value}>
                            <FormControl>
                              <SelectTrigger>
                                <SelectValue placeholder="Select type" />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              <SelectItem value="elders">Elders</SelectItem>
                              <SelectItem value="sisters">Sisters</SelectItem>
                            </SelectContent>
                          </Select>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={registerForm.control}
                      name="wardAccessCode"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Ward Access Code</FormLabel>
                          <FormControl>
                            <Input placeholder="Get from your ward clerk" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={registerForm.control}
                      name="password"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Portal Password</FormLabel>
                          <FormControl>
                            <Input 
                              type="password" 
                              placeholder="Keep it simple (4-20 characters)" 
                              {...field} 
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <Button 
                      type="submit" 
                      className="w-full bg-amber-600 hover:bg-amber-700"
                      disabled={registerMutation.isPending}
                    >
                      {registerMutation.isPending ? "Sending..." : "Send Verification Email"}
                      <Mail className="ml-2 h-4 w-4" />
                    </Button>
                  </form>
                </Form>
              </CardContent>
            </Card>
          )}

          {step === "verify" && (
            <Card className="border-2 border-blue-200 bg-white shadow-lg">
              <CardHeader>
                <CardTitle className="flex items-center text-blue-700">
                  <Mail className="h-6 w-6 mr-2" />
                  Email Verification
                </CardTitle>
                <CardDescription>
                  Enter the 6-digit code sent to {missionaryData?.emailAddress}
                </CardDescription>
              </CardHeader>
              <CardContent>
                <Form {...verificationForm}>
                  <form onSubmit={verificationForm.handleSubmit(onVerifySubmit)} className="space-y-4">
                    <FormField
                      control={verificationForm.control}
                      name="verificationCode"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Verification Code</FormLabel>
                          <FormControl>
                            <Input 
                              placeholder="123456" 
                              maxLength={6}
                              className="text-center text-lg font-mono"
                              {...field} 
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <Button 
                      type="submit" 
                      className="w-full bg-blue-600 hover:bg-blue-700"
                      disabled={verifyMutation.isPending}
                    >
                      {verifyMutation.isPending ? "Verifying..." : "Verify & Complete Registration"}
                      <Lock className="ml-2 h-4 w-4" />
                    </Button>
                  </form>
                </Form>

                <div className="mt-4 text-center">
                  <Button 
                    variant="ghost" 
                    onClick={() => setStep("register")}
                    className="text-sm text-gray-600"
                  >
                    Back to Registration
                  </Button>
                </div>
              </CardContent>
            </Card>
          )}

          {step === "complete" && (
            <Card className="border-2 border-green-200 bg-white shadow-lg">
              <CardHeader>
                <CardTitle className="flex items-center text-green-700">
                  <User className="h-6 w-6 mr-2" />
                  Registration Complete!
                </CardTitle>
                <CardDescription>
                  Your missionary account has been created successfully
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="text-sm text-gray-600">
                  <p className="mb-2">You can now:</p>
                  <ul className="list-disc list-inside space-y-1">
                    <li>View your meal appointments</li>
                    <li>Manage notification preferences</li>
                    <li>Access your calendar</li>
                  </ul>
                </div>

                <Button 
                  onClick={handleAccessPortal}
                  className="w-full bg-green-600 hover:bg-green-700"
                >
                  Access Missionary Portal
                  <MapPin className="ml-2 h-4 w-4" />
                </Button>

                <div className="text-center">
                  <Button 
                    variant="ghost" 
                    onClick={handleBackToHome}
                    className="text-sm text-gray-600"
                  >
                    Back to Home
                  </Button>
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      </main>
    </div>
  );
}