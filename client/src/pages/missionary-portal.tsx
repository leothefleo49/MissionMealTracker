import { useState, useEffect } from "react";
import { useLocation, useParams } from "wouter";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ArrowLeft, Calendar, User, Bell, Settings, Lock, Eye, EyeOff } from "lucide-react";
import { MissionaryUpcomingMeals } from "@/components/missionary-upcoming-meals";
import { useQuery } from "@tanstack/react-query";
import { CalendarGrid } from "@/components/calendar-grid";
import { useIsMobile } from "@/hooks/use-mobile";
import { useToast } from "@/hooks/use-toast";

export default function MissionaryPortal() {
  const params = useParams();
  const accessCode = params.accessCode;
  const [, setLocation] = useLocation();
  const [activeTab, setActiveTab] = useState("upcoming");
  const [missionaryType, setMissionaryType] = useState<"elders" | "sisters">("elders");
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [authEmail, setAuthEmail] = useState("");
  const [authPassword, setAuthPassword] = useState("");
  const [authenticating, setAuthenticating] = useState(false);
  const [authError, setAuthError] = useState("");
  const [wardCodeInput, setWardCodeInput] = useState("");
  const [selectedMissionaryId, setSelectedMissionaryId] = useState<string>("");
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [changingPassword, setChangingPassword] = useState(false);
  const [showCurrentPassword, setShowCurrentPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [authenticatedMissionary, setAuthenticatedMissionary] = useState<any>(null);
  const isMobile = useIsMobile();
  const { toast } = useToast();
  
  // Fetch ward data
  const { data: ward } = useQuery<any>({
    queryKey: ['/api/wards', accessCode],
    queryFn: () => fetch(`/api/wards/${accessCode}`).then(res => {
      if (!res.ok) {
        throw new Error("Invalid ward access code");
      }
      return res.json();
    }),
    retry: false,
    enabled: !!accessCode
  });

  const wardId = ward?.id;
  
  // Fetch missionaries data
  const { data: missionaries } = useQuery<any[]>({
    queryKey: ['/api/wards', wardId, 'missionaries'],
    queryFn: () => fetch(`/api/wards/${wardId}/missionaries`).then(res => res.json()),
    enabled: !!wardId && isAuthenticated,
    staleTime: 1000,
    refetchInterval: 1000,
    refetchOnWindowFocus: true
  });

  // Check for stored authentication
  useEffect(() => {
    if (accessCode) {
      const stored = localStorage.getItem(`missionary-auth-${accessCode}`);
      const missionaryData = localStorage.getItem(`missionary-data-${accessCode}`);
      if (stored === 'true') {
        setIsAuthenticated(true);
        if (missionaryData) {
          setAuthenticatedMissionary(JSON.parse(missionaryData));
        }
      }
    }
  }, [accessCode]);

  // Initialize missionary selection
  useEffect(() => {
    if (missionaries && missionaries.length > 0 && !selectedMissionaryId) {
      const defaultMissionary = missionaries.find(m => m.type === missionaryType) || missionaries[0];
      setSelectedMissionaryId(defaultMissionary.id.toString());
    }
  }, [missionaries, missionaryType, selectedMissionaryId]);

  const handleAuthentication = async () => {
    setAuthenticating(true);
    setAuthError("");
    
    try {
      const response = await fetch(`/api/missionary-portal/authenticate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          accessCode, 
          emailAddress: authEmail, 
          password: authPassword 
        }),
      });
      
      if (response.ok) {
        const data = await response.json();
        if (data.authenticated) {
          setIsAuthenticated(true);
          setAuthenticatedMissionary(data.missionary);
          localStorage.setItem(`missionary-auth-${accessCode}`, 'true');
          localStorage.setItem(`missionary-data-${accessCode}`, JSON.stringify(data.missionary));
        } else {
          setAuthError("Invalid email or password");
        }
      } else {
        setAuthError("Authentication failed");
      }
    } catch (error) {
      setAuthError("Network error occurred");
    } finally {
      setAuthenticating(false);
    }
  };

  const handlePasswordChange = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!currentPassword || !newPassword || !confirmPassword) {
      toast({
        title: "Error",
        description: "Please fill in all password fields",
        variant: "destructive",
      });
      return;
    }
    
    if (newPassword !== confirmPassword) {
      toast({
        title: "Error",
        description: "New passwords do not match",
        variant: "destructive",
      });
      return;
    }
    
    if (newPassword.length < 6) {
      toast({
        title: "Error",
        description: "New password must be at least 6 characters long",
        variant: "destructive",
      });
      return;
    }
    
    setChangingPassword(true);
    
    try {
      const response = await fetch('/api/missionary-change-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          accessCode,
          emailAddress: authEmail,
          currentPassword,
          newPassword
        }),
      });
      
      if (response.ok) {
        toast({
          title: "Success",
          description: "Password changed successfully",
        });
        setCurrentPassword("");
        setNewPassword("");
        setConfirmPassword("");
      } else {
        const data = await response.json();
        toast({
          title: "Error",
          description: data.message || "Failed to change password",
          variant: "destructive",
        });
      }
    } catch (error) {
      toast({
        title: "Error",
        description: "Network error occurred",
        variant: "destructive",
      });
    } finally {
      setChangingPassword(false);
    }
  };

  // Get missionary ID based on selection
  const missionary = missionaries?.find(m => m.id.toString() === selectedMissionaryId);
  const missionaryId = missionary?.id;
  
  // Show access code prompt if no access code provided
  if (!accessCode) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center p-4">
        <Card className="w-full max-w-md">
          <CardContent className="p-6">
            <div className="text-center mb-6">
              <h1 className="text-2xl font-bold text-gray-900 mb-2">Missionary Portal</h1>
              <p className="text-gray-600">Enter your ward access code to continue</p>
            </div>
            
            <div className="space-y-4">
              <input
                type="text"
                placeholder="Enter ward access code"
                value={wardCodeInput}
                onChange={(e) => setWardCodeInput(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
              
              <Button 
                onClick={() => {
                  if (wardCodeInput.trim()) {
                    setLocation(`/missionary-portal/${wardCodeInput.trim()}`);
                  }
                }}
                disabled={!wardCodeInput.trim()}
                className="w-full bg-blue-600 hover:bg-blue-700"
              >
                Continue
              </Button>
              
              <div className="text-center">
                <button
                  onClick={() => setLocation("/")}
                  className="text-sm text-blue-600 hover:text-blue-700 underline"
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

  if (!isAuthenticated) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center p-4">
        <Card className="w-full max-w-md">
          <CardContent className="p-6">
            <div className="text-center mb-6">
              <h1 className="text-2xl font-bold text-gray-900 mb-2">Missionary Portal Access</h1>
              <p className="text-gray-600">Sign in or register to access your meal schedule</p>
            </div>
            
            <div className="space-y-4">
              <div className="space-y-3">
                <input
                  type="email"
                  placeholder="Enter your @missionary.org email"
                  value={authEmail}
                  onChange={(e) => setAuthEmail(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
                
                <input
                  type="password"
                  placeholder="Enter your password"
                  value={authPassword}
                  onChange={(e) => setAuthPassword(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
                
                {authError && (
                  <div className="text-red-600 text-sm text-center">{authError}</div>
                )}
                
                <Button 
                  onClick={handleAuthentication}
                  disabled={authenticating || !authEmail || !authPassword}
                  className="w-full bg-blue-600 hover:bg-blue-700"
                >
                  {authenticating ? "Signing In..." : "Sign In"}
                </Button>
              </div>
              
              <div className="text-center space-y-2">
                <button
                  onClick={() => setLocation(`/missionary-register/${accessCode}`)}
                  className="block w-full text-sm text-blue-600 hover:text-blue-700 underline"
                >
                  Don't have an account? Register here
                </button>
                
                <button
                  onClick={() => setLocation(`/missionary-forgot-password/${accessCode}`)}
                  className="block w-full text-sm text-gray-600 hover:text-gray-700 underline"
                >
                  Forgot your password?
                </button>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col bg-gray-50">
      {/* Header */}
      <header className="bg-white shadow-sm">
        <div className="max-w-7xl mx-auto px-2 sm:px-6 lg:px-8 py-2 sm:py-4">
          <div className="flex justify-between items-center gap-1">
            <div className="flex items-center min-w-0 flex-grow">
              <Bell className="h-6 w-6 sm:h-8 sm:w-8 text-primary flex-shrink-0" />
              <h1 className="ml-1 sm:ml-2 text-sm sm:text-xl font-bold text-gray-900 truncate">
                {isMobile ? "Portal" : "Missionary Portal"}
              </h1>
            </div>
            <Button 
              variant="ghost" 
              size="sm"
              className="flex items-center flex-shrink-0 px-2 py-1"
              onClick={() => setLocation(`/ward/${accessCode}`)}
            >
              <ArrowLeft className="h-3 w-3 sm:h-4 sm:w-4" />
              {isMobile && <span className="ml-1 text-xs">Back</span>}
              {!isMobile && <span className="ml-2 text-base">Back to Ward</span>}
            </Button>
          </div>
        </div>
      </header>
      
      {/* Main Content */}
      <main className="flex-grow">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <Card className="mb-6">
            <CardHeader>
              <CardTitle>Missionary Meal Schedule</CardTitle>
              <CardDescription>
                View your upcoming meal appointments with ward members.
              </CardDescription>
            </CardHeader>
            
            <CardContent>
              {/* Missionary Selector */}
              <div className="mb-6 flex justify-center">
                <div className="max-w-md w-full">
                  <h3 className="text-sm font-medium mb-2 text-center">Select Missionary</h3>
                  <div className="grid grid-cols-1 gap-4">
                    {missionaries && missionaries.length > 0 ? (
                      <div className="grid grid-cols-1 gap-2">
                        {missionaries.map((m) => (
                          <Button
                            key={m.id}
                            variant={selectedMissionaryId === m.id.toString() ? "default" : "outline"}
                            onClick={() => {
                              setSelectedMissionaryId(m.id.toString());
                              setMissionaryType(m.type);
                            }}
                            className={`w-full ${m.type === "sisters" && selectedMissionaryId === m.id.toString() ? "bg-amber-500 hover:bg-amber-600" : ""}`}
                          >
                            <User className="mr-2 h-4 w-4" />
                            {m.name}
                          </Button>
                        ))}
                      </div>
                    ) : (
                      <div className="text-center text-sm text-gray-500">
                        No missionaries found for this ward
                      </div>
                    )}
                  </div>
                </div>
              </div>
              
              <Tabs defaultValue={activeTab} value={activeTab} onValueChange={setActiveTab}>
                <TabsList className="mb-6 w-full grid grid-cols-3">
                  <TabsTrigger value="upcoming" className="flex items-center justify-center text-xs sm:text-sm">
                    <Bell className="mr-1 sm:mr-2 h-3 w-3 sm:h-4 sm:w-4" />
                    <span className="hidden xs:inline">Upcoming Meals</span>
                    <span className="xs:hidden">Meals</span>
                  </TabsTrigger>
                  <TabsTrigger value="calendar" className="flex items-center justify-center text-xs sm:text-sm">
                    <Calendar className="mr-1 sm:mr-2 h-3 w-3 sm:h-4 sm:w-4" />
                    <span className="hidden xs:inline">Calendar View</span>
                    <span className="xs:hidden">Calendar</span>
                  </TabsTrigger>
                  <TabsTrigger value="settings" className="flex items-center justify-center text-xs sm:text-sm">
                    <Settings className="mr-1 sm:mr-2 h-3 w-3 sm:h-4 sm:w-4" />
                    <span className="hidden xs:inline">Settings</span>
                    <span className="xs:hidden">Settings</span>
                  </TabsTrigger>
                </TabsList>
                
                <TabsContent value="upcoming">
                  {missionary ? (
                    <MissionaryUpcomingMeals 
                      missionaryId={missionaryId} 
                      missionaryType={missionary.type}
                    />
                  ) : (
                    <div className="text-center p-6">
                      <p>No missionary selected or data unavailable.</p>
                    </div>
                  )}
                </TabsContent>
                
                <TabsContent value="calendar">
                  <div className="space-y-4">
                    <div>
                      <h2 className="text-xl font-semibold mb-2">Calendar Overview</h2>
                      <p className="text-sm text-gray-500">
                        View all scheduled meals on the calendar. The highlighted dates show when you have meal appointments.
                      </p>
                    </div>
                    
                    {missionary ? (
                      <CalendarGrid
                        missionaryType={missionary.id.toString()}
                        onSelectDate={() => {}}
                        selectedDate={null}
                      />
                    ) : (
                      <div className="text-center p-6">
                        <p>No missionary selected or data unavailable.</p>
                      </div>
                    )}
                  </div>
                </TabsContent>
              </Tabs>
            </CardContent>
          </Card>
        </div>
      </main>
    </div>
  );
}