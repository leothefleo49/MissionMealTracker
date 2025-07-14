// client/src/components/ui/combobox.tsx
"use client"

import * as React from "react"
import { Check, ChevronsUpDown } from "lucide-react"

import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList, // Import CommandList for scrolling
} from "@/components/ui/command"
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover"

interface ComboboxProps<T> {
  options: T[];
  value: string | number | null | undefined;
  onValueChange: (value: string | number | null | undefined) => void;
  placeholder?: string;
  searchPlaceholder?: string;
  noResultsMessage?: string;
  displayKey: keyof T; // Key to display to the user (e.g., 'name')
  valueKey: keyof T;   // Key whose value will be stored (e.g., 'id')
  className?: string; // For custom styling of the trigger button
  contentClassName?: string; // For custom styling of the popover content (e.g., max-height)
}

export function Combobox<T extends Record<string, any>>({
  options,
  value,
  onValueChange,
  placeholder = "Select item...",
  searchPlaceholder = "Search items...",
  noResultsMessage = "No item found.",
  displayKey,
  valueKey,
  className,
  contentClassName,
}: ComboboxProps<T>) {
  const [open, setOpen] = React.useState(false)

  const selectedOption = options.find((option) => String(option[valueKey]) === String(value));
  const displayValue = selectedOption ? String(selectedOption[displayKey]) : "";

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          role="combobox"
          aria-expanded={open}
          className={cn("w-[200px] justify-between", className)}
        >
          {value ? displayValue : placeholder}
          <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className={cn("w-[var(--radix-popover-trigger-width)] p-0", contentClassName)}>
        <Command>
          <CommandInput placeholder={searchPlaceholder} className="h-9" />
          <CommandEmpty>{noResultsMessage}</CommandEmpty>
          <CommandList> {/* Use CommandList for scrolling behavior */}
            <CommandGroup>
              {options.map((option) => (
                <CommandItem
                  key={String(option[valueKey])}
                  value={String(option[displayKey])} // Use displayKey for searchability
                  onSelect={() => {
                    onValueChange(String(option[valueKey]) === String(value) ? undefined : option[valueKey]);
                    setOpen(false);
                  }}
                >
                  {option.label}
                  <Check
                    className={cn(
                      "ml-auto h-4 w-4",
                      String(option[valueKey]) === String(value) ? "opacity-100" : "opacity-0"
                    )}
                  />
                </CommandItem>
              ))}
            </CommandGroup>
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  )
}