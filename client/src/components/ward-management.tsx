import { useState } from "react";
import { useAuth } from "@/hooks/use-auth";
import { useQuery, useMutation } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { insertWardSchema, Ward } from "@shared/schema";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { useToast } from "@/hooks/use-toast";
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
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
// Using browser-compatible crypto API instead of Node.js crypto

// Extend the ward schema with validation
const createWardSchema = insertWardSchema.extend({
  name: z.string().min(3, "Ward name must be at least 3 characters"),
  description: z.string().optional(),
});

type CreateWardFormValues = z.infer<typeof createWardSchema>;

export function WardManagement() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [selectedWard, setSelectedWard] = useState<Ward | null>(null);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);

  // Only fetch all wards if the user is a super admin
  const { data: wards, isLoading } = useQuery<Ward[], Error>({
    queryKey: ["/api/admin/wards"],
    enabled: !!user?.isSuperAdmin,
  });

  // Create ward form
  const createForm = useForm<CreateWardFormValues>({
    resolver: zodResolver(createWardSchema),
    defaultValues: {
      name: "",
      description: "",
      active: true,
      accessCode: generateAccessCode(), // Generate a random access code
    },
  });

  // Edit ward form
  const editForm = useForm<Partial<Ward>>({
    resolver: zodResolver(
      z.object({
        name: z.string().min(3, "Ward name must be at least 3 characters"),
        description: z.string().optional(),
        active: z.boolean(),
      })
    ),
    defaultValues: {
      name: "",
      description: "",
      active: true,
    },
  });

  // Function to generate a random access code for ward URLs using browser crypto
  function generateAccessCode() {
    // Generate a random string of 16 bytes (32 hex characters)
    const array = new Uint8Array(16);
    window.crypto.getRandomValues(array);
    return Array.from(array)
      .map(b => b.toString(16).padStart(2, '0'))
      .join('');
  }

  // Create ward mutation
  const createWardMutation = useMutation({
    mutationFn: async (data: CreateWardFormValues) => {
      const res = await apiRequest("POST", "/api/admin/wards", data);
      if (!res.ok) {
        const errorData = await res.json();
        throw new Error(errorData.message || "Failed to create ward");
      }
      return await res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/wards"] });
      setIsCreateDialogOpen(false);
      createForm.reset({
        name: "",
        description: "",
        active: true,
        accessCode: generateAccessCode(),
      });
      toast({
        title: "Ward created",
        description: "The ward has been created successfully.",
        variant: "default",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Failed to create ward",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  // Update ward mutation
  const updateWardMutation = useMutation({
    mutationFn: async (data: { id: number; updates: Partial<Ward> }) => {
      const res = await apiRequest(
        "PATCH",
        `/api/admin/wards/${data.id}`,
        data.updates
      );
      if (!res.ok) {
        const errorData = await res.json();
        throw new Error(errorData.message || "Failed to update ward");
      }
      return await res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/wards"] });
      setIsEditDialogOpen(false);
      setSelectedWard(null);
      toast({
        title: "Ward updated",
        description: "The ward has been updated successfully.",
        variant: "default",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Failed to update ward",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  // Handler for create ward form submission
  function onCreateSubmit(values: CreateWardFormValues) {
    createWardMutation.mutate(values);
  }

  // Handler for edit ward form submission
  function onEditSubmit(values: Partial<Ward>) {
    if (selectedWard) {
      updateWardMutation.mutate({
        id: selectedWard.id,
        updates: values,
      });
    }
  }

  // Handle opening the edit dialog
  function handleEditWard(ward: Ward) {
    setSelectedWard(ward);
    editForm.reset({
      name: ward.name,
      description: ward.description,
      active: ward.active,
    });
    setIsEditDialogOpen(true);
  }

  // Handle regenerating access code for a ward
  function handleRegenerateAccessCode(wardId: number) {
    if (window.confirm("Are you sure you want to regenerate the access code? This will invalidate any existing links to this ward.")) {
      updateWardMutation.mutate({
        id: wardId,
        updates: {
          accessCode: generateAccessCode(),
        },
      });
    }
  }

  if (!user?.isSuperAdmin) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Ward Management</CardTitle>
          <CardDescription>
            You need super admin privileges to manage wards.
          </CardDescription>
        </CardHeader>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-bold">Ward Management</h2>
        <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
          <DialogTrigger asChild>
            <Button variant="default">Create New Ward</Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Create New Ward</DialogTitle>
              <DialogDescription>
                Add a new ward to the system. Each ward will have its own missionaries and meal schedule.
              </DialogDescription>
            </DialogHeader>
            <Form {...createForm}>
              <form onSubmit={createForm.handleSubmit(onCreateSubmit)} className="space-y-4">
                <FormField
                  control={createForm.control}
                  name="name"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Ward Name</FormLabel>
                      <FormControl>
                        <Input placeholder="Enter ward name" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={createForm.control}
                  name="description"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Description (Optional)</FormLabel>
                      <FormControl>
                        <Textarea placeholder="Enter ward description" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={createForm.control}
                  name="active"
                  render={({ field }) => (
                    <FormItem className="flex flex-row items-center justify-between rounded-lg border p-3 shadow-sm">
                      <div className="space-y-0.5">
                        <FormLabel>Active</FormLabel>
                        <FormDescription>
                          Whether this ward is active in the system
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
                <FormField
                  control={createForm.control}
                  name="accessCode"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Access Code</FormLabel>
                      <div className="flex gap-2">
                        <FormControl>
                          <Input readOnly {...field} />
                        </FormControl>
                        <Button 
                          type="button" 
                          variant="outline"
                          onClick={() => createForm.setValue("accessCode", generateAccessCode())}
                        >
                          Regenerate
                        </Button>
                      </div>
                      <FormDescription>
                        This code will be used to create a unique URL for this ward
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <DialogFooter>
                  <Button
                    type="submit"
                    disabled={createWardMutation.isPending}
                  >
                    {createWardMutation.isPending ? "Creating..." : "Create Ward"}
                  </Button>
                </DialogFooter>
              </form>
            </Form>
          </DialogContent>
        </Dialog>
      </div>

      {isLoading ? (
        <div>Loading wards...</div>
      ) : !wards || wards.length === 0 ? (
        <Card>
          <CardHeader>
            <CardTitle>No Wards Found</CardTitle>
            <CardDescription>
              There are no wards in the system. Create a new ward to get started.
            </CardDescription>
          </CardHeader>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {wards.map((ward) => (
            <Card key={ward.id} className={!ward.active ? "opacity-70" : ""}>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  {ward.name}
                  {!ward.active && (
                    <span className="text-xs bg-red-100 text-red-800 px-2 py-1 rounded">
                      Inactive
                    </span>
                  )}
                </CardTitle>
                <CardDescription>{ward.description}</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  <div>
                    <span className="font-semibold">Access URL:</span>
                    <div className="text-sm mt-1 bg-gray-100 p-2 rounded break-all">
                      {`${window.location.origin}/ward/${ward.accessCode}`}
                    </div>
                  </div>
                </div>
              </CardContent>
              <CardFooter className="flex flex-col sm:flex-row gap-2 sm:justify-between">
                <Button
                  variant="outline"
                  size="sm"
                  className="w-full sm:w-auto"
                  onClick={() => handleRegenerateAccessCode(ward.id)}
                >
                  Regenerate URL
                </Button>
                <Button
                  variant="default"
                  size="sm"
                  className="w-full sm:w-auto"
                  onClick={() => handleEditWard(ward)}
                >
                  Edit Ward
                </Button>
              </CardFooter>
            </Card>
          ))}
        </div>
      )}

      {/* Edit Ward Dialog */}
      <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit Ward</DialogTitle>
            <DialogDescription>
              Update the ward information.
            </DialogDescription>
          </DialogHeader>
          <Form {...editForm}>
            <form onSubmit={editForm.handleSubmit(onEditSubmit)} className="space-y-4">
              <FormField
                control={editForm.control}
                name="name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Ward Name</FormLabel>
                    <FormControl>
                      <Input {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={editForm.control}
                name="description"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Description (Optional)</FormLabel>
                    <FormControl>
                      <Textarea {...field} value={field.value || ""} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={editForm.control}
                name="active"
                render={({ field }) => (
                  <FormItem className="flex flex-row items-center justify-between rounded-lg border p-3 shadow-sm">
                    <div className="space-y-0.5">
                      <FormLabel>Active</FormLabel>
                      <FormDescription>
                        Whether this ward is active in the system
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
              <DialogFooter>
                <Button
                  type="submit"
                  disabled={updateWardMutation.isPending}
                >
                  {updateWardMutation.isPending ? "Saving..." : "Save Changes"}
                </Button>
              </DialogFooter>
            </form>
          </Form>
        </DialogContent>
      </Dialog>
    </div>
  );
}