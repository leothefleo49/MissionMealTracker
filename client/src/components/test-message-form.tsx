import { useState } from "react";
import { z } from "zod";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { format } from "date-fns";
import { useMutation } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { CalendarIcon, Send } from "lucide-react";
import { cn } from "@/lib/utils";
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
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

// Schema for test message form
const testMessageSchema = z.object({
  phoneNumber: z.string().min(10, { message: "Please enter a valid phone number" }),
  messageType: z.enum(["meal_reminder", "day_of", "weekly_summary", "custom"]),
  notificationMethod: z.enum(["text", "messenger"]),
  messengerAccount: z.string().optional(),
  schedulingOption: z.enum(["now", "scheduled"]),
  scheduledDate: z.date().optional(),
  scheduledTime: z.string().optional(),
  customMessage: z.string().min(1, { message: "Message is required" }).optional(),
  mealDetails: z.object({
    hostName: z.string().optional(),
    date: z.date().optional(),
    startTime: z.string().optional(),
    mealDescription: z.string().optional(),
    specialNotes: z.string().optional(),
  }).optional(),
});

type TestMessageFormProps = {
  wardId: number | null;
};

export function TestMessageForm({ wardId }: TestMessageFormProps) {
  const { toast } = useToast();
  const [activeTab, setActiveTab] = useState<string>("meal_reminder");
  
  const form = useForm<z.infer<typeof testMessageSchema>>({
    resolver: zodResolver(testMessageSchema),
    defaultValues: {
      phoneNumber: "",
      messageType: "meal_reminder",
      notificationMethod: "text",
      messengerAccount: "",
      schedulingOption: "now",
      customMessage: "",
      mealDetails: {
        hostName: "Test Host",
        date: new Date(),
        startTime: "17:30",
        mealDescription: "Test meal: Spaghetti and meatballs",
        specialNotes: "Please park on the street",
      },
    },
  });
  
  // Update the messageType when tab changes
  const handleTabChange = (value: string) => {
    setActiveTab(value);
    form.setValue("messageType", value as any);
  };
  
  // Watch values for conditional rendering
  const messageType = form.watch("messageType");
  const notificationMethod = form.watch("notificationMethod");
  const schedulingOption = form.watch("schedulingOption");
  
  // Send test message mutation
  const sendTestMessage = useMutation({
    mutationFn: async (data: z.infer<typeof testMessageSchema>) => {
      // If no ward is selected, show error
      if (!wardId) {
        throw new Error("Please select a ward before sending a test message");
      }
      
      const payload = {
        ...data,
        wardId,
        scheduledDate: data.scheduledDate ? format(data.scheduledDate, "yyyy-MM-dd") : undefined,
        mealDetails: data.mealDetails && data.messageType !== "custom" ? {
          ...data.mealDetails,
          date: data.mealDetails.date ? format(data.mealDetails.date, "yyyy-MM-dd") : undefined,
        } : undefined,
      };
      
      const res = await apiRequest("POST", "/api/admin/test-message", payload);
      return await res.json();
    },
    onSuccess: () => {
      toast({
        title: "Test message sent",
        description: schedulingOption === "now" 
          ? "The test message has been sent successfully." 
          : "The test message has been scheduled successfully.",
      });
      form.reset({
        ...form.getValues(),
        customMessage: "",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Error sending test message",
        description: error.message || "Failed to send test message. Please try again.",
        variant: "destructive",
      });
    },
  });
  
  // Form submission handler
  function onSubmit(data: z.infer<typeof testMessageSchema>) {
    // Validate scheduled date/time
    if (data.schedulingOption === "scheduled") {
      if (!data.scheduledDate) {
        toast({
          title: "Date required",
          description: "Please select a date for scheduled messages",
          variant: "destructive",
        });
        return;
      }
      
      if (!data.scheduledTime) {
        toast({
          title: "Time required",
          description: "Please select a time for scheduled messages",
          variant: "destructive",
        });
        return;
      }
    }
    
    // Validate messenger account if method is messenger
    if (data.notificationMethod === "messenger" && !data.messengerAccount) {
      toast({
        title: "Messenger account required",
        description: "Please enter a messenger account for messenger notifications",
        variant: "destructive",
      });
      return;
    }
    
    // Custom message is required if message type is custom
    if (data.messageType === "custom" && !data.customMessage) {
      toast({
        title: "Message required",
        description: "Please enter a custom message",
        variant: "destructive",
      });
      return;
    }
    
    // If no ward is selected, show error
    if (!wardId) {
      toast({
        title: "Ward required",
        description: "Please select a ward before sending a test message",
        variant: "destructive",
      });
      return;
    }
    
    sendTestMessage.mutate(data);
  }
  
  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
        <div className="grid gap-4 sm:grid-cols-2">
          <FormField
            control={form.control}
            name="phoneNumber"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Target Phone Number</FormLabel>
                <FormControl>
                  <Input placeholder="e.g. 5551234567" {...field} />
                </FormControl>
                <FormDescription>
                  Enter the phone number to receive the test message
                </FormDescription>
                <FormMessage />
              </FormItem>
            )}
          />
          
          <FormField
            control={form.control}
            name="notificationMethod"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Notification Method</FormLabel>
                <Select onValueChange={field.onChange} defaultValue={field.value}>
                  <FormControl>
                    <SelectTrigger>
                      <SelectValue placeholder="Select notification method" />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    <SelectItem value="text">Text Message</SelectItem>
                    <SelectItem value="messenger">Facebook Messenger</SelectItem>
                  </SelectContent>
                </Select>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>
        
        {notificationMethod === "messenger" && (
          <FormField
            control={form.control}
            name="messengerAccount"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Messenger Account</FormLabel>
                <FormControl>
                  <Input placeholder="e.g. username123" {...field} />
                </FormControl>
                <FormDescription>
                  Enter the Facebook Messenger account name
                </FormDescription>
                <FormMessage />
              </FormItem>
            )}
          />
        )}
        
        <div className="border rounded-md p-4 space-y-4">
          <h3 className="font-medium">Message Settings</h3>
          
          <Tabs value={activeTab} onValueChange={handleTabChange}>
            <TabsList className="grid grid-cols-4 w-full">
              <TabsTrigger value="meal_reminder">Meal Reminder</TabsTrigger>
              <TabsTrigger value="day_of">Day-of Reminder</TabsTrigger>
              <TabsTrigger value="weekly_summary">Weekly Summary</TabsTrigger>
              <TabsTrigger value="custom">Custom Message</TabsTrigger>
            </TabsList>
            
            <TabsContent value="meal_reminder" className="pt-4">
              <div className="space-y-4">
                <p className="text-sm text-muted-foreground">
                  Test the meal reminder notification with custom meal details.
                </p>
                
                <div className="grid gap-4 sm:grid-cols-2">
                  <FormField
                    control={form.control}
                    name="mealDetails.hostName"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Host Name</FormLabel>
                        <FormControl>
                          <Input {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  
                  <FormField
                    control={form.control}
                    name="mealDetails.date"
                    render={({ field }) => (
                      <FormItem className="flex flex-col">
                        <FormLabel>Meal Date</FormLabel>
                        <Popover>
                          <PopoverTrigger asChild>
                            <FormControl>
                              <Button
                                variant={"outline"}
                                className={cn(
                                  "pl-3 text-left font-normal",
                                  !field.value && "text-muted-foreground"
                                )}
                              >
                                {field.value ? (
                                  format(field.value, "PPP")
                                ) : (
                                  <span>Pick a date</span>
                                )}
                                <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                              </Button>
                            </FormControl>
                          </PopoverTrigger>
                          <PopoverContent className="w-auto p-0" align="start">
                            <Calendar
                              mode="single"
                              selected={field.value}
                              onSelect={field.onChange}
                              initialFocus
                            />
                          </PopoverContent>
                        </Popover>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>
                
                <div className="grid gap-4 sm:grid-cols-2">
                  <FormField
                    control={form.control}
                    name="mealDetails.startTime"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Meal Time</FormLabel>
                        <FormControl>
                          <Input type="time" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  
                  <FormField
                    control={form.control}
                    name="mealDetails.mealDescription"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Meal Description</FormLabel>
                        <FormControl>
                          <Input {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>
                
                <FormField
                  control={form.control}
                  name="mealDetails.specialNotes"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Special Notes</FormLabel>
                      <FormControl>
                        <Textarea rows={2} {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
            </TabsContent>
            
            <TabsContent value="day_of" className="pt-4">
              <div className="space-y-4">
                <p className="text-sm text-muted-foreground">
                  Test the day-of reminder that includes all meals scheduled for a specific day.
                </p>
                
                <div className="grid gap-4 sm:grid-cols-2">
                  <FormField
                    control={form.control}
                    name="mealDetails.date"
                    render={({ field }) => (
                      <FormItem className="flex flex-col">
                        <FormLabel>Date for Day-of Reminder</FormLabel>
                        <Popover>
                          <PopoverTrigger asChild>
                            <FormControl>
                              <Button
                                variant={"outline"}
                                className={cn(
                                  "pl-3 text-left font-normal",
                                  !field.value && "text-muted-foreground"
                                )}
                              >
                                {field.value ? (
                                  format(field.value, "PPP")
                                ) : (
                                  <span>Pick a date</span>
                                )}
                                <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                              </Button>
                            </FormControl>
                          </PopoverTrigger>
                          <PopoverContent className="w-auto p-0" align="start">
                            <Calendar
                              mode="single"
                              selected={field.value}
                              onSelect={field.onChange}
                              initialFocus
                            />
                          </PopoverContent>
                        </Popover>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>
              </div>
            </TabsContent>
            
            <TabsContent value="weekly_summary" className="pt-4">
              <div className="space-y-4">
                <p className="text-sm text-muted-foreground">
                  Test the weekly summary that shows all meals for the coming week.
                </p>
              </div>
            </TabsContent>
            
            <TabsContent value="custom" className="pt-4">
              <div className="space-y-4">
                <p className="text-sm text-muted-foreground">
                  Send a completely custom message.
                </p>
                
                <FormField
                  control={form.control}
                  name="customMessage"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Custom Message</FormLabel>
                      <FormControl>
                        <Textarea 
                          rows={5} 
                          placeholder="Enter your custom message here..." 
                          {...field} 
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
            </TabsContent>
          </Tabs>
        </div>
        
        <div className="border rounded-md p-4 space-y-4">
          <h3 className="font-medium">Delivery Options</h3>
          
          <FormField
            control={form.control}
            name="schedulingOption"
            render={({ field }) => (
              <FormItem className="space-y-3">
                <FormLabel>When to send</FormLabel>
                <FormControl>
                  <RadioGroup
                    onValueChange={field.onChange}
                    defaultValue={field.value}
                    className="flex flex-col space-y-1"
                  >
                    <FormItem className="flex items-center space-x-3 space-y-0">
                      <FormControl>
                        <RadioGroupItem value="now" />
                      </FormControl>
                      <FormLabel className="font-normal">
                        Send immediately
                      </FormLabel>
                    </FormItem>
                    <FormItem className="flex items-center space-x-3 space-y-0">
                      <FormControl>
                        <RadioGroupItem value="scheduled" />
                      </FormControl>
                      <FormLabel className="font-normal">
                        Schedule for later
                      </FormLabel>
                    </FormItem>
                  </RadioGroup>
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          
          {schedulingOption === "scheduled" && (
            <div className="grid gap-4 sm:grid-cols-2">
              <FormField
                control={form.control}
                name="scheduledDate"
                render={({ field }) => (
                  <FormItem className="flex flex-col">
                    <FormLabel>Scheduled Date</FormLabel>
                    <Popover>
                      <PopoverTrigger asChild>
                        <FormControl>
                          <Button
                            variant={"outline"}
                            className={cn(
                              "pl-3 text-left font-normal",
                              !field.value && "text-muted-foreground"
                            )}
                          >
                            {field.value ? (
                              format(field.value, "PPP")
                            ) : (
                              <span>Pick a date</span>
                            )}
                            <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                          </Button>
                        </FormControl>
                      </PopoverTrigger>
                      <PopoverContent className="w-auto p-0" align="start">
                        <Calendar
                          mode="single"
                          selected={field.value}
                          onSelect={field.onChange}
                          initialFocus
                        />
                      </PopoverContent>
                    </Popover>
                    <FormMessage />
                  </FormItem>
                )}
              />
              
              <FormField
                control={form.control}
                name="scheduledTime"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Scheduled Time</FormLabel>
                    <FormControl>
                      <Input type="time" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>
          )}
        </div>
        
        <Button 
          type="submit" 
          className="w-full flex items-center justify-center"
          disabled={sendTestMessage.isPending || !wardId}
        >
          <Send className="mr-2 h-4 w-4" />
          {sendTestMessage.isPending 
            ? "Sending..." 
            : schedulingOption === "scheduled" 
              ? "Schedule Test Message" 
              : "Send Test Message Now"
          }
        </Button>
        
        {!wardId && (
          <p className="text-sm text-amber-600 text-center">
            Please select a ward first to enable test messaging
          </p>
        )}
      </form>
    </Form>
  );
}