import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";
import { format, addMonths, isAfter, isBefore, setHours, setMinutes, isToday, isWithinInterval } from "date-fns";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

// Format a date with specific pattern
export function formatDate(date: Date, pattern: string = "PPP") {
  return format(date, pattern);
}

// Returns true if a date is in the future
export function isFutureDate(date: Date): boolean {
  return isAfter(date, new Date());
}

// Returns true if a date is in the past
export function isPastDate(date: Date): boolean {
  return isBefore(date, new Date());
}

// Check if date is within allowed booking range (up to 3 months ahead)
export function isWithinBookingRange(date: Date): boolean {
  const now = new Date();
  const maxBookingDate = addMonths(now, 3);
  
  return isWithinInterval(date, {
    start: now,
    end: maxBookingDate
  });
}

// Format time from "HH:MM" 24h format to "h:MM A" 12h format
export function formatTimeFrom24To12(time: string): string {
  const [hours, minutes] = time.split(":");
  const date = new Date();
  date.setHours(parseInt(hours, 10));
  date.setMinutes(parseInt(minutes, 10));
  
  return format(date, "h:mm a");
}

// Parse time string "HH:MM" and return a date with that time
export function parseTimeString(time: string): Date {
  const [hours, minutes] = time.split(":");
  const date = new Date();
  return setMinutes(setHours(date, parseInt(hours, 10)), parseInt(minutes, 10));
}

// Get start and end dates for a 6-month calendar view
export function getCalendarViewDates(startFromMonth: Date = new Date()): {
  start: Date;
  end: Date;
} {
  // Set to beginning of current month
  const startMonth = new Date(startFromMonth);
  startMonth.setDate(1);
  startMonth.setHours(0, 0, 0, 0);
  
  // End date is 6 months later
  const endMonth = addMonths(startMonth, 6);
  endMonth.setDate(0); // Last day of the 5th month
  endMonth.setHours(23, 59, 59, 999);
  
  return { start: startMonth, end: endMonth };
}

// Generate array of time options for meal scheduling
export function getTimeOptions(): { value: string; label: string }[] {
  const startTime = parseTimeString("16:30"); // 4:30 PM
  const endTime = parseTimeString("18:30");   // 6:30 PM
  const options = [];
  
  let currentTime = new Date(startTime);
  while (currentTime <= endTime) {
    const timeValue = format(currentTime, "HH:mm");
    const timeLabel = format(currentTime, "h:mm a");
    
    options.push({ value: timeValue, label: timeLabel });
    
    // Add 30 minutes for the next option
    currentTime.setMinutes(currentTime.getMinutes() + 30);
  }
  
  return options;
}

// Format phone number to (XXX) XXX-XXXX format
export function formatPhoneNumber(phoneNumber: string): string {
  // Remove all non-digit characters
  const cleaned = phoneNumber.replace(/\D/g, '');
  
  // Check if the number has exactly 10 digits
  const match = cleaned.match(/^(\d{3})(\d{3})(\d{4})$/);
  
  if (match) {
    return `(${match[1]}) ${match[2]}-${match[3]}`;
  }
  
  // Return the original if not valid
  return phoneNumber;
}

// Parse formatted phone number back to digits only
export function parsePhoneNumber(formattedNumber: string): string {
  return formattedNumber.replace(/\D/g, '');
}

export function getMissionaryTypeColor(type: string): string {
  return type === 'elders' ? 'primary' : 'amber-500';
}
