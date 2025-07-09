import { useState, useEffect } from "react";
import { z } from "zod";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation, useQueryClient } from "@tanstack/react-query";
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

// Form schema with the new isTrio field
const missionaryFormSchema = z.object({
  name: z.string().min(2, { message: "Missionary name is required" }),
  type: z.enum(["elders", "sisters"]),
  phoneNumber: z.string().min(10, { message: "Please enter a valid phone number" }),
  personalPhone: z.string().optional(),
  emailAddress: z.string().refine((email) => {
    if (!email) return true;
    return email.endsWith('@missionary.org');
  }, { message: "Email must end with @missionary.org" }).optional().or(z.literal("")),
  isTrio: z.boolean().default(false), // New "Is a Trio" field
  active: z.boolean().default(true),
  foodAllergies: z.string().optional(),
  petAllergies: z.string().optional(),
  allergySeverity: z.enum(["mild", "moderate", "severe", "life-threatening"]).optional(),
  favoriteMeals: z.string().optional(),
  dietaryRestrictions: z.string().optional(),
  transferDate: z.date().optional(),
  wardId: z.number(),
});

interface Missionary {
  id: number;
  name: string;
  type: "elders" | "sisters";
  phoneNumber: string;
  personalPhone?: string;
  emailAddress?: string;
  isTrio: boolean;
  active: boolean;
  foodAllergies?: string;
  petAllergies?: string;
  allergySeverity?: "mild" | "moderate" | "severe" | "life-threatening";
  favoriteMeals?: string;
  dietaryRestrictions?: string;
  transferDate?: Date | null;
  wardId: number;
}

interface EditMissionaryDialogProps {
  isOpen: boolean;
  onClose: () => void;
  missionary: Missionary;
}

export function EditMissionaryDialog({ isOpen, onClose, missionary }: EditMissionaryDialogProps) {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const form = useForm<z.infer<typeof missionaryFormSchema>>({
    resolver: zodResolver(missionaryFormSchema),
    defaultValues: {
      name: missionary.name,
      type: missionary.type,
      phoneNumber: missionary.phoneNumber,
      personalPhone: missionary.personalPhone || "",
      emailAddress: missionary.emailAddress || "",
      isTrio: missionary.isTrio || false,
      active: missionary.active,
      foodAllergies: missionary.foodAllergies || "",
      petAllergies: missionary.petAllergies || "",
      allergySeverity: missionary.allergySeverity || "mild",
      favoriteMeals: missionary.favoriteMeals || "",
      dietaryRestrictions: missionary.dietaryRestrictions || "",
      transferDate: missionary.transferDate ? new Date(missionary.transferDate) : undefined,
      wardId: missionary.wardId,
    },
  });

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

  function onSubmit(data: z.infer<typeof missionaryFormSchema>) {
    updateMissionary.mutate(data);
  }

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-[600px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Edit Missionary</DialogTitle>
          <DialogDescription>
            Update missionary companionship information and preferences.
          </DialogDescription>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4 pt-4">
            <FormField
              control={form.control}
              name="name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Companionship Name</FormLabel>
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
                  <FormItem className="flex flex-row items-center justify-between rounded-lg border p-3 shadow-sm">
                    <FormLabel>Active</FormLabel>
                    <FormControl>
                      <Switch
                        checked={field.value}
                        onCheckedChange={field.onChange}
                      />
                    </FormControl>
                  </FormItem>
                )}
              />
            </div>

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
                name="emailAddress"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Email Address</FormLabel>
                    <FormControl>
                      <Input placeholder="missionary@missionary.org" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <FormField
              control={form.control}
              name="isTrio"
              render={({ field }) => (
                <FormItem className="flex flex-row items-center justify-between rounded-lg border p-3 shadow-sm">
                  <div className="space-y-0.5">
                    <FormLabel>Is this a Trio?</FormLabel>
                    <FormDescription>
                      Enable if there are three missionaries in this companionship.
                    </FormDescription>
                  </div>
                  <FormControl>
                    <Switch
                      checked={field.value}
                      onCheckedChange={field.onChange}
                    />
                  </FormControl>
                </FormItem>
              )}
            />

            <div className="space-y-4 p-4 bg-gray-50 rounded-lg border">
              <h4 className="font-semibold text-gray-900">Dietary & Preference Information</h4>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="foodAllergies"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Food Allergies</FormLabel>
                      <FormControl>
                        <Textarea placeholder="Peanuts, shellfish, dairy, etc." {...field} />
                      </FormControl>
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
                        <Textarea placeholder="Cats, dogs, etc." {...field} />
                      </FormControl>
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
                        <SelectTrigger><SelectValue placeholder="Select severity level" /></SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="mild">Mild</SelectItem>
                        <SelectItem value="moderate">Moderate</SelectItem>
                        <SelectItem value="severe">Severe</SelectItem>
                        <SelectItem value="life-threatening">Life-threatening</SelectItem>
                      </SelectContent>
                    </Select>
                  </FormItem>
                )}
              />
            </div>

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