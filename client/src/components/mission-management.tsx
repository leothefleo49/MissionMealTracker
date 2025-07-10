// client/src/components/mission-management.tsx
import { z } from "zod";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation, useQuery } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { useState, useEffect } from "react";
import { Pencil, Plus, Trash, Check, X, Building, MapPin } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
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
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogFooter,
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
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

// Define the zod schema for new mission creation
const createMissionSchema = z.object({
  name: z.string().min(2, { message: "Mission name must be at least 2 characters" }),
  regionId: z.number().optional().nullable(),
  description: z.string().optional(),
});

type Mission = {
  id: number;
  name: string;
  regionId?: number | null;
  description?: string;
  region?: { id: number; name: string }; // Include region detail
};

type CreateMissionFormValues = z.infer<typeof createMissionSchema>;

interface MissionManagementProps {
  showUnassignedOnly?: boolean; // New prop to filter unassigned missions
}

export function MissionManagement({ showUnassignedOnly }: MissionManagementProps) {
  const { toast } = useToast();
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [currentMission, setCurrentMission] = useState<Mission | null>(null);

  // Create form
  const createForm = useForm<CreateMissionFormValues>({
    resolver: zodResolver(createMissionSchema),
    defaultValues: {
      name: "",
      regionId: null,
      description: "",
    },
  });

  // Edit form
  const editForm = useForm<Partial<Mission> & { id?: number }>({
    resolver: zodResolver(createMissionSchema.partial()),
    defaultValues: {
      id: undefined,
      name: "",
      regionId: null,
      description: "",
    },
  });

  // Fetch regions for dropdown
  const { data: regions, isLoading: isLoadingRegions } = useQuery({
    queryKey: ["/api/regions"],
    queryFn: async () => {
      const response = await fetch('/api/regions');
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Failed to fetch regions');
      }
      return response.json();
    },
    staleTime: 5 * 60 * 1000, // 5 minutes
  });

  // Fetch missions
  const { data: missions, isLoading, error, refetch } = useQuery({
    queryKey: ["/api/missions", showUnassignedOnly], // Include filter in query key
    queryFn: async () => {
      let url = '/api/missions';
      if (showUnassignedOnly) {
        url += '?unassignedOnly=true'; // Add query param
      }
      const response = await fetch(url);
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Failed to fetch missions');
      }
      return response.json();
    },
    staleTime: 1000,
  });

  // Create mission mutation
  const createMissionMutation = useMutation({
    mutationFn: async (data: CreateMissionFormValues) => {
      const res = await apiRequest("POST", "/api/missions", data);
      return await res.json();
    },
    onSuccess: () => {
      toast({
        title: "Mission created",
        description: "Mission has been successfully created.",
      });
      setIsCreateDialogOpen(false);
      createForm.reset({ name: "", regionId: null, description: "" });
      queryClient.invalidateQueries({ queryKey: ["/api/missions"] });
      queryClient.invalidateQueries({ queryKey: ["/api/regions"] }); // Invalidate regions to refresh data that might include new mission counts
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: error.message || "Failed to create mission. Please try again.",
        variant: "destructive",
      });
    },
  });

  // Edit mission mutation
  const editMissionMutation = useMutation({
    mutationFn: async (data: Partial<Mission> & { id: number }) => {
      const res = await apiRequest("PATCH", `/api/missions/${data.id}`, data);
      return await res.json();
    },
    onSuccess: () => {
      toast({
        title: "Mission updated",
        description: "Mission has been successfully updated.",
      });
      setIsEditDialogOpen(false);
      editForm.reset();
      queryClient.invalidateQueries({ queryKey: ["/api/missions"] });
      queryClient.invalidateQueries({ queryKey: ["/api/regions"] });
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: error.message || "Failed to update mission. Please try again.",
        variant: "destructive",
      });
    },
  });

  // Delete mission mutation
  const deleteMissionMutation = useMutation({
    mutationFn: async (missionId: number) => {
      await apiRequest("DELETE", `/api/missions/${missionId}`);
    },
    onSuccess: () => {
      toast({
        title: "Mission deleted",
        description: "Mission has been successfully deleted.",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/missions"] });
      queryClient.invalidateQueries({ queryKey: ["/api/regions"] });
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: error.message || "Failed to delete mission. Please try again.",
        variant: "destructive",
      });
    },
  });


  function onCreateSubmit(values: CreateMissionFormValues) {
    createMissionMutation.mutate(values);
  }

  function onEditSubmit(values: Partial<Mission>) {
    if (currentMission?.id) {
      editMissionMutation.mutate({ ...values, id: currentMission.id });
    }
  }

  function handleDeleteMission(missionId: number) {
    deleteMissionMutation.mutate(missionId);
  }

  function handleEditMission(mission: Mission) {
    setCurrentMission(mission);
    editForm.reset({
      name: mission.name,
      regionId: mission.regionId === undefined ? null : mission.regionId, // Handle undefined regionId
      description: mission.description || "",
    });
    setIsEditDialogOpen(true);
  }

  if (isLoading || isLoadingRegions) {
    return (
      <div className="py-4">
        <p>Loading missions...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="py-4 text-red-600">
        <p>Error loading missions: {error.message}. Please try again.</p>
      </div>
    );
  }

  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-xl font-semibold">Mission Management</h2>
        <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="h-4 w-4 mr-2" />
              Add Mission
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle>Create New Mission</DialogTitle>
              <DialogDescription>
                Add a new mission to the system and assign it to a region.
              </DialogDescription>
            </DialogHeader>

            <Form {...createForm}>
              <form onSubmit={createForm.handleSubmit(onCreateSubmit)} className="space-y-4">
                <FormField
                  control={createForm.control}
                  name="name"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Mission Name</FormLabel>
                      <FormControl>
                        <Input placeholder="e.g. Argentina Buenos Aires North" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={createForm.control}
                  name="regionId"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Region (Optional)</FormLabel>
                      <Select
                        onValueChange={(value) => field.onChange(value ? Number(value) : null)}
                        value={field.value !== null && field.value !== undefined ? String(field.value) : ""}
                      >
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Select a region" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="null">Unassigned</SelectItem>
                          {regions?.map((region: any) => (
                            <SelectItem key={region.id} value={String(region.id)}>
                              {region.name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <FormDescription>
                        Assign this mission to a specific region.
                      </FormDescription>
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
                        <Textarea
                          placeholder="Enter a brief description of this mission"
                          {...field}
                          value={field.value || ""}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <DialogFooter className="mt-6">
                  <Button
                    type="submit"
                    disabled={createMissionMutation.isPending}
                  >
                    {createMissionMutation.isPending ? "Creating..." : "Create Mission"}
                  </Button>
                </DialogFooter>
              </form>
            </Form>
          </DialogContent>
        </Dialog>
      </div>

      {missions && missions.length > 0 ? (
        <div className="grid gap-4">
          {missions.map((mission: Mission) => (
            <Card key={mission.id}>
              <CardHeader className="pb-2">
                <div className="flex justify-between items-start">
                  <div>
                    <CardTitle className="text-lg">{mission.name}</CardTitle>
                    <CardDescription>
                      {mission.description || 'No description provided'}
                    </CardDescription>
                  </div>
                  {mission.region && (
                    <Badge variant="outline" className="flex items-center gap-1">
                      <MapPin className="h-3 w-3" /> {mission.region.name}
                    </Badge>
                  )}
                  {!mission.region && (
                    <Badge variant="secondary" className="flex items-center gap-1 bg-yellow-100 text-yellow-800">
                      Unassigned
                    </Badge>
                  )}
                </div>
              </CardHeader>
              <CardContent>
                <div className="flex flex-wrap gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleEditMission(mission)}
                  >
                    <Pencil className="h-4 w-4 mr-2" />
                    Edit
                  </Button>
                  <AlertDialog>
                    <AlertDialogTrigger asChild>
                      <Button variant="destructive" size="sm">
                        <Trash className="h-4 w-4 mr-2" />
                        Delete
                      </Button>
                    </AlertDialogTrigger>
                    <AlertDialogContent>
                      <AlertDialogHeader>
                        <AlertDialogTitle>Are you absolutely sure?</AlertDialogTitle>
                        <AlertDialogDescription>
                          This action cannot be undone. This will permanently delete the
                          <span className="font-bold text-gray-900 mx-1">{mission.name}</span> mission and any associated data (stakes, wards, missionaries).
                        </AlertDialogDescription>
                      </AlertDialogHeader>
                      <AlertDialogFooter>
                        <AlertDialogCancel>Cancel</AlertDialogCancel>
                        <AlertDialogAction onClick={() => handleDeleteMission(mission.id)}>
                          Delete
                        </AlertDialogAction>
                      </AlertDialogFooter>
                    </AlertDialogContent>
                  </AlertDialog>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      ) : (
        <div className="text-center py-8 bg-slate-50 border rounded-md">
          <p className="text-gray-500">No missions have been created yet. Create your first mission to get started.</p>
        </div>
      )}

      {/* Edit Dialog */}
      <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Edit Mission</DialogTitle>
            <DialogDescription>
              Update the mission's information.
            </DialogDescription>
          </DialogHeader>

          {currentMission && (
            <Form {...editForm}>
              <form onSubmit={editForm.handleSubmit(onEditSubmit)} className="space-y-4">
                <FormField
                  control={editForm.control}
                  name="name"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Mission Name</FormLabel>
                      <FormControl>
                        <Input {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={editForm.control}
                  name="regionId"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Region (Optional)</FormLabel>
                      <Select
                        onValueChange={(value) => field.onChange(value ? Number(value) : null)}
                        value={field.value !== null && field.value !== undefined ? String(field.value) : ""}
                      >
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Select a region" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="null">Unassigned</SelectItem>
                          {regions?.map((region: any) => (
                            <SelectItem key={region.id} value={String(region.id)}>
                              {region.name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <FormDescription>
                        Assign this mission to a specific region.
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={editForm.control}
                  name="description"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Description</FormLabel>
                      <FormControl>
                        <Textarea
                          placeholder="Enter a brief description"
                          {...field}
                          value={field.value || ""}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <DialogFooter className="mt-6">
                  <Button
                    type="submit"
                    disabled={editMissionMutation.isPending}
                  >
                    {editMissionMutation.isPending ? "Saving..." : "Save Changes"}
                  </Button>
                </DialogFooter>
              </form>
            </Form>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}