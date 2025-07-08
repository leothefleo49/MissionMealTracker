import { z } from "zod";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
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
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

const missionaryFormSchema = z.object({
  name: z.string().min(2, "Name is required"),
  type: z.enum(["elders", "sisters"], { required_error: "Type is required" }),
  phoneNumber: z.string().min(10, "A valid phone number is required"),
  emailAddress: z
    .string()
    .email("A valid email is required")
    .refine(
      (email) => email.endsWith("@missionary.org"),
      "Email must be a @missionary.org address",
    ),
  password: z.string().min(6, "Password must be at least 6 characters"),
  wardId: z.number(),
});

interface AddMissionaryDialogProps {
  isOpen: boolean;
  onClose: () => void;
  wardId: number;
}

export function AddMissionaryDialog({
  isOpen,
  onClose,
  wardId,
}: AddMissionaryDialogProps) {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const form = useForm<z.infer<typeof missionaryFormSchema>>({
    resolver: zodResolver(missionaryFormSchema),
    defaultValues: {
      name: "",
      type: "elders",
      phoneNumber: "",
      emailAddress: "",
      password: "",
      wardId,
    },
  });

  const createMissionaryMutation = useMutation({
    mutationFn: (data: z.infer<typeof missionaryFormSchema>) =>
      apiRequest("POST", "/api/admin/missionaries", {
        ...data,
        emailVerified: true, // Auto-verify email
        consentStatus: "granted", // Auto-grant consent
      }),
    onSuccess: () => {
      toast({
        title: "Missionary Added",
        description: "The new missionary has been added successfully.",
      });
      queryClient.invalidateQueries({
        queryKey: ["/api/admin/missionaries/ward", wardId],
      });
      onClose();
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to add missionary.",
        variant: "destructive",
      });
    },
  });

  function onSubmit(data: z.infer<typeof missionaryFormSchema>) {
    createMissionaryMutation.mutate(data);
  }

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[600px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Add New Missionary</DialogTitle>
          <DialogDescription>
            Enter the details for the new missionary. Their email will be
            automatically verified.
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
                    <Input
                      placeholder="Elder Smith & Elder Johnson"
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="type"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Type</FormLabel>
                    <Select
                      onValueChange={field.onChange}
                      defaultValue={field.value}
                    >
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Select type" />
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
                name="phoneNumber"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Phone Number</FormLabel>
                    <FormControl>
                      <Input placeholder="555-123-4567" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>
            <FormField
              control={form.control}
              name="emailAddress"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Email Address</FormLabel>
                  <FormControl>
                    <Input placeholder="name@missionary.org" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="password"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Initial Password</FormLabel>
                  <FormControl>
                    <Input type="password" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <DialogFooter>
              <Button variant="outline" type="button" onClick={onClose}>
                Cancel
              </Button>
              <Button
                type="submit"
                disabled={createMissionaryMutation.isPending}
              >
                {createMissionaryMutation.isPending
                  ? "Adding..."
                  : "Add Missionary"}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}