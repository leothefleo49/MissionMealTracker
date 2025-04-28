import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { format } from "date-fns";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
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
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { getTimeOptions, formatTimeFrom24To12 } from "@/lib/utils";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";

// Form validation schema
const formSchema = z.object({
  hostName: z.string().min(2, { message: "Host name must be at least 2 characters" }),
  hostPhone: z.string().min(10, { message: "Please enter a valid phone number" }),
  startTime: z.string().min(1, { message: "Please select a time" }),
  mealDescription: z.string().optional(),
  specialNotes: z.string().optional(),
});

type BookingFormProps = {
  selectedDate: Date;
  missionaryType: string; // This will be the missionary ID or type
  wardId: number;
  onCancel: () => void;
  onSuccess: () => void;
};

export function MealBookingForm({ selectedDate, missionaryType, wardId, onCancel, onSuccess }: BookingFormProps) {
  const timeOptions = getTimeOptions();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [submitting, setSubmitting] = useState(false);
  
  // Define missionary interface
  interface Missionary {
    id: number;
    name: string;
    type: string;
  }
  
  // Get the selected missionary
  const { data: missionary, isLoading: loadingMissionary } = useQuery<Missionary>({
    queryKey: [`/api/missionaries/${missionaryType}`],
    queryFn: () => fetch(`/api/missionaries/${missionaryType}`).then(res => res.json()),
    enabled: !!missionaryType && !isNaN(parseInt(missionaryType, 10)),
  });
  
  // Form setup
  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      hostName: "",
      hostPhone: "",
      startTime: "17:30", // Default to 5:30 PM
      mealDescription: "",
      specialNotes: "",
    },
  });
  
  // Handle form submission
  const bookMealMutation = useMutation({
    mutationFn: async (values: z.infer<typeof formSchema>) => {
      if (!missionary) {
        throw new Error("No missionary selected");
      }
      
      // Format the date for the API
      const mealDate = new Date(selectedDate);
      
      return apiRequest("POST", "/api/meals", {
        missionaryId: missionary.id,
        date: mealDate.toISOString(),
        startTime: values.startTime,
        hostName: values.hostName,
        hostPhone: values.hostPhone,
        mealDescription: values.mealDescription || "",
        specialNotes: values.specialNotes || "",
        wardId: wardId
      });
    },
    onSuccess: () => {
      // Show success toast
      toast({
        title: "Meal Scheduled",
        description: "The missionaries have been notified of your meal appointment.",
        variant: "default",
      });
      
      // Invalidate queries to refresh data
      queryClient.invalidateQueries({ 
        queryKey: ['/api/meals'] 
      });
      
      // Reset form and call success callback
      form.reset();
      onSuccess();
    },
    onError: (error: any) => {
      console.error("Booking error:", error);
      toast({
        title: "Booking Failed",
        description: error.message || "There was an error scheduling the meal. Please try again.",
        variant: "destructive",
      });
      setSubmitting(false);
    },
  });
  
  function onSubmit(values: z.infer<typeof formSchema>) {
    setSubmitting(true);
    bookMealMutation.mutate(values);
  }
  
  const formattedDate = format(selectedDate, "EEEE, MMMM do");
  const missionaryDisplay = missionary?.name || "Missionaries";
  
  return (
    <Card className="mb-8 bg-white shadow-sm border border-gray-200">
      <CardContent className="p-6">
        <h3 className="text-lg font-medium text-gray-900 mb-4">
          Schedule for {formattedDate} with {missionaryDisplay}
        </h3>
        
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
            <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
              <FormField
                control={form.control}
                name="hostName"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Host Name/Family *</FormLabel>
                    <FormControl>
                      <Input placeholder="Enter host name" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              
              <FormField
                control={form.control}
                name="startTime"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Preferred Time *</FormLabel>
                    <Select 
                      onValueChange={field.onChange} 
                      defaultValue={field.value}
                    >
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Select a time" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {timeOptions.map((option) => (
                          <SelectItem key={option.value} value={option.value}>
                            {option.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>
            
            <FormField
              control={form.control}
              name="hostPhone"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Contact Phone *</FormLabel>
                  <FormControl>
                    <Input placeholder="(555) 123-4567" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            
            <FormField
              control={form.control}
              name="mealDescription"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Meal Description (Optional)</FormLabel>
                  <FormControl>
                    <Textarea 
                      placeholder="Let the missionaries know what you're planning to serve"
                      className="resize-none"
                      {...field}
                    />
                  </FormControl>
                  <FormDescription>
                    Let the missionaries know what you're planning to serve.
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />
            
            <FormField
              control={form.control}
              name="specialNotes"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Special Notes (Optional)</FormLabel>
                  <FormControl>
                    <Textarea 
                      placeholder="Any dietary restrictions, allergies, or special instructions"
                      className="resize-none"
                      {...field}
                    />
                  </FormControl>
                  <FormDescription>
                    Any dietary restrictions, allergies, or special instructions.
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />
            
            <div className="flex justify-end space-x-3">
              <Button
                type="button"
                variant="outline"
                onClick={onCancel}
              >
                Cancel
              </Button>
              <Button 
                type="submit"
                disabled={submitting || loadingMissionary}
              >
                Schedule Meal
              </Button>
            </div>
          </form>
        </Form>
      </CardContent>
    </Card>
  );
}
