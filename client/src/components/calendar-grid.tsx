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
import { ChevronLeft, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn, isWithinBookingRange } from "@/lib/utils";
import { useQuery } from "@tanstack/react-query";
import { Skeleton } from "@/components/ui/skeleton";

export type MealStatus = {
  bookedMissionaries: {
    id: number;
    name: string;
    type: string;
    color: string;
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

  const { data: wardMissionaries } = useQuery<any[]>({
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

  const isPrevMonthDisabled = isEqual(
    parse(currentMonth, "MMM-yyyy", new Date()).getMonth(),
    today.getMonth()
  ) && parse(currentMonth, "MMM-yyyy", new Date()).getFullYear() === today.getFullYear();

  const maxMonthsAhead = 3;
  const isNextMonthDisabled = isEqual(
    parse(currentMonth, "MMM-yyyy", new Date()).getMonth(),
    add(today, { months: maxMonthsAhead - 1 }).getMonth()
  ) && parse(currentMonth, "MMM-yyyy", new Date()).getFullYear() === add(today, { months: maxMonthsAhead - 1 }).getFullYear();

  const startDate = startOfWeek(firstDayCurrentMonth, { weekStartsOn: 0 });
  const endDate = endOfWeek(endOfMonth(firstDayCurrentMonth), { weekStartsOn: 0 });

  const { data: meals, isLoading } = useQuery({
    queryKey: ['/api/meals', wardId, format(startDate, 'yyyy-MM'), format(endDate, 'yyyy-MM')],
    queryFn: () => fetch(
      `/api/meals?wardId=${wardId}&startDate=${startDate.toISOString()}&endDate=${endDate.toISOString()}`
    ).then(res => res.json()),
    enabled: !!wardId,
    staleTime: 1000,
    refetchOnWindowFocus: true,
    refetchOnMount: true,
    refetchInterval: 1000,
  });

  const mealStatusMap = useMemo(() => {
    const map = new Map<string, MealStatus>();
    if (meals && wardMissionaries) {
      meals.forEach((meal: any) => {
        if (meal.cancelled) return;
        const mealDate = format(parseISO(meal.date), "yyyy-MM-dd");
        const mealStatus = map.get(mealDate) || { bookedMissionaries: [] };
        const missionaryIndex = wardMissionaries.findIndex((m: any) => m.id === meal.missionary.id);
        const missionaryExists = mealStatus.bookedMissionaries.some((m) => m.id === meal.missionary.id);

        if (!missionaryExists && missionaryIndex !== -1) {
          const setNumber = (missionaryIndex % 6) + 1;
          mealStatus.bookedMissionaries.push({
            id: meal.missionary.id,
            name: meal.missionary.name,
            type: meal.missionary.type,
            color: `var(--missionary-${setNumber}-color)`,
          });
        }
        map.set(mealDate, mealStatus);
      });
    }
    return map;
  }, [meals, wardMissionaries]);

  return (
    <div className="mb-8 border border-gray-200 rounded-lg overflow-hidden bg-white max-w-full calendar-container">
      <div className="flex justify-between items-center bg-gray-50 px-1 sm:px-4 py-1 sm:py-3 border-b border-gray-200">
        <Button variant="ghost" size="sm" onClick={previousMonth} disabled={isPrevMonthDisabled} className={cn("p-0.5 sm:p-2 rounded-full hover:bg-gray-200 focus:outline-none w-6 h-6 sm:w-10 sm:h-10 flex-shrink-0", isPrevMonthDisabled && "opacity-50 cursor-not-allowed")}>
          <ChevronLeft className="h-3 w-3 sm:h-5 sm:w-5" />
          <span className="sr-only">Previous month</span>
        </Button>
        <h3 className="text-xs sm:text-base font-medium text-gray-900 truncate px-1 flex-grow text-center min-w-0">
          {format(firstDayCurrentMonth, "MMMM yyyy")}
        </h3>
        <Button variant="ghost" size="sm" onClick={nextMonth} disabled={isNextMonthDisabled} className={cn("p-0.5 sm:p-2 rounded-full hover:bg-gray-200 focus:outline-none w-6 h-6 sm:w-10 sm:h-10 flex-shrink-0", isNextMonthDisabled && "opacity-50 cursor-not-allowed")}>
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
          Array.from({ length: 35 }).map((_, idx) => (
            <div key={idx} className="p-1 aspect-square">
              <Skeleton className="h-full w-full rounded-full" />
            </div>
          ))
        ) : (
          days.map((day) => {
            const formattedDay = format(day, "yyyy-MM-dd");
            const mealStatus = mealStatusMap.get(formattedDay) || { bookedMissionaries: [] };
            const isSelected = selectedDate ? isSameDay(day, selectedDate) : false;
            const isDayUnavailable = mealStatus.bookedMissionaries.some((m) => m.id.toString() === missionaryType);
            const isOutsideBookingRange = !isWithinBookingRange(day);
            const isCompletelyBooked = wardMissionaries?.length === mealStatus.bookedMissionaries.length;
            const isPastDate = isBefore(day, startOfToday()) && !isToday(day);
            const isDimmed = isPastDate || isCompletelyBooked;
            const isDisabled = !isSameMonth(day, firstDayCurrentMonth) || isOutsideBookingRange || isDayUnavailable;

            return (
              <div key={day.toString()} className={cn("calendar-day p-0.5 sm:p-1 flex flex-col items-center justify-center min-h-10 sm:min-h-12 w-full aspect-square relative", !isDisabled && "hover:bg-gray-50 cursor-pointer", isDimmed && !isSelected && "opacity-60", isSelected && "border-2 border-primary", isDisabled && "disabled opacity-30 pointer-events-none")} onClick={() => !isDisabled && onSelectDate(day)}>
                <div className="calendar-day-lines">
                  {wardMissionaries?.map((missionaryGroup, index) => {
                    const mealForGroup = mealStatus.bookedMissionaries.find(m => m.id === missionaryGroup.id);
                    return (
                      <div key={missionaryGroup.id} className="calendar-day-line" style={{ backgroundColor: mealForGroup ? mealForGroup.color : 'transparent' }}>
                        {mealForGroup && (
                          <div className={`calendar-dots dots-1`}>
                            <div className={`calendar-dot dot-${index + 1}`} />
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
                <div className={cn("rounded-full h-6 w-6 sm:h-8 sm:w-8 flex items-center justify-center relative z-10 bg-white/70 backdrop-blur-sm", isToday(day) && "bg-blue-100 text-primary font-bold")}>
                  <span className="text-xs sm:text-sm font-medium">
                    {format(day, "d")}
                  </span>
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}