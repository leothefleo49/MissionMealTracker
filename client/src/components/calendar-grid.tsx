import { useState, useEffect, useMemo } from "react";
import { 
  add, 
  eachDayOfInterval, 
  endOfMonth, 
  endOfWeek, 
  format, 
  getDay, 
  isEqual, 
  isSameDay, 
  isSameMonth, 
  isToday, 
  parse, 
  parseISO, 
  startOfToday, 
  startOfWeek 
} from "date-fns";
import { ChevronLeft, ChevronRight, Calendar } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn, isWithinBookingRange } from "@/lib/utils";
import { useQuery } from "@tanstack/react-query";
import { Skeleton } from "@/components/ui/skeleton";

export type MealStatus = {
  bookedMissionaries: {
    id: number;
    name: string;
    type: string;
  }[];
};

type CalendarGridProps = {
  onSelectDate: (date: Date) => void;
  selectedDate?: Date | null;
  missionaryType: string;
  startMonth?: Date;
  maxMonths?: number;
  wardId?: number;
  autoSelectNextAvailable?: boolean;
};

export function CalendarGrid({ 
  onSelectDate, 
  selectedDate, 
  missionaryType,
  startMonth = startOfToday(),
  maxMonths = 6,
  wardId,
  autoSelectNextAvailable = false
}: CalendarGridProps) {
  const today = startOfToday();
  const [currentMonth, setCurrentMonth] = useState(format(startMonth, "MMM-yyyy"));
  const firstDayCurrentMonth = parse(currentMonth, "MMM-yyyy", new Date());
  
  const days = eachDayOfInterval({
    start: startOfWeek(firstDayCurrentMonth, { weekStartsOn: 0 }),
    end: endOfWeek(endOfMonth(firstDayCurrentMonth), { weekStartsOn: 0 }),
  });
  
  function previousMonth() {
    const firstDayPrevMonth = add(firstDayCurrentMonth, { months: -1 });
    setCurrentMonth(format(firstDayPrevMonth, "MMM-yyyy"));
  }
  
  function nextMonth() {
    const firstDayNextMonth = add(firstDayCurrentMonth, { months: 1 });
    setCurrentMonth(format(firstDayNextMonth, "MMM-yyyy"));
  }
  
  // Disable previous month button if we're at the current month
  const isPrevMonthDisabled = isEqual(
    parse(currentMonth, "MMM-yyyy", new Date()).getMonth(),
    today.getMonth()
  ) && parse(currentMonth, "MMM-yyyy", new Date()).getFullYear() === today.getFullYear();
  
  // Allow calendar navigation up to 3 months ahead
  const maxMonthsAhead = 3;
  const isNextMonthDisabled = isEqual(
    parse(currentMonth, "MMM-yyyy", new Date()).getMonth(),
    add(today, { months: maxMonthsAhead - 1 }).getMonth()
  ) && parse(currentMonth, "MMM-yyyy", new Date()).getFullYear() === add(today, { months: maxMonthsAhead - 1 }).getFullYear();
  
  // Fetch meal bookings for the displayed month
  const startDate = startOfWeek(firstDayCurrentMonth, { weekStartsOn: 0 });
  const endDate = endOfWeek(endOfMonth(firstDayCurrentMonth), { weekStartsOn: 0 });
  
  const { data: meals, isLoading } = useQuery({
    queryKey: ['/api/meals', format(startDate, 'yyyy-MM'), format(endDate, 'yyyy-MM')],
    queryFn: () => fetch(
      `/api/meals?startDate=${startDate.toISOString()}&endDate=${endDate.toISOString()}`
    ).then(res => res.json()),
    staleTime: 30 * 60 * 1000, // Consider data fresh for 30 minutes
    refetchOnWindowFocus: false,
    refetchOnMount: false,
    refetchInterval: false,
    gcTime: 60 * 60 * 1000 // Keep cache for 1 hour
  });
  
  // Create a map of dates to meal status
  const mealStatusMap = useMemo(() => {
    const map = new Map<string, MealStatus>();
    
    if (meals) {
      meals.forEach((meal: any) => {
        if (meal.cancelled) return;
        
        const mealDate = format(parseISO(meal.date), "yyyy-MM-dd");
        const mealStatus = map.get(mealDate) || { bookedMissionaries: [] };
        
        const missionaryExists = mealStatus.bookedMissionaries.some(
          (m) => m.id === meal.missionary.id
        );
        
        if (!missionaryExists) {
          mealStatus.bookedMissionaries.push({
            id: meal.missionary.id,
            name: meal.missionary.name,
            type: meal.missionary.type
          });
        }
        
        map.set(mealDate, mealStatus);
      });
    }
    
    return map;
  }, [meals]);

  // Auto-select next available date when missionary type changes or when enabled
  useEffect(() => {
    if (autoSelectNextAvailable && !selectedDate && mealStatusMap.size > 0) {
      const availableDates = days.filter(day => {
        if (!isWithinBookingRange(day)) return false;
        
        const dayKey = format(day, 'yyyy-MM-dd');
        const mealStatus = mealStatusMap.get(dayKey);
        
        if (!mealStatus) return true; // No meals booked, available
        
        const bookedTypes = mealStatus.bookedMissionaries.map(m => m.type);
        return !bookedTypes.includes(missionaryType);
      });
      
      if (availableDates.length > 0) {
        onSelectDate(availableDates[0]);
      }
    }
  }, [autoSelectNextAvailable, selectedDate, mealStatusMap, days, missionaryType, onSelectDate]);
  
  return (
    <div className="mb-8 border border-gray-200 rounded-lg overflow-hidden bg-white">
      <div className="flex justify-between items-center bg-gray-50 px-4 py-3 border-b border-gray-200">
        <Button
          variant="ghost"
          size="icon"
          onClick={previousMonth}
          disabled={isPrevMonthDisabled}
          className={cn(
            "p-1 rounded-full hover:bg-gray-200 focus:outline-none",
            isPrevMonthDisabled && "opacity-50 cursor-not-allowed"
          )}
        >
          <ChevronLeft className="h-5 w-5" />
          <span className="sr-only">Previous month</span>
        </Button>
        
        <h3 className="text-base font-medium text-gray-900">
          {format(firstDayCurrentMonth, "MMMM yyyy")}
        </h3>
        
        <Button
          variant="ghost"
          size="icon"
          onClick={nextMonth}
          disabled={isNextMonthDisabled}
          className={cn(
            "p-1 rounded-full hover:bg-gray-200 focus:outline-none",
            isNextMonthDisabled && "opacity-50 cursor-not-allowed"
          )}
        >
          <ChevronRight className="h-5 w-5" />
          <span className="sr-only">Next month</span>
        </Button>
      </div>
      
      <div className="grid grid-cols-7 text-center py-2 border-b border-gray-200">
        <div className="text-xs font-medium text-gray-500">Sun</div>
        <div className="text-xs font-medium text-gray-500">Mon</div>
        <div className="text-xs font-medium text-gray-500">Tue</div>
        <div className="text-xs font-medium text-gray-500">Wed</div>
        <div className="text-xs font-medium text-gray-500">Thu</div>
        <div className="text-xs font-medium text-gray-500">Fri</div>
        <div className="text-xs font-medium text-gray-500">Sat</div>
      </div>
      
      <div className="grid grid-cols-7 text-center">
        {isLoading ? (
          // Loading skeleton
          Array.from({ length: 35 }).map((_, idx) => (
            <div key={idx} className="p-1 aspect-ratio-1">
              <Skeleton className="h-10 w-10 rounded-full mx-auto" />
            </div>
          ))
        ) : (
          days.map((day) => {
            const formattedDay = format(day, "yyyy-MM-dd");
            const mealStatus = mealStatusMap.get(formattedDay) || { bookedMissionaries: [] };
            const isSelected = selectedDate ? isSameDay(day, selectedDate) : false;
            
            // Get all booked missionary types on this day
            const missionariesByType = new Map<string, {id: number, name: string}[]>();
            mealStatus.bookedMissionaries.forEach((m: any) => {
              const missionaries = missionariesByType.get(m.type) || [];
              missionaries.push({id: m.id, name: m.name});
              missionariesByType.set(m.type, missionaries);
            });
            
            // Determine calendar day class based on booked missionaries - support for up to 5 sets
            let dayClass = "";
            const bookedMissionaryIds = mealStatus.bookedMissionaries.map((m: any) => m.id);
            
            if (bookedMissionaryIds.length === 1) {
              // Single missionary set - determine which set number (1-5) based on ID
              const setNumber = ((bookedMissionaryIds[0] - 1) % 5) + 1;
              dayClass = `missionary-set-${setNumber}`;
            } else if (bookedMissionaryIds.length > 1) {
              // Multiple missionary sets booked
              dayClass = "missionary-booked-multiple";
            }
            
            // Legacy support for elders/sisters
            const hasElders = !!missionariesByType.get("elders")?.length;
            const hasSisters = !!missionariesByType.get("sisters")?.length;
            
            if (hasElders && hasSisters) {
              dayClass = "missionary-booked-both"; 
            } else if (hasElders) {
              dayClass = "missionary-booked-elders";
            } else if (hasSisters) {
              dayClass = "missionary-booked-sisters";
            }
            
            // Check if this day is available for the selected missionary
            // When missionaryType is a numeric ID, check if that specific missionary is already booked
            const isMissionaryId = !isNaN(parseInt(missionaryType, 10));
            const isDayUnavailable = isMissionaryId 
              ? mealStatus.bookedMissionaries.some((m: any) => m.id.toString() === missionaryType)
              : ((missionaryType === "elders" && hasElders) || 
                 (missionaryType === "sisters" && hasSisters));
            
            // Check if the date is within the booking range
            const isOutsideBookingRange = !isWithinBookingRange(day);
            
            // Determine if the day is disabled
            const isDisabled = 
              !isSameMonth(day, firstDayCurrentMonth) || 
              isOutsideBookingRange || 
              isDayUnavailable;
            
            return (
              <div
                key={day.toString()}
                className={cn(
                  "calendar-day p-1",
                  !isDisabled && "hover:bg-gray-50 cursor-pointer",
                  isDisabled && "disabled opacity-30 pointer-events-none",
                  dayClass,
                  isSelected && "border-2 border-primary"
                )}
                onClick={() => !isDisabled && onSelectDate(day)}
              >
                <div className={cn(
                  "rounded-full h-10 w-10 flex items-center justify-center mx-auto",
                  isToday(day) && "bg-blue-50 text-primary font-bold"
                )}>
                  <span className="text-sm">
                    {format(day, "d")}
                  </span>
                </div>
              </div>
            );
          })
        )}
      </div>
      
      {/* Calendar styling moved to global CSS for better compatibility */}
    </div>
  );
}
