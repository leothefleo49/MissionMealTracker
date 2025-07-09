import { useState, useEffect } from "react";
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
import { getTimeOptions } from "@/lib/utils";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Users } from "lucide-react";

// Form validation schema
const formSchema = z.object({
  hostName: z.string().min(2, { message: "Host name must be at least 2 characters" }),
  hostPhone: z.string().min(10, { message: "Please enter a valid phone number" }),
  hostEmail: z.string().email({ message: "Please enter a valid email address" }), // New field
  startTime: z.string().min(1, { message: "Please select a time" }),
  mealDescription: z.string().optional(),
  specialNotes: z.string().optional(),
  wardId: z.number().optional(),
  missionaryId: z.number().optional(),
  date: z.string().optional(),
});

type BookingFormProps = {
  selectedDate: Date;
  missionaryId: string; // Now expecting ID directly
  wardId: number;
  onCancel: () => void;
  onSuccess: () => void;
};

export function MealBookingForm({ selectedDate, missionaryId, wardId, onCancel, onSuccess }: BookingFormProps) {
  const timeOptions = getTimeOptions();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  interface Missionary {
    id: number;
    name: string;
    type: 'elders' | 'sisters';
    isTrio: boolean;
  }

  const { data: missionary, isLoading: loadingMissionary } = useQuery<Missionary>({
    queryKey: ['/api/missionaries', missionaryId],
    queryFn: () => fetch(`/api/missionaries/${missionaryId}`).then(res => res.json()),
    enabled: !!missionaryId,
  });

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      hostName: "",
      hostPhone: "",
      hostEmail: "",
      startTime: "17:30",
      mealDescription: "",
      specialNotes: "",
    },
  });

  const bookMealMutation = useMutation({
    mutationFn: async (values: z.infer<typeof formSchema>) => {
      if (!missionary) {
        throw new Error("No missionary selected");
      }

      const mealDate = new Date(selectedDate);

      return apiRequest("POST", "/api/meals", {
        missionaryId: missionary.id,
        date: mealDate.toISOString(),
        startTime: values.startTime,
        hostName: values.hostName,
        hostPhone: values.hostPhone,
        hostEmail: values.hostEmail, // Include email in request
        mealDescription: values.mealDescription || "",
        specialNotes: values.specialNotes || "",
        wardId: wardId
      });
    },
    onSuccess: () => {
      toast({
        title: "Meal Scheduled",
        description: "The missionaries have been notified of your meal appointment.",
      });
      queryClient.invalidateQueries({ queryKey: ['/api/meals'] });
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
    },
  });

  function onSubmit(values: z.infer<typeof formSchema>) {
    bookMealMutation.mutate(values);
  }

  const formattedDate = format(selectedDate, "EEEE, MMMM do");
  const missionaryDisplay = missionary?.name || "Missionaries";

  if (loadingMissionary) {
      return <Card className="mb-8 bg-white shadow-sm border border-gray-200"><CardContent className="p-6">Loading missionary details...</CardContent></Card>
  }

  return (
    <Card className="mt-6 mb-8 bg-white shadow-lg border-2 border-primary/20">
      <CardContent className="p-6">
        <h3 className="text-lg font-medium text-gray-900 mb-2">
          Schedule for {missionaryDisplay}
        </h3>
        <p className="text-sm text-gray-600 mb-4">
          On: <span className="font-semibold">{formattedDate}</span>
        </p>

        {missionary?.isTrio && (
            <Alert variant="destructive" className="mb-4 bg-amber-50 border-amber-200 text-amber-800 [&>svg]:text-amber-500">
                <Users className="h-4 w-4" />
                <AlertTitle>Feeding a Trio</AlertTitle>
                <AlertDescription>
                    You are signing up to feed a companionship of three missionaries. Please prepare accordingly.
                </AlertDescription>
            </Alert>
        )}

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
            <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
              <FormField
                control={form.control}
                name="hostName"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Host Name/Family *</FormLabel>
                    <FormControl><Input placeholder="The Smith Family" {...field} /></FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="hostPhone"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Host Phone *</FormLabel>
                    <FormControl><Input type="tel" placeholder="(555) 123-4567" {...field} /></FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <FormField
              control={form.control}
              name="hostEmail"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Host Email *</FormLabel>
                  <FormControl><Input type="email" placeholder="example@email.com" {...field} /></FormControl>
                  <FormDescription>Used for meal reminders and updates.</FormDescription>
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
                  <Select onValueChange={field.onChange} defaultValue={field.value}>
                    <FormControl><SelectTrigger><SelectValue placeholder="Select a time" /></SelectTrigger></FormControl>
                    <SelectContent>
                      {timeOptions.map((option) => <SelectItem key={option.value} value={option.value}>{option.label}</SelectItem>)}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="mealDescription"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>What are you serving? (Optional)</FormLabel>
                  <FormControl><Textarea placeholder="e.g., Lasagna, salad, and breadsticks" {...field} /></FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="specialNotes"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Notes for Missionaries (Optional)</FormLabel>
                  <FormControl><Textarea placeholder="e.g., We have a cat, please use the back door." {...field} /></FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="flex justify-end space-x-3 pt-4 border-t">
              <Button type="button" variant="outline" onClick={onCancel}>Cancel</Button>
              <Button type="submit" disabled={bookMealMutation.isPending}>
                {bookMealMutation.isPending ? "Scheduling..." : "Schedule Meal"}
              </Button>
            </div>
          </form>
        </Form>
      </CardContent>
    </Card>
  );
}