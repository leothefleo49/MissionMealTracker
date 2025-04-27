import { useState, useCallback } from 'react';
import { 
  addMonths, 
  startOfMonth, 
  endOfMonth, 
  format, 
  isBefore, 
  isAfter,
  isSameDay,
  addDays 
} from 'date-fns';

type UseDatesReturn = {
  currentMonth: Date;
  startDate: Date;
  endDate: Date;
  nextMonth: () => void;
  prevMonth: () => void;
  isInFuture: (date: Date) => boolean;
  isInPast: (date: Date) => boolean;
  isToday: (date: Date) => boolean;
  isInRange: (date: Date, startDate: Date, endDate: Date) => boolean;
  getMonthDisplay: () => string;
  getNextMonths: (count: number) => { value: string; label: string }[];
};

export function useDates(initialDate = new Date()): UseDatesReturn {
  const [currentMonth, setCurrentMonth] = useState(startOfMonth(initialDate));
  
  const startDate = startOfMonth(currentMonth);
  const endDate = endOfMonth(currentMonth);
  
  const nextMonth = useCallback(() => {
    setCurrentMonth(prev => addMonths(prev, 1));
  }, []);
  
  const prevMonth = useCallback(() => {
    setCurrentMonth(prev => addMonths(prev, -1));
  }, []);
  
  const isInFuture = useCallback((date: Date) => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    return isAfter(date, today);
  }, []);
  
  const isInPast = useCallback((date: Date) => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    return isBefore(date, today);
  }, []);
  
  const isToday = useCallback((date: Date) => {
    const today = new Date();
    return isSameDay(date, today);
  }, []);
  
  const isInRange = useCallback((date: Date, start: Date, end: Date) => {
    return !isBefore(date, start) && !isAfter(date, end);
  }, []);
  
  const getMonthDisplay = useCallback(() => {
    return format(currentMonth, 'MMMM yyyy');
  }, [currentMonth]);
  
  const getNextMonths = useCallback((count: number) => {
    const months = [];
    let currentDate = new Date();
    
    for (let i = 0; i < count; i++) {
      const monthDate = addMonths(currentDate, i);
      const label = format(monthDate, 'MMMM yyyy');
      const value = format(monthDate, 'yyyy-MM');
      months.push({ value, label });
    }
    
    return months;
  }, []);
  
  return {
    currentMonth,
    startDate,
    endDate,
    nextMonth,
    prevMonth,
    isInFuture,
    isInPast,
    isToday,
    isInRange,
    getMonthDisplay,
    getNextMonths,
  };
}
