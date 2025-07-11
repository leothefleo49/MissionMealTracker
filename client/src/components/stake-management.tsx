// client/src/components/stake-management.tsx
import React from 'react';
import { useQuery, useMutation } from '@tanstack/react-query';
import { hc } from 'hono/client';
import type { AppType } from '../../../server/routes';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from './ui/card';
import { Button } from './ui/button';
import { PlusCircle, Pencil, Trash, Building, MapPin } from 'lucide-react'; // Added MapPin for display, Building for general hierarchy icon if needed
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
import { useToast } from '@/hooks/use-toast';
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

const client = hc<AppType>('/');

type Stake = { // Using Stake type for fetched data
    id: number;
    name: string;
    missionId?: number | null;
    description?: string;
    mission?: { id: number; name: string }; // Include mission detail for display as returned by backend
    wards: { id: number; name: string }[] | null;
};

// Define the zod schema for new stake creation
const createStakeSchema = z.object({
    name: z.string().min(2, { message: "Stake name must be at least 2 characters" }),
    missionId: z.number().optional().nullable(),
    description: z.string().optional(),
});

type CreateStakeFormValues = z.infer<typeof createStakeSchema>;


interface StakeManagementProps {
    showUnassignedOnly?: boolean; // New prop for unassigned filter
}

