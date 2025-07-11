// client/src/components/stake-management.tsx
import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { PlusCircle, Edit, Trash2, Check, X, Building, Filter, Search } from 'lucide-react'; // Import Search icon
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow
} from './ui/table';
import { Button } from './ui/button';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter
} from './ui/dialog';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { toast } from './ui/use-toast';
import { Loader2 } from 'lucide-react';
import { Alert, AlertDescription, AlertTitle } from './ui/alert';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue
} from './ui/select';
import { Switch } from './ui/switch';


interface Stake {
  id: number;
  name: string;
  missionId?: number | null;
  description?: string;
  mission?: {
    id: number;
    name: string;
  } | null;
}

interface Mission {
  id: number;
  name: string;
}

export function StakeManagement() {
  const queryClient = useQueryClient();
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [currentStake, setCurrentStake] = useState<Stake | null>(null);
  const [stakeName, setStakeName] = useState('');
  const [stakeDescription, setStakeDescription] = useState('');
  const [selectedMissionId, setSelectedMissionId] = useState<string | null>(null);
  const [showUnassignedOnly, setShowUnassignedOnly] = useState(false);
  const [searchTerm, setSearchTerm] = useState(''); // New state for search term


  const { data: stakes, isLoading: isLoadingStakes, isError: isErrorStakes } = useQuery<Stake[]>({
    queryKey: ['stakes', showUnassignedOnly, searchTerm], // Add searchTerm to queryKey
    queryFn: async () => {
      const params = new URLSearchParams();
      if (showUnassignedOnly) {
        params.append('unassignedOnly', 'true');
      }
      if (searchTerm) {
        params.append('searchTerm', searchTerm); // Pass searchTerm to the API
      }
      const res = await fetch(`/api/stakes?${params.toString()}`);
      if (!res.ok) {
        throw new Error('Failed to fetch stakes');
      }
      return res.json();
    },
  });

  const { data: missions, isLoading: isLoadingMissions } = useQuery<Mission[]>({
    queryKey: ['missions'],
    queryFn: async () => {
      const res = await fetch('/api/missions');
      if (!res.ok) {
        throw new Error('Failed to fetch missions');
      }
      return res.json();
    },
  });

  const addStakeMutation = useMutation({
    mutationFn: async (newStake: { name: string; missionId?: number | null; description?: string }) => {
      const res = await fetch('/api/stakes', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newStake),
      });
      if (!res.ok) {
        const errorData = await res.json();
        throw new Error(errorData.message || 'Failed to add stake');
      }
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['stakes'] });
      queryClient.invalidateQueries({ queryKey: ['missions'] }); // Invalidate missions to refresh hierarchy
      setIsAddDialogOpen(false);
      setStakeName('');
      setStakeDescription('');
      setSelectedMissionId(null);
      toast({
        title: 'Stake Added',
        description: 'The new stake has been successfully added.',
      });
    },
    onError: (error) => {
      toast({
        title: 'Error',
        description: error.message,
        variant: 'destructive',
      });
    },
  });

  const updateStakeMutation = useMutation({
    mutationFn: async (updatedStake: Partial<Stake> & { id: number }) => {
      const res = await fetch(`/api/stakes/${updatedStake.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updatedStake),
      });
      if (!res.ok) {
        const errorData = await res.json();
        throw new Error(errorData.message || 'Failed to update stake');
      }
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['stakes'] });
      queryClient.invalidateQueries({ queryKey: ['missions'] }); // Invalidate missions to refresh hierarchy
      setIsEditDialogOpen(false);
      setCurrentStake(null);
      setStakeName('');
      setStakeDescription('');
      setSelectedMissionId(null);
      toast({
        title: 'Stake Updated',
        description: 'The stake has been successfully updated.',
      });
    },
    onError: (error) => {
      toast({
        title: 'Error',
        description: error.message,
        variant: 'destructive',
      });
    },
  });

  const deleteStakeMutation = useMutation({
    mutationFn: async (id: number) => {
      const res = await fetch(`/api/stakes/${id}`, {
        method: 'DELETE',
      });
      if (!res.ok) {
        const errorData = await res.json();
        throw new Error(errorData.message || 'Failed to delete stake');
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['stakes'] });
      queryClient.invalidateQueries({ queryKey: ['missions'] }); // Invalidate missions to refresh hierarchy
      toast({
        title: 'Stake Deleted',
        description: 'The stake has been successfully deleted.',
      });
    },
    onError: (error) => {
      toast({
        title: 'Error',
        description: error.message,
        variant: 'destructive',
      });
    },
  });

  const handleAddStake = () => {
    const newStake = {
      name: stakeName,
      description: stakeDescription,
      missionId: selectedMissionId ? parseInt(selectedMissionId, 10) : null,
    };
    addStakeMutation.mutate(newStake);
  };

  const handleEditStake = () => {
    if (currentStake) {
      const updatedStake = {
        id: currentStake.id,
        name: stakeName,
        description: stakeDescription,
        missionId: selectedMissionId ? parseInt(selectedMissionId, 10) : null,
      };
      updateStakeMutation.mutate(updatedStake);
    }
  };

  const openEditDialog = (stake: Stake) => {
    setCurrentStake(stake);
    setStakeName(stake.name);
    setStakeDescription(stake.description || '');
    setSelectedMissionId(stake.missionId ? String(stake.missionId) : null);
    setIsEditDialogOpen(true);
  };

  if (isLoadingStakes || isLoadingMissions) {
    return (
      <div className="flex justify-center items-center h-48">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    );
  }

  if (isErrorStakes) {
    return (
      <Alert variant="destructive">
        <AlertTitle>Error</AlertTitle>
        <AlertDescription>Failed to load stakes. Please try again later.</AlertDescription>
      </Alert>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-bold flex items-center">
          <Building className="mr-2" /> Stake Management
        </h2>
        <div className="flex items-center space-x-4">
          {/* Search Input */}
          <div className="relative">
            <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search stakes..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-8"
            />
          </div>
          <div className="flex items-center space-x-2">
            <Switch
              id="unassigned-stakes-filter"
              checked={showUnassignedOnly}
              onCheckedChange={setShowUnassignedOnly}
            />
            <Label htmlFor="unassigned-stakes-filter">Show Unassigned Only</Label>
          </div>
          <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
            <DialogTrigger asChild>
              <Button>
                <PlusCircle className="mr-2 h-4 w-4" /> Add Stake
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-[425px]">
              <DialogHeader>
                <DialogTitle>Add New Stake</DialogTitle>
              </DialogHeader>
              <div className="grid gap-4 py-4">
                <div className="grid grid-cols-4 items-center gap-4">
                  <Label htmlFor="name" className="text-right">
                    Name
                  </Label>
                  <Input
                    id="name"
                    value={stakeName}
                    onChange={(e) => setStakeName(e.target.value)}
                    className="col-span-3"
                  />
                </div>
                <div className="grid grid-cols-4 items-center gap-4">
                  <Label htmlFor="description" className="text-right">
                    Description
                  </Label>
                  <Input
                    id="description"
                    value={stakeDescription}
                    onChange={(e) => setStakeDescription(e.target.value)}
                    className="col-span-3"
                  />
                </div>
                <div className="grid grid-cols-4 items-center gap-4">
                  <Label htmlFor="mission" className="text-right">
                    Mission
                  </Label>
                  <Select
                    onValueChange={(value) => setSelectedMissionId(value === 'null' ? null : value)}
                    value={selectedMissionId || 'null'}
                  >
                    <SelectTrigger className="col-span-3">
                      <SelectValue placeholder="Select a Mission (Optional)" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="null">Unassigned</SelectItem>
                      {missions?.map((mission) => (
                        <SelectItem key={mission.id} value={String(mission.id)}>
                          {mission.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <DialogFooter>
                <Button onClick={handleAddStake} disabled={addStakeMutation.isPending}>
                  {addStakeMutation.isPending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Check className="mr-2 h-4 w-4" />}
                  Add Stake
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Name</TableHead>
            <TableHead>Description</TableHead>
            <TableHead>Mission</TableHead>
            <TableHead className="text-right">Actions</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {stakes?.map((stake) => (
            <TableRow key={stake.id}>
              <TableCell className="font-medium">{stake.name}</TableCell>
              <TableCell>{stake.description || 'N/A'}</TableCell>
              <TableCell>{stake.mission?.name || 'Unassigned'}</TableCell>
              <TableCell className="text-right">
                <Button variant="ghost" size="icon" onClick={() => openEditDialog(stake)}>
                  <Edit className="h-4 w-4" />
                </Button>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => deleteStakeMutation.mutate(stake.id)}
                  disabled={deleteStakeMutation.isPending}
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>

      <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle>Edit Stake</DialogTitle>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="edit-name" className="text-right">
                Name
              </Label>
              <Input
                id="edit-name"
                value={stakeName}
                onChange={(e) => setStakeName(e.target.value)}
                className="col-span-3"
              />
            </div>
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="edit-description" className="text-right">
                Description
              </Label>
              <Input
                id="edit-description"
                value={stakeDescription}
                onChange={(e) => setStakeDescription(e.target.value)}
                className="col-span-3"
              />
            </div>
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="edit-mission" className="text-right">
                Mission
              </Label>
              <Select
                onValueChange={(value) => setSelectedMissionId(value === 'null' ? null : value)}
                value={selectedMissionId || 'null'}
              >
                <SelectTrigger className="col-span-3">
                  <SelectValue placeholder="Select a Mission (Optional)" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="null">Unassigned</SelectItem>
                  {missions?.map((mission) => (
                    <SelectItem key={mission.id} value={String(mission.id)}>
                      {mission.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button onClick={handleEditStake} disabled={updateStakeMutation.isPending}>
              {updateStakeMutation.isPending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Check className="mr-2 h-4 w-4" />}
              Save Changes
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}