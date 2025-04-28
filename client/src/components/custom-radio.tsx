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
    <FormItem className="flex items-start space-x-3 space-y-0 rounded-md border p-3 shadow-sm">
      <FormControl>
        <div className="flex items-center space-x-2">
          <div 
            className={cn(
              "flex h-5 w-5 items-center justify-center rounded-full border",
              checked 
                ? "border-primary bg-primary text-primary-foreground" 
                : "border-input",
              disabled && "opacity-50 cursor-not-allowed"
            )}
            onClick={() => !disabled && onChange(value)}
          >
            {checked && (
              <div className="h-2.5 w-2.5 rounded-full bg-white" />
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
      <FormLabel className={cn("text-sm font-medium", disabled && "opacity-50")}>
        {label}
      </FormLabel>
    </FormItem>
  );
}