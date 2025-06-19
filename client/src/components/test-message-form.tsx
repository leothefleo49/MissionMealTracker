import { useState, useEffect } from "react";
import { z } from "zod";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { format } from "date-fns";
import { useMutation } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { CalendarIcon, Clock } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
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
import { cn } from "@/lib/utils";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { CustomRadio } from "@/components/custom-radio";
import { useToast } from "@/hooks/use-toast";

// Schema for test message form
const testMessageSchema = z.object({
  contactInfo: z.string().min(5, "Please enter a valid email address or WhatsApp number"),
  notificationMethod: z.enum(["email", "whatsapp"]),
  messageType: z.enum(["custom", "meal_reminder", "day_of", "weekly_summary"]),
  customMessage: z.string().optional(),
  schedulingOption: z.enum(["immediate", "scheduled"]),
  scheduledDate: z.date().optional(),
  scheduledTime: z.string().optional(),
  mealDetails: z.object({
    date: z.string().optional(),
    startTime: z.string().optional(),
    hostName: z.string().optional(),
    mealDescription: z.string().optional(),
    specialNotes: z.string().optional(),
  }).optional(),
  wardId: z.number(),
});

type TestMessageFormProps = {
  wardId: number | null;
};

export function TestMessageForm({ wardId }: TestMessageFormProps) {
  const { toast } = useToast();
  const [isCustomMessage, setIsCustomMessage] = useState(false);
  const [isScheduled, setIsScheduled] = useState(false);
  
  const form = useForm<z.infer<typeof testMessageSchema>>({
    resolver: zodResolver(testMessageSchema),
    defaultValues: {
      contactInfo: "",
      notificationMethod: "email",
      messageType: "custom",
      customMessage: "",
      schedulingOption: "immediate",
      scheduledDate: undefined,
      scheduledTime: "12:00",
      mealDetails: {
        date: format(new Date(), "yyyy-MM-dd"),
        startTime: "17:30",
        hostName: "Test Host",
        mealDescription: "Test meal for demonstration",
        specialNotes: "",
      },
      wardId: wardId || 0,
    },
  });
  
  // Set initial states based on form default values
  useEffect(() => {
    setIsCustomMessage(form.getValues("messageType") === "custom");
    setIsScheduled(form.getValues("schedulingOption") === "scheduled");
  }, []);
  
  const sendTestMessageMutation = useMutation({
    mutationFn: async (data: z.infer<typeof testMessageSchema>) => {
      const response = await apiRequest("POST", "/api/admin/test-message", data);
      return await response.json();
    },
    onSuccess: (data) => {
      // Check if this was a consent request vs. an actual message
      if (data.requiresConsent) {
        toast({
          title: "Consent Request Sent",
          description: "A consent request was sent. The recipient must reply with 'YES' followed by the verification code before receiving actual messages.",
          duration: 10000,
        });
      } else {
        toast({
          title: "Test message sent",
          description: "The test message was sent successfully!",
        });
        form.reset();
      }
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: error.message || "Failed to send test message",
        variant: "destructive",
      });
    },
  });
  
  function onSubmit(data: z.infer<typeof testMessageSchema>) {
    if (!wardId) {
      toast({
        title: "Error",
        description: "Please select a ward first",
        variant: "destructive",
      });
      return;
    }
    
    // Format the data before sending
    const formattedData = {
      ...data,
      wardId,
    };
    
    // Create a modified version for API submission
    const apiSubmission = {
      ...formattedData,
      // Convert date to string format if it exists
      scheduledDate: data.scheduledDate ? format(data.scheduledDate, "yyyy-MM-dd") : undefined,
    };
    
    sendTestMessageMutation.mutate(apiSubmission as any);
  }
  
  return (
    <Card className="w-full">
      <CardHeader>
        <CardTitle>Test Message</CardTitle>
        <CardDescription>
          Send a test email notification to verify Gmail functionality
        </CardDescription>
      </CardHeader>
      <CardContent>
        {!wardId ? (
          <div className="p-4 text-center">
            <p>Please select a ward first to send test messages</p>
          </div>
        ) : (
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
              {/* Contact Information */}
              <div className="grid gap-4 sm:grid-cols-2">
                <FormField
                  control={form.control}
                  name="contactInfo"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Contact Information</FormLabel>
                      <FormControl>
                        <Input placeholder="email@missionary.org" {...field} />
                      </FormControl>
                      <FormDescription>
                        Enter email address to receive test notification
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
                      <Select
                        onValueChange={field.onChange}
                        defaultValue={field.value}
                      >
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Select notification method" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="email">Email Notification</SelectItem>
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
              
              {/* Message Type */}
              <FormField
                control={form.control}
                name="messageType"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Message Type</FormLabel>
                    <FormControl>
                      <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
                        <CustomRadio
                          name="messageType"
                          value="custom"
                          checked={field.value === "custom"}
                          onChange={(value) => {
                            field.onChange(value);
                            setIsCustomMessage(value === "custom");
                          }}
                          label="Custom Message"
                        />
                        <CustomRadio
                          name="messageType"
                          value="meal_reminder"
                          checked={field.value === "meal_reminder"}
                          onChange={(value) => {
                            field.onChange(value);
                            setIsCustomMessage(value === "custom");
                          }}
                          label="Meal Reminder (Before Meal)"
                        />
                        <CustomRadio
                          name="messageType"
                          value="day_of"
                          checked={field.value === "day_of"}
                          onChange={(value) => {
                            field.onChange(value);
                            setIsCustomMessage(value === "custom");
                          }}
                          label="Day-of Reminder"
                        />
                        <CustomRadio
                          name="messageType"
                          value="weekly_summary"
                          checked={field.value === "weekly_summary"}
                          onChange={(value) => {
                            field.onChange(value);
                            setIsCustomMessage(value === "custom");
                          }}
                          label="Weekly Summary"
                        />
                      </div>
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              
              {/* Custom Message (conditional) */}
              {isCustomMessage && (
                <FormField
                  control={form.control}
                  name="customMessage"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Message Content</FormLabel>
                      <FormControl>
                        <Textarea
                          placeholder="Enter your test message here..."
                          className="min-h-[80px]"
                          {...field}
                        />
                      </FormControl>
                      <FormDescription>
                        Enter the custom message you want to send for testing
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              )}
              
              {/* Scheduling Options */}
              <FormField
                control={form.control}
                name="schedulingOption"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Scheduling</FormLabel>
                    <FormControl>
                      <div className="flex gap-4">
                        <CustomRadio
                          name="schedulingOption"
                          value="immediate"
                          checked={field.value === "immediate"}
                          onChange={(value) => {
                            field.onChange(value);
                            setIsScheduled(value === "scheduled");
                          }}
                          label="Send Immediately"
                        />
                        <CustomRadio
                          name="schedulingOption"
                          value="scheduled"
                          checked={field.value === "scheduled"}
                          onChange={(value) => {
                            field.onChange(value);
                            setIsScheduled(value === "scheduled");
                          }}
                          label="Schedule for Later"
                        />
                      </div>
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              
              {/* Scheduled Date and Time (conditional) */}
              {isScheduled && (
                <div className="grid gap-4 sm:grid-cols-2">
                  <FormField
                    control={form.control}
                    name="scheduledDate"
                    render={({ field }) => (
                      <FormItem className="flex flex-col">
                        <FormLabel>Date</FormLabel>
                        <Popover>
                          <PopoverTrigger asChild>
                            <FormControl>
                              <Button
                                variant={"outline"}
                                className={cn(
                                  "w-full pl-3 text-left font-normal",
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
                              disabled={(date) =>
                                date < new Date() || date < new Date("1900-01-01")
                              }
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
                      <FormItem className="relative">
                        <FormLabel>Time</FormLabel>
                        <div className="relative">
                          <FormControl>
                            <Input
                              type="time"
                              {...field}
                              value={field.value || ""}
                            />
                          </FormControl>
                          <Clock className="absolute right-3 top-2.5 h-4 w-4 opacity-50" />
                        </div>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>
              )}
              
              {/* Meal Details (for all non-custom messages) */}
              {!isCustomMessage && (
                <div className="border rounded-md p-4 space-y-4 mt-6">
                  <h3 className="font-medium">Test Meal Details</h3>
                  <div className="grid gap-4 sm:grid-cols-2">
                    <FormField
                      control={form.control}
                      name="mealDetails.date"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Meal Date</FormLabel>
                          <FormControl>
                            <Input type="date" {...field} value={field.value || ""} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    
                    <FormField
                      control={form.control}
                      name="mealDetails.startTime"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Start Time</FormLabel>
                          <FormControl>
                            <Input type="time" {...field} value={field.value || ""} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>
                  
                  <FormField
                    control={form.control}
                    name="mealDetails.hostName"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Host Name</FormLabel>
                        <FormControl>
                          <Input {...field} value={field.value || ""} placeholder="Host family name" />
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
                          <Input {...field} value={field.value || ""} placeholder="What will be served" />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  
                  <FormField
                    control={form.control}
                    name="mealDetails.specialNotes"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Special Notes</FormLabel>
                        <FormControl>
                          <Textarea 
                            {...field} 
                            value={field.value || ""} 
                            placeholder="Any special instructions, allergies, etc."
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>
              )}
              
              <Button 
                type="submit" 
                className="w-full" 
                disabled={sendTestMessageMutation.isPending}
              >
                {sendTestMessageMutation.isPending ? "Sending..." : "Send Test Message"}
              </Button>
            </form>
          </Form>
        )}
      </CardContent>
    </Card>
  );
}