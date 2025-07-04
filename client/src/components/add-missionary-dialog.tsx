import { useState } from "react";
import { z } from "zod";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation } from "@tanstack/react-query";
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
import { Mail, RefreshCw, User, Lock, CalendarIcon, Eye, EyeOff } from "lucide-react";
import { format } from "date-fns";

// Form schema for adding a new missionary
const addMissionarySchema = z.object({
  name: z.string().min(2, { message: "Missionary name is required" }),
  type: z.enum(["elders", "sisters"], { required_error: "Please select missionary type" }),
  phoneNumber: z.string().min(10, { message: "Please enter a valid phone number" }),
  personalPhone: z.string().optional().or(z.literal("")),
  emailAddress: z.string().email("Please enter a valid email address").refine(
    (email) => email.endsWith('@missionary.org'),
    "Email must be a @missionary.org address"
  ),
  whatsappNumber: z.string().optional().or(z.literal("")),
  messengerAccount: z.string().optional().or(z.literal("")),
  preferredNotification: z.enum(["email", "whatsapp", "text", "messenger"]),
  active: z.boolean().default(true),
  foodAllergies: z.string().optional().or(z.literal("")),
  petAllergies: z.string().optional().or(z.literal("")),
  allergySeverity: z.enum(["mild", "moderate", "severe", "life-threatening"]).optional(),
  favoriteMeals: z.string().optional().or(z.literal("")),
  dietaryRestrictions: z.string().optional().or(z.literal("")),
  transferDate: z.date().optional().nullable(),
  notificationScheduleType: z.enum(["before_meal", "day_of", "weekly_summary", "multiple"]),
  hoursBefore: z.number().min(1).max(48).optional(),
  dayOfTime: z.string().optional().or(z.literal("")),
  weeklySummaryDay: z.enum(["sunday", "monday", "tuesday", "wednesday", "thursday", "friday", "saturday"]).optional(),
  weeklySummaryTime: z.string().optional().or(z.literal("")),
  password: z.string().min(4, "Password must be at least 4 characters").max(20, "Maximum 20 characters for password"),
});

interface AddMissionaryDialogProps {
  isOpen: boolean;
  onClose: () => void;
  wardId: number;
}

export function AddMissionaryDialog({ isOpen, onClose, wardId }: AddMissionaryDialogProps) {
  const { toast } = useToast();
  const [showPassword, setShowPassword] = useState(false);

  const form = useForm<z.infer<typeof addMissionarySchema>>({
    resolver: zodResolver(addMissionarySchema),
    defaultValues: {
      name: "",
      type: "elders", // Default type
      phoneNumber: "",
      personalPhone: "",
      emailAddress: "",
      whatsappNumber: "",
      messengerAccount: "",
      preferredNotification: "email", // Default notification method
      active: true,
      foodAllergies: "",
      petAllergies: "",
      allergySeverity: "mild",
      favoriteMeals: "",
      dietaryRestrictions: "",
      transferDate: null,
      notificationScheduleType: "before_meal",
      hoursBefore: 3,
      dayOfTime: "09:00",
      weeklySummaryDay: "sunday",
      weeklySummaryTime: "18:00",
      password: "",
    },
  });

  const createMissionaryMutation = useMutation({
    mutationFn: async (data: z.infer<typeof addMissionarySchema>) => {
      // Ensure transferDate is formatted to ISO string or null
      const formattedData = {
        ...data,
        wardId: wardId, // Ensure wardId is attached
        transferDate: data.transferDate ? format(data.transferDate, 'yyyy-MM-dd') : null,
      };
      const res = await apiRequest("POST", "/api/admin/missionaries", formattedData);
      return await res.json();
    },
    onSuccess: () => {
      toast({
        title: "Missionary added",
        description: "New missionary account created successfully!",
      });
      form.reset();
      queryClient.invalidateQueries({ queryKey: ["/api/admin/missionaries/ward", wardId] });
      onClose();
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: error.message || "Failed to add missionary. Please try again.",
        variant: "destructive",
      });
    },
  });

  function onSubmit(values: z.infer<typeof addMissionarySchema>) {
    createMissionaryMutation.mutate(values);
  }

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-[600px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <User className="h-5 w-5 text-primary" />
            Add New Missionary
          </DialogTitle>
          <DialogDescription>
            Create a new missionary account and set their initial details.
          </DialogDescription>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <h4 className="font-semibold text-gray-900 mt-4">Basic Information</h4>
            <FormField
              control={form.control}
              name="name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Full Name</FormLabel>
                  <FormControl>
                    <Input placeholder="Elder Johnson & Elder Smith" {...field} />
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

            <h4 className="font-semibold text-gray-900 mt-6">Contact Information</h4>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="phoneNumber"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Mission Phone Number</FormLabel>
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

            <FormField
                control={form.control}
                name="messengerAccount"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Messenger Account (Optional)</FormLabel>
                    <FormControl>
                      <Input placeholder="missionaries.example" {...field} />
                    </FormControl>
                    <FormDescription>
                      Facebook Messenger username for notifications
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />

            <h4 className="font-semibold text-gray-900 mt-6">Dietary & Preferences</h4>
            <div className="space-y-4 p-4 bg-gray-50 rounded-lg">

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
                    <FormLabel>Allergy Severity (Optional)</FormLabel>
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

            <h4 className="font-semibold text-gray-900 mt-6">Notification Settings</h4>
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
                          <RadioGroupItem value="whatsapp" />
                        </FormControl>
                        <FormLabel className="font-normal">
                          WhatsApp Notifications
                        </FormLabel>
                      </FormItem>
                      <FormItem className="flex items-center space-x-3 space-y-0">
                        <FormControl>
                          <RadioGroupItem value="text" />
                        </FormControl>
                        <FormLabel className="font-normal">
                          SMS Text Message (Legacy)
                        </FormLabel>
                      </FormItem>
                      <FormItem className="flex items-center space-x-3 space-y-0">
                        <FormControl>
                          <RadioGroupItem value="messenger" />
                        </FormControl>
                        <FormLabel className="font-normal">
                          Messenger (Legacy)
                        </FormLabel>
                      </FormItem>
                    </RadioGroup>
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

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

            <h4 className="font-semibold text-gray-900 mt-6">Transfer Information</h4>
            <FormField
              control={form.control}
              name="transferDate"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Transfer Date (Optional)</FormLabel>
                  <FormControl>
                    <Input 
                      type="date"
                      value={field.value ? format(field.value, 'yyyy-MM-dd') : ''}
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

            <h4 className="font-semibold text-gray-900 mt-6">Portal Access Password</h4>
            <FormField
              control={form.control}
              name="password"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Initial Portal Password</FormLabel>
                  <div className="relative">
                    <FormControl>
                      <Input 
                        type={showPassword ? "text" : "password"} 
                        placeholder="Set a password for their portal access" 
                        {...field} 
                      />
                    </FormControl>
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600"
                    >
                      {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </button>
                  </div>
                  <FormDescription>
                    Missionaries will use this to sign into their portal. They can change it later.
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />

            <DialogFooter>
              <Button variant="outline" type="button" onClick={onClose}>
                Cancel
              </Button>
              <Button type="submit" disabled={createMissionaryMutation.isPending}>
                {createMissionaryMutation.isPending ? "Creating..." : "Add Missionary"}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
