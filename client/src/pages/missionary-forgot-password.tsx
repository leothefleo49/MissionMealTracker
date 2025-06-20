import { useState } from "react";
import { useLocation, useParams } from "wouter";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ArrowLeft, Mail, CheckCircle } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

export default function MissionaryForgotPassword() {
  const params = useParams();
  const accessCode = params.accessCode;
  const [, setLocation] = useLocation();
  const [email, setEmail] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);
  const [error, setError] = useState("");
  const { toast } = useToast();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setError("");

    try {
      const response = await fetch('/api/missionary-forgot-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          emailAddress: email,
          accessCode 
        }),
      });

      if (response.ok) {
        setIsSuccess(true);
        toast({
          title: "Password reset sent",
          description: "Check your email for password reset instructions.",
        });
      } else {
        const data = await response.json();
        setError(data.message || "Failed to send password reset email");
      }
    } catch (error) {
      setError("Network error occurred. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  };

  if (isSuccess) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center p-4">
        <Card className="w-full max-w-md">
          <CardContent className="p-6">
            <div className="text-center">
              <CheckCircle className="h-12 w-12 text-green-500 mx-auto mb-4" />
              <h1 className="text-xl font-bold text-gray-900 mb-2">Check Your Email</h1>
              <p className="text-gray-600 mb-6">
                We've sent password reset instructions to your email address. Please check your inbox and follow the instructions to reset your password.
              </p>
              
              <div className="space-y-3">
                <Button 
                  onClick={() => setLocation(`/missionary-portal/${accessCode}`)}
                  className="w-full bg-blue-600 hover:bg-blue-700"
                >
                  Back to Sign In
                </Button>
                
                <button
                  onClick={() => setLocation("/")}
                  className="block w-full text-sm text-gray-600 hover:text-gray-700 underline"
                >
                  Back to Home
                </button>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center p-4">
      <Card className="w-full max-w-md">
        <CardHeader>
          <div className="flex items-center space-x-2">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setLocation(`/missionary-portal/${accessCode || ''}`)}
              className="p-0 h-auto"
            >
              <ArrowLeft className="h-4 w-4" />
            </Button>
            <div>
              <CardTitle>Reset Password</CardTitle>
              <CardDescription>
                Enter your missionary email to reset your password
              </CardDescription>
            </div>
          </div>
        </CardHeader>
        
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <label htmlFor="email" className="text-sm font-medium text-gray-700">
                Email Address
              </label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                <input
                  id="email"
                  type="email"
                  placeholder="Enter your @missionary.org email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full pl-10 pr-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  required
                />
              </div>
            </div>

            {error && (
              <div className="text-red-600 text-sm text-center">{error}</div>
            )}

            <Button 
              type="submit"
              disabled={isSubmitting || !email}
              className="w-full bg-blue-600 hover:bg-blue-700"
            >
              {isSubmitting ? "Sending..." : "Send Reset Instructions"}
            </Button>
          </form>

          <div className="mt-4 text-center">
            <button
              onClick={() => setLocation(`/missionary-portal/${accessCode || ''}`)}
              className="text-sm text-gray-600 hover:text-gray-700 underline"
            >
              Remember your password? Sign in
            </button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}