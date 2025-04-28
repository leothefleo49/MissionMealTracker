import { useState, useEffect } from "react";
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

// Form schema
const missionaryFormSchema = z.object({
  name: z.string().min(2, { message: "Missionary name is required" }),
  type: z.enum(["elders", "sisters"]),
  phoneNumber: z.string().min(10, { message: "Please enter a valid phone number" }),
  messengerAccount: z.string().optional(),
  preferredNotification: z.enum(["text", "messenger"]),
  active: z.boolean().default(true),
  notificationScheduleType: z.enum(["before_meal", "day_of", "weekly_summary", "multiple"]),
  hoursBefore: z.number().min(1).max(48).optional(),
  dayOfTime: z.string().optional(),
  weeklySummaryDay: z.enum(["sunday", "monday", "tuesday", "wednesday", "thursday", "friday", "saturday"]).optional(),
  weeklySummaryTime: z.string().optional(),
  dietaryRestrictions: z.string().optional(),
  wardId: z.number(),
});

interface Missionary {
  id: number;
  name: string;
  type: "elders" | "sisters";
  phoneNumber: string;
  messengerAccount?: string;
  preferredNotification: "text" | "messenger";
  active: boolean;
  notificationScheduleType: string;
  hoursBefore?: number;
  dayOfTime?: string;
  weeklySummaryDay?: string;
  weeklySummaryTime?: string;
  dietaryRestrictions?: string;
  wardId: number;
}

interface EditMissionaryDialogProps {
  isOpen: boolean;
  onClose: () => void;
  missionary: Missionary;
}

export function EditMissionaryDialog({ isOpen, onClose, missionary }: EditMissionaryDialogProps) {
  const { toast } = useToast();
  const [isMessenger, setIsMessenger] = useState(missionary.preferredNotification === "messenger");
  
  // Set up form with missionary data
  const form = useForm<z.infer<typeof missionaryFormSchema>>({
    resolver: zodResolver(missionaryFormSchema),
    defaultValues: {
      name: missionary.name,
      type: missionary.type,
      phoneNumber: missionary.phoneNumber,
      messengerAccount: missionary.messengerAccount || "",
      preferredNotification: missionary.preferredNotification,
      active: missionary.active,
      notificationScheduleType: missionary.notificationScheduleType as any, // Type casting for compatibility
      hoursBefore: missionary.hoursBefore || 3,
      dayOfTime: missionary.dayOfTime || "08:00",
      weeklySummaryDay: missionary.weeklySummaryDay as any || "sunday", // Type casting for compatibility
      weeklySummaryTime: missionary.weeklySummaryTime || "08:00",
      dietaryRestrictions: missionary.dietaryRestrictions || "",
      wardId: missionary.wardId,
    },
  });
  
  // Mutation for updating missionary
  const updateMissionary = useMutation({
    mutationFn: async (data: z.infer<typeof missionaryFormSchema>) => {
      const res = await apiRequest("PATCH", `/api/admin/missionaries/${missionary.id}`, data);
      return await res.json();
    },
    onSuccess: () => {
      toast({
        title: "Missionary updated",
        description: "The missionary has been successfully updated.",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/admin/missionaries/ward", missionary.wardId] });
      onClose();
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: error.message || "Failed to update missionary. Please try again.",
        variant: "destructive",
      });
    },
  });
  
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
  function onSubmit(data: z.infer<typeof missionaryFormSchema>) {
    updateMissionary.mutate(data);
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
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
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
            
            <FormField
              control={form.control}
              name="dietaryRestrictions"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Dietary Restrictions/Allergies</FormLabel>
                  <FormControl>
                    <Textarea 
                      placeholder="Example: Gluten-free, allergic to peanuts, dairy-free, etc."
                      {...field}
                    />
                  </FormControl>
                  <FormDescription>
                    List any food allergies or dietary restrictions that meal providers should be aware of.
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
                      onValueChange={(value: "text" | "messenger") => {
                        field.onChange(value);
                        setIsMessenger(value === "messenger");
                      }}
                      defaultValue={field.value}
                      className="flex flex-col space-y-1"
                    >
                      <FormItem className="flex items-center space-x-3 space-y-0">
                        <FormControl>
                          <RadioGroupItem value="text" />
                        </FormControl>
                        <FormLabel className="font-normal">
                          Text Message
                        </FormLabel>
                      </FormItem>
                      <FormItem className="flex items-center space-x-3 space-y-0">
                        <FormControl>
                          <RadioGroupItem value="messenger" />
                        </FormControl>
                        <FormLabel className="font-normal">
                          Facebook Messenger
                        </FormLabel>
                      </FormItem>
                    </RadioGroup>
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            
            <div className="grid grid-cols-1 gap-4">
              {!isMessenger ? (
                <FormField
                  control={form.control}
                  name="phoneNumber"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Phone Number</FormLabel>
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
              ) : (
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
                          value={field.value || ""}
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
            
            <DialogFooter>
              <Button variant="outline" type="button" onClick={onClose}>
                Cancel
              </Button>
              <Button type="submit" disabled={updateMissionary.isPending}>
                {updateMissionary.isPending ? "Saving..." : "Save Changes"}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}