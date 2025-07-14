// client/src/components/add-missionary-dialog.tsx
import { z } from "zod";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation, useQueryClient, useQuery } from "@tanstack/react-query"; // Import useQuery
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"; // Keep Select for type
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"; // Import Popover components
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem } from "@/components/ui/command"; // Import Command components
import { CaretSortIcon, CheckIcon } from "@radix-ui/react-icons"; // Import icons
import { cn } from "@/lib/utils"; // Import cn utility
import { useState } from "react"; // Import useState for Combobox
import type { Congregation } from "@shared/schema"; // Import Congregation type

// Re-using the Combobox component
interface ComboboxProps {
  options: { label: string; value: string | number }[];
  value: string | number | undefined;
  onChange: (value: string | number | undefined) => void;
  placeholder: string;
  className?: string;
  maxHeight?: string;
}

const Combobox = ({ options, value, onChange, placeholder, className, maxHeight = "200px" }: ComboboxProps) => {
  const [open, setOpen] = useState(false);

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          role="combobox"
          aria-expanded={open}
          className={cn("w-full justify-between", className)} // Changed to w-full
        >
          {value
            ? options.find((option) => option.value === value)?.label
            : placeholder}
          <CaretSortIcon className="ml-2 h-4 w-4 shrink-0 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-[var(--radix-popover-trigger-width)] p-0"> {/* Adjusted width */}
        <Command>
          <CommandInput placeholder="Search..." className="h-9" />
          <CommandEmpty>No results found.</CommandEmpty>
          <CommandGroup style={{ maxHeight: maxHeight, overflowY: 'auto' }}>
            {options.map((option) => (
              <CommandItem
                key={option.value}
                value={option.label} // Use label for searchability
                onSelect={() => {
                  onChange(option.value === value ? undefined : option.value);
                  setOpen(false);
                }}
              >
                {option.label}
                <CheckIcon
                  className={cn(
                    "ml-auto h-4 w-4",
                    option.value === value ? "opacity-100" : "opacity-0"
                  )}
                />
              </CommandItem>
            ))}
          </CommandGroup>
        </Command>
      </PopoverContent>
    </Popover>
  );
};


const missionaryFormSchema = z.object({
  name: z.string().min(2, "Name is required"),
  type: z.enum(["elders", "sisters"], { required_error: "Type is required" }),
  phoneNumber: z.string().optional(), // Made optional, as per schema, but will enforce if needed later
  emailAddress: z.string().email("A valid email is required").refine(
    (email) => email.endsWith("@missionary.org"),
    "Email must be a @missionary.org address"
  ),
  password: z.string().min(6, "Password must be at least 6 characters"),
  congregationId: z.number({ required_error: "Congregation is required" }), // Ensure congregationId is a number
});

interface AddMissionaryDialogProps {
  isOpen: boolean;
  onClose: () => void;
  // Removed congregationId prop, as it will now be selected via Combobox
  onSubmit: (data: z.infer<typeof missionaryFormSchema>) => void; // Added onSubmit prop
  isLoading: boolean; // Added isLoading prop
}

export function AddMissionaryDialog({ isOpen, onClose, onSubmit, isLoading }: AddMissionaryDialogProps) {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Fetch all congregations for the Combobox
  const { data: congregations, isLoading: isLoadingCongregations } = useQuery<Congregation[]>({
    queryKey: ['congregations'],
    queryFn: async () => {
      const response = await fetch('/api/admin/congregations');
      if (!response.ok) {
        throw new Error('Failed to fetch congregations');
      }
      return response.json();
    },
  });

  const congregationOptions = congregations?.map(c => ({
    label: c.name,
    value: c.id,
  })) || [];

  const form = useForm<z.infer<typeof missionaryFormSchema>>({
    resolver: zodResolver(missionaryFormSchema),
    defaultValues: {
      name: "",
      type: "elders",
      phoneNumber: "",
      emailAddress: "",
      password: "",
      congregationId: undefined, // Default to undefined to force selection
    },
  });

  // Removed direct mutation call, now using onSubmit prop from parent
  // const createMissionaryMutation = useMutation({ ... });


  function handleSubmit(data: z.infer<typeof missionaryFormSchema>) {
    onSubmit(data); // Call the onSubmit prop passed from MissionaryList
  }

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[600px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Add New Missionary</DialogTitle>
          <DialogDescription>
            Enter the details for the new missionary.
          </DialogDescription>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Name</FormLabel>
                  <FormControl>
                    <Input placeholder="Elder Smith & Elder Johnson" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="type"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Type</FormLabel>
                    <Select onValueChange={field.onChange} defaultValue={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Select type" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="elders">Elders</SelectItem>
                        <SelectItem value="sisters">Sisters</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="phoneNumber"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Phone Number (Optional)</FormLabel>
                    <FormControl>
                      <Input placeholder="555-123-4567" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>
            <FormField
              control={form.control}
              name="emailAddress"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Email Address</FormLabel>
                  <FormControl>
                    <Input placeholder="name@missionary.org" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="password"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Initial Password</FormLabel>
                  <FormControl>
                    <Input type="password" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="congregationId"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Congregation</FormLabel>
                  <FormControl>
                    <Combobox
                      options={congregationOptions}
                      value={field.value}
                      onChange={field.onChange}
                      placeholder={isLoadingCongregations ? "Loading congregations..." : "Select a congregation"}
                      className="w-full"
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <DialogFooter>
              <Button variant="outline" type="button" onClick={onClose}>
                Cancel
              </Button>
              <Button type="submit" disabled={isLoading}>
                {isLoading ? "Adding..." : "Add Missionary"}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}