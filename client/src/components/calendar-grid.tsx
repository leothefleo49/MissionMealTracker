import { useState, useEffect, useMemo } from "react";
import { 
  add, 
  eachDayOfInterval, 
  endOfMonth, 
  endOfWeek, 
  format, 
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

type Missionary = {
  id: number;
  name: string;
  type: 'elders' | 'sisters';
};

type Meal = {
  id: number;
  missionaryId: number;
  date: string; // ISO date string
  cancelled: boolean;
};

type CalendarGridProps = {
  onSelectDate: (date: Date) => void;
  selectedDate?: Date | null;
  startMonth?: Date;
  wardId?: number;
};

export function CalendarGrid({ 
  onSelectDate, 
  selectedDate, 
  startMonth = startOfToday(),
  wardId,
}: CalendarGridProps) {
  const { data: wardMissionaries, isLoading: isLoadingMissionaries } = useQuery<Missionary[]>({
    queryKey: ['/api/wards', wardId, 'missionaries'],
    queryFn: () => fetch(`/api/wards/${wardId}/missionaries`).then(res => res.json()),
    enabled: !!wardId,
  });

  const missionaryColorMap = useMemo(() => {
    const map = new Map<number, { color: string, dotClass: string }>();
    if (wardMissionaries) {
      wardMissionaries.forEach((missionary, index) => {
        const setNumber = (index % 6) + 1;
        map.set(missionary.id, {
          color: `var(--missionary-${setNumber}-color)`,
          dotClass: `dots-${setNumber}`
        });
      });
    }
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
    setCurrentMonth(format(add(firstDayCurrentMonth, { months: -1 }), "MMM-yyyy"));
  }

  function nextMonth() {
    setCurrentMonth(format(add(firstDayCurrentMonth, { months: 1 }), "MMM-yyyy"));
  }

  const isPrevMonthDisabled = isEqual(firstDayCurrentMonth.getMonth(), today.getMonth()) && isEqual(firstDayCurrentMonth.getFullYear(), today.getFullYear());
  const isNextMonthDisabled = isEqual(firstDayCurrentMonth.getMonth(), add(today, { months: 2 }).getMonth());

  const { data: meals, isLoading: isLoadingMeals } = useQuery<Meal[]>({
    queryKey: ['/api/meals', format(firstDayCurrentMonth, 'yyyy-MM')],
    queryFn: () => {
      const startDate = startOfWeek(firstDayCurrentMonth, { weekStartsOn: 0 });
      const endDate = endOfWeek(endOfMonth(firstDayCurrentMonth), { weekStartsOn: 0 });
      return fetch(`/api/meals?wardId=${wardId}&startDate=${startDate.toISOString()}&endDate=${endDate.toISOString()}`).then(res => res.json());
    },
    enabled: !!wardId,
  });

  const mealsByDate = useMemo(() => {
    const map = new Map<string, Set<number>>();
    if (meals) {
      for (const meal of meals) {
        if (!meal.cancelled) {
          const dateKey = format(parseISO(meal.date), "yyyy-MM-dd");
          if (!map.has(dateKey)) {
            map.set(dateKey, new Set());
          }
          map.get(dateKey)!.add(meal.missionaryId);
        }
      }
    }
    return map;
  }, [meals]);

  const isLoading = isLoadingMissionaries || isLoadingMeals;

  return (
    <div className="mb-8 border border-gray-200 rounded-lg overflow-hidden bg-white max-w-full">
      <div className="flex justify-between items-center bg-gray-50 px-4 py-3 border-b border-gray-200">
        <Button variant="ghost" size="icon" onClick={previousMonth} disabled={isPrevMonthDisabled} className="h-8 w-8">
          <ChevronLeft className="h-5 w-5" />
        </Button>
        <h3 className="text-base font-medium text-gray-900">{format(firstDayCurrentMonth, "MMMM yyyy")}</h3>
        <Button variant="ghost" size="icon" onClick={nextMonth} disabled={isNextMonthDisabled} className="h-8 w-8">
          <ChevronRight className="h-5 w-5" />
        </Button>
      </div>

      <div className="grid grid-cols-7 text-center py-2 border-b border-gray-200">
        {['S', 'M', 'T', 'W', 'T', 'F', 'S'].map(day => <div key={day} className="text-xs font-medium text-gray-500">{day}</div>)}
      </div>

      <div className="grid grid-cols-7 text-center">
        {days.map((day) => {
          const dateKey = format(day, "yyyy-MM-dd");
          const bookedMissionaryIds = mealsByDate.get(dateKey) || new Set();

          const isDayInPast = isBefore(day, today);
          const isDayInCurrentMonth = isSameMonth(day, firstDayCurrentMonth);
          const isFullyBooked = wardMissionaries ? bookedMissionaryIds.size >= wardMissionaries.length : false;
          const isDisabled = !isDayInCurrentMonth || isDayInPast || isFullyBooked;

          return (
            <div
              key={day.toString()}
              className={cn(
                "relative p-1 aspect-square border-r border-b border-gray-100",
                !isDayInCurrentMonth && "bg-gray-50",
                isDisabled && "opacity-50 pointer-events-none"
              )}
              onClick={() => !isDisabled && onSelectDate(day)}
            >
              <time
                dateTime={format(day, "yyyy-MM-dd")}
                className={cn(
                  "absolute top-1 right-1 text-xs font-medium",
                  isToday(day) && "bg-primary text-primary-foreground rounded-full h-5 w-5 flex items-center justify-center"
                )}
              >
                {format(day, "d")}
              </time>

              {!isLoading && wardMissionaries && wardMissionaries.length > 0 && (
                <div className="absolute inset-0 p-1 pt-6 flex flex-col justify-end">
                  <div className="calendar-day-grid" style={{ gridTemplateRows: `repeat(${wardMissionaries.length}, 1fr)`}}>
                    {wardMissionaries.map(missionary => {
                      const isBooked = bookedMissionaryIds.has(missionary.id);
                      const missionaryStyle = missionaryColorMap.get(missionary.id);
                      return (
                        <div
                          key={missionary.id}
                          className="calendar-missionary-line"
                          style={{ backgroundColor: isBooked ? missionaryStyle?.color : undefined, opacity: isBooked ? 0.7 : 1 }}
                        >
                          {isBooked && (
                            <div className={cn("dice-dot-pattern", missionaryStyle?.dotClass)}>
                                {Array.from({ length: 6 }).map((_, i) => <div key={i} className={`dice-dot dot-${i + 1}`}></div>)}
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}