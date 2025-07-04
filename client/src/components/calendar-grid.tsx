import { useState, useEffect, useMemo } from "react";
import { 
  add, 
  eachDayOfInterval, 
  endOfMonth, 
  endOfWeek, 
  format, 
  getDay, 
  isBefore,
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

// Helper to render dice-like dots for numbers 1-6
const renderDiceDots = (num: number) => {
  const dots = [];
  // Define positions for a 3x3 grid within the dot container
  const positions = [
    { top: '15%', left: '15%' }, // 0: Top-left
    { top: '15%', right: '15%' }, // 1: Top-right
    { top: '50%', left: '50%', transform: 'translate(-50%, -50%)' }, // 2: Center
    { bottom: '15%', left: '15%' }, // 3: Bottom-left
    { bottom: '15%', right: '15%' }, // 4: Bottom-right
    { top: '50%', left: '15%', transform: 'translateY(-50%)' }, // 5: Middle-left (reused for 6)
    { top: '50%', right: '15%', transform: 'translateY(-50%)' }, // 6: Middle-right (reused for 6)
  ];

  const getDotIndices = (n: number) => {
    switch (n) {
      case 1: return [2]; // Center
      case 2: return [0, 4]; // Top-left, Bottom-right
      case 3: return [0, 2, 4]; // Top-left, Center, Bottom-right
      case 4: return [0, 1, 3, 4]; // All corners
      case 5: return [0, 1, 2, 3, 4]; // All corners + Center
      case 6: return [0, 1, 3, 4, 5, 6]; // All 6 positions (corners + middle left/right)
      default: return [];
    }
  };

  const indicesToRender = getDotIndices(num);

  indicesToRender.forEach(idx => {
    const style = positions[idx];
    dots.push(<div key={idx} className="absolute w-1 h-1 rounded-full bg-current" style={style}></div>);
  });

  return dots;
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

  // Fetch ward missionaries to determine total count for fractional display and dot mapping
  const { data: wardMissionaries } = useQuery({
    queryKey: ['/api/wards', wardId, 'missionaries'],
    queryFn: () => fetch(`/api/wards/${wardId}/missionaries`).then(res => res.json()),
    enabled: !!wardId,
    staleTime: 5000,
    refetchInterval: 5000
  });

  // Create a map from missionary ID to a unique set number (1-6)
  const missionarySetMap = useMemo(() => {
    const map = new Map<number, number>();
    wardMissionaries?.forEach((m: any, index: number) => {
      // Ensure set number is between 1 and 6
      map.set(m.id, (index % 6) + 1); 
    });
    return map;
  }, [wardMissionaries]);

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
    staleTime: 1000, // Consider data fresh for 1 second
    refetchOnWindowFocus: true,
    refetchOnMount: true,
    refetchInterval: 1000, // Refetch every second
    gcTime: 5 * 60 * 1000 // Keep cache for 5 minutes
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

  // Auto-select disabled to prevent unwanted date jumping
  // useEffect(() => {
  //   if (autoSelectNextAvailable && !selectedDate && mealStatusMap.size > 0) {
  //     const availableDates = days.filter(day => {
  //       if (!isWithinBookingRange(day)) return false;
  //       
  //       const dayKey = format(day, 'yyyy-MM-dd');
  //       const mealStatus = mealStatusMap.get(dayKey);
  //       
  //       if (!mealStatus) return true; // No meals booked, available
  //       
  //       const bookedTypes = mealStatus.bookedMissionaries.map(m => m.type);
  //       return !bookedTypes.includes(missionaryType);
  //     });
  //     
  //     if (availableDates.length > 0) {
  //       onSelectDate(availableDates[0]);
  //     }
  //   }
  // }, [autoSelectNextAvailable, selectedDate, mealStatusMap, days, missionaryType, onSelectDate]);

  return (
    <div className="mb-8 border border-gray-200 rounded-lg overflow-hidden bg-white max-w-full calendar-container">
      <div className="flex justify-between items-center bg-gray-50 px-1 sm:px-4 py-1 sm:py-3 border-b border-gray-200">
        <Button
          variant="ghost"
          size="sm"
          onClick={previousMonth}
          disabled={isPrevMonthDisabled}
          className={cn(
            "p-0.5 sm:p-2 rounded-full hover:bg-gray-200 focus:outline-none w-6 h-6 sm:w-10 sm:h-10 flex-shrink-0",
            isPrevMonthDisabled && "opacity-50 cursor-not-allowed"
          )}
        >
          <ChevronLeft className="h-3 w-3 sm:h-5 sm:w-5" />
          <span className="sr-only">Previous month</span>
        </Button>

        <h3 className="text-xs sm:text-base font-medium text-gray-900 truncate px-1 flex-grow text-center min-w-0">
          {format(firstDayCurrentMonth, "MMM Guadeloupe")}
        </h3>

        <Button
          variant="ghost"
          size="sm"
          onClick={nextMonth}
          disabled={isNextMonthDisabled}
          className={cn(
            "p-0.5 sm:p-2 rounded-full hover:bg-gray-200 focus:outline-none w-6 h-6 sm:w-10 sm:h-10 flex-shrink-0",
            isNextMonthDisabled && "opacity-50 cursor-not-allowed"
          )}
        >
          <ChevronRight className="h-3 w-3 sm:h-5 sm:w-5" />
          <span className="sr-only">Next month</span>
        </Button>
      </div>

      <div className="grid grid-cols-7 text-center py-1 sm:py-2 border-b border-gray-200">
        <div className="text-xs font-medium text-gray-500 px-1">S</div>
        <div className="text-xs font-medium text-gray-500 px-1">M</div>
        <div className="text-xs font-medium text-gray-500 px-1">T</div>
        <div className="text-xs font-medium text-gray-500 px-1">W</div>
        <div className="text-xs font-medium text-gray-500 px-1">T</div>
        <div className="text-xs font-medium text-gray-500 px-1">F</div>
        <div className="text-xs font-medium text-gray-500 px-1">S</div>
      </div>

      <div className="grid grid-cols-7 text-center calendar-grid">
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

            // Get unique set numbers for booked missionaries on this day
            const bookedSetNumbers = Array.from(new Set(
              mealStatus.bookedMissionaries
                .map((m: any) => missionarySetMap.get(m.id))
                .filter(Boolean) as number[]
            )).sort((a,b) => a - b); // Sort to ensure consistent dot pattern order

            // Determine if the day is available for the selected missionary
            const isMissionaryId = !isNaN(parseInt(missionaryType, 10));
            const isDayUnavailableForSelectedMissionary = isMissionaryId 
              ? mealStatus.bookedMissionaries.some((m: any) => m.id.toString() === missionaryType)
              : false;

            // Check if the date is within the booking range
            const isOutsideBookingRange = !isWithinBookingRange(day);

            // Check if ALL missionary sets are completely booked
            const totalMissionarySets = wardMissionaries?.length || 0;
            const isCompletelyBooked = totalMissionarySets > 0 && bookedSetNumbers.length === totalMissionarySets;

            // Check if the date is in the past (but not today)
            const isPastDate = isBefore(day, startOfToday()) && !isToday(day);

            // Determine if the day should be dimmed (past dates or completely booked)
            const isDimmed = isPastDate || isCompletelyBooked;

            // Determine if the day is disabled (only disable if outside range, not in current month, or specific missionary already booked)
            const isDisabled = 
              !isSameMonth(day, firstDayCurrentMonth) || 
              isOutsideBookingRange || 
              isDayUnavailableForSelectedMissionary;

            return (
              <div
                key={day.toString()}
                className={cn(
                  "calendar-day p-0.5 sm:p-1 flex flex-col items-center justify-center min-h-10 sm:min-h-12 w-full relative", // Added relative for dot positioning
                  !isDisabled && "hover:bg-gray-50 cursor-pointer",
                  isDisabled && "disabled opacity-30 pointer-events-none",
                  isDimmed && !isSelected && "opacity-60",
                  isSelected && "border-2 border-primary"
                )}
                onClick={() => !isDisabled && onSelectDate(day)}
              >
                <div className={cn(
                  "rounded-full h-6 w-6 sm:h-8 sm:w-8 flex items-center justify-center relative z-10 bg-white",
                  isToday(day) && "bg-blue-50 text-primary font-bold"
                )}>
                  <span className="text-xs sm:text-sm font-medium">
                    {format(day, "d")}
                  </span>
                </div>
                {/* Render dots for booked missionary sets */}
                {bookedSetNumbers.length > 0 && (
                  <div className="absolute top-1 right-1 left-1 h-2.5 flex justify-center items-center pointer-events-none">
                    {bookedSetNumbers.map((setNum, idx) => (
                      <div key={idx} className={`missionary-dot-container missionary-set-${setNum}`}>
                        {renderDiceDots(setNum)}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            );
          })
        )}
      </div>

      {/* Calendar styling moved to global CSS for better compatibility */}
    </div>
  );
}
