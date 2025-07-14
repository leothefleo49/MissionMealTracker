// client/src/components/edit-missionary-dialog.tsx
import { useState, useEffect } from "react";
import { z } from "zod";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation, useQuery } from "@tanstack/react-query"; // Import useQuery
import { apiRequest, queryClient } from "@/lib/queryClient";
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
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"; // Import Popover components
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem } from "@/components/ui/command"; // Import Command components
import { CaretSortIcon, CheckIcon } from "@radix-ui/react-icons"; // Import icons
import { cn } from "@/lib/utils"; // Import cn utility
import type { Missionary, Congregation } from "@shared/schema"; // Import Congregation type

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

// Form schema
const missionaryFormSchema = z.object({
  name: z.string().min(2, { message: "Missionary name is required" }),
  type: z.enum(["elders", "sisters"]),
  phoneNumber: z.string().optional(), // Made optional
  personalPhone: z.string().optional(),
  emailAddress: z.string().refine((email) => {
    if (!email) return true; // Optional field
    return email.endsWith('@missionary.org');
  }, { message: "Email must end with @missionary.org" }).optional().or(z.literal("")),
  whatsappNumber: z.string().optional(),
  messengerAccount: z.string().optional(),
  preferredNotification: z.enum(["email", "whatsapp", "text", "messenger"]),
  active: z.boolean().default(true),
  foodAllergies: z.string().optional(),
  petAllergies: z.string().optional(),
  allergySeverity: z.enum(["mild", "moderate", "severe", "life-threatening"]).optional(),
  favoriteMeals: z.string().optional(),
  dietaryRestrictions: z.string().optional(),
  transferDate: z.date().optional().nullable(), // Allow null for transferDate
  notificationScheduleType: z.enum(["before_meal", "day_of", "weekly_summary", "multiple"]),
  hoursBefore: z.number().min(1).max(48).optional(),
  dayOfTime: z.string().optional(),
  weeklySummaryDay: z.enum(["sunday", "monday", "tuesday", "wednesday", "thursday", "friday", "saturday"]).optional(),
  weeklySummaryTime: z.string().optional(),
  congregationId: z.number({ required_error: "Congregation is required" }), // Ensure congregationId is a number
});

interface EditMissionaryDialogProps {
  isOpen: boolean;
  onClose: () => void;
  missionary: Missionary;
  onSubmit: (id: number, data: Partial<Missionary>) => void; // Added onSubmit prop
  isLoading: boolean; // Added isLoading prop
}

