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
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";

type Mission = {
    id: number;
    name: string;
    regionId: number;
    stakes: { id: number; name: string }[] | null;
};

type Region = {
    id: number;
    name: string;
}

const missionSchema = z.object({
  name: z.string().min(2, "Mission name must be at least 2 characters"),
  regionId: z.coerce.number({ required_error: "Please select a region." }),
});

type MissionFormValues = z.infer<typeof missionSchema>;

const fetchMissions = async (): Promise<Mission[]> => {
    const res = await apiRequest("GET", '/api/missions');
    return res.json();
}

const fetchRegions = async (): Promise<Region[]> => {
    const res = await apiRequest("GET", '/api/regions');
    return res.json();
}

export function MissionManagement() {
    const queryClient = useQueryClient();
    const { toast } = useToast();
    const { data: missions, isLoading: missionsLoading, isError: missionsError, error: missionErr } = useQuery({
        queryKey: ['missions'],
        queryFn: fetchMissions,
    });

    const { data: regions, isLoading: regionsLoading, isError: regionsError, error: regionErr } = useQuery({
        queryKey: ['regions'],
        queryFn: fetchRegions,
    });

    const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
    const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
    const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
    const [selectedMission, setSelectedMission] = useState<Mission | null>(null);

    const createForm = useForm<MissionFormValues>({
        resolver: zodResolver(missionSchema),
        defaultValues: { name: "", regionId: undefined },
    });

    const editForm = useForm<MissionFormValues>({
        resolver: zodResolver(missionSchema),
    });

    const createMissionMutation = useMutation({
        mutationFn: (newMission: MissionFormValues) => apiRequest("POST", "/api/missions", newMission),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['missions'] });
            toast({ title: "Mission created", description: "The new mission has been successfully created." });
            setIsCreateDialogOpen(false);
            createForm.reset();
        },
        onError: (error: Error) => {
            toast({ title: "Error", description: error.message, variant: "destructive" });
        },
    });

    const updateMissionMutation = useMutation({
        mutationFn: (updatedMission: MissionFormValues) => apiRequest("PATCH", `/api/missions/${selectedMission?.id}`, updatedMission),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['missions'] });
            toast({ title: "Mission updated", description: "The mission has been successfully updated." });
            setIsEditDialogOpen(false);
            setSelectedMission(null);
        },
        onError: (error: Error) => {
            toast({ title: "Error", description: error.message, variant: "destructive" });
        },
    });

    const deleteMissionMutation = useMutation({
        mutationFn: () => apiRequest("DELETE", `/api/missions/${selectedMission?.id}`),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['missions'] });
            toast({ title: "Mission deleted", description: "The mission has been successfully deleted." });
            setIsDeleteDialogOpen(false);
            setSelectedMission(null);
        },
        onError: (error: Error) => {
            toast({ title: "Error", description: error.message, variant: "destructive" });
        },
    });

    const handleCreateSubmit = (data: MissionFormValues) => {
        createMissionMutation.mutate(data);
    };

    const handleUpdateSubmit = (data: MissionFormValues) => {
        updateMissionMutation.mutate(data);
    };

    const handleDeleteConfirm = () => {
        deleteMissionMutation.mutate();
    };

    const openEditDialog = (mission: Mission) => {
        setSelectedMission(mission);
        editForm.setValue("name", mission.name);
        editForm.setValue("regionId", mission.regionId);
        setIsEditDialogOpen(true);
    };

    const openDeleteDialog = (mission: Mission) => {
        setSelectedMission(mission);
        setIsDeleteDialogOpen(true);
    };

    return (
        <Card>
            <CardHeader>
                <div className="flex justify-between items-center">
                    <div>
                        <CardTitle>Mission Management</CardTitle>
                        <CardDescription>Create and manage missions within your regions.</CardDescription>
                    </div>
                    <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
                        <DialogTrigger asChild>
                            <Button>
                                <PlusCircle className="mr-2 h-4 w-4" />
                                Add Mission
                            </Button>
                        </DialogTrigger>
                        <DialogContent>
                            <DialogHeader>
                                <DialogTitle>Add New Mission</DialogTitle>
                            </DialogHeader>
                            <form onSubmit={createForm.handleSubmit(handleCreateSubmit)}>
                                <Input {...createForm.register("name")} placeholder="Mission Name" className="mb-4"/>
                                {createForm.formState.errors.name && <p className="text-red-500 text-sm mt-1">{createForm.formState.errors.name.message}</p>}

                                <Select onValueChange={(value) => createForm.setValue("regionId", Number(value))}>
                                    <SelectTrigger>
                                        <SelectValue placeholder="Select a region" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        {regions?.map(region => (
                                            <SelectItem key={region.id} value={String(region.id)}>{region.name}</SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                                {createForm.formState.errors.regionId && <p className="text-red-500 text-sm mt-1">{createForm.formState.errors.regionId.message}</p>}

                                <DialogFooter className="mt-4">
                                    <Button type="submit" disabled={createMissionMutation.isPending}>
                                        {createMissionMutation.isPending ? "Adding..." : "Add Mission"}
                                    </Button>
                                </DialogFooter>
                            </form>
                        </DialogContent>
                    </Dialog>
                </div>
            </CardHeader>
            <CardContent>
                {missionsLoading && <p className="text-center text-muted-foreground">Loading missions...</p>}
                {missionsError && <p className="text-destructive">Error: {missionErr?.message}</p>}
                <div className="space-y-4">
                    {missions?.map(mission => (
                        <Card key={mission.id}>
                            <CardHeader>
                                <div className="flex justify-between items-center">
                                    <CardTitle>{mission.name}</CardTitle>
                                    <div className="flex space-x-2">
                                        <Button variant="ghost" size="icon" onClick={() => openEditDialog(mission)}>
                                            <Pencil className="h-4 w-4" />
                                        </Button>
                                        <Button variant="ghost" size="icon" onClick={() => openDeleteDialog(mission)}>
                                            <Trash2 className="h-4 w-4 text-red-500" />
                                        </Button>
                                    </div>
                                </div>
                                <CardDescription>
                                    {mission.stakes?.length || 0} stakes
                                </CardDescription>
                            </CardHeader>
                            <CardContent>
                                {mission.stakes && mission.stakes.length > 0 ? (
                                    <ul>
                                        {mission.stakes.map(stake => (
                                            <li key={stake.id} className="text-sm text-muted-foreground">{stake.name}</li>
                                        ))}
                                    </ul>
                                ) : (
                                    <p className="text-sm text-muted-foreground">No stakes in this mission yet.</p>
                                )}
                            </CardContent>
                        </Card>
                    ))}
                </div>
            </CardContent>
             <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>Edit Mission</DialogTitle>
                    </DialogHeader>
                    <form onSubmit={editForm.handleSubmit(handleUpdateSubmit)}>
                        <Input {...editForm.register("name")} placeholder="Mission Name" className="mb-4" />
                        {editForm.formState.errors.name && <p className="text-red-500 text-sm mt-1">{editForm.formState.errors.name.message}</p>}

                        <Select defaultValue={String(selectedMission?.regionId)} onValueChange={(value) => editForm.setValue("regionId", Number(value))}>
                            <SelectTrigger>
                                <SelectValue placeholder="Select a region" />
                            </SelectTrigger>
                            <SelectContent>
                                {regions?.map(region => (
                                    <SelectItem key={region.id} value={String(region.id)}>{region.name}</SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                        {editForm.formState.errors.regionId && <p className="text-red-500 text-sm mt-1">{editForm.formState.errors.regionId.message}</p>}

                        <DialogFooter className="mt-4">
                            <Button type="submit" disabled={updateMissionMutation.isPending}>
                                {updateMissionMutation.isPending ? "Saving..." : "Save Changes"}
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
                            This action cannot be undone. This will permanently delete the mission and all associated stakes and wards.
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogCancel>Cancel</AlertDialogCancel>
                        <AlertDialogAction onClick={handleDeleteConfirm} disabled={deleteMissionMutation.isPending}>
                            {deleteMissionMutation.isPending ? "Deleting..." : "Delete"}
                        </AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>
        </Card>
    );
}