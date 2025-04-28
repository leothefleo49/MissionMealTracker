import React from "react";
import { FormControl, FormItem, FormLabel } from "@/components/ui/form";
import { cn } from "@/lib/utils";

interface CustomRadioProps {
  value: string;
  checked: boolean;
  onChange: (value: string) => void;
  label: string;
  name: string;
  disabled?: boolean;
}

export function CustomRadio({ value, checked, onChange, label, name, disabled = false }: CustomRadioProps) {
  return (
    <FormItem 
      className={cn(
        "flex flex-col sm:flex-row items-center sm:items-start gap-3 rounded-md border p-4 shadow-sm",
        checked ? "border-primary bg-primary/5" : "border-input",
        disabled && "opacity-50 cursor-not-allowed"
      )}
      onClick={() => !disabled && onChange(value)}
    >
      <FormControl>
        <div className="flex items-center justify-center">
          <div 
            className={cn(
              "flex aspect-square w-6 items-center justify-center rounded-full border-2",
              checked 
                ? "border-primary" 
                : "border-gray-300",
              disabled && "opacity-50 cursor-not-allowed"
            )}
          >
            {checked && (
              <div className="aspect-square w-3 rounded-full bg-primary" />
            )}
          </div>
          <input 
            type="radio" 
            className="sr-only" 
            name={name}
            value={value} 
            checked={checked} 
            onChange={() => onChange(value)} 
            disabled={disabled}
          />
        </div>
      </FormControl>
      <FormLabel className={cn(
        "text-sm font-medium flex-1 text-center sm:text-left cursor-pointer",
        disabled && "opacity-50"
      )}>
        {label}
      </FormLabel>
    </FormItem>
  );
}