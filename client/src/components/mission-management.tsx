// client/src/components/mission-management.tsx
import React from 'react';
import { useQuery, useMutation } from '@tanstack/react-query';
import { hc } from 'hono/client';
import type { AppType } from '../../../server/routes';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from './ui/card';
import { Button } from './ui/button';
import { PlusCircle, Pencil, Trash, Globe, MapPin } from 'lucide-react';
import { Badge } from './ui/badge';
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
    DialogFooter,
} from './ui/dialog';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { useToast } from '../hooks/use-toast';
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
} from './ui/alert-dialog';
import {
    Form,
    FormControl,
    FormDescription,
    FormField,
    FormItem,
    FormLabel,
    FormMessage,
} from './ui/form';
import { Textarea } from './ui/textarea';
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from './ui/select';
import { zodResolver } from '@hookform/resolvers/zod';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { apiRequest, queryClient } from '@/lib/queryClient';
import { Combobox } from './ui/combobox';


const client = hc<AppType>('/');

type Mission = {
    id: number;
    name: string;
    regionId?: number | null;
    description?: string;
    region?: { id: number; name: string };
    stakes: { id: number; name: string }[] | null; // Added stakes to Mission type
};

const createMissionSchema = z.object({
    name: z.string().min(2, { message: "Mission name must be at least 2 characters" }),
    regionId: z.number().optional().nullable(),
    description: z.string().optional(),
});

type CreateMissionFormValues = z.infer<typeof createMissionSchema>;


interface MissionManagementProps {
    showUnassignedOnly?: boolean;
}