export function EditMissionaryDialog({ isOpen, onClose, missionary, onSubmit, isLoading }: EditMissionaryDialogProps) {
  const { toast } = useToast();
  const [isMessenger, setIsMessenger] = useState(missionary.preferredNotification === "messenger");

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


  // Set up form with missionary data
  const form = useForm<z.infer<typeof missionaryFormSchema>>({
    resolver: zodResolver(missionaryFormSchema),
    defaultValues: {
      name: missionary.name,
      type: missionary.type,
      phoneNumber: missionary.phoneNumber || "",
      personalPhone: missionary.personalPhone || "",
      emailAddress: missionary.emailAddress || "",
      whatsappNumber: missionary.whatsappNumber || "",
      messengerAccount: missionary.messengerAccount || "",
      preferredNotification: missionary.preferredNotification,
      active: missionary.active,
      foodAllergies: missionary.foodAllergies || "",
      petAllergies: missionary.petAllergies || "",
      allergySeverity: missionary.allergySeverity || "mild",
      favoriteMeals: missionary.favoriteMeals || "",
      dietaryRestrictions: missionary.dietaryRestrictions || "",
      transferDate: missionary.transferDate ? new Date(missionary.transferDate) : undefined,
      notificationScheduleType: missionary.notificationScheduleType as any,
      hoursBefore: missionary.hoursBefore || 3,
      dayOfTime: missionary.dayOfTime || "08:00",
      weeklySummaryDay: missionary.weeklySummaryDay as any || "sunday",
      weeklySummaryTime: missionary.weeklySummaryTime || "08:00",
      congregationId: missionary.congregationId, // Set initial value from missionary prop
    },
  });

  // Reset form values when missionary prop changes (e.g., when editing a different missionary)
  useEffect(() => {
    if (missionary) {
      form.reset({
        name: missionary.name,
        type: missionary.type,
        phoneNumber: missionary.phoneNumber || "",
        personalPhone: missionary.personalPhone || "",
        emailAddress: missionary.emailAddress || "",
        whatsappNumber: missionary.whatsappNumber || "",
        messengerAccount: missionary.messengerAccount || "",
        preferredNotification: missionary.preferredNotification,
        active: missionary.active,
        foodAllergies: missionary.foodAllergies || "",
        petAllergies: missionary.petAllergies || "",
        allergySeverity: missionary.allergySeverity || "mild",
        favoriteMeals: missionary.favoriteMeals || "",
        dietaryRestrictions: missionary.dietaryRestrictions || "",
        transferDate: missionary.transferDate ? new Date(missionary.transferDate) : undefined,
        notificationScheduleType: missionary.notificationScheduleType as any,
        hoursBefore: missionary.hoursBefore || 3,
        dayOfTime: missionary.dayOfTime || "08:00",
        weeklySummaryDay: missionary.weeklySummaryDay as any || "sunday",
        weeklySummaryTime: missionary.weeklySummaryTime || "08:00",
        congregationId: missionary.congregationId,
      });
      setIsMessenger(missionary.preferredNotification === "messenger");
    }
  }, [missionary, form.reset]);


  // Watch for changes to preferredNotification to control UI display
  useEffect(() => {
    const subscription = form.watch((value, { name }) => {
      if (name === "preferredNotification") {
        setIsMessenger(value.preferredNotification === "messenger");
      }
    });
    return () => subscription.unsubscribe();
  }, [form.watch]);

  // Submit handler
  function handleSubmit(data: z.infer<typeof missionaryFormSchema>) {
    onSubmit(missionary.id, data); // Call the onSubmit prop passed from MissionaryList
  }

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-[600px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Edit Missionary</DialogTitle>
          <DialogDescription>
            Update missionary information and notification preferences.
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

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="type"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Type</FormLabel>
                    <Select onValueChange={field.onChange} defaultValue={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Select missionary type" />
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
                name="active"
                render={({ field }) => (
                  <FormItem className="flex flex-row items-end space-x-3 space-y-0 py-4">
                    <FormControl>
                      <Switch
                        checked={field.value}
                        onCheckedChange={field.onChange}
                      />
                    </FormControl>
                    <FormLabel>Active</FormLabel>
                  </FormItem>
                )}
              />
            </div>

            {/* Contact Information */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="phoneNumber"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Mission Phone Number (Official)</FormLabel>
                    <FormControl>
                      <Input placeholder="+1234567890" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="personalPhone"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Personal Phone Number (Optional)</FormLabel>
                    <FormControl>
                      <Input placeholder="+1234567890" {...field} />
                    </FormControl>
                    <FormDescription>
                      For emergency contact purposes
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="emailAddress"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Email Address</FormLabel>
                    <FormControl>
                      <Input placeholder="missionary@missionary.org" {...field} />
                    </FormControl>
                    <FormDescription>
                      Must end with @missionary.org
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="whatsappNumber"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>WhatsApp Number (Optional)</FormLabel>
                    <FormControl>
                      <Input placeholder="+1234567890" {...field} />
                    </FormControl>
                    <FormDescription>
                      Can be same as mission phone
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            {/* Dietary Information */}
            <div className="space-y-4 p-4 bg-gray-50 rounded-lg">
              <h4 className="font-semibold text-gray-900">Dietary Information</h4>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="foodAllergies"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Food Allergies (Optional)</FormLabel>
                      <FormControl>
                        <Textarea
                          placeholder="Peanuts, shellfish, dairy, etc."
                          {...field}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="petAllergies"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Pet Allergies (Optional)</FormLabel>
                      <FormControl>
                        <Textarea
                          placeholder="Cats, dogs, etc."
                          {...field}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <FormField
                control={form.control}
                name="allergySeverity"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Allergy Severity</FormLabel>
                    <Select onValueChange={field.onChange} defaultValue={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Select severity level" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="mild">Mild - Minor discomfort</SelectItem>
                        <SelectItem value="moderate">Moderate - Noticeable symptoms</SelectItem>
                        <SelectItem value="severe">Severe - Significant reaction</SelectItem>
                        <SelectItem value="life-threatening">Life-threatening - Anaphylaxis risk</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="favoriteMeals"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Favorite Meals (Optional)</FormLabel>
                    <FormControl>
                      <Textarea
                        placeholder="Pizza, tacos, lasagna, etc."
                        {...field}
                      />
                    </FormControl>
                    <FormDescription>
                      Help meal providers know what you enjoy
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="dietaryRestrictions"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Other Dietary Restrictions (Optional)</FormLabel>
                    <FormControl>
                      <Textarea
                        placeholder="Vegetarian, gluten-free, kosher, etc."
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            {/* Transfer Date */}
            <FormField
              control={form.control}
              name="transferDate"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Transfer Date (Optional)</FormLabel>
                  <FormControl>
                    <Input
                      type="date"
                      value={field.value ? field.value.toISOString().split('T')[0] : ''}
                      onChange={(e) => field.onChange(e.target.value ? new Date(e.target.value) : null)}
                    />
                  </FormControl>
                  <FormDescription>
                    Set to receive automatic reminders to update information
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="preferredNotification"
              render={({ field }) => (
                <FormItem className="space-y-3">
                  <FormLabel>Preferred Notification Method</FormLabel>
                  <FormControl>
                    <RadioGroup
                      onValueChange={(value: "email" | "whatsapp" | "text" | "messenger") => {
                        field.onChange(value);
                        setIsMessenger(value === "messenger");
                      }}
                      defaultValue={field.value}
                      className="grid grid-cols-2 gap-4"
                    >
                      <FormItem className="flex items-center space-x-3 space-y-0">
                        <FormControl>
                          <RadioGroupItem value="email" />
                        </FormControl>
                        <FormLabel className="font-normal">
                          Email Notifications
                        </FormLabel>
                      </FormItem>
                      <FormItem className="flex items-center space-x-3 space-y-0">
                        <FormControl>
                          <RadioGroupItem value="text" />
                        </FormControl>
                        <FormLabel className="font-normal">
                          SMS (Text Message)
                        </FormLabel>
                      </FormItem>
                      <FormItem className="flex items-center space-x-3 space-y-0">
                        <FormControl>
                          <RadioGroupItem value="whatsapp" />
                        </FormControl>
                        <FormLabel className="font-normal">
                          WhatsApp
                        </FormLabel>
                      </FormItem>
                      <FormItem className="flex items-center space-x-3 space-y-0">
                        <FormControl>
                          <RadioGroupItem value="messenger" />
                        </FormControl>
                        <FormLabel className="font-normal">
                          Messenger
                        </FormLabel>
                      </FormItem>
                    </RadioGroup>
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="grid grid-cols-1 gap-4">
              {form.watch("preferredNotification") === "text" && ( // Show phoneNumber field only for 'text'
                <FormField
                  control={form.control}
                  name="phoneNumber"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Phone Number for SMS</FormLabel>
                      <FormControl>
                        <Input placeholder="5551234567" {...field} />
                      </FormControl>
                      <FormDescription>
                        Phone number for SMS notifications
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              )}

              {form.watch("preferredNotification") === "whatsapp" && ( // Show whatsappNumber field only for 'whatsapp'
                <FormField
                  control={form.control}
                  name="whatsappNumber"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>WhatsApp Number</FormLabel>
                      <FormControl>
                        <Input
                          placeholder="+1234567890"
                          {...field}
                        />
                      </FormControl>
                      <FormDescription>
                        WhatsApp number for notifications
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              )}

              {form.watch("preferredNotification") === "messenger" && ( // Show messengerAccount field only for 'messenger'
                <FormField
                  control={form.control}
                  name="messengerAccount"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Messenger Account</FormLabel>
                      <FormControl>
                        <Input
                          placeholder="missionaries.example"
                          {...field}
                        />
                      </FormControl>
                      <FormDescription>
                        Facebook Messenger username for notifications
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              )}
            </div>

            <FormField
              control={form.control}
              name="notificationScheduleType"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Notification Schedule</FormLabel>
                  <Select onValueChange={field.onChange} defaultValue={field.value}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Select notification schedule" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      <SelectItem value="before_meal">Hours Before Meal</SelectItem>
                      <SelectItem value="day_of">Day Of (Morning)</SelectItem>
                      <SelectItem value="weekly_summary">Weekly Summary</SelectItem>
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />

            {form.watch("notificationScheduleType") === "before_meal" && (
              <FormField
                control={form.control}
                name="hoursBefore"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Hours Before</FormLabel>
                    <FormControl>
                      <Input
                        type="number"
                        min={1}
                        max={48}
                        {...field}
                        onChange={(e) => field.onChange(parseInt(e.target.value))}
                      />
                    </FormControl>
                    <FormDescription>
                      How many hours before the meal to send notification
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />
            )}

            {form.watch("notificationScheduleType") === "day_of" && (
              <FormField
                control={form.control}
                name="dayOfTime"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Time of Day</FormLabel>
                    <FormControl>
                      <Input type="time" {...field} />
                    </FormControl>
                    <FormDescription>
                      What time to send morning notifications
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />
            )}

            {form.watch("notificationScheduleType") === "weekly_summary" && (
              <>
                <FormField
                  control={form.control}
                  name="weeklySummaryDay"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Day of Week</FormLabel>
                      <Select onValueChange={field.onChange} defaultValue={field.value}>
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Select day" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="sunday">Sunday</SelectItem>
                          <SelectItem value="monday">Monday</SelectItem>
                          <SelectItem value="tuesday">Tuesday</SelectItem>
                          <SelectItem value="wednesday">Wednesday</SelectItem>
                          <SelectItem value="thursday">Thursday</SelectItem>
                          <SelectItem value="friday">Friday</SelectItem>
                          <SelectItem value="saturday">Saturday</SelectItem>
                        </SelectContent>
                      </Select>
                      <FormDescription>
                        Day to send weekly summary
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="weeklySummaryTime"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Time</FormLabel>
                      <FormControl>
                        <Input type="time" {...field} />
                      </FormControl>
                      <FormDescription>
                        Time to send weekly summary
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </>
            )}

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
                {isLoading ? "Saving..." : "Save Changes"}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}