import { useState, useEffect } from "react";
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
  eldersBooked: boolean;
  sistersBooked: boolean;
};

type CalendarGridProps = {
  onSelectDate: (date: Date) => void;
  selectedDate?: Date | null;
  missionaryType: "elders" | "sisters";
  startMonth?: Date;
  maxMonths?: number;
};

export function CalendarGrid({ 
  onSelectDate, 
  selectedDate, 
  missionaryType,
  startMonth = startOfToday(),
  maxMonths = 6
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
  
  // Disable next month button if we're at the max months ahead
  const isNextMonthDisabled = isEqual(
    parse(currentMonth, "MMM-yyyy", new Date()).getMonth(),
    add(today, { months: maxMonths - 1 }).getMonth()
  ) && parse(currentMonth, "MMM-yyyy", new Date()).getFullYear() === add(today, { months: maxMonths - 1 }).getFullYear();
  
  // Fetch meal bookings for the displayed month
  const startDate = startOfWeek(firstDayCurrentMonth, { weekStartsOn: 0 });
  const endDate = endOfWeek(endOfMonth(firstDayCurrentMonth), { weekStartsOn: 0 });
  
  const { data: meals, isLoading } = useQuery({
    queryKey: ['/api/meals', startDate.toISOString(), endDate.toISOString()],
    queryFn: () => fetch(
      `/api/meals?startDate=${startDate.toISOString()}&endDate=${endDate.toISOString()}`
    ).then(res => res.json())
  });
  
  // Create a map of dates to meal status
  const mealStatusMap = new Map<string, MealStatus>();
  
  useEffect(() => {
    if (meals) {
      meals.forEach((meal: any) => {
        if (meal.cancelled) return;
        
        const mealDate = format(parseISO(meal.date), "yyyy-MM-dd");
        const mealStatus = mealStatusMap.get(mealDate) || { eldersBooked: false, sistersBooked: false };
        
        if (meal.missionary.type === "elders") {
          mealStatus.eldersBooked = true;
        } else if (meal.missionary.type === "sisters") {
          mealStatus.sistersBooked = true;
        }
        
        mealStatusMap.set(mealDate, mealStatus);
      });
    }
  }, [meals]);
  
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
            const mealStatus = mealStatusMap.get(formattedDay) || { eldersBooked: false, sistersBooked: false };
            const isSelected = selectedDate ? isSameDay(day, selectedDate) : false;
            
            // Determine calendar day class
            let dayClass = "";
            if (mealStatus.eldersBooked && mealStatus.sistersBooked) {
              dayClass = "missionary-booked-both"; 
            } else if (mealStatus.eldersBooked) {
              dayClass = "missionary-booked-elders";
            } else if (mealStatus.sistersBooked) {
              dayClass = "missionary-booked-sisters";
            }
            
            // Check if this day is available for the selected missionary type
            const isDayUnavailable = 
              (missionaryType === "elders" && mealStatus.eldersBooked) ||
              (missionaryType === "sisters" && mealStatus.sistersBooked);
            
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
      
      <style jsx>{`
        .calendar-day {
          aspect-ratio: 1;
          max-width: 100%;
        }
        .calendar-day.missionary-booked-elders {
          background-color: rgba(59, 130, 246, 0.1);
          border: 1px solid #3b82f6;
        }
        .calendar-day.missionary-booked-sisters {
          background-color: rgba(245, 158, 11, 0.1);
          border: 1px solid #f59e0b;
        }
        .calendar-day.missionary-booked-both {
          background: linear-gradient(135deg, 
                    rgba(59, 130, 246, 0.1) 0%, 
                    rgba(59, 130, 246, 0.1) 50%, 
                    rgba(245, 158, 11, 0.1) 50%, 
                    rgba(245, 158, 11, 0.1) 100%);
          border: 1px dashed #94a3b8;
        }
      `}</style>
    </div>
  );
}