export function MissionManagement({ showUnassignedOnly }: MissionManagementProps) {
    const { toast } = useToast();
    const [isEditDialogOpen, setIsEditDialogOpen] = React.useState(false);
    const [isCreateDialogOpen, setIsCreateDialogOpen] = React.useState(false);
    const [currentMission, setCurrentMission] = React.useState<Mission | null>(null);

    const createForm = useForm<CreateMissionFormValues>({
        resolver: zodResolver(createMissionSchema),
        defaultValues: {
            name: "",
            regionId: null,
            description: "",
        },
    });

    const editForm = useForm<Partial<Mission> & { id?: number }>({
        resolver: zodResolver(createMissionSchema.partial()),
        defaultValues: {
            id: undefined,
            name: "",
            regionId: null,
            description: "",
        },
    });

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
        staleTime: 5 * 60 * 1000,
    });

    const fetchMissions = async (): Promise<Mission[]> => {
        const res = await client.api.missions.$get({
            query: { unassignedOnly: showUnassignedOnly ? 'true' : 'false' }
        });
        if (!res.ok) {
            const errorData = await res.json();
            throw new Error(errorData.message || 'Failed to fetch missions');
        }
        return res.json();
    }

    const { data: missions, isLoading, isError, error, refetch } = useQuery<Mission[], Error>({
        queryKey: ['missions', showUnassignedOnly],
        queryFn: fetchMissions,
    });

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
            queryClient.invalidateQueries({ queryKey: ["missions"] });
            queryClient.invalidateQueries({ queryKey: ["/api/regions"] }); // Invalidate regions query to reflect new mission assignments
        },
        onError: (error: Error) => {
            toast({
                title: "Error",
                description: error.message || "Failed to create mission. Please try again.",
                variant: "destructive",
            });
        },
    });

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
            queryClient.invalidateQueries({ queryKey: ["missions"] });
            queryClient.invalidateQueries({ queryKey: ["/api/regions"] }); // Invalidate regions query to reflect updated mission assignments
        },
        onError: (error: Error) => {
            toast({
                title: "Error",
                description: error.message || "Failed to update mission. Please try again.",
                variant: "destructive",
            });
        },
    });

    const deleteMissionMutation = useMutation({
        mutationFn: async (missionId: number) => {
            await apiRequest("DELETE", `/api/missions/${missionId}`);
        },
        onSuccess: () => {
            toast({
                title: "Mission deleted",
                description: "Mission has been successfully deleted.",
            });
            queryClient.invalidateQueries({ queryKey: ["missions"] });
            queryClient.invalidateQueries({ queryKey: ["/api/regions"] }); // Invalidate regions query
        },
        onError: (error: Error) => {
            toast({
                title: "Error",
                description: error.message || "Failed to delete mission. Please try again.",
                variant: "destructive",
            });
        },
    });

    const onCreateSubmit = (values: CreateMissionFormValues) => {
        createMissionMutation.mutate(values);
    };

    const onEditSubmit = (values: Partial<Mission>) => {
        if (currentMission?.id) {
            editMissionMutation.mutate({ ...values, id: currentMission.id });
        }
    };

    const handleDeleteMission = (missionId: number) => {
        deleteMissionMutation.mutate(missionId);
    };

    const handleEditMission = (mission: Mission) => {
        setCurrentMission(mission);
        editForm.reset({
            name: mission.name,
            regionId: mission.regionId === undefined ? null : mission.regionId,
            description: mission.description || "",
        });
        setIsEditDialogOpen(true);
    };

    if (isLoading || isLoadingRegions) {
        return (
            <div className="py-4">
                <p className="text-center text-muted-foreground">Loading missions...</p>
            </div>
        );
    }

    if (isError) {
        return (
            <div className="py-4 text-destructive">
                <p>Error loading missions: {error.message}. Please try again.</p>
            </div>
        );
    }

    return (
        <Card>
            <CardHeader>
                <div className="flex justify-between items-center">
                    <div>
                        <CardTitle>Mission Management</CardTitle>
                        <CardDescription>Create and manage missions within your region.</CardDescription>
                    </div>
                    <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
                        <DialogTrigger asChild>
                            <Button>
                                <PlusCircle className="mr-2 h-4 w-4" />
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
                                                    <Input placeholder="e.g. Europe Area" {...field} />
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
                                                <Combobox
                                                    options={regions || []}
                                                    value={field.value !== null && field.value !== undefined ? String(field.value) : "null"}
                                                    onValueChange={(value) => field.onChange(value === "null" ? null : Number(value))}
                                                    placeholder="Select a region"
                                                    searchPlaceholder="Search regions..."
                                                    noResultsMessage="No region found."
                                                    displayKey="name"
                                                    valueKey="id"
                                                    className="w-full"
                                                    contentClassName="max-h-[200px] overflow-y-auto" // Added max-height and overflow
                                                />
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
                                        <Button type="submit" disabled={createMissionMutation.isPending}>
                                            {createMissionMutation.isPending ? "Creating..." : "Create Mission"}
                                        </Button>
                                    </DialogFooter>
                                </form>
                            </Form>
                        </DialogContent>
                    </Dialog>
                </div>
            </CardHeader>
            <CardContent>
                {missions && missions.length > 0 ? (
                    <div className="space-y-4">
                        {missions.map(mission => (
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
                                    <p className="text-sm text-muted-foreground mb-2">{mission.stakes?.length || 0} stakes</p>
                                    <div className="flex flex-wrap gap-2 mb-4">
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
                                    {mission.stakes && mission.stakes.length > 0 ? (
                                        <div className="mt-4">
                                            <h4 className="text-sm font-medium mb-2">Stakes in this Mission:</h4>
                                            <ul className="list-disc pl-5 space-y-1 text-sm text-muted-foreground">
                                                {mission.stakes.map(stake => (
                                                    <li key={stake.id}>{stake.name}</li>
                                                ))}
                                            </ul>
                                        </div>
                                    ) : (
                                        <p className="text-sm text-muted-foreground mt-4">No stakes in this mission yet.</p>
                                    )}
                                </CardContent>
                            </Card>
                        ))}
                    </div>
                ) : (
                    <div className="text-center py-8 bg-slate-50 border rounded-md">
                        <p className="text-gray-500">No missions have been created yet. Create your first mission to get started.</p>
                    </div>
                )}
            </CardContent>
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
                                            <Combobox
                                                options={regions || []}
                                                value={field.value !== null && field.value !== undefined ? String(field.value) : "null"}
                                                onValueChange={(value) => field.onChange(value === "null" ? null : Number(value))}
                                                placeholder="Select a region"
                                                searchPlaceholder="Search regions..."
                                                noResultsMessage="No region found."
                                                displayKey="name"
                                                valueKey="id"
                                                className="w-full"
                                                contentClassName="max-h-[200px] overflow-y-auto" // Added max-height and overflow
                                            />
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
        </Card>
    );
}