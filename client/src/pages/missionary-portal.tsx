import { useState } from "react";
import { useLocation } from "wouter";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ArrowLeft, Calendar, User, Bell } from "lucide-react";
import { MissionaryUpcomingMeals } from "@/components/missionary-upcoming-meals";
import { useQuery } from "@tanstack/react-query";
import { CalendarGrid } from "@/components/calendar-grid";
import { useIsMobile } from "@/hooks/use-mobile";

export default function MissionaryPortal() {
  const [, setLocation] = useLocation();
  const [activeTab, setActiveTab] = useState("upcoming");
  const [missionaryType, setMissionaryType] = useState<"elders" | "sisters">("elders");
  const isMobile = useIsMobile();
  
  // Fetch missionaries data
  const { data: missionaries } = useQuery<any[]>({
    queryKey: ['/api/missionaries'],
  });
  
  // Get missionary ID based on type
  const missionary = missionaries?.find(m => m.type === missionaryType);
  const missionaryId = missionary?.id;

  return (
    <div className="min-h-screen flex flex-col bg-gray-50">
      {/* Header */}
      <header className="bg-white shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex justify-between items-center">
            <div className="flex items-center">
              <Bell className="h-8 w-8 text-primary flex-shrink-0" />
              <h1 className="ml-2 text-xl font-bold text-gray-900 truncate">
                Missionary Portal
              </h1>
            </div>
            <Button 
              variant="ghost" 
              className="flex items-center"
              onClick={() => setLocation('/')}
            >
              <ArrowLeft className="mr-2 h-4 w-4" />
              Back to Calendar
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
              {/* Missionary Type Selector */}
              <div className="mb-6 flex justify-center">
                <div className="grid grid-cols-2 gap-4 sm:flex sm:gap-2 max-w-xs w-full">
                  <Button
                    variant={missionaryType === "elders" ? "default" : "outline"}
                    onClick={() => setMissionaryType("elders")}
                    className="w-full"
                  >
                    <User className="mr-2 h-4 w-4" />
                    Elders
                  </Button>
                  <Button
                    variant={missionaryType === "sisters" ? "default" : "outline"}
                    className={`w-full ${missionaryType === "sisters" ? "bg-amber-500 hover:bg-amber-600" : ""}`}
                    onClick={() => setMissionaryType("sisters")}
                  >
                    <User className="mr-2 h-4 w-4" />
                    Sisters
                  </Button>
                </div>
              </div>
              
              <Tabs defaultValue={activeTab} value={activeTab} onValueChange={setActiveTab}>
                <TabsList className="mb-6 w-full grid grid-cols-2">
                  <TabsTrigger value="upcoming">
                    <Bell className="mr-2 h-4 w-4" />
                    Upcoming Meals
                  </TabsTrigger>
                  <TabsTrigger value="calendar">
                    <Calendar className="mr-2 h-4 w-4" />
                    Calendar View
                  </TabsTrigger>
                </TabsList>
                
                <TabsContent value="upcoming">
                  <MissionaryUpcomingMeals 
                    missionaryId={missionaryId} 
                    missionaryType={missionaryType} 
                  />
                </TabsContent>
                
                <TabsContent value="calendar">
                  <div className="space-y-4">
                    <div>
                      <h2 className="text-xl font-semibold mb-2">Calendar Overview</h2>
                      <p className="text-sm text-gray-500">
                        View all scheduled meals on the calendar. The highlighted dates show when you have meal appointments.
                      </p>
                    </div>
                    
                    <CalendarGrid
                      missionaryType={missionaryType}
                      onSelectDate={() => {}}
                      selectedDate={null}
                    />
                    
                    <div className="mt-4 p-4 bg-blue-50 rounded-md border border-blue-100">
                      <p className="text-sm text-blue-700">
                        <strong>Note:</strong> This is a view-only calendar. Contact the ward meal coordinator if you need to make changes to your schedule.
                      </p>
                    </div>
                  </div>
                </TabsContent>
              </Tabs>
            </CardContent>
          </Card>
        </div>
      </main>
      
      {/* Footer */}
      <footer className="bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <div className="flex flex-col items-center justify-between md:flex-row">
            <div className="flex items-center">
              <p className="text-sm text-gray-500">&copy; {new Date().getFullYear()} Missionary Meal Calendar</p>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}