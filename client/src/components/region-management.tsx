// client/src/components/region-management.tsx
import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from '../hooks/use-toast';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from './ui/dialog';
import { Label } from './ui/label';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from './ui/table';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { PlusCircle, Search, XCircle } from 'lucide-react';
import { Switch } from './ui/switch';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from './ui/tooltip';
import { Popover, PopoverContent, PopoverTrigger } from './ui/popover';
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem } from './ui/command';
import { CaretSortIcon, CheckIcon } from '@radix-ui/react-icons';
import { cn } from '../lib/utils';
import type { Region, Mission } from '@shared/schema';

// Re-using the Combobox component from stake-management.tsx/congregation-management.tsx
interface ComboboxProps {
  options: { label: string; value: string | number }[];
  value: string | number | undefined;
  onChange: (value: string | number | undefined) => void;
  placeholder: string;
  className?: string;
  maxHeight?: string;
}

const Combobox = ({ options, value, onChange, placeholder, className, maxHeight = "200px" }: ComboboxProps) => {
  const [open, setOpen] = useState(false);

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          role="combobox"
          aria-expanded={open}
          className={cn("w-[200px] justify-between", className)}
        >
          {value
            ? options.find((option) => option.value === value)?.label
            : placeholder}
          <CaretSortIcon className="ml-2 h-4 w-4 shrink-0 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-[200px] p-0">
        <Command>
          <CommandInput placeholder="Search..." className="h-9" />
          <CommandEmpty>No results found.</CommandEmpty>
          <CommandGroup style={{ maxHeight: maxHeight, overflowY: 'auto' }}>
            {options.map((option) => (
              <CommandItem
                key={option.value}
                value={option.label} // Use label for searchability
                onSelect={() => {
                  onChange(option.value === value ? undefined : option.value);
                  setOpen(false);
                }}
              >
                {option.label}
                <CheckIcon
                  className={cn(
                    "ml-auto h-4 w-4",
                    option.value === value ? "opacity-100" : "opacity-0"
                  )}
                />
              </CommandItem>
            ))}
          </CommandGroup>
        </Command>
      </PopoverContent>
    </Popover>
  );
};

export function RegionManagement() {
  const queryClient = useQueryClient();
  const [isAddRegionDialogOpen, setIsAddRegionDialogOpen] = useState(false);
  const [newRegionName, setNewRegionName] = useState('');
  const [newRegionDescription, setNewRegionDescription] = useState('');
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [currentRegion, setCurrentRegion] = useState<Region | null>(null);
  const [editedRegionName, setEditedRegionName] = useState('');
  const [editedRegionDescription, setEditedRegionDescription] = useState('');
  const [isAddMissionDialogOpen, setIsAddMissionDialogOpen] = useState(false);
  const [newMissionName, setNewMissionName] = useState('');
  const [newMissionDescription, setNewMissionDescription] = useState('');
  const [newMissionRegionId, setNewMissionRegionId] = useState<number | null>(null);
  const [isEditMissionDialogOpen, setIsEditMissionDialogOpen] = useState(false);
  const [currentMission, setCurrentMission] = useState<Mission | null>(null);
  const [editedMissionName, setEditedMissionName] = useState('');
  const [editedMissionDescription, setEditedMissionDescription] = useState('');
  const [editedMissionRegionId, setEditedMissionRegionId] = useState<number | null>(null);
  const [showUnassignedMissionsOnly, setShowUnassignedMissionsOnly] = useState(false);
  const [missionSearchTerm, setMissionSearchTerm] = useState('');


  // Fetch all regions with their associated missions
  const { data: regions, isLoading: isLoadingRegions, error: regionsError } = useQuery<(Region & { missions: Mission[] })[]>({
    queryKey: ['regions'], // No filter for regions themselves, just for their embedded missions
    queryFn: async () => {
      const response = await fetch('/api/regions');
      if (!response.ok) {
        throw new Error('Failed to fetch regions');
      }
      return response.json();
    },
  });

  // Fetch all missions for assignment dropdown and separate management view
  const { data: allMissions, isLoading: isLoadingAllMissions } = useQuery<Mission[]>({
    queryKey: ['missions', showUnassignedMissionsOnly, missionSearchTerm], // Add filters for missions list
    queryFn: async () => {
      const params = new URLSearchParams();
      if (showUnassignedMissionsOnly) {
        params.append('unassignedOnly', 'true');
      }
      if (missionSearchTerm) {
        params.append('searchTerm', missionSearchTerm);
      }
      const response = await fetch(`/api/missions?${params.toString()}`);
      if (!response.ok) {
        throw new Error('Failed to fetch missions');
      }
      return response.json();
    },
  });

  const regionOptions = regions?.map(region => ({
    label: region.name,
    value: region.id,
  })) || [];

  const addRegionMutation = useMutation({
    mutationFn: async (newRegionData: { name: string; description?: string }) => {
      const response = await fetch('/api/regions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newRegionData),
      });
      if (!response.ok) {
        throw new Error('Failed to create region');
      }
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['regions'] });
      toast({ title: 'Region created successfully.' });
      setIsAddRegionDialogOpen(false);
      setNewRegionName('');
      setNewRegionDescription('');
    },
    onError: (error) => {
      toast({ title: 'Failed to create region.', description: error.message, variant: 'destructive' });
    },
  });

  const updateRegionMutation = useMutation({
    mutationFn: async (updatedRegionData: Partial<Region> & { id: number }) => {
      const response = await fetch(`/api/regions/${updatedRegionData.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updatedRegionData),
      });
      if (!response.ok) {
        throw new Error('Failed to update region');
      }
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['regions'] });
      toast({ title: 'Region updated successfully.' });
      setIsEditDialogOpen(false);
      setCurrentRegion(null);
    },
    onError: (error) => {
      toast({ title: 'Failed to update region.', description: error.message, variant: 'destructive' });
    },
  });

  const deleteRegionMutation = useMutation({
    mutationFn: async (id: number) => {
      const response = await fetch(`/api/regions/${id}`, {
        method: 'DELETE',
      });
      if (!response.ok) {
        throw new Error('Failed to delete region');
      }
      return true;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['regions'] });
      toast({ title: 'Region deleted successfully.' });
    },
    onError: (error) => {
      toast({ title: 'Failed to delete region.', description: error.message, variant: 'destructive' });
    },
  });

  const addMissionMutation = useMutation({
    mutationFn: async (newMissionData: { name: string; description?: string; regionId?: number | null }) => {
      const response = await fetch('/api/missions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newMissionData),
      });
      if (!response.ok) {
        throw new Error('Failed to create mission');
      }
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['missions'] });
      queryClient.invalidateQueries({ queryKey: ['regions'] }); // Invalidate regions to update child missions
      toast({ title: 'Mission created successfully.' });
      setIsAddMissionDialogOpen(false);
      setNewMissionName('');
      setNewMissionDescription('');
      setNewMissionRegionId(null);
    },
    onError: (error) => {
      toast({ title: 'Failed to create mission.', description: error.message, variant: 'destructive' });
    },
  });

  const updateMissionMutation = useMutation({
    mutationFn: async (updatedMissionData: Partial<Mission> & { id: number }) => {
      const response = await fetch(`/api/missions/${updatedMissionData.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updatedMissionData),
      });
      if (!response.ok) {
        throw new Error('Failed to update mission');
      }
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['missions'] });
      queryClient.invalidateQueries({ queryKey: ['regions'] }); // Invalidate regions to update child missions
      toast({ title: 'Mission updated successfully.' });
      setIsEditMissionDialogOpen(false);
      setCurrentMission(null);
    },
    onError: (error) => {
      toast({ title: 'Failed to update mission.', description: error.message, variant: 'destructive' });
    },
  });

  const deleteMissionMutation = useMutation({
    mutationFn: async (id: number) => {
      const response = await fetch(`/api/missions/${id}`, {
        method: 'DELETE',
      });
      if (!response.ok) {
        throw new Error('Failed to delete mission');
      }
      return true;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['missions'] });
      queryClient.invalidateQueries({ queryKey: ['regions'] }); // Invalidate regions
      toast({ title: 'Mission deleted successfully.' });
    },
    onError: (error) => {
      toast({ title: 'Failed to delete mission.', description: error.message, variant: 'destructive' });
    },
  });

  const handleAddRegion = () => {
    addRegionMutation.mutate({
      name: newRegionName,
      description: newRegionDescription || undefined,
    });
  };

  const handleEditRegion = (region: Region) => {
    setCurrentRegion(region);
    setEditedRegionName(region.name);
    setEditedRegionDescription(region.description || '');
    setIsEditDialogOpen(true);
  };

  const handleUpdateRegion = () => {
    if (currentRegion) {
      updateRegionMutation.mutate({
        id: currentRegion.id,
        name: editedRegionName,
        description: editedRegionDescription || undefined,
      });
    }
  };

  const handleDeleteRegion = (id: number) => {
    if (window.confirm('Are you sure you want to delete this region? This will also unassign any missions linked to it.')) {
      deleteRegionMutation.mutate(id);
    }
  };

  const handleAddMission = () => {
    addMissionMutation.mutate({
      name: newMissionName,
      description: newMissionDescription || undefined,
      regionId: newMissionRegionId,
    });
  };

  const handleEditMission = (mission: Mission) => {
    setCurrentMission(mission);
    setEditedMissionName(mission.name);
    setEditedMissionDescription(mission.description || '');
    setEditedMissionRegionId(mission.regionId || null);
    setIsEditMissionDialogOpen(true);
  };

  const handleUpdateMission = () => {
    if (currentMission) {
      updateMissionMutation.mutate({
        id: currentMission.id,
        name: editedMissionName,
        description: editedMissionDescription || undefined,
        regionId: editedMissionRegionId,
      });
    }
  };

  const handleDeleteMission = (id: number) => {
    if (window.confirm('Are you sure you want to delete this mission? This action cannot be undone.')) {
      deleteMissionMutation.mutate(id);
    }
  };

  if (isLoadingRegions || isLoadingAllMissions) {
    return <div>Loading regions and missions...</div>;
  }

  if (regionsError) {
    return <div>Error: {regionsError.message}</div>;
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex justify-between items-center">
            Region Definitions
            <Button onClick={() => setIsAddRegionDialogOpen(true)}>
              <PlusCircle className="mr-2 h-4 w-4" /> Add Region
            </Button>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Name</TableHead>
                <TableHead>Description</TableHead>
                <TableHead>Missions Count</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {regions?.map((region) => (
                <TableRow key={region.id}>
                  <TableCell className="font-medium">{region.name}</TableCell>
                  <TableCell>{region.description || 'N/A'}</TableCell>
                  <TableCell>{region.missions.length}</TableCell>
                  <TableCell className="text-right">
                    <Button variant="ghost" size="sm" onClick={() => handleEditRegion(region)}>Edit</Button>
                    <Button variant="destructive" size="sm" onClick={() => handleDeleteRegion(region.id)}>Delete</Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex justify-between items-center">
            Mission Definitions
            <div className="flex items-center space-x-2">
              <div className="relative">
                <Input
                  placeholder="Search missions..."
                  value={missionSearchTerm}
                  onChange={(e) => setMissionSearchTerm(e.target.value)}
                  className="pl-8"
                />
                <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                {missionSearchTerm && (
                  <Button
                    variant="ghost"
                    size="sm"
                    className="absolute right-1.5 top-1.5 h-6 w-6 p-0"
                    onClick={() => setMissionSearchTerm('')}
                  >
                    <XCircle className="h-4 w-4 text-muted-foreground" />
                  </Button>
                )}
              </div>
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <div className="flex items-center space-x-1">
                      <Label htmlFor="unassigned-missions-mode">Show Unassigned Only</Label>
                      <Switch
                        id="unassigned-missions-mode"
                        checked={showUnassignedMissionsOnly}
                        onCheckedChange={setShowUnassignedMissionsOnly}
                      />
                    </div>
                  </TooltipTrigger>
                  <TooltipContent>
                    <p>Toggle to display only missions not assigned to any region.</p>
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>
              <Button onClick={() => setIsAddMissionDialogOpen(true)}>
                <PlusCircle className="mr-2 h-4 w-4" /> Add Mission
              </Button>
            </div>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Name</TableHead>
                <TableHead>Description</TableHead>
                <TableHead>Assigned Region</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {allMissions?.map((mission) => (
                <TableRow key={mission.id}>
                  <TableCell className="font-medium">{mission.name}</TableCell>
                  <TableCell>{mission.description || 'N/A'}</TableCell>
                  <TableCell>{mission.region?.name || 'Unassigned'}</TableCell>
                  <TableCell className="text-right">
                    <Button variant="ghost" size="sm" onClick={() => handleEditMission(mission)}>Edit</Button>
                    <Button variant="destructive" size="sm" onClick={() => handleDeleteMission(mission.id)}>Delete</Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>


      {/* Add Region Dialog */}
      <Dialog open={isAddRegionDialogOpen} onOpenChange={setIsAddRegionDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add New Region</DialogTitle>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="region-name" className="text-right">
                Name
              </Label>
              <Input
                id="region-name"
                value={newRegionName}
                onChange={(e) => setNewRegionName(e.target.value)}
                className="col-span-3"
              />
            </div>
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="region-description" className="text-right">
                Description
              </Label>
              <Input
                id="region-description"
                value={newRegionDescription}
                onChange={(e) => setNewRegionDescription(e.target.value)}
                className="col-span-3"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsAddRegionDialogOpen(false)}>Cancel</Button>
            <Button onClick={handleAddRegion} disabled={addRegionMutation.isPending}>
              {addRegionMutation.isPending ? 'Creating...' : 'Add Region'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit Region Dialog */}
      <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit Region</DialogTitle>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="edit-region-name" className="text-right">
                Name
              </Label>
              <Input
                id="edit-region-name"
                value={editedRegionName}
                onChange={(e) => setEditedRegionName(e.target.value)}
                className="col-span-3"
              />
            </div>
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="edit-region-description" className="text-right">
                Description
              </Label>
              <Input
                id="edit-region-description"
                value={editedRegionDescription}
                onChange={(e) => setEditedRegionDescription(e.target.value)}
                className="col-span-3"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsEditDialogOpen(false)}>Cancel</Button>
            <Button onClick={handleUpdateRegion} disabled={updateRegionMutation.isPending}>
              {updateRegionMutation.isPending ? 'Updating...' : 'Update Region'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Add Mission Dialog */}
      <Dialog open={isAddMissionDialogOpen} onOpenChange={setIsAddMissionDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add New Mission</DialogTitle>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="mission-name" className="text-right">
                Name
              </Label>
              <Input
                id="mission-name"
                value={newMissionName}
                onChange={(e) => setNewMissionName(e.target.value)}
                className="col-span-3"
              />
            </div>
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="mission-description" className="text-right">
                Description
              </Label>
              <Input
                id="mission-description"
                value={newMissionDescription}
                onChange={(e) => setNewMissionDescription(e.target.value)}
                className="col-span-3"
              />
            </div>
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="assign-region" className="text-right">
                Assign to Region
              </Label>
              <Combobox
                options={regionOptions}
                value={newMissionRegionId || ''}
                onChange={(value) => setNewMissionRegionId(value as number | null)}
                placeholder="Select a region..."
                className="col-span-3"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsAddMissionDialogOpen(false)}>Cancel</Button>
            <Button onClick={handleAddMission} disabled={addMissionMutation.isPending}>
              {addMissionMutation.isPending ? 'Creating...' : 'Add Mission'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit Mission Dialog */}
      <Dialog open={isEditMissionDialogOpen} onOpenChange={setIsEditMissionDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit Mission</DialogTitle>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="edit-mission-name" className="text-right">
                Name
              </Label>
              <Input
                id="edit-mission-name"
                value={editedMissionName}
                onChange={(e) => setEditedMissionName(e.target.value)}
                className="col-span-3"
              />
            </div>
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="edit-mission-description" className="text-right">
                Description
              </Label>
              <Input
                id="edit-mission-description"
                value={editedMissionDescription}
                onChange={(e) => setEditedMissionDescription(e.target.value)}
                className="col-span-3"
              />
            </div>
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="edit-assign-region" className="text-right">
                Assign to Region
              </Label>
              <Combobox
                options={regionOptions}
                value={editedMissionRegionId || ''}
                onChange={(value) => setEditedMissionRegionId(value as number | null)}
                placeholder="Select a region..."
                className="col-span-3"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsEditMissionDialogOpen(false)}>Cancel</Button>
            <Button onClick={handleUpdateMission} disabled={updateMissionMutation.isPending}>
              {updateMissionMutation.isPending ? 'Updating...' : 'Update Mission'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}