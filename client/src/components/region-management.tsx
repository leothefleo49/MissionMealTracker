// client/src/components/region-management.tsx
import React from 'react';
import { useQuery, useMutation } from '@tanstack/react-query';
import { hc } from 'hono/client';
import type { AppType } from '../../../server/routes';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from './ui/card';
import { Button } from './ui/button';
import { PlusCircle, Pencil, Trash, Globe } from 'lucide-react';
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
import { zodResolver } from '@hookform/resolvers/zod';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { apiRequest, queryClient } from '@/lib/queryClient';


const client = hc<AppType>('/');

type Region = {
    id: number;
    name: string;
    description?: string;
    missions: { id: number; name: string }[] | null; // Added missions to Region type
};

const createRegionSchema = z.object({
    name: z.string().min(2, { message: "Region name must be at least 2 characters" }),
    description: z.string().optional(),
});

type CreateRegionFormValues = z.infer<typeof createRegionSchema>;


export function RegionManagement() {
    const { toast } = useToast();
    const [isEditDialogOpen, setIsEditDialogOpen] = React.useState(false);
    const [isCreateDialogOpen, setIsCreateDialogOpen] = React.useState(false);
    const [currentRegion, setCurrentRegion] = React.useState<Region | null>(null);

    const createForm = useForm<CreateRegionFormValues>({
        resolver: zodResolver(createRegionSchema),
        defaultValues: {
            name: "",
            description: "",
        },
    });

    const editForm = useForm<Partial<Region> & { id?: number }>({
        resolver: zodResolver(createRegionSchema.partial()),
        defaultValues: {
            id: undefined,
            name: "",
            description: "",
        },
    });

    const fetchRegions = async (): Promise<Region[]> => {
        const res = await client.api.regions.$get();
        if (!res.ok) {
            const errorData = await res.json();
            throw new Error(errorData.message || 'Failed to fetch regions');
        }
        return res.json();
    }

    const { data: regions, isLoading, isError, error, refetch } = useQuery<Region[], Error>({
        queryKey: ['regions'],
        queryFn: fetchRegions,
    });

    const createRegionMutation = useMutation({
        mutationFn: async (data: CreateRegionFormValues) => {
            const res = await apiRequest("POST", "/api/regions", data);
            return await res.json();
        },
        onSuccess: () => {
            toast({
                title: "Region created",
                description: "Region has been successfully created.",
            });
            setIsCreateDialogOpen(false);
            createForm.reset({ name: "", description: "" });
            queryClient.invalidateQueries({ queryKey: ["regions"] }); // Invalidate regions query
        },
        onError: (error: Error) => {
            toast({
                title: "Error",
                description: error.message || "Failed to create region. Please try again.",
                variant: "destructive",
            });
        },
    });

    const editRegionMutation = useMutation({
        mutationFn: async (data: Partial<Region> & { id: number }) => {
            const res = await apiRequest("PATCH", `/api/regions/${data.id}`, data);
            return await res.json();
        },
        onSuccess: () => {
            toast({
                title: "Region updated",
                description: "Region has been successfully updated.",
            });
            setIsEditDialogOpen(false);
            editForm.reset();
            queryClient.invalidateQueries({ queryKey: ["regions"] }); // Invalidate regions query
        },
        onError: (error: Error) => {
            toast({
                title: "Error",
                description: error.message || "Failed to update region. Please try again.",
                variant: "destructive",
            });
        },
    });

    const deleteRegionMutation = useMutation({
        mutationFn: async (regionId: number) => {
            await apiRequest("DELETE", `/api/regions/${regionId}`);
        },
        onSuccess: () => {
            toast({
                title: "Region deleted",
                description: "Region has been successfully deleted.",
            });
            queryClient.invalidateQueries({ queryKey: ["regions"] }); // Invalidate regions query
            queryClient.invalidateQueries({ queryKey: ["missions"] }); // Invalidate missions query as they might become unassigned
        },
        onError: (error: Error) => {
            toast({
                title: "Error",
                description: error.message || "Failed to delete region. Please try again.",
                variant: "destructive",
            });
        },
    });

    const onCreateSubmit = (values: CreateRegionFormValues) => {
        createRegionMutation.mutate(values);
    };

    const onEditSubmit = (values: Partial<Region>) => {
        if (currentRegion?.id) {
            editRegionMutation.mutate({ ...values, id: currentRegion.id });
        }
    };

    const handleDeleteRegion = (regionId: number) => {
        deleteRegionMutation.mutate(regionId);
    };

    const handleEditRegion = (region: Region) => {
        setCurrentRegion(region);
        editForm.reset({
            name: region.name,
            description: region.description || "",
        });
        setIsEditDialogOpen(true);
    };

    if (isLoading) {
        return (
            <div className="py-4">
                <p className="text-center text-muted-foreground">Loading regions...</p>
            </div>
        );
    }

    if (isError) {
        return (
            <div className="py-4 text-destructive">
                <p>Error loading regions: {error.message}. Please try again.</p>
            </div>
        );
    }

    return (
        <Card>
            <CardHeader>
                <div className="flex justify-between items-center">
                    <div>
                        <CardTitle>Region Management</CardTitle>
                        <CardDescription>Create and manage regions for your organization.</CardDescription>
                    </div>
                    <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
                        <DialogTrigger asChild>
                            <Button>
                                <PlusCircle className="mr-2 h-4 w-4" />
                                Add Region
                            </Button>
                        </DialogTrigger>
                        <DialogContent className="max-w-md">
                            <DialogHeader>
                                <DialogTitle>Create New Region</DialogTitle>
                                <DialogDescription>
                                    Add a new geographical region to the system.
                                </DialogDescription>
                            </DialogHeader>
                            <Form {...createForm}>
                                <form onSubmit={createForm.handleSubmit(onCreateSubmit)} className="space-y-4">
                                    <FormField
                                        control={createForm.control}
                                        name="name"
                                        render={({ field }) => (
                                            <FormItem>
                                                <FormLabel>Region Name</FormLabel>
                                                <FormControl>
                                                    <Input placeholder="e.g. North America" {...field} />
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
                                                    <Textarea
                                                        placeholder="Enter a brief description of this region"
                                                        {...field}
                                                        value={field.value || ""}
                                                    />
                                                </FormControl>
                                                <FormMessage />
                                            </FormItem>
                                        )}
                                    />
                                    <DialogFooter className="mt-6">
                                        <Button type="submit" disabled={createRegionMutation.isPending}>
                                            {createRegionMutation.isPending ? "Creating..." : "Create Region"}
                                        </Button>
                                    </DialogFooter>
                                </form>
                            </Form>
                        </DialogContent>
                    </Dialog>
                </div>
            </CardHeader>
            <CardContent>
                {regions && regions.length > 0 ? (
                    <div className="space-y-4">
                        {regions.map(region => (
                            <Card key={region.id}>
                                <CardHeader className="pb-2">
                                    <div className="flex justify-between items-start">
                                        <div>
                                            <CardTitle className="text-lg">{region.name}</CardTitle>
                                            <CardDescription>
                                                {region.description || 'No description provided'}
                                            </CardDescription>
                                        </div>
                                        <Badge variant="outline" className="flex items-center gap-1">
                                            <Globe className="h-3 w-3" /> Region
                                        </Badge>
                                    </div>
                                </CardHeader>
                                <CardContent>
                                    <p className="text-sm text-muted-foreground mb-2">{region.missions?.length || 0} missions</p>
                                    <div className="flex flex-wrap gap-2 mb-4">
                                        <Button
                                            variant="outline"
                                            size="sm"
                                            onClick={() => handleEditRegion(region)}
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
                                                        <span className="font-bold text-gray-900 mx-1">{region.name}</span> region and any associated data (missions, stakes, wards, missionaries).
                                                    </AlertDialogDescription>
                                                </AlertDialogHeader>
                                                <AlertDialogFooter>
                                                    <AlertDialogCancel>Cancel</AlertDialogCancel>
                                                    <AlertDialogAction onClick={() => handleDeleteRegion(region.id)}>
                                                        Delete
                                                    </AlertDialogAction>
                                                </AlertDialogFooter>
                                            </AlertDialogContent>
                                        </AlertDialog>
                                    </div>
                                    {region.missions && region.missions.length > 0 ? (
                                        <div className="mt-4">
                                            <h4 className="text-sm font-medium mb-2">Missions in this Region:</h4>
                                            <ul className="list-disc pl-5 space-y-1 text-sm text-muted-foreground">
                                                {region.missions.map(mission => (
                                                    <li key={mission.id}>{mission.name}</li>
                                                ))}
                                            </ul>
                                        </div>
                                    ) : (
                                        <p className="text-sm text-muted-foreground mt-4">No missions in this region yet.</p>
                                    )}
                                </CardContent>
                            </Card>
                        ))}
                    </div>
                ) : (
                    <div className="text-center py-8 bg-slate-50 border rounded-md">
                        <p className="text-gray-500">No regions have been created yet. Create your first region to get started.</p>
                    </div>
                )}
            </CardContent>
            <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
                <DialogContent className="max-w-md">
                    <DialogHeader>
                        <DialogTitle>Edit Region</DialogTitle>
                        <DialogDescription>
                            Update the region's information.
                        </DialogDescription>
                    </DialogHeader>
                    {currentRegion && (
                        <Form {...editForm}>
                            <form onSubmit={editForm.handleSubmit(onEditSubmit)} className="space-y-4">
                                <FormField
                                    control={editForm.control}
                                    name="name"
                                    render={({ field }) => (
                                        <FormItem>
                                            <FormLabel>Region Name</FormLabel>
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
                                        disabled={editRegionMutation.isPending}
                                    >
                                        {editRegionMutation.isPending ? "Saving..." : "Save Changes"}
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