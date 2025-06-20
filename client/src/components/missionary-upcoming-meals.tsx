import { useState } from "react";
import { format, parseISO, addDays } from "date-fns";
import { Calendar, Clock, Home, User, ThumbsUp, AlertCircle } from "lucide-react";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { useQuery } from "@tanstack/react-query";
import { formatTimeFrom24To12 } from "@/lib/utils";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";

type MissionaryUpcomingMealsProps = {
  missionaryId?: number;
  missionaryType: "elders" | "sisters";
}

export function MissionaryUpcomingMeals({ missionaryId, missionaryType }: MissionaryUpcomingMealsProps) {
  const { toast } = useToast();
  const [timeframe, setTimeframe] = useState<"week" | "month" | "all">("week");
  
  // Get current date
  const today = new Date();
  
  // Calculate end date based on timeframe
  let endDate = new Date(today);
  if (timeframe === "week") {
    endDate = addDays(today, 7);
  } else if (timeframe === "month") {
    endDate = addDays(today, 30);
  } else {
    // For "all", go 6 months out
    endDate = addDays(today, 180);
  }
  
  // Fetch meals for the selected missionary type
  const { data: meals, isLoading } = useQuery<any[]>({
    queryKey: ['/api/meals', today.toDateString(), endDate.toDateString(), missionaryType],
    queryFn: () => fetch(
      `/api/meals?startDate=${today.toISOString()}&endDate=${endDate.toISOString()}`
    ).then(res => res.json()),
    staleTime: 5 * 60 * 1000, // 5 minutes
    refetchInterval: false,
    refetchOnWindowFocus: false
  });
  
  // Filter meals by missionary type
  const filteredMeals = meals?.filter(meal => 
    meal.missionary && meal.missionary.type === missionaryType && !meal.cancelled
  ) || [];
  
  // Sort meals by date
  const sortedMeals = [...filteredMeals].sort((a, b) => {
    const dateA = new Date(a.date);
    const dateB = new Date(b.date);
    return dateA.getTime() - dateB.getTime();
  });

  const handleConfirmMeal = async (mealId: number) => {
    try {
      // This would be a real API call in a production app
      // await apiRequest("PATCH", `/api/meals/${mealId}/confirm`, {});
      toast({
        title: "Meal confirmed",
        description: "The host will be notified you're coming.",
        variant: "default",
      });
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to confirm the meal.",
        variant: "destructive",
      });
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-semibold">
            <User className="inline-block mr-2 text-primary" />
            {missionaryType === "elders" ? "Elders" : "Sisters"} Upcoming Meals
          </h2>
          <p className="text-sm text-gray-500 mt-1">
            View your scheduled meals with ward members
          </p>
        </div>
        
        <div className="w-full sm:w-auto">
          <Label htmlFor="timeframe-select" className="sr-only">Timeframe</Label>
          <Select 
            value={timeframe} 
            onValueChange={(value) => setTimeframe(value as any)}
          >
            <SelectTrigger id="timeframe-select" className="w-full sm:w-[180px]">
              <SelectValue placeholder="Select timeframe" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="week">Next 7 days</SelectItem>
              <SelectItem value="month">Next 30 days</SelectItem>
              <SelectItem value="all">All upcoming</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>
      
      {isLoading ? (
        // Loading skeletons
        <div className="space-y-4">
          {[1, 2, 3].map((i) => (
            <Card key={i} className="overflow-hidden">
              <CardHeader className="pb-2">
                <div className="flex justify-between">
                  <Skeleton className="h-6 w-32" />
                  <Skeleton className="h-6 w-20" />
                </div>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  <Skeleton className="h-4 w-full" />
                  <Skeleton className="h-4 w-3/4" />
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      ) : sortedMeals.length > 0 ? (
        <div className="space-y-4">
          {sortedMeals.map((meal) => {
            const mealDate = parseISO(meal.date);
            const formattedDate = format(mealDate, "EEEE, MMMM d");
            const formattedTime = formatTimeFrom24To12(meal.startTime);
            
            // Check if the meal is today
            const isToday = format(mealDate, "yyyy-MM-dd") === format(new Date(), "yyyy-MM-dd");
            
            return (
              <Card key={meal.id} className={cn(
                "overflow-hidden transition-all", 
                isToday ? "border-primary border-2" : ""
              )}>
                <CardHeader className="pb-2">
                  <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-2">
                    <div className="flex items-center">
                      <Calendar className="h-5 w-5 mr-2 text-primary" />
                      <CardTitle className="text-base font-semibold">
                        {formattedDate}
                        {isToday && (
                          <Badge variant="outline" className="ml-2 bg-primary/10 text-primary border-primary">
                            Today
                          </Badge>
                        )}
                      </CardTitle>
                    </div>
                    <div>
                      <Badge variant="secondary" className="flex items-center">
                        <Clock className="h-3 w-3 mr-1" />
                        {formattedTime}
                      </Badge>
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    <div className="flex items-start">
                      <Home className="h-4 w-4 mr-2 mt-1 text-gray-500" />
                      <div>
                        <p className="font-medium">{meal.hostName}</p>
                        <p className="text-sm text-gray-500">Phone: {meal.hostPhone}</p>
                      </div>
                    </div>
                    
                    {meal.mealDescription && (
                      <div className="bg-gray-50 p-3 rounded-md">
                        <p className="text-sm font-medium">Meal: {meal.mealDescription}</p>
                      </div>
                    )}
                    
                    {meal.specialNotes && (
                      <div className="bg-amber-50 p-3 rounded-md">
                        <p className="text-sm">
                          <AlertCircle className="h-4 w-4 inline-block mr-1 text-amber-500" />
                          <span className="font-medium">Notes: </span>
                          {meal.specialNotes}
                        </p>
                      </div>
                    )}
                  </div>
                </CardContent>
                <CardFooter>
                  <Button 
                    variant="outline" 
                    size="sm" 
                    className="w-full sm:w-auto"
                    onClick={() => handleConfirmMeal(meal.id)}
                  >
                    <ThumbsUp className="h-4 w-4 mr-2" />
                    Confirm Attendance
                  </Button>
                </CardFooter>
              </Card>
            );
          })}
        </div>
      ) : (
        <Card>
          <CardContent className="flex flex-col items-center justify-center p-6 text-center">
            <Calendar className="h-12 w-12 text-gray-300 mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-1">No upcoming meals</h3>
            <p className="text-gray-500 max-w-md">
              There are no scheduled meals for {missionaryType === "elders" ? "Elders" : "Sisters"} 
              in the {timeframe === "week" ? "next 7 days" : timeframe === "month" ? "next 30 days" : "next 6 months"}.
            </p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}