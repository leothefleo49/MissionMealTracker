import { useLocation } from "wouter";
import { Calendar, LogIn, Users, Settings, Info, ExternalLink } from "lucide-react";
import { useIsMobile } from "@/hooks/use-mobile";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

export default function Home() {
  const [, setLocation] = useLocation();
  const isMobile = useIsMobile();
  
  return (
    <div className="min-h-screen flex flex-col bg-gray-50">
      {/* Header */}
      <header className="bg-white shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex justify-between items-center">
            <div className="flex items-center">
              <Calendar className="h-8 w-8 text-primary flex-shrink-0" />
              <h1 className="ml-2 text-xl font-bold text-gray-900 truncate">
                {isMobile ? "Missionary Meals" : "Missionary Meal Calendar"}
              </h1>
            </div>
            <div className="hidden md:flex space-x-2">
              <Button variant="ghost" onClick={() => setLocation('/missionary-portal')}>
                Missionary Portal
              </Button>
              <Button 
                variant="outline" 
                onClick={() => setLocation('/auth')}
                className="flex items-center gap-2"
              >
                <LogIn className="h-4 w-4" />
                Admin Login
              </Button>
            </div>
            {/* Mobile menu */}
            <div className="flex md:hidden">
              <Button 
                variant="outline" 
                size="sm" 
                onClick={() => setLocation('/auth')}
                className="flex items-center gap-1"
              >
                <LogIn className="h-4 w-4" />
                Admin
              </Button>
            </div>
          </div>
        </div>
      </header>
      
      {/* Main Content */}
      <main className="flex-grow">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          {/* Hero Section */}
          <div className="text-center mb-10 py-8">
            <h1 className="text-4xl font-extrabold tracking-tight text-gray-900 sm:text-5xl md:text-6xl">
              <span className="block">Missionary Meal</span>
              <span className="block text-primary">Calendar System</span>
            </h1>
            <p className="mt-3 max-w-md mx-auto text-base text-gray-500 sm:text-lg md:mt-5 md:text-xl md:max-w-3xl">
              A simple way to schedule and manage meals for missionaries in your ward.
            </p>
          </div>

          {/* Main Cards */}
          <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3">
            {/* How it Works Card */}
            <Card>
              <CardHeader>
                <Info className="h-6 w-6 text-primary mb-2" />
                <CardTitle>How It Works</CardTitle>
                <CardDescription>
                  Understanding the missionary meal scheduling process
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <h3 className="font-medium text-sm">For Ward Members</h3>
                  <ul className="list-disc list-inside space-y-1 text-sm text-gray-600">
                    <li>Use your ward's unique link (ask your ward missionary coordinator)</li>
                    <li>Choose a date on the calendar</li>
                    <li>Fill out your contact info and meal details</li>
                    <li>Missionaries receive automatic notifications</li>
                  </ul>
                </div>
                <div className="space-y-2">
                  <h3 className="font-medium text-sm">For Missionaries</h3>
                  <ul className="list-disc list-inside space-y-1 text-sm text-gray-600">
                    <li>Receive meal notifications via text or Messenger</li>
                    <li>Access your personal portal to view all upcoming meals</li>
                    <li>Get automatic reminders for scheduled dinners</li>
                  </ul>
                </div>
              </CardContent>
            </Card>

            {/* Ward Access Card */}
            <Card>
              <CardHeader>
                <Users className="h-6 w-6 text-primary mb-2" />
                <CardTitle>Ward-Specific Access</CardTitle>
                <CardDescription>
                  Access your ward's calendar to schedule meals
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <p className="text-sm text-gray-600">
                  Each ward has its own dedicated meal calendar with a unique access link.
                  To schedule a meal, you'll need your ward's specific URL.
                </p>
                <div className="bg-gray-50 p-4 rounded-lg">
                  <h3 className="font-medium text-sm mb-2">How to get access:</h3>
                  <ul className="list-disc list-inside space-y-1 text-sm text-gray-600">
                    <li>Ask your ward mission leader or missionary coordinator</li>
                    <li>Check ward announcements or newsletter</li>
                    <li>Contact your bishop or ward clerk</li>
                  </ul>
                </div>
              </CardContent>
              <CardFooter>
                <p className="text-xs text-gray-500">
                  The unique link ensures that meal scheduling is available only to members of your ward.
                </p>
              </CardFooter>
            </Card>

            {/* Admin Access Card */}
            <Card>
              <CardHeader>
                <Settings className="h-6 w-6 text-primary mb-2" />
                <CardTitle>Admin Access</CardTitle>
                <CardDescription>
                  For ward leaders and missionary coordinators
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <p className="text-sm text-gray-600">
                  Ward administrators can create and manage ward-specific calendars, 
                  set up missionary details, and access scheduling information.
                </p>
                <div className="bg-gray-50 p-4 rounded-lg">
                  <h3 className="font-medium text-sm mb-2">Administrator features:</h3>
                  <ul className="list-disc list-inside space-y-1 text-sm text-gray-600">
                    <li>Create and manage ward calendars</li>
                    <li>Configure missionary details (elders or sisters, duo or trio)</li>
                    <li>Generate unique ward access links</li>
                    <li>View and manage scheduled meals</li>
                  </ul>
                </div>
              </CardContent>
              <CardFooter>
                <Button 
                  onClick={() => setLocation('/auth')}
                  className="w-full flex items-center justify-center gap-2"
                >
                  <LogIn className="h-4 w-4" />
                  Admin Login
                </Button>
              </CardFooter>
            </Card>
          </div>

          {/* Call to Action */}
          <div className="mt-12 text-center">
            <p className="text-lg text-gray-600 mb-4">
              Are you a ward missionary coordinator? Set up your ward's calendar today.
            </p>
            <div className="flex justify-center">
              <Button 
                size="lg" 
                onClick={() => setLocation('/auth')}
                className="flex items-center gap-2"
              >
                <ExternalLink className="h-4 w-4" />
                Get Started
              </Button>
            </div>
          </div>
        </div>
      </main>
      
      {/* Footer */}
      <footer className="bg-white mt-auto">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <div className="flex flex-col items-center justify-between md:flex-row">
            <div className="flex items-center">
              <p className="text-sm text-gray-500">&copy; {new Date().getFullYear()} Missionary Meal Calendar</p>
            </div>
            <div className="mt-4 md:mt-0">
              <div className="flex space-x-6">
                <a href="#" className="text-gray-400 hover:text-gray-500">Help</a>
                <a href="#" className="text-gray-400 hover:text-gray-500">Privacy</a>
                <a href="#" className="text-gray-400 hover:text-gray-500">Terms</a>
              </div>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}
