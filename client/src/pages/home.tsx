import { useState } from "react";
import { useLocation } from "wouter";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Calendar, Phone, User } from "lucide-react";
import { CalendarGrid } from "@/components/calendar-grid";
import { MealBookingForm } from "@/components/meal-booking-form";
import { MissionaryContactCard } from "@/components/missionary-contact-card";
import { UpcomingMealItem } from "@/components/upcoming-meal-item";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useQuery } from "@tanstack/react-query";
import { Separator } from "@/components/ui/separator";
import { Button } from "@/components/ui/button";

export default function Home() {
  const [, setLocation] = useLocation();
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);
  const [missionaryType, setMissionaryType] = useState<"elders" | "sisters">("elders");
  const [activeTab, setActiveTab] = useState("calendar");
  const [filterMissionaryType, setFilterMissionaryType] = useState("all");
  const [sortOrder, setSortOrder] = useState("date-asc");
  
  // Fetch missionaries
  const { data: missionaries } = useQuery({
    queryKey: ['/api/missionaries'],
  });
  
  // Fetch upcoming meals
  const now = new Date();
  const startOfDay = new Date(now.setHours(0, 0, 0, 0));
  const sixMonthsLater = new Date(now);
  sixMonthsLater.setMonth(sixMonthsLater.getMonth() + 6);
  
  const { data: meals, isLoading: loadingMeals } = useQuery({
    queryKey: ['/api/meals', startOfDay.toISOString(), sixMonthsLater.toISOString()],
    queryFn: () => fetch(
      `/api/meals?startDate=${startOfDay.toISOString()}&endDate=${sixMonthsLater.toISOString()}`
    ).then(res => res.json())
  });
  
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
  const sortedMeals = [...filteredMeals].sort((a: any, b: any) => {
    const dateA = new Date(a.date);
    const dateB = new Date(b.date);
    
    if (sortOrder === "date-asc") {
      return dateA.getTime() - dateB.getTime();
    } else {
      return dateB.getTime() - dateA.getTime();
    }
  });
  
  return (
    <div className="min-h-screen flex flex-col bg-gray-50">
      {/* Header */}
      <header className="bg-white shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex justify-between items-center">
            <div className="flex items-center">
              <Calendar className="h-8 w-8 text-primary" />
              <h1 className="ml-2 text-xl font-bold text-gray-900">Missionary Meal Calendar</h1>
            </div>
            <div className="hidden md:flex space-x-2">
              <Button variant="ghost" onClick={() => window.open('#', '_blank')}>
                Help
              </Button>
              <Button variant="ghost" onClick={() => setLocation('/admin')}>
                Admin Login
              </Button>
            </div>
            {/* Mobile menu button would go here */}
          </div>
        </div>
      </header>
      
      {/* Main Content */}
      <main className="flex-grow">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <Tabs defaultValue="calendar" value={activeTab} onValueChange={setActiveTab}>
            <TabsList className="mb-8 border-b border-gray-200 w-full justify-start">
              <TabsTrigger value="calendar" className="px-1 py-4">
                Schedule a Meal
              </TabsTrigger>
              <TabsTrigger value="contact" className="px-1 py-4">
                Contact Missionaries
              </TabsTrigger>
              <TabsTrigger value="upcoming" className="px-1 py-4">
                Upcoming Meals
              </TabsTrigger>
            </TabsList>
            
            <TabsContent value="calendar">
              <div className="mb-6">
                <h2 className="text-lg font-medium text-gray-900 mb-2">Schedule a Missionary Meal</h2>
                <p className="text-sm text-gray-600">
                  Select a date to schedule a meal for the missionaries. You can schedule meals up to 3 months in advance.
                </p>
              </div>
              
              {/* Missionary Selection */}
              <div className="mb-6">
                <div className="flex flex-col sm:flex-row space-y-4 sm:space-y-0 sm:space-x-4">
                  <div className="flex-1">
                    <Label className="block text-sm font-medium text-gray-700 mb-1">
                      Select Missionaries
                    </Label>
                    <RadioGroup 
                      defaultValue="elders" 
                      value={missionaryType} 
                      onValueChange={(value) => handleMissionaryTypeChange(value as "elders" | "sisters")}
                      className="flex space-x-4"
                    >
                      <div className="flex items-center space-x-2">
                        <RadioGroupItem value="elders" id="elders" />
                        <Label htmlFor="elders" className="text-sm text-gray-700">Elders</Label>
                      </div>
                      <div className="flex items-center space-x-2">
                        <RadioGroupItem value="sisters" id="sisters" />
                        <Label htmlFor="sisters" className="text-sm text-gray-700">Sisters</Label>
                      </div>
                    </RadioGroup>
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
              {selectedDate && (
                <MealBookingForm
                  selectedDate={selectedDate}
                  missionaryType={missionaryType}
                  onCancel={handleCancelBooking}
                  onSuccess={handleBookingSuccess}
                />
              )}
              
              <style jsx>{`
                .missionary-booked-elders {
                  background-color: rgba(59, 130, 246, 0.1);
                  border: 1px solid #3b82f6;
                }
                .missionary-booked-sisters {
                  background-color: rgba(245, 158, 11, 0.1);
                  border: 1px solid #f59e0b;
                }
                .missionary-booked-both {
                  background: linear-gradient(135deg, 
                            rgba(59, 130, 246, 0.1) 0%, 
                            rgba(59, 130, 246, 0.1) 50%, 
                            rgba(245, 158, 11, 0.1) 50%, 
                            rgba(245, 158, 11, 0.1) 100%);
                  border: 1px dashed #94a3b8;
                }
              `}</style>
            </TabsContent>
            
            <TabsContent value="contact">
              <div className="mb-6">
                <h2 className="text-lg font-medium text-gray-900 mb-2">Contact Missionaries</h2>
                <p className="text-sm text-gray-600">
                  Here you can find contact information for the missionaries serving in our area.
                </p>
              </div>
              
              <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-2">
                {missionaries && missionaries.map((missionary: any) => (
                  <MissionaryContactCard
                    key={missionary.id}
                    name={missionary.name}
                    type={missionary.type}
                    phoneNumber={missionary.phoneNumber}
                    messengerAccount={missionary.messengerAccount}
                  />
                ))}
              </div>
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
      <footer className="bg-white">
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