export function StakeManagement({ showUnassignedOnly }: StakeManagementProps) {
    const { toast } = useToast();
    const [isEditDialogOpen, setIsEditDialogOpen] = React.useState(false);
    const [isCreateDialogOpen, setIsCreateDialogOpen] = React.useState(false);
    const [currentStake, setCurrentStake] = React.useState<Stake | null>(null);

    // Create form
    const createForm = useForm<CreateStakeFormValues>({
        resolver: zodResolver(createStakeSchema),
        defaultValues: {
            name: "",
            missionId: null,
            description: "",
        },
    });

    // Edit form
    const editForm = useForm<Partial<Stake> & { id?: number }>({
        resolver: zodResolver(createStakeSchema.partial()),
        defaultValues: {
            id: undefined,
            name: "",
            missionId: null,
            description: "",
        },
    });

    // Fetch missions for dropdown
    const { data: missions, isLoading: isLoadingMissions } = useQuery({
        queryKey: ["/api/missions"],
        queryFn: async () => {
            const response = await fetch('/api/missions');
            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.message || 'Failed to fetch missions');
            }
            return response.json();
        },
        staleTime: 5 * 60 * 1000, // 5 minutes
    });

    const fetchStakes = async (): Promise<Stake[]> => { // Changed return type to Stake[]
        // Updated URL to include showUnassignedOnly query parameter for hono client
        const res = await client.api.stakes.$get({ 
            query: { unassignedOnly: showUnassignedOnly ? 'true' : 'false' } 
        });
        if (!res.ok) {
            const errorData = await res.json(); // Parse error response
            throw new Error(errorData.message || 'Failed to fetch stakes');
        }
        return res.json();
    }

    const { data: stakes, isLoading, isError, error, refetch } = useQuery<Stake[], Error>({ // Specify type parameters
        queryKey: ['stakes', showUnassignedOnly], // Include filter in query key
        queryFn: fetchStakes,
    });

    // Create stake mutation
    const createStakeMutation = useMutation({
        mutationFn: async (data: CreateStakeFormValues) => {
            const res = await apiRequest("POST", "/api/stakes", data);
            return await res.json();
        },
        onSuccess: () => {
            toast({
                title: "Stake created",
                description: "Stake has been successfully created.",
            });
            setIsCreateDialogOpen(false);
            createForm.reset({ name: "", missionId: null, description: "" });
            queryClient.invalidateQueries({ queryKey: ["stakes"] });
            queryClient.invalidateQueries({ queryKey: ["/api/missions"] }); // Invalidate missions to refresh data that might include new stake counts
        },
        onError: (error: Error) => {
            toast({
                title: "Error",
                description: error.message || "Failed to create stake. Please try again.",
                variant: "destructive",
            });
        },
    });

    // Edit stake mutation
    const editStakeMutation = useMutation({
        mutationFn: async (data: Partial<Stake> & { id: number }) => {
            const res = await apiRequest("PATCH", `/api/stakes/${data.id}`, data);
            return await res.json();
        },
        onSuccess: () => {
            toast({
                title: "Stake updated",
                description: "Stake has been successfully updated.",
            });
            setIsEditDialogOpen(false);
            editForm.reset();
            queryClient.invalidateQueries({ queryKey: ["stakes"] });
            queryClient.invalidateQueries({ queryKey: ["/api/missions"] });
        },
        onError: (error: Error) => {
            toast({
                title: "Error",
                description: error.message || "Failed to update stake. Please try again.",
                variant: "destructive",
            });
        },
    });

    // Delete stake mutation
    const deleteStakeMutation = useMutation({
        mutationFn: async (stakeId: number) => {
            await apiRequest("DELETE", `/api/stakes/${stakeId}`);
        },
        onSuccess: () => {
            toast({
                title: "Stake deleted",
                description: "Stake has been successfully deleted.",
            });
            queryClient.invalidateQueries({ queryKey: ["stakes"] });
            queryClient.invalidateQueries({ queryKey: ["/api/missions"] });
        },
        onError: (error: Error) => {
            toast({
                title: "Error",
                description: error.message || "Failed to delete stake. Please try again.",
                variant: "destructive",
            });
        },
    });

    const onCreateSubmit = (values: CreateStakeFormValues) => {
        createStakeMutation.mutate(values);
    };

    const onEditSubmit = (values: Partial<Stake>) => {
        if (currentStake?.id) {
            editStakeMutation.mutate({ ...values, id: currentStake.id });
        }
    };

    const handleDeleteStake = (stakeId: number) => {
        deleteStakeMutation.mutate(stakeId);
    };

    const handleEditStake = (stake: Stake) => {
        setCurrentStake(stake);
        editForm.reset({
            name: stake.name,
            missionId: stake.missionId === undefined ? null : stake.missionId,
            description: stake.description || "",
        });
        setIsEditDialogOpen(true);
    };

    if (isLoading || isLoadingMissions) {
        return (
            <div className="py-4">
                <p className="text-center text-muted-foreground">Loading stakes...</p>
            </div>
        );
    }

    if (isError) {
        return (
            <div className="py-4 text-destructive">
                <p>Error loading stakes: {error.message}. Please try again.</p>
            </div>
        );
    }

    return (
        <Card>
            <CardHeader>
                 <div className="flex justify-between items-center">
                    <div>
                        <CardTitle>Stake Management</CardTitle>
                        <CardDescription>Create and manage stakes within your mission.</CardDescription>
                    </div>
                    <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
                        <DialogTrigger asChild>
                            <Button>
                                <PlusCircle className="mr-2 h-4 w-4" />
                                Add Stake
                            </Button>
                        </DialogTrigger>
                        <DialogContent className="max-w-md">
                            <DialogHeader>
                                <DialogTitle>Create New Stake</DialogTitle>
                                <DialogDescription>
                                    Add a new stake to the system and assign it to a mission.
                                </DialogDescription>
                            </DialogHeader>
                            <Form {...createForm}>
                                <form onSubmit={createForm.handleSubmit(onCreateSubmit)} className="space-y-4">
                                    <FormField
                                        control={createForm.control}
                                        name="name"
                                        render={({ field }) => (
                                            <FormItem>
                                                <FormLabel>Stake Name</FormLabel>
                                                <FormControl>
                                                    <Input placeholder="e.g. Springfield Stake" {...field} />
                                                </FormControl>
                                                <FormMessage />
                                            </FormItem>
                                        )}
                                    />
                                    <FormField
                                        control={createForm.control}
                                        name="missionId"
                                        render={({ field }) => (
                                            <FormItem>
                                                <FormLabel>Mission (Optional)</FormLabel>
                                                <Select
                                                    onValueChange={(value) => field.onChange(value ? Number(value) : null)}
                                                    value={field.value !== null && field.value !== undefined ? String(field.value) : ""}
                                                >
                                                    <FormControl>
                                                        <SelectTrigger>
                                                            <SelectValue placeholder="Select a mission" />
                                                        </SelectTrigger>
                                                    </FormControl>
                                                    <SelectContent>
                                                        <SelectItem value="null">Unassigned</SelectItem>
                                                        {missions?.map((mission: any) => (
                                                            <SelectItem key={mission.id} value={String(mission.id)}>
                                                                {mission.name}
                                                            </SelectItem>
                                                        ))}
                                                    </SelectContent>
                                                </Select>
                                                <FormDescription>
                                                    Assign this stake to a specific mission.
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
                                                        placeholder="Enter a brief description of this stake"
                                                        {...field}
                                                        value={field.value || ""}
                                                    />
                                                </FormControl>
                                                <FormMessage />
                                            </FormItem>
                                        )}
                                    />
                                    <DialogFooter className="mt-6">
                                        <Button type="submit" disabled={createStakeMutation.isPending}>
                                            {createStakeMutation.isPending ? "Creating..." : "Create Stake"}
                                        </Button>
                                    </DialogFooter>
                                </form>
                            </Form>
                        </DialogContent>
                    </Dialog>
                </div>
            </CardHeader>
            <CardContent>
                {stakes && stakes.length > 0 ? (
                    <div className="space-y-4">
                        {stakes.map(stake => (
                            <Card key={stake.id}>
                                <CardHeader className="pb-2">
                                    <div className="flex justify-between items-start">
                                        <div>
                                            <CardTitle className="text-lg">{stake.name}</CardTitle>
                                            <CardDescription>
                                                {stake.description || 'No description provided'}
                                            </CardDescription>
                                        </div>
                                        {stake.mission && ( // Display mission if assigned
                                            <Badge variant="outline" className="flex items-center gap-1">
                                                <MapPin className="h-3 w-3" /> {stake.mission.name}
                                            </Badge>
                                        )}
                                        {!stake.mission && ( // Display 'Unassigned' if not assigned
                                            <Badge variant="secondary" className="flex items-center gap-1 bg-yellow-100 text-yellow-800">
                                                Unassigned
                                            </Badge>
                                        )}
                                    </div>
                                </CardHeader>
                                <CardContent>
                                    <p className="text-sm text-muted-foreground mb-2">{stake.wards?.length || 0} wards</p>
                                    <div className="flex flex-wrap gap-2 mb-4"> {/* Added flex container for buttons */}
                                        <Button
                                            variant="outline"
                                            size="sm"
                                            onClick={() => handleEditStake(stake)}
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
                                                        <span className="font-bold text-gray-900 mx-1">{stake.name}</span> stake and any associated data (wards, missionaries).
                                                    </AlertDialogDescription>
                                                </AlertDialogHeader>
                                                <AlertDialogFooter>
                                                    <AlertDialogCancel>Cancel</AlertDialogCancel>
                                                    <AlertDialogAction onClick={() => handleDeleteStake(stake.id)}>
                                                        Delete
                                                    </AlertDialogAction>
                                                </AlertDialogFooter>
                                            </AlertDialogContent>
                                        </AlertDialog>
                                    </div>
                                    {stake.wards && stake.wards.length > 0 ? (
                                        <div className="mt-4">
                                            <h4 className="text-sm font-medium mb-2">Wards in this Stake:</h4>
                                            <ul className="list-disc pl-5 space-y-1 text-sm text-muted-foreground">
                                                {stake.wards.map(ward => (
                                                    <li key={ward.id}>{ward.name}</li>
                                                ))}
                                            </ul>
                                        </div>
                                    ) : (
                                        <p className="text-sm text-muted-foreground mt-4">No wards in this stake yet.</p>
                                    )}
                                </CardContent>
                            </Card>
                        ))}
                    </div>
                ) : (
                    <div className="text-center py-8 bg-slate-50 border rounded-md">
                        <p className="text-gray-500">No stakes have been created yet. Create your first stake to get started.</p>
                    </div>
                )}
            </CardContent>
            <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
                <DialogContent className="max-w-md">
                    <DialogHeader>
                        <DialogTitle>Edit Stake</DialogTitle>
                        <DialogDescription>
                            Update the stake's information.
                        </DialogDescription>
                    </DialogHeader>
                    {currentStake && (
                        <Form {...editForm}>
                            <form onSubmit={editForm.handleSubmit(onEditSubmit)} className="space-y-4">
                                <FormField
                                    control={editForm.control}
                                    name="name"
                                    render={({ field }) => (
                                        <FormItem>
                                            <FormLabel>Stake Name</FormLabel>
                                            <FormControl>
                                                <Input {...field} />
                                            </FormControl>
                                            <FormMessage />
                                        </FormItem>
                                    )}
                                />
                                <FormField
                                    control={editForm.control}
                                    name="missionId"
                                    render={({ field }) => (
                                        <FormItem>
                                            <FormLabel>Mission (Optional)</FormLabel>
                                            <Select
                                                onValueChange={(value) => field.onChange(value ? Number(value) : null)}
                                                value={field.value !== null && field.value !== undefined ? String(field.value) : ""}
                                            >
                                                <FormControl>
                                                    <SelectTrigger>
                                                        <SelectValue placeholder="Select a mission" />
                                                    </SelectTrigger>
                                                </FormControl>
                                                <SelectContent>
                                                    <SelectItem value="null">Unassigned</SelectItem>
                                                    {missions?.map((mission: any) => (
                                                        <SelectItem key={mission.id} value={String(mission.id)}>
                                                            {mission.name}
                                                        </SelectItem>
                                                    ))}
                                                </SelectContent>
                                            </Select>
                                            <FormDescription>
                                                Assign this stake to a specific mission.
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
                                        disabled={editStakeMutation.isPending}
                                    >
                                        {editStakeMutation.isPending ? "Saving..." : "Save Changes"}
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