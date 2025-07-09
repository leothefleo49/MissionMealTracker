import { useEffect } from "react";
import { z } from "zod";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";

const mealFormSchema = z.object({
  missionaryId: z.coerce.number({ required_error: "Please select a missionary." }),
  date: z.string().refine((val) => !isNaN(Date.parse(val)), { message: "Invalid date" }),
  startTime: z.string().min(1, "Please select a time"),
  hostName: z.string().min(2, "Host name is required"),
  hostPhone: z.string().min(10, "A valid phone number is required"),
  mealDescription: z.string().optional(),
  specialNotes: z.string().optional(),
});

type MealFormValues = z.infer<typeof mealFormSchema>;

interface MealEditDialogProps {
  isOpen: boolean;
  onClose: () => void;
  meal: any | null;
  congregationId: number;
}

export function MealEditDialog({ isOpen, onClose, meal, congregationId }: MealEditDialogProps) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const isEditing = !!meal;

  const { data: missionaries = [] } = useQuery<any[]>({
    queryKey: ['/api/congregations', congregationId, 'missionaries'],
    queryFn: () => fetch(`/api/congregations/${congregationId}/missionaries`).then(res => res.json()),
    enabled: !!congregationId,
  });

  const form = useForm<MealFormValues>({
    resolver: zodResolver(mealFormSchema),
    defaultValues: {
      missionaryId: undefined,
      date: new Date().toISOString().split('T')[0],
      startTime: "17:30",
      hostName: "",
      hostPhone: "",
      mealDescription: "",
      specialNotes: "",
    },
  });

  useEffect(() => {
    if (isEditing && meal) {
      form.reset({
        missionaryId: meal.missionaryId,
        date: new Date(meal.date).toISOString().split('T')[0],
        startTime: meal.startTime,
        hostName: meal.hostName,
        hostPhone: meal.hostPhone,
        mealDescription: meal.mealDescription || "",
        specialNotes: meal.specialNotes || "",
      });
    } else {
      form.reset({
        missionaryId: missionaries.length > 0 ? missionaries[0].id : undefined,
        date: new Date().toISOString().split('T')[0],
        startTime: "17:30",
        hostName: "",
        hostPhone: "",
        mealDescription: "",
        specialNotes: "",
      });
    }
  }, [isEditing, meal, form, missionaries]);

  const mealMutation = useMutation({
    mutationFn: (data: MealFormValues) => {
      const payload = { ...data, congregationId };
      if (isEditing) {
        return apiRequest("PATCH", `/api/meals/${meal.id}`, payload);
      }
      return apiRequest("POST", "/api/meals", payload);
    },
    onSuccess: () => {
      toast({ title: `Meal ${isEditing ? 'Updated' : 'Created'}`, description: `The meal has been successfully ${isEditing ? 'updated' : 'created'}.` });
      queryClient.invalidateQueries({ queryKey: ['/api/congregations', congregationId, 'meals'] });
      onClose();
    },
    onError: (error: any) => {
      toast({ title: "Error", description: error.message || "An error occurred.", variant: "destructive" });
    },
  });

  const onSubmit = (data: MealFormValues) => {
    mealMutation.mutate(data);
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>{isEditing ? "Edit Meal" : "Add New Meal"}</DialogTitle>
          <DialogDescription>
            {isEditing ? "Update the details for this meal." : "Fill in the details to schedule a new meal."}
          </DialogDescription>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="missionaryId"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Missionaries</FormLabel>
                  <Select onValueChange={field.onChange} value={field.value?.toString()}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Select missionaries" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {missionaries.map((m) => (
                        <SelectItem key={m.id} value={m.id.toString()}>
                          {m.name} ({m.type})
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />
             <div className="grid grid-cols-2 gap-4">
                <FormField
                    control={form.control}
                    name="date"
                    render={({ field }) => (
                        <FormItem>
                        <FormLabel>Date</FormLabel>
                        <FormControl>
                            <Input type="date" {...field} />
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
                        <FormLabel>Time</FormLabel>
                        <FormControl>
                            <Input type="time" {...field} />
                        </FormControl>
                        <FormMessage />
                        </FormItem>
                    )}
                />
            </div>
            <FormField
              control={form.control}
              name="hostName"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Host Name</FormLabel>
                  <FormControl>
                    <Input placeholder="e.g., Smith Family" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="hostPhone"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Host Phone</FormLabel>
                  <FormControl>
                    <Input placeholder="e.g., 555-123-4567" {...field} />
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
                    <Textarea placeholder="e.g., Lasagna, salad, and breadsticks" {...field} />
                  </FormControl>
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
                    <Textarea placeholder="e.g., Gluten allergy, no nuts" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <DialogFooter>
              <Button type="button" variant="outline" onClick={onClose}>Cancel</Button>
              <Button type="submit" disabled={mealMutation.isPending}>
                {mealMutation.isPending ? "Saving..." : "Save Meal"}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}