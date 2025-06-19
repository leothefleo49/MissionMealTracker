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
  transferDate: z.date().optional(),
  notificationScheduleType: z.enum(["before_meal", "day_of", "weekly_summary", "multiple"]),
  hoursBefore: z.number().min(1).max(48).optional(),
  dayOfTime: z.string().optional(),
  weeklySummaryDay: z.enum(["sunday", "monday", "tuesday", "wednesday", "thursday", "friday", "saturday"]).optional(),
  weeklySummaryTime: z.string().optional(),
  wardId: z.number(),
});

interface Missionary {
  id: number;
  name: string;
  type: "elders" | "sisters";
  phoneNumber: string;
  personalPhone?: string;
  emailAddress?: string;
  emailVerified?: boolean;
  whatsappNumber?: string;
  messengerAccount?: string;
  preferredNotification: "email" | "whatsapp" | "text" | "messenger";
  active: boolean;
  foodAllergies?: string;
  petAllergies?: string;
  allergySeverity?: "mild" | "moderate" | "severe" | "life-threatening";
  favoriteMeals?: string;
  dietaryRestrictions?: string;
  transferDate?: Date | null;
  notificationScheduleType: string;
  hoursBefore?: number;
  dayOfTime?: string;
  weeklySummaryDay?: string;
  weeklySummaryTime?: string;
  wardId: number;
  // Consent management fields
  consentStatus: "pending" | "granted" | "denied";
  consentDate?: Date | null;
  consentVerificationToken?: string | null;
  consentVerificationSentAt?: Date | null;
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
        
        {/* Consent Status Section (non-editable) */}
        <div className="bg-gray-50 rounded-md p-3 mb-4 border border-gray-200">
          <h4 className="text-sm font-semibold mb-2">Consent Status</h4>
          <div className="flex items-center gap-2 mb-1">
            <div className={`inline-flex items-center px-2 py-1 rounded text-xs font-medium ${
              missionary.consentStatus === "granted" 
                ? "bg-green-100 text-green-800" 
                : missionary.consentStatus === "denied"
                ? "bg-red-100 text-red-800"
                : missionary.consentStatus === "pending" && missionary.consentVerificationSentAt
                ? "bg-yellow-100 text-yellow-800"
                : "bg-gray-100 text-gray-800"
            }`}>
              {missionary.consentStatus === "granted" 
                ? "Consent Granted" 
                : missionary.consentStatus === "denied" 
                ? "Consent Denied" 
                : missionary.consentStatus === "pending" && missionary.consentVerificationSentAt
                ? "Verification Sent"
                : "No Consent Requested"}
            </div>
          </div>
          {missionary.consentDate && (
            <p className="text-xs text-gray-600">
              Last updated: {new Date(missionary.consentDate).toLocaleDateString()} {new Date(missionary.consentDate).toLocaleTimeString()}
            </p>
          )}
          {missionary.consentVerificationSentAt && missionary.consentStatus === "pending" && (
            <p className="text-xs text-gray-600">
              Verification sent: {new Date(missionary.consentVerificationSentAt).toLocaleDateString()} {new Date(missionary.consentVerificationSentAt).toLocaleTimeString()}
            </p>
          )}
          <p className="text-xs text-gray-500 mt-2">
            Note: Consent must be verified by the missionary via text message before notifications can be sent.
          </p>
        </div>
        
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
            
            {/* Contact Information */}
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
                    <FormLabel>Personal Phone Number</FormLabel>
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
                    <FormLabel>WhatsApp Number</FormLabel>
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
                      <FormLabel>Food Allergies</FormLabel>
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
                      <FormLabel>Pet Allergies</FormLabel>
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
                    <FormLabel>Favorite Meals</FormLabel>
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
                    <FormLabel>Other Dietary Restrictions</FormLabel>
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
                  <FormLabel>Transfer Date</FormLabel>
                  <FormControl>
                    <Input 
                      type="date"
                      value={field.value ? field.value.toISOString().split('T')[0] : ''}
                      onChange={(e) => field.onChange(e.target.value ? new Date(e.target.value) : undefined)}
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
                          Email (Free)
                        </FormLabel>
                      </FormItem>
                      <FormItem className="flex items-center space-x-3 space-y-0">
                        <FormControl>
                          <RadioGroupItem value="whatsapp" />
                        </FormControl>
                        <FormLabel className="font-normal">
                          WhatsApp (Free)
                        </FormLabel>
                      </FormItem>
                      <FormItem className="flex items-center space-x-3 space-y-0 opacity-50">
                        <FormControl>
                          <RadioGroupItem value="text" disabled />
                        </FormControl>
                        <FormLabel className="font-normal">
                          SMS Text (Requires Permission)
                        </FormLabel>
                      </FormItem>
                      <FormItem className="flex items-center space-x-3 space-y-0 opacity-50">
                        <FormControl>
                          <RadioGroupItem value="messenger" disabled />
                        </FormControl>
                        <FormLabel className="font-normal">
                          Messenger (Requires Permission)
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
            
            <DialogFooter className="flex-col items-stretch sm:items-end">
              <div className="flex justify-end space-x-2 mb-2">
                <Button variant="outline" type="button" onClick={onClose}>
                  Cancel
                </Button>
                <Button type="submit" disabled={updateMissionary.isPending}>
                  {updateMissionary.isPending ? "Saving..." : "Save Changes"}
                </Button>
              </div>
              
              <div className="text-xs text-gray-500 bg-gray-50 p-2 rounded border border-gray-200 mt-4">
                <p>To request consent for notifications, close this dialog and use the messaging button in the missionary list view.</p>
                <p className="mt-1">Missionaries must reply with "YES" followed by the verification code they receive via text message.</p>
              </div>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}