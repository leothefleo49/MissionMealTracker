import { useState, useEffect } from "react";
import { useLocation, useParams } from "wouter";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Calendar,
  Phone,
  User,
  ArrowLeft,
  UserPlus,
  ChevronDown,
  BarChart3,
} from "lucide-react";
import { CalendarGrid } from "@/components/calendar-grid";
import { MealBookingForm } from "@/components/meal-booking-form";
import { MissionaryContactCard } from "@/components/missionary-contact-card";
import { UpcomingMealItem } from "@/components/upcoming-meal-item";
import { MealStatistics } from "@/components/meal-statistics";
import { Label } from "@/components/ui/label";
import { useIsMobile } from "@/hooks/use-is-mobile";
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
  const [missionaryType, setMissionaryType] = useState<string>("");
  const [activeTab, setActiveTab] = useState("calendar");
  const [filterMissionaryType, setFilterMissionaryType] = useState("all");
  const [sortOrder, setSortOrder] = useState("date-asc");
  const { toast } = useToast();
  const isMobile = useIsMobile();

  // Fetch ward data by access code
  const {
    data: ward,
    isLoading: loadingWard,
    error: wardError,
  } = useQuery({
    queryKey: ["/api/wards", accessCode],
    queryFn: () =>
      fetch(`/api/wards/${accessCode}`).then((res) => {
        if (!res.ok) {
          throw new Error("Invalid ward access code");
        }
        return res.json();
      }),
    retry: false,
  });

  // Fetch missionaries for this ward
  const { data: missionaries, isLoading: loadingMissionaries } = useQuery<
    any[]
  >({
    queryKey: ["/api/wards", ward?.id, "missionaries"],
    queryFn: () =>
      fetch(`/api/wards/${ward?.id}/missionaries`).then((res) => res.json()),
    enabled: !!ward?.id,
    staleTime: 1000,
    refetchInterval: 1000,
    refetchOnWindowFocus: true,
  });

  // Set default missionary when missionaries data changes
  useEffect(() => {
    if (missionaries && missionaries.length > 0 && !missionaryType) {
      setMissionaryType(missionaries[0].id.toString());
    }
  }, [missionaries, missionaryType]);

  // Fetch upcoming meals
  const now = new Date();
  const startOfDay = new Date(now.setHours(0, 0, 0, 0));
  const sixMonthsLater = new Date(now);
  sixMonthsLater.setMonth(sixMonthsLater.getMonth() + 6);

  const { data: meals, isLoading: loadingMeals } = useQuery({
    queryKey: [
      "/api/wards",
      ward?.id,
      "meals",
      startOfDay.toISOString(),
      sixMonthsLater.toISOString(),
    ],
    queryFn: () =>
      fetch(
        `/api/meals?wardId=${
          ward?.id
        }&startDate=${startOfDay.toISOString()}&endDate=${sixMonthsLater.toISOString()}`,
      ).then((res) => res.json()),
    enabled: !!ward?.id,
    staleTime: 1000,
    refetchInterval: 1000,
    refetchOnWindowFocus: true,
  });

  // If invalid ward access code, show error
  useEffect(() => {
    if (wardError) {
      toast({
        title: "Invalid Access Link",
        description:
          "The ward access link you're using is invalid or has expired. Please contact your ward missionary coordinator.",
        variant: "destructive",
      });
    }
  }, [wardError, toast]);

  // Handle date selection
  const handleSelectDate = (date: Date) => {
    setSelectedDate(date);
  };

  // Handle missionary selection
  const handleMissionaryTypeChange = (value: string) => {
    setMissionaryType(value);
    setSelectedDate(null); // Reset selected date when changing missionary
  };

  // Check if selected missionary is already booked for selected date
  const isMissionaryBookedForDate = (
    missionaryId: string,
    date: Date | null,
  ): boolean => {
    if (!date || !meals || !missionaryId) return false;

    const dateString = date.toISOString().split("T")[0];
    return meals.some(
      (meal: any) =>
        meal.missionaryId.toString() === missionaryId &&
        meal.date.split("T")[0] === dateString &&
        !meal.cancelled,
    );
  };

  const selectedMissionaryBookedForDate =
    selectedDate && missionaryType
      ? isMissionaryBookedForDate(missionaryType, selectedDate)
      : false;

  // Handle form cancellation
  const handleCancelBooking = () => {
    setSelectedDate(null);
  };

  // Handle successful booking
  const handleBookingSuccess = () => {
    setSelectedDate(null);
  };

  // Filter meals based on missionary type
  const filteredMeals = meals
    ? meals.filter((meal: any) => {
        if (filterMissionaryType === "all") return true;
        return meal.missionary.type === filterMissionaryType;
      })
    : [];

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
          <p className="text-gray-500">
            Please wait while we load your ward's meal calendar.
          </p>
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
            The ward link you're using is invalid or has expired. Please contact
            your ward missionary coordinator for the correct link.
          </p>
          <Button onClick={() => setLocation("/")}>Return to Home</Button>
        </div>
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
              <Calendar className="h-6 w-6 sm:h-8 sm:w-8 text-primary flex-shrink-0" />
              <div className="ml-1 sm:ml-2 min-w-0 flex-grow">
                <h1 className="text-sm sm:text-xl font-bold text-gray-900 truncate">
                  {isMobile
                    ? ward.name
                    : `${ward.name} - Missionary Meal Calendar`}
                </h1>
                {!isMobile && (
                  <p className="text-sm text-gray-500">
                    Schedule meals for missionaries serving in the {ward.name}
                  </p>
                )}
              </div>
            </div>
            <div className="flex space-x-1 sm:space-x-2 flex-shrink-0">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setLocation("/auth")}
                className="flex items-center text-blue-600 border-blue-200 hover:bg-blue-50 px-2 py-1"
              >
                <User className="h-3 w-3 sm:h-4 sm:w-4" />
                {isMobile ? (
                  <span className="ml-1 text-xs">Admin</span>
                ) : (
                  <span className="ml-1">Admin Login</span>
                )}
              </Button>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setLocation("/")}
                className="flex items-center px-2 py-1"
              >
                <ArrowLeft className="h-3 w-3 sm:h-4 sm:w-4" />
                {isMobile && <span className="ml-1 text-xs">Home</span>}
                {!isMobile && <span className="ml-1">Back to Home</span>}
              </Button>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-grow">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <Tabs
            defaultValue="calendar"
            value={activeTab}
            onValueChange={setActiveTab}
          >
            {/* Mobile dropdown navigation */}
            <div className="mb-8 sm:hidden">
              <Select value={activeTab} onValueChange={setActiveTab}>
                <SelectTrigger className="w-full p-3 bg-white border border-gray-200 rounded-md [&>svg]:hidden">
                  <div className="flex items-center w-full">
                    {activeTab === "calendar" && (
                      <Calendar className="w-4 h-4 mr-2 text-black" />
                    )}
                    {activeTab === "contact" && (
                      <Phone className="w-4 h-4 mr-2 text-black" />
                    )}
                    {activeTab === "upcoming" && (
                      <User className="w-4 h-4 mr-2 text-black" />
                    )}
                    {activeTab === "statistics" && (
                      <BarChart3 className="w-4 h-4 mr-2 text-black" />
                    )}
                    <span className="flex-grow text-black">
                      {activeTab === "calendar" && "Schedule a Meal"}
                      {activeTab === "contact" && "Contact Missionaries"}
                      {activeTab === "upcoming" && "My Meals"}
                      {activeTab === "statistics" && "Meal Statistics"}
                    </span>
                    <ChevronDown className="w-4 h-4 ml-2 text-black" />
                  </div>
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="calendar">
                    <div className="flex items-center">
                      <Calendar className="w-4 h-4 mr-2" />
                      Schedule a Meal
                    </div>
                  </SelectItem>
                  <SelectItem value="contact">
                    <div className="flex items-center">
                      <Phone className="w-4 h-4 mr-2" />
                      Contact Missionaries
                    </div>
                  </SelectItem>
                  <SelectItem value="upcoming">
                    <div className="flex items-center">
                      <User className="w-4 h-4 mr-2" />
                      My Meals
                    </div>
                  </SelectItem>
                  <SelectItem value="statistics">
                    <div className="flex items-center">
                      <BarChart3 className="w-4 h-4 mr-2" />
                      Meal Statistics
                    </div>
                  </SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Desktop tab navigation */}
            <TabsList
              className="tab-list mb-8 border-b border-gray-200 w-full justify-start overflow-x-auto hidden sm:flex"
              style={{ scrollbarWidth: "none" }}
            >
              <TabsTrigger
                value="calendar"
                className="px-3 py-3 sm:py-4 text-sm sm:text-base whitespace-nowrap"
              >
                <Calendar className="w-4 h-4 mr-2" />
                Schedule a Meal
              </TabsTrigger>
              <TabsTrigger
                value="contact"
                className="px-3 py-3 sm:py-4 text-sm sm:text-base whitespace-nowrap"
              >
                <Phone className="w-4 h-4 mr-2" />
                Contact Missionaries
              </TabsTrigger>
              <TabsTrigger
                value="upcoming"
                className="px-3 py-3 sm:py-4 text-sm sm:text-base whitespace-nowrap"
              >
                <User className="w-4 h-4 mr-2" />
                My Meals
              </TabsTrigger>
              <TabsTrigger
                value="statistics"
                className="px-3 py-3 sm:py-4 text-sm sm:text-base whitespace-nowrap"
              >
                <BarChart3 className="w-4 h-4 mr-2" />
                Meal Statistics
              </TabsTrigger>
            </TabsList>

            <TabsContent value="calendar">
              <div className="mb-6">
                <h2 className="text-lg font-medium text-gray-900 mb-2">
                  Schedule a Missionary Meal
                </h2>
                <p className="text-sm text-gray-600">
                  Select a date to schedule a meal for the missionaries. You can
                  schedule meals up to 3 months in advance.
                </p>
              </div>

              {/* Missionary Selection */}
              <div className="mb-6">
                <div className="flex flex-col lg:flex-row space-y-4 lg:space-y-0 lg:space-x-4">
                  <div className="flex-1">
                    <Label className="block text-sm font-medium text-gray-700 mb-1">
                      Select Missionaries
                    </Label>
                    {loadingMissionaries ? (
                      <div className="h-10 flex items-center">
                        <span className="text-sm text-gray-500">
                          Loading missionaries...
                        </span>
                      </div>
                    ) : missionaries && missionaries.length > 0 ? (
                      <div className="missionary-select-grid grid grid-cols-1 gap-2 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5">
                        {missionaries.map((missionary: any, index: number) => {
                          const isSelected =
                            missionaryType === missionary.id.toString();
                          const setNumber = (index % 5) + 1;
                          const setColors = {
                            1: {
                              bg: "bg-blue-500",
                              border: "border-blue-500",
                              text: "text-blue-700",
                            },
                            2: {
                              bg: "bg-amber-500",
                              border: "border-amber-500",
                              text: "text-amber-700",
                            },
                            3: {
                              bg: "bg-green-500",
                              border: "border-green-500",
                              text: "text-green-700",
                            },
                            4: {
                              bg: "bg-pink-500",
                              border: "border-pink-500",
                              text: "text-pink-700",
                            },
                            5: {
                              bg: "bg-purple-500",
                              border: "border-purple-500",
                              text: "text-purple-700",
                            },
                          };
                          const colors =
                            setColors[setNumber as keyof typeof setColors];

                          return (
                            <Button
                              key={missionary.id}
                              type="button"
                              variant={isSelected ? "default" : "outline"}
                              className={`missionary-select-button py-2 flex justify-center items-center text-sm ${
                                isSelected
                                  ? `${colors.bg} text-white hover:${colors.bg}/90`
                                  : `border ${colors.border} ${colors.text} hover:bg-gray-50`
                              }`}
                              onClick={() =>
                                handleMissionaryTypeChange(
                                  missionary.id.toString(),
                                )
                              }
                            >
                              <User className="h-4 w-4 mr-1" />
                              <span className="truncate">{missionary.name}</span>
                            </Button>
                          );
                        })}
                      </div>
                    ) : (
                      <div className="h-10 flex items-center">
                        <span className="text-sm text-gray-500">
                          No missionaries available
                        </span>
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
                          {new Date().toLocaleDateString("default", {
                            month: "long",
                          })}{" "}
                          {new Date().getFullYear()}
                        </SelectItem>
                        <SelectItem value="next1">
                          {new Date(
                            new Date().getFullYear(),
                            new Date().getMonth() + 1,
                          ).toLocaleDateString("default", { month: "long" })}{" "}
                          {new Date(
                            new Date().getFullYear(),
                            new Date().getMonth() + 1,
                          ).getFullYear()}
                        </SelectItem>
                        <SelectItem value="next2">
                          {new Date(
                            new Date().getFullYear(),
                            new Date().getMonth() + 2,
                          ).toLocaleDateString("default", { month: "long" })}{" "}
                          {new Date(
                            new Date().getFullYear(),
                            new Date().getMonth() + 2,
                          ).getFullYear()}
                        </SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              </div>

              {/* Legend - Dynamic based on missionaries available */}
              <div className="mb-4 flex flex-wrap gap-4 text-sm">
                <div className="flex items-center">
                  <div className="w-4 h-4 mr-1 bg-white border border-gray-300 rounded"></div>
                  <span>Available</span>
                </div>

                {missionaries &&
                  missionaries.length > 0 &&
                  missionaries.map((missionary: any, index: number) => {
                    const setNumber = (index % 5) + 1;
                    const setColors = {
                      1: {
                        bg: "bg-blue-100",
                        border: "border-blue-500",
                        text: "text-blue-700",
                      },
                      2: {
                        bg: "bg-amber-100",
                        border: "border-amber-500",
                        text: "text-amber-700",
                      },
                      3: {
                        bg: "bg-green-100",
                        border: "border-green-500",
                        text: "text-green-700",
                      },
                      4: {
                        bg: "bg-pink-100",
                        border: "border-pink-500",
                        text: "text-pink-700",
                      },
                      5: {
                        bg: "bg-purple-100",
                        border: "border-purple-500",
                        text: "text-purple-700",
                      },
                    };
                    const colors =
                      setColors[setNumber as keyof typeof setColors];

                    return (
                      <div key={missionary.id} className="flex items-center">
                        <div
                          className={`w-4 h-4 mr-1 ${colors.bg} border ${colors.border} rounded`}
                        ></div>
                        <span className={colors.text}>{missionary.name}</span>
                      </div>
                    );
                  })}
              </div>

              {/* Calendar */}
              <CalendarGrid
                onSelectDate={handleSelectDate}
                selectedDate={selectedDate}
                missionaryType={missionaryType}
                wardId={ward?.id}
                autoSelectNextAvailable={true}
              />

              {/* Booking Form (shown when date is selected) */}
              {selectedDate && ward && (
                selectedMissionaryBookedForDate ? (
                  <div className="mt-6 bg-yellow-50 border border-yellow-200 rounded-lg p-4">
                    <div className="flex items-start">
                      <div className="flex-shrink-0">
                        <svg
                          className="h-5 w-5 text-yellow-400"
                          viewBox="0 0 20 20"
                          fill="currentColor"
                        >
                          <path
                            fillRule="evenodd"
                            d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z"
                            clipRule="evenodd"
                          />
                        </svg>
                      </div>
                      <div className="ml-3">
                        <h3 className="text-sm font-medium text-yellow-800">
                          Missionary Already Booked
                        </h3>
                        <div className="mt-2 text-sm text-yellow-700">
                          <p>
                            {missionaries?.find(
                              (m) => m.id.toString() === missionaryType,
                            )?.name || "This missionary"}{" "}
                            is already booked for a meal on{" "}
                            {selectedDate.toLocaleDateString()}. Please select a
                            different date or choose another missionary.
                          </p>
                        </div>
                        <div className="mt-3">
                          <button
                            onClick={() => setSelectedDate(null)}
                            className="text-sm bg-yellow-100 text-yellow-800 px-3 py-1 rounded-md hover:bg-yellow-200"
                          >
                            Select Different Date
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>
                ) : (
                  <MealBookingForm
                    selectedDate={selectedDate}
                    missionaryType={missionaryType}
                    wardId={ward.id}
                    onCancel={handleCancelBooking}
                    onSuccess={handleBookingSuccess}
                  />
                )
              )}
            </TabsContent>

            <TabsContent value="contact">
              <div className="mb-6">
                <h2 className="text-lg font-medium text-gray-900 mb-2">
                  Contact Missionaries
                </h2>
                <p className="text-sm text-gray-600">
                  Here you can find contact information for the missionaries
                  serving in {ward.name}.
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
                <h2 className="text-lg font-medium text-gray-900 mb-2">
                  Your Upcoming Scheduled Meals
                </h2>
                <p className="text-sm text-gray-600">
                  View and manage your scheduled meals with missionaries.
                </p>
              </div>

              {/* Filter Controls */}
              <div className="mb-6 flex flex-col sm:flex-row sm:items-center space-y-4 sm:space-y-0 sm:space-x-4">
                <div className="sm:w-64">
                  <Label
                    htmlFor="filter-missionary"
                    className="block text-sm font-medium text-gray-700 mb-1"
                  >
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
                      {/* Dynamically create filter options based on available missionary types */}
                      {missionaries &&
                        missionaries.length > 0 &&
                        (() => {
                          const missionaryTypes = new Map();
                          missionaries.forEach((missionary: any) => {
                            if (!missionaryTypes.has(missionary.type)) {
                              missionaryTypes.set(
                                missionary.type,
                                missionary.name,
                              );
                            }
                          });

                          return Array.from(missionaryTypes.entries()).map(
                            ([type, name]) => (
                              <SelectItem key={type} value={type}>
                                {name} Only
                              </SelectItem>
                            ),
                          );
                        })()}
                    </SelectContent>
                  </Select>
                </div>
                <div className="sm:w-64">
                  <Label
                    htmlFor="sort-meals"
                    className="block text-sm font-medium text-gray-700 mb-1"
                  >
                    Sort By
                  </Label>
                  <Select value={sortOrder} onValueChange={setSortOrder}>
                    <SelectTrigger id="sort-meals">
                      <SelectValue placeholder="Select sort order" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="date-asc">
                        Date (Soonest First)
                      </SelectItem>
                      <SelectItem value="date-desc">
                        Date (Latest First)
                      </SelectItem>
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
                    No upcoming meals scheduled. Go to the calendar tab to
                    schedule a meal.
                  </div>
                )}
              </div>
            </TabsContent>

            <TabsContent value="statistics">
              <div className="mb-6">
                <h2 className="text-lg font-medium text-gray-900 mb-2">
                  Meal Statistics & Trends
                </h2>
                <p className="text-sm text-gray-600">
                  View comprehensive meal data, missionary frequency, and trends
                  for your ward.
                </p>
              </div>

              {ward?.id && <MealStatistics wardId={ward.id} />}
            </TabsContent>
          </Tabs>
        </div>
      </main>

      {/* Footer */}
      <footer className="bg-white mt-auto">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <div className="flex flex-col items-center justify-between md:flex-row">
            <div className="flex items-center">
              <p className="text-sm text-gray-500">
                &copy; {new Date().getFullYear()} {ward?.name} - Missionary Meal
                Calendar
              </p>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}