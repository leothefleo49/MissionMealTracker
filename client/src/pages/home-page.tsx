import { useState } from "react";
import { useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Bell, Calendar, Phone, User, ChevronRight, MapPin } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

export default function HomePage() {
  const [, setLocation] = useLocation();
  const [wardCode, setWardCode] = useState("");
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();

  const handleWardAccess = async () => {
    if (!wardCode.trim()) {
      toast({
        title: "Ward Code Required",
        description: "Please enter your ward access code",
        variant: "destructive",
      });
      return;
    }

    setLoading(true);
    
    try {
      // Validate ward access code
      const response = await fetch(`/api/wards/${wardCode}`);
      
      if (response.ok) {
        const ward = await response.json();
        
        // Store ward access in localStorage for persistence
        localStorage.setItem('wardAccess', JSON.stringify({
          wardId: ward.id,
          accessCode: wardCode,
          wardName: ward.name,
          accessTime: new Date().toISOString()
        }));
        
        setLocation(`/ward/${wardCode}`);
      } else {
        toast({
          title: "Invalid Ward Code",
          description: "Please check your ward access code and try again",
          variant: "destructive",
        });
      }
    } catch (error) {
      toast({
        title: "Connection Error",
        description: "Unable to connect to the server. Please try again.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleMissionaryPortal = () => {
    setLocation("/missionary-register");
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100">
      {/* Header */}
      <header className="bg-white shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <div className="flex items-center justify-center">
            <div className="flex items-center">
              <Bell className="h-8 w-8 text-primary mr-3" />
              <h1 className="text-2xl font-bold text-gray-900">
                Missionary Meal Calendar
              </h1>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-grow">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
          {/* Hero Section */}
          <div className="text-center mb-12">
            <h2 className="text-4xl font-bold text-gray-900 mb-4">
              Welcome to the Missionary Meal System
            </h2>
            <p className="text-xl text-gray-600 mb-8 max-w-2xl mx-auto">
              Coordinate meals with missionaries in your ward. Schedule appointments, 
              manage notifications, and strengthen community bonds.
            </p>
          </div>

          {/* Access Cards */}
          <div className="grid md:grid-cols-2 gap-8 mb-12">
            {/* Ward Member Access */}
            <Card className="border-2 border-blue-200 bg-white shadow-lg hover:shadow-xl transition-shadow">
              <CardHeader>
                <CardTitle className="flex items-center text-blue-700">
                  <MapPin className="h-6 w-6 mr-2" />
                  Ward Member Access
                </CardTitle>
                <CardDescription>
                  Enter your ward access code to view and schedule missionary meals
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <Label htmlFor="ward-code" className="text-sm font-medium">
                    Ward Access Code
                  </Label>
                  <Input
                    id="ward-code"
                    type="text"
                    placeholder="Enter your ward code"
                    value={wardCode}
                    onChange={(e) => setWardCode(e.target.value)}
                    onKeyPress={(e) => e.key === 'Enter' && handleWardAccess()}
                    className="mt-1"
                  />
                </div>
                <Button 
                  onClick={handleWardAccess}
                  disabled={loading}
                  className="w-full bg-blue-600 hover:bg-blue-700"
                >
                  {loading ? "Validating..." : "Access Ward Calendar"}
                  <ChevronRight className="ml-2 h-4 w-4" />
                </Button>
              </CardContent>
            </Card>

            {/* Missionary Portal */}
            <Card className="border-2 border-amber-200 bg-white shadow-lg hover:shadow-xl transition-shadow">
              <CardHeader>
                <CardTitle className="flex items-center text-amber-700">
                  <User className="h-6 w-6 mr-2" />
                  Missionary Portal
                </CardTitle>
                <CardDescription>
                  Register as a missionary or access your meal schedule and preferences
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="text-sm text-gray-600">
                  <p className="mb-2">For missionaries to:</p>
                  <ul className="list-disc list-inside space-y-1">
                    <li>Register with email verification</li>
                    <li>View upcoming meal appointments</li>
                    <li>Manage notification preferences</li>
                  </ul>
                </div>
                <Button 
                  onClick={handleMissionaryPortal}
                  variant="outline"
                  className="w-full border-amber-600 text-amber-700 hover:bg-amber-50"
                >
                  Enter Missionary Portal
                  <ChevronRight className="ml-2 h-4 w-4" />
                </Button>
              </CardContent>
            </Card>
          </div>

          {/* Features */}
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
            <div className="text-center p-6 bg-white rounded-lg shadow-sm">
              <Calendar className="h-12 w-12 text-blue-600 mx-auto mb-4" />
              <h3 className="text-lg font-semibold mb-2">Easy Scheduling</h3>
              <p className="text-gray-600 text-sm">
                View availability and schedule meals up to 3 months in advance
              </p>
            </div>
            
            <div className="text-center p-6 bg-white rounded-lg shadow-sm">
              <Bell className="h-12 w-12 text-green-600 mx-auto mb-4" />
              <h3 className="text-lg font-semibold mb-2">Email Notifications</h3>
              <p className="text-gray-600 text-sm">
                Automatic reminders and confirmations via Gmail
              </p>
            </div>
            
            <div className="text-center p-6 bg-white rounded-lg shadow-sm">
              <Phone className="h-12 w-12 text-purple-600 mx-auto mb-4" />
              <h3 className="text-lg font-semibold mb-2">Contact Information</h3>
              <p className="text-gray-600 text-sm">
                Easy access to missionary contact details
              </p>
            </div>
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="bg-white border-t">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="text-center text-gray-500 text-sm">
            <p>&copy; 2025 Missionary Meal Calendar System</p>
            <p className="mt-1">Strengthening communities through shared meals</p>
          </div>
        </div>
      </footer>
    </div>
  );
}