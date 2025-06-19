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

export function CalendarGrid({ 
  onSelectDate, 
  selectedDate, 
  missionaryType,
  startMonth = startOfToday(),
  maxMonths = 6,
  wardId,
  autoSelectNextAvailable = false
}: CalendarGridProps) {
  
  // Fetch ward missionaries to determine total count for fractional display
  const { data: wardMissionaries } = useQuery({
    queryKey: ['/api/wards', wardId, 'missionaries'],
    queryFn: () => fetch(`/api/wards/${wardId}/missionaries`).then(res => res.json()),
    enabled: !!wardId,
    staleTime: 5000,
    refetchInterval: 5000
  });
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
          {format(firstDayCurrentMonth, "MMM yyyy")}
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
            
            // Get all booked missionary types and unique missionaries on this day
            const missionariesByType = new Map<string, {id: number, name: string}[]>();
            const uniqueMissionaries = new Map<number, {id: number, name: string, type: string}>();
            
            mealStatus.bookedMissionaries.forEach((m: any) => {
              const missionaries = missionariesByType.get(m.type) || [];
              missionaries.push({id: m.id, name: m.name});
              missionariesByType.set(m.type, missionaries);
              uniqueMissionaries.set(m.id, {id: m.id, name: m.name, type: m.type});
            });
            
            // Get total missionary count and determine fractional layout
            const totalMissionaries = wardMissionaries?.length || 1;
            const uniqueMissionaryIds = Array.from(uniqueMissionaries.keys());
            
            // Create fractional color background based on booked missionaries
            const createFractionalStyles = () => {
              if (uniqueMissionaryIds.length === 0) return { className: "", style: {} };
              
              // For single missionary ward, fill entire cell
              if (totalMissionaries === 1) {
                const setNumber = ((uniqueMissionaryIds[0] - 1) % 5) + 1;
                return { className: `missionary-set-${setNumber}`, style: {} };
              }
              
              // For multiple missionaries, create fractional sections using linear gradient
              const sections = [];
              const sectionSize = 100 / totalMissionaries;
              
              for (let i = 0; i < totalMissionaries; i++) {
                const missionaryId = wardMissionaries?.[i]?.id;
                const isBooked = uniqueMissionaryIds.includes(missionaryId);
                const setNumber = (i % 5) + 1;
                
                const start = i * sectionSize;
                const end = (i + 1) * sectionSize;
                
                if (isBooked) {
                  sections.push(`var(--missionary-${setNumber}-color) ${start}% ${end}%`);
                } else {
                  sections.push(`transparent ${start}% ${end}%`);
                }
              }
              
              if (sections.length > 0) {
                const backgroundImage = `linear-gradient(to right, ${sections.join(', ')})`;
                return { 
                  className: "fractional-missionary-booking", 
                  style: { backgroundImage }
                };
              }
              
              return { className: "", style: {} };
            };
            
            const { className: dayClass, style: dayStyle } = createFractionalStyles();
            
            // Legacy support for elders/sisters type filtering
            const hasElders = !!missionariesByType.get("elders")?.length;
            const hasSisters = !!missionariesByType.get("sisters")?.length;
            
            // Check if this day is available for the selected missionary
            // When missionaryType is a numeric ID, check if that specific missionary is already booked
            const isMissionaryId = !isNaN(parseInt(missionaryType, 10));
            const isDayUnavailable = isMissionaryId 
              ? mealStatus.bookedMissionaries.some((m: any) => m.id.toString() === missionaryType)
              : false; // Don't disable for legacy type filtering
            
            // Check if the date is within the booking range
            const isOutsideBookingRange = !isWithinBookingRange(day);
            
            // Check if ALL missionary sets are completely booked
            // We need to check if every single missionary in the ward has a booking on this day
            const totalMissionaryCount = wardMissionaries?.length || 1;
            const isCompletelyBooked = totalMissionaryCount > 1 && wardMissionaries?.length === uniqueMissionaryIds.length;
            
            // Check if the date is in the past (but not today)
            const isPastDate = isBefore(day, startOfToday()) && !isToday(day);
            
            // Determine if the day should be dimmed (past dates or completely booked)
            const isDimmed = isPastDate || isCompletelyBooked;
            
            // Determine if the day is disabled (only disable if outside range, not in current month, or specific missionary already booked)
            const isDisabled = 
              !isSameMonth(day, firstDayCurrentMonth) || 
              isOutsideBookingRange || 
              isDayUnavailable;
            
            return (
              <div
                key={day.toString()}
                className={cn(
                  "calendar-day p-0.5 sm:p-1 flex flex-col items-center justify-center min-h-10 sm:min-h-12 w-full",
                  !isDisabled && "hover:bg-gray-50 cursor-pointer",
                  isDisabled && "disabled opacity-30 pointer-events-none",
                  isDimmed && !isSelected && "opacity-60",
                  dayClass,
                  isSelected && "border-2 border-primary"
                )}
                style={dayStyle}
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

              </div>
            );
          })
        )}
      </div>
      
      {/* Calendar styling moved to global CSS for better compatibility */}
    </div>
  );
}
