import { useState, useEffect } from "react";
import { useLocation, useParams } from "wouter";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Calendar, Phone, User, ArrowLeft, UserPlus } from "lucide-react";
import { CalendarGrid } from "@/components/calendar-grid";
import { MealBookingForm } from "@/components/meal-booking-form";
import { MissionaryContactCard } from "@/components/missionary-contact-card";
import { UpcomingMealItem } from "@/components/upcoming-meal-item";
import { Label } from "@/components/ui/label";
import { useIsMobile } from "@/hooks/use-mobile";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useQuery } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";

export default function WardPage() {
  const params = useParams();
  const { accessCode } = params;
  const [, setLocation] = useLocation();
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);
  const [missionaryType, setMissionaryType] = useState<"elders" | "sisters">("elders");
  const [activeTab, setActiveTab] = useState("calendar");
  const [filterMissionaryType, setFilterMissionaryType] = useState("all");
  const [sortOrder, setSortOrder] = useState("date-asc");
  const { toast } = useToast();
  const isMobile = useIsMobile();
  
  // Fetch ward data by access code
  const { data: ward, isLoading: loadingWard, error: wardError } = useQuery({
    queryKey: ['/api/wards', accessCode],
    queryFn: () => fetch(`/api/wards/${accessCode}`).then(res => {
      if (!res.ok) {
        throw new Error("Invalid ward access code");
      }
      return res.json();
    }),
    retry: false
  });
  
  // Fetch missionaries for this ward
  const { data: missionaries, isLoading: loadingMissionaries } = useQuery<any[]>({
    queryKey: ['/api/wards', ward?.id, 'missionaries'],
    enabled: !!ward?.id,
  });
  
  // Fetch upcoming meals
  const now = new Date();
  const startOfDay = new Date(now.setHours(0, 0, 0, 0));
  const sixMonthsLater = new Date(now);
  sixMonthsLater.setMonth(sixMonthsLater.getMonth() + 6);
  
  const { data: meals, isLoading: loadingMeals } = useQuery({
    queryKey: ['/api/wards', ward?.id, 'meals', startOfDay.toISOString(), sixMonthsLater.toISOString()],
    queryFn: () => fetch(
      `/api/meals?wardId=${ward?.id}&startDate=${startOfDay.toISOString()}&endDate=${sixMonthsLater.toISOString()}`
    ).then(res => res.json()),
    enabled: !!ward?.id
  });
  
  // If invalid ward access code, show error
  useEffect(() => {
    if (wardError) {
      toast({
        title: "Invalid Access Link",
        description: "The ward access link you're using is invalid or has expired. Please contact your ward missionary coordinator.",
        variant: "destructive"
      });
    }
  }, [wardError, toast]);
  
  // Handle date selection
  const handleSelectDate = (date: Date) => {
    setSelectedDate(date);
  };
  
  // Handle missionary type selection
  const handleMissionaryTypeChange = (value: "elders" | "sisters") => {
    setMissionaryType(value);
    setSelectedDate(null); // Reset selected date when changing missionary type
  };
  
  // Handle form cancellation
  const handleCancelBooking = () => {
    setSelectedDate(null);
  };
  
  // Handle successful booking
  const handleBookingSuccess = () => {
    setSelectedDate(null);
  };
  
  // Filter meals based on missionary type
  const filteredMeals = meals ? meals.filter((meal: any) => {
    if (filterMissionaryType === "all") return true;
    return meal.missionary.type === filterMissionaryType;
  }) : [];
  
  // Sort meals
  const sortedMeals = [...(filteredMeals || [])].sort((a: any, b: any) => {
    const dateA = new Date(a.date);
    const dateB = new Date(b.date);
    
    if (sortOrder === "date-asc") {
      return dateA.getTime() - dateB.getTime();
    } else {
      return dateB.getTime() - dateA.getTime();
    }
  });

  // If ward doesn't exist or is loading
  if (loadingWard) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-gray-50">
        <div className="text-center">
          <Calendar className="h-12 w-12 text-primary mx-auto mb-4" />
          <h1 className="text-xl font-bold mb-2">Loading Ward Calendar...</h1>
          <p className="text-gray-500">Please wait while we load your ward's meal calendar.</p>
        </div>
      </div>
    );
  }

  if (wardError || !ward) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-gray-50">
        <div className="text-center max-w-md mx-auto">
          <Calendar className="h-12 w-12 text-red-500 mx-auto mb-4" />
          <h1 className="text-xl font-bold mb-2">Invalid Ward Link</h1>
          <p className="text-gray-500 mb-6">
            The ward link you're using is invalid or has expired. Please contact your ward missionary coordinator for the correct link.
          </p>
          <Button onClick={() => setLocation('/')}>
            Return to Home
          </Button>
        </div>
      </div>
    );
  }
  
  return (
    <div className="min-h-screen flex flex-col bg-gray-50">
      {/* Header */}
      <header className="bg-white shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex justify-between items-center">
            <div className="flex items-center">
              <Calendar className="h-8 w-8 text-primary flex-shrink-0" />
              <div className="ml-2">
                <h1 className="text-xl font-bold text-gray-900 truncate">
                  {ward.name} - Missionary Meal Calendar
                </h1>
                {!isMobile && (
                  <p className="text-sm text-gray-500">
                    Schedule meals for missionaries serving in the {ward.name}
                  </p>
                )}
              </div>
            </div>
            <div className="flex space-x-2">
              <Button 
                variant="outline" 
                size={isMobile ? "sm" : "default"}
                onClick={() => setLocation(`/ward/${accessCode}/missionary-portal`)}
                className="flex items-center"
              >
                <UserPlus className="h-4 w-4 mr-1" />
                {isMobile ? "Portal" : "Missionary Portal"}
              </Button>
              <Button 
                variant="ghost" 
                size={isMobile ? "sm" : "default"}
                onClick={() => setLocation('/')}
                className="flex items-center"
              >
                <ArrowLeft className="h-4 w-4 mr-1" />
                {isMobile ? "Home" : "Back to Home"}
              </Button>
            </div>
          </div>
        </div>
      </header>
      
      {/* Main Content */}
      <main className="flex-grow">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <Tabs defaultValue="calendar" value={activeTab} onValueChange={setActiveTab}>
            <TabsList className="mb-8 border-b border-gray-200 w-full justify-start overflow-x-auto" style={{ scrollbarWidth: 'none' }}>
              <TabsTrigger value="calendar" className="px-1 py-3 sm:py-4 text-sm sm:text-base whitespace-nowrap">
                <Calendar className="w-4 h-4 mr-1 inline md:hidden" />
                Schedule a Meal
              </TabsTrigger>
              <TabsTrigger value="contact" className="px-1 py-3 sm:py-4 text-sm sm:text-base whitespace-nowrap">
                <Phone className="w-4 h-4 mr-1 inline md:hidden" />
                Contact Missionaries
              </TabsTrigger>
              <TabsTrigger value="upcoming" className="px-1 py-3 sm:py-4 text-sm sm:text-base whitespace-nowrap">
                <User className="w-4 h-4 mr-1 inline md:hidden" />
                My Meals
              </TabsTrigger>
            </TabsList>
            
            <TabsContent value="calendar">
              <div className="mb-6">
                <h2 className="text-lg font-medium text-gray-900 mb-2">Schedule a Missionary Meal</h2>
                <p className="text-sm text-gray-600">
                  Select a date to schedule a meal for the missionaries. You can schedule meals up to 6 months in advance.
                </p>
              </div>
              
              {/* Missionary Selection */}
              <div className="mb-6">
                <div className="flex flex-col sm:flex-row space-y-4 sm:space-y-0 sm:space-x-4">
                  <div className="flex-1">
                    <Label className="block text-sm font-medium text-gray-700 mb-1">
                      Select Missionaries
                    </Label>
                    {loadingMissionaries ? (
                      <div className="h-10 flex items-center">
                        <span className="text-sm text-gray-500">Loading missionaries...</span>
                      </div>
                    ) : missionaries && missionaries.length > 0 ? (
                      <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 md:grid-cols-4">
                        {missionaries.map((missionary: any) => (
                          <Button
                            key={missionary.id}
                            type="button"
                            variant={missionaryType === missionary.id.toString() ? "default" : "outline"}
                            className={`py-2 flex justify-center items-center ${
                              missionaryType === missionary.id.toString() 
                                ? missionary.type === "sisters" ? "bg-amber-500 text-white" : "bg-primary text-white" 
                                : "border border-gray-300"
                            }`}
                            onClick={() => handleMissionaryTypeChange(missionary.id.toString())}
                          >
                            <User className="h-4 w-4 mr-2" />
                            <span>{missionary.name}</span>
                          </Button>
                        ))}
                      </div>
                    ) : (
                      <div className="h-10 flex items-center">
                        <span className="text-sm text-gray-500">No missionaries available</span>
                      </div>
                    )}
                  </div>
                  <div className="flex-1">
                    <Label className="block text-sm font-medium text-gray-700 mb-1">
                      Calendar View
                    </Label>
                    <Select defaultValue="current">
                      <SelectTrigger>
                        <SelectValue placeholder="Select months" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="current">
                          {new Date().toLocaleDateString('default', { month: 'long' })} - {new Date(new Date().setMonth(new Date().getMonth() + 5)).toLocaleDateString('default', { month: 'long' })} {new Date().getFullYear()}
                        </SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              </div>
              
              {/* Legend */}
              <div className="mb-4 flex flex-wrap gap-4 text-sm">
                <div className="flex items-center">
                  <div className="w-4 h-4 mr-1 bg-white border border-gray-300 rounded"></div>
                  <span>Available</span>
                </div>
                <div className="flex items-center">
                  <div className="w-4 h-4 mr-1 missionary-booked-elders rounded"></div>
                  <span>Elders Booked</span>
                </div>
                <div className="flex items-center">
                  <div className="w-4 h-4 mr-1 missionary-booked-sisters rounded"></div>
                  <span>Sisters Booked</span>
                </div>
                <div className="flex items-center">
                  <div className="w-4 h-4 mr-1 missionary-booked-both rounded"></div>
                  <span>Both Booked (Different Locations)</span>
                </div>
              </div>
              
              {/* Calendar */}
              <CalendarGrid 
                onSelectDate={handleSelectDate}
                selectedDate={selectedDate}
                missionaryType={missionaryType}
              />
              
              {/* Booking Form (shown when date is selected) */}
              {selectedDate && ward && (
                <MealBookingForm
                  selectedDate={selectedDate}
                  missionaryType={missionaryType}
                  wardId={ward.id}
                  onCancel={handleCancelBooking}
                  onSuccess={handleBookingSuccess}
                />
              )}
            </TabsContent>
            
            <TabsContent value="contact">
              <div className="mb-6">
                <h2 className="text-lg font-medium text-gray-900 mb-2">Contact Missionaries</h2>
                <p className="text-sm text-gray-600">
                  Here you can find contact information for the missionaries serving in {ward.name}.
                </p>
              </div>
              
              {loadingMissionaries ? (
                <div className="text-center py-8">
                  <p>Loading missionary information...</p>
                </div>
              ) : missionaries && missionaries.length > 0 ? (
                <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-2">
                  {missionaries.map((missionary: any) => (
                    <MissionaryContactCard
                      key={missionary.id}
                      name={missionary.name}
                      type={missionary.type}
                      phoneNumber={missionary.phoneNumber}
                      messengerAccount={missionary.messengerAccount}
                    />
                  ))}
                </div>
              ) : (
                <div className="text-center py-8">
                  <p>No active missionaries found for this ward.</p>
                </div>
              )}
            </TabsContent>
            
            <TabsContent value="upcoming">
              <div className="mb-6">
                <h2 className="text-lg font-medium text-gray-900 mb-2">Your Upcoming Scheduled Meals</h2>
                <p className="text-sm text-gray-600">
                  View and manage your scheduled meals with missionaries.
                </p>
              </div>
              
              {/* Filter Controls */}
              <div className="mb-6 flex flex-col sm:flex-row sm:items-center space-y-4 sm:space-y-0 sm:space-x-4">
                <div className="sm:w-64">
                  <Label htmlFor="filter-missionary" className="block text-sm font-medium text-gray-700 mb-1">
                    Filter By
                  </Label>
                  <Select 
                    value={filterMissionaryType} 
                    onValueChange={setFilterMissionaryType}
                  >
                    <SelectTrigger id="filter-missionary">
                      <SelectValue placeholder="Select filter" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Missionaries</SelectItem>
                      <SelectItem value="elders">Elders Only</SelectItem>
                      <SelectItem value="sisters">Sisters Only</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="sm:w-64">
                  <Label htmlFor="sort-meals" className="block text-sm font-medium text-gray-700 mb-1">
                    Sort By
                  </Label>
                  <Select 
                    value={sortOrder} 
                    onValueChange={setSortOrder}
                  >
                    <SelectTrigger id="sort-meals">
                      <SelectValue placeholder="Select sort order" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="date-asc">Date (Soonest First)</SelectItem>
                      <SelectItem value="date-desc">Date (Latest First)</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              
              {/* Upcoming Meals List */}
              <div className="bg-white shadow-sm rounded-lg border border-gray-200 overflow-hidden">
                {loadingMeals ? (
                  <div className="p-6 text-center">Loading upcoming meals...</div>
                ) : sortedMeals.length > 0 ? (
                  <ul className="divide-y divide-gray-200">
                    {sortedMeals.map((meal: any) => (
                      <li key={meal.id}>
                        <UpcomingMealItem
                          id={meal.id}
                          date={meal.date}
                          startTime={meal.startTime}
                          hostName={meal.hostName}
                          hostPhone={meal.hostPhone}
                          mealDescription={meal.mealDescription}
                          missionaryType={meal.missionary.type}
                        />
                      </li>
                    ))}
                  </ul>
                ) : (
                  <div className="p-6 text-center text-gray-500">
                    No upcoming meals scheduled. Go to the calendar tab to schedule a meal.
                  </div>
                )}
              </div>
            </TabsContent>
          </Tabs>
        </div>
      </main>
      
      {/* Footer */}
      <footer className="bg-white mt-auto">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <div className="flex flex-col items-center justify-between md:flex-row">
            <div className="flex items-center">
              <p className="text-sm text-gray-500">&copy; {new Date().getFullYear()} {ward.name} - Missionary Meal Calendar</p>
            </div>
            {/* Footer links removed */}
          </div>
        </div>
      </footer>
    </div>
  );
}