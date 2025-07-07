import { useState, useEffect } from "react";
import { useLocation, useParams } from "wouter";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ArrowLeft, Mail, Lock, User, Eye, EyeOff } from "lucide-react";
import { useAuth } from "@/hooks/use-auth";
import { useToast } from "@/hooks/use-toast";
import './missionary-portal.css'; // Import the new CSS file

export default function MissionaryPortal() {
  const params = useParams();
  const accessCode = params.accessCode;
  const [, setLocation] = useLocation();
  const { wardLoginMutation } = useAuth();
  const { toast } = useToast();

  const [missionaryEmail, setMissionaryEmail] = useState("");
  const [missionaryPassword, setMissionaryPassword] = useState("");
  const [adminUsername, setAdminUsername] = useState("");
  const [adminPassword, setAdminPassword] = useState("");
  const [isMissionarySubmitting, setIsMissionarySubmitting] = useState(false);
  const [isAdminSubmitting, setIsAdminSubmitting] = useState(false);
  const [showMissionaryPass, setShowMissionaryPass] = useState(false);
  const [showAdminPass, setShowAdminPass] = useState(false);

  const handleMissionaryLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsMissionarySubmitting(true);
    // Missionary self-registration/login logic will be handled here
    // For now, it's a placeholder
    setTimeout(() => {
      toast({ title: "Missionary Login", description: "This feature is being developed." });
      setIsMissionarySubmitting(false);
    }, 1000);
  };

  const handleAdminLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsAdminSubmitting(true);
    wardLoginMutation.mutate(
      { wardAccessCode: accessCode || '', password: adminPassword },
      {
        onSuccess: () => {
          // The useAuth hook will handle the redirect
        },
        onError: () => {
          setIsAdminSubmitting(false);
        }
      }
    );
  };

  return (
    <div className="portal-container">
      <div className="portal-grid">
        {/* Box 1: Missionary Sign-In & Registration */}
        <div className="portal-box">
          <CardHeader>
            <CardTitle>Missionary Portal Access</CardTitle>
            <CardDescription>Sign in to manage your meal schedule.</CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleMissionaryLogin} className="space-y-4">
              <div className="space-y-1">
                <Label htmlFor="missionary-email">Email</Label>
                <div className="relative">
                  <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                  <Input id="missionary-email" type="email" placeholder="@missionary.org" value={missionaryEmail} onChange={(e) => setMissionaryEmail(e.target.value)} className="pl-10" required />
                </div>
              </div>
              <div className="space-y-1">
                <Label htmlFor="missionary-password">Password</Label>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                  <Input id="missionary-password" type={showMissionaryPass ? "text" : "password"} value={missionaryPassword} onChange={(e) => setMissionaryPassword(e.target.value)} className="pl-10" required />
                  <button type="button" onClick={() => setShowMissionaryPass(!showMissionaryPass)} className="absolute right-3 top-1/2 -translate-y-1/2">
                    {showMissionaryPass ? <EyeOff className="h-4 w-4"/> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
              </div>
              <Button type="submit" className="w-full" disabled={isMissionarySubmitting}>
                {isMissionarySubmitting ? "Signing In..." : "Sign In"}
              </Button>
              <div className="text-center text-sm space-y-2 mt-4">
                <a href={`/missionary-register/${accessCode}`} className="text-blue-600 hover:underline">Don't have an account? Register here</a>
                <br/>
                <a href="#" className="text-gray-500 hover:underline">Forgot your password?</a>
              </div>
            </form>
          </CardContent>
        </div>

        {/* Box 2: Ward/Super Admin Login */}
        <div className="portal-box">
          <CardHeader>
            <CardTitle>Admin Missionary Management</CardTitle>
            <CardDescription>Log in to manage missionaries for this ward.</CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleAdminLogin} className="space-y-4">
              <div className="space-y-1">
                <Label htmlFor="admin-username">Admin Username/Email</Label>
                 <div className="relative">
                  <User className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                  <Input id="admin-username" type="text" value={adminUsername} onChange={(e) => setAdminUsername(e.target.value)} className="pl-10" />
                </div>
              </div>
              <div className="space-y-1">
                <Label htmlFor="admin-password">Admin Password</Label>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                  <Input id="admin-password" type={showAdminPass ? "text" : "password"} value={adminPassword} onChange={(e) => setAdminPassword(e.target.value)} className="pl-10" required />
                  <button type="button" onClick={() => setShowAdminPass(!showAdminPass)} className="absolute right-3 top-1/2 -translate-y-1/2">
                    {showAdminPass ? <EyeOff className="h-4 w-4"/> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
              </div>
              <Button type="submit" className="w-full" disabled={isAdminSubmitting}>
                {isAdminSubmitting ? "Logging In..." : "Admin Login"}
              </Button>
            </form>
          </CardContent>
        </div>
      </div>
      <Button variant="ghost" onClick={() => setLocation('/')} className="absolute top-4 left-4">
        <ArrowLeft className="mr-2 h-4 w-4" />
        Back to Home
      </Button>
    </div>
  );
}