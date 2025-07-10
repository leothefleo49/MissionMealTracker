import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from './ui/card';
import { Button } from './ui/button';
import { PlusCircle, Pencil, Trash2 } from 'lucide-react';
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
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Input } from "@/components/ui/input";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";

type Region = {
    id: number;
    name: string;
    missions: { id: number; name: string }[] | null;
};

const regionSchema = z.object({
  name: z.string().min(2, "Region name must be at least 2 characters"),
});

type RegionFormValues = z.infer<typeof regionSchema>;

const fetchRegions = async (): Promise<Region[]> => {
    const res = await apiRequest("GET", '/api/regions');
    return res.json();
}

export function RegionManagement() {
    const queryClient = useQueryClient();
    const { toast } = useToast();
    const { data: regions, isLoading, isError, error } = useQuery({
        queryKey: ['regions'],
        queryFn: fetchRegions,
    });
    const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
    const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
    const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
    const [selectedRegion, setSelectedRegion] = useState<Region | null>(null);

    const createForm = useForm<RegionFormValues>({
        resolver: zodResolver(regionSchema),
        defaultValues: { name: "" },
    });

    const editForm = useForm<RegionFormValues>({
        resolver: zodResolver(regionSchema),
    });

    const createRegionMutation = useMutation({
        mutationFn: (newRegion: RegionFormValues) => apiRequest("POST", "/api/regions", newRegion),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['regions'] });
            toast({ title: "Region created", description: "The new region has been successfully created." });
            setIsCreateDialogOpen(false);
            createForm.reset();
        },
        onError: (error: Error) => {
            toast({ title: "Error", description: error.message, variant: "destructive" });
        },
    });

    const updateRegionMutation = useMutation({
        mutationFn: (updatedRegion: RegionFormValues) => apiRequest("PATCH", `/api/regions/${selectedRegion?.id}`, updatedRegion),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['regions'] });
            toast({ title: "Region updated", description: "The region has been successfully updated." });
            setIsEditDialogOpen(false);
            setSelectedRegion(null);
        },
        onError: (error: Error) => {
            toast({ title: "Error", description: error.message, variant: "destructive" });
        },
    });

    const deleteRegionMutation = useMutation({
        mutationFn: () => apiRequest("DELETE", `/api/regions/${selectedRegion?.id}`),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['regions'] });
            toast({ title: "Region deleted", description: "The region has been successfully deleted." });
            setIsDeleteDialogOpen(false);
            setSelectedRegion(null);
        },
        onError: (error: Error) => {
            toast({ title: "Error", description: error.message, variant: "destructive" });
        },
    });

    const handleCreateSubmit = (data: RegionFormValues) => {
        createRegionMutation.mutate(data);
    };

    const handleUpdateSubmit = (data: RegionFormValues) => {
        updateRegionMutation.mutate(data);
    };

    const handleDeleteConfirm = () => {
        deleteRegionMutation.mutate();
    };

    const openEditDialog = (region: Region) => {
        setSelectedRegion(region);
        editForm.setValue("name", region.name);
        setIsEditDialogOpen(true);
    };

    const openDeleteDialog = (region: Region) => {
        setSelectedRegion(region);
        setIsDeleteDialogOpen(true);
    };

    return (
        <Card>
            <CardHeader>
                <div className="flex justify-between items-center">
                    <div>
                        <CardTitle>Region Management</CardTitle>
                        <CardDescription>Create and manage all regions in the organization.</CardDescription>
                    </div>
                    <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
                        <DialogTrigger asChild>
                            <Button>
                                <PlusCircle className="mr-2 h-4 w-4" />
                                Add Region
                            </Button>
                        </DialogTrigger>
                        <DialogContent>
                            <DialogHeader>
                                <DialogTitle>Add New Region</DialogTitle>
                            </DialogHeader>
                            <form onSubmit={createForm.handleSubmit(handleCreateSubmit)}>
                                <Input {...createForm.register("name")} placeholder="Region Name" />
                                {createForm.formState.errors.name && <p className="text-red-500 text-sm mt-1">{createForm.formState.errors.name.message}</p>}
                                <DialogFooter className="mt-4">
                                    <Button type="submit" disabled={createRegionMutation.isPending}>
                                        {createRegionMutation.isPending ? "Adding..." : "Add Region"}
                                    </Button>
                                </DialogFooter>
                            </form>
                        </DialogContent>
                    </Dialog>
                </div>
            </CardHeader>
            <CardContent>
                {isLoading && <p className="text-center text-muted-foreground">Loading regions...</p>}
                {isError && <p className="text-destructive">Error: {error.message}</p>}
                <div className="space-y-4">
                    {regions?.map(region => (
                        <Card key={region.id}>
                            <CardHeader>
                                <div className="flex justify-between items-center">
                                    <CardTitle>{region.name}</CardTitle>
                                    <div className="flex space-x-2">
                                        <Button variant="ghost" size="icon" onClick={() => openEditDialog(region)}>
                                            <Pencil className="h-4 w-4" />
                                        </Button>
                                        <Button variant="ghost" size="icon" onClick={() => openDeleteDialog(region)}>
                                            <Trash2 className="h-4 w-4 text-red-500" />
                                        </Button>
                                    </div>
                                </div>
                                <CardDescription>
                                    {region.missions?.length || 0} missions
                                </CardDescription>
                            </CardHeader>
                            <CardContent>
                                {region.missions && region.missions.length > 0 ? (
                                    <ul>
                                        {region.missions.map(mission => (
                                            <li key={mission.id} className="text-sm text-muted-foreground">{mission.name}</li>
                                        ))}
                                    </ul>
                                ) : (
                                    <p className="text-sm text-muted-foreground">No missions in this region yet.</p>
                                )}
                            </CardContent>
                        </Card>
                    ))}
                </div>
            </CardContent>
            <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>Edit Region</DialogTitle>
                    </DialogHeader>
                    <form onSubmit={editForm.handleSubmit(handleUpdateSubmit)}>
                        <Input {...editForm.register("name")} placeholder="Region Name" />
                        {editForm.formState.errors.name && <p className="text-red-500 text-sm mt-1">{editForm.formState.errors.name.message}</p>}
                        <DialogFooter className="mt-4">
                            <Button type="submit" disabled={updateRegionMutation.isPending}>
                                {updateRegionMutation.isPending ? "Saving..." : "Save Changes"}
                            </Button>
                        </DialogFooter>
                    </form>
                </DialogContent>
            </Dialog>
            <AlertDialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogTitle>Are you sure?</AlertDialogTitle>
                        <AlertDialogDescription>
                            This action cannot be undone. This will permanently delete the region and all associated missions, stakes, and wards.
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogCancel>Cancel</AlertDialogCancel>
                        <AlertDialogAction onClick={handleDeleteConfirm} disabled={deleteRegionMutation.isPending}>
                            {deleteRegionMutation.isPending ? "Deleting..." : "Delete"}
                        </AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>
        </Card>
    );
}