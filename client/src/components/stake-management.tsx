// client/src/components/stake-management.tsx
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
import { cn } from '../lib/utils'; // Assuming cn utility is available
import type { Stake, Mission } from '@shared/schema';

// New component for Combobox
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

export function StakeManagement() {
  const queryClient = useQueryClient();
  const [isAddStakeDialogOpen, setIsAddStakeDialogOpen] = useState(false);
  const [newStakeName, setNewStakeName] = useState('');
  const [newStakeDescription, setNewStakeDescription] = useState('');
  const [newStakeMissionId, setNewStakeMissionId] = useState<number | null>(null);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [currentStake, setCurrentStake] = useState<Stake | null>(null);
  const [editedStakeName, setEditedStakeName] = useState('');
  const [editedStakeDescription, setEditedStakeDescription] = useState('');
  const [editedStakeMissionId, setEditedStakeMissionId] = useState<number | null>(null);
  const [showUnassignedOnly, setShowUnassignedOnly] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');

  // Fetch all stakes with filtering and search
  const { data: stakes, isLoading: isLoadingStakes, error: stakesError } = useQuery<Stake[]>({
    queryKey: ['stakes', showUnassignedOnly, searchTerm],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (showUnassignedOnly) {
        params.append('unassignedOnly', 'true');
      }
      if (searchTerm) {
        params.append('searchTerm', searchTerm);
      }
      const response = await fetch(`/api/stakes?${params.toString()}`);
      if (!response.ok) {
        throw new Error('Failed to fetch stakes');
      }
      return response.json();
    },
  });

  // Fetch all missions for assignment dropdown
  const { data: missions, isLoading: isLoadingMissions } = useQuery<Mission[]>({
    queryKey: ['missions'],
    queryFn: async () => {
      const response = await fetch('/api/missions');
      if (!response.ok) {
        throw new Error('Failed to fetch missions');
      }
      return response.json();
    },
  });

  const missionOptions = missions?.map(mission => ({
    label: mission.name,
    value: mission.id,
  })) || [];

  const addStakeMutation = useMutation({
    mutationFn: async (newStakeData: { name: string; description?: string; missionId?: number | null }) => {
      const response = await fetch('/api/stakes', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newStakeData),
      });
      if (!response.ok) {
        throw new Error('Failed to create stake');
      }
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['stakes'] });
      queryClient.invalidateQueries({ queryKey: ['missions'] }); // Invalidate missions to update child stakes
      setIsAddStakeDialogOpen(false);
      setNewStakeName('');
      setNewStakeDescription('');
      setNewStakeMissionId(null);
      toast({ title: 'Stake created successfully.' });
    },
    onError: (error) => {
      toast({ title: 'Failed to create stake.', description: error.message, variant: 'destructive' });
    },
  });

  const updateStakeMutation = useMutation({
    mutationFn: async (updatedStakeData: Partial<Stake> & { id: number }) => {
      const response = await fetch(`/api/stakes/${updatedStakeData.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updatedStakeData),
      });
      if (!response.ok) {
        throw new Error('Failed to update stake');
      }
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['stakes'] });
      queryClient.invalidateQueries({ queryKey: ['missions'] }); // Invalidate missions to update child stakes
      setIsEditDialogOpen(false);
      setCurrentStake(null);
      toast({ title: 'Stake updated successfully.' });
    },
    onError: (error) => {
      toast({ title: 'Failed to update stake.', description: error.message, variant: 'destructive' });
    },
  });

  const deleteStakeMutation = useMutation({
    mutationFn: async (id: number) => {
      const response = await fetch(`/api/stakes/${id}`, {
        method: 'DELETE',
      });
      if (!response.ok) {
        throw new Error('Failed to delete stake');
      }
      return true;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['stakes'] });
      queryClient.invalidateQueries({ queryKey: ['missions'] }); // Invalidate missions
      toast({ title: 'Stake deleted successfully.' });
    },
    onError: (error) => {
      toast({ title: 'Failed to delete stake.', description: error.message, variant: 'destructive' });
    },
  });

  const handleAddStake = () => {
    addStakeMutation.mutate({
      name: newStakeName,
      description: newStakeDescription || undefined,
      missionId: newStakeMissionId,
    });
  };

  const handleEditStake = (stake: Stake) => {
    setCurrentStake(stake);
    setEditedStakeName(stake.name);
    setEditedStakeDescription(stake.description || '');
    setEditedStakeMissionId(stake.missionId || null);
    setIsEditDialogOpen(true);
  };

  const handleUpdateStake = () => {
    if (currentStake) {
      updateStakeMutation.mutate({
        id: currentStake.id,
        name: editedStakeName,
        description: editedStakeDescription || undefined,
        missionId: editedStakeMissionId,
      });
    }
  };

  const handleDeleteStake = (id: number) => {
    if (window.confirm('Are you sure you want to delete this stake? This action cannot be undone.')) {
      deleteStakeMutation.mutate(id);
    }
  };

  if (isLoadingStakes || isLoadingMissions) {
    return <div>Loading stakes...</div>;
  }

  if (stakesError) {
    return <div>Error: {stakesError.message}</div>;
  }

  return (
    <Card className="w-full">
      <CardHeader>
        <CardTitle className="flex justify-between items-center">
          Stakes Management
          <div className="flex items-center space-x-2">
            <div className="relative">
              <Input
                placeholder="Search stakes..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-8"
              />
              <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
              {searchTerm && (
                <Button
                  variant="ghost"
                  size="sm"
                  className="absolute right-1.5 top-1.5 h-6 w-6 p-0"
                  onClick={() => setSearchTerm('')}
                >
                  <XCircle className="h-4 w-4 text-muted-foreground" />
                </Button>
              )}
            </div>
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <div className="flex items-center space-x-1">
                    <Label htmlFor="unassigned-stakes-mode">Show Unassigned Only</Label>
                    <Switch
                      id="unassigned-stakes-mode"
                      checked={showUnassignedOnly}
                      onCheckedChange={setShowUnassignedOnly}
                    />
                  </div>
                </TooltipTrigger>
                <TooltipContent>
                  <p>Toggle to display only stakes not assigned to any mission.</p>
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
            <Button onClick={() => setIsAddStakeDialogOpen(true)}>
              <PlusCircle className="mr-2 h-4 w-4" /> Add Stake
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
              <TableHead>Assigned Mission</TableHead>
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
                  <Button variant="ghost" size="sm" onClick={() => handleEditStake(stake)}>Edit</Button>
                  <Button variant="destructive" size="sm" onClick={() => handleDeleteStake(stake.id)}>Delete</Button>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>

        {/* Add Stake Dialog */}
        <Dialog open={isAddStakeDialogOpen} onOpenChange={setIsAddStakeDialogOpen}>
          <DialogContent>
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
                  value={newStakeName}
                  onChange={(e) => setNewStakeName(e.target.value)}
                  className="col-span-3"
                />
              </div>
              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="description" className="text-right">
                  Description
                </Label>
                <Input
                  id="description"
                  value={newStakeDescription}
                  onChange={(e) => setNewStakeDescription(e.target.value)}
                  className="col-span-3"
                />
              </div>
              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="assign-mission" className="text-right">
                  Assign to Mission
                </Label>
                <Combobox
                  options={missionOptions}
                  value={newStakeMissionId || ''}
                  onChange={(value) => setNewStakeMissionId(value as number | null)}
                  placeholder="Select a mission..."
                  className="col-span-3"
                />
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setIsAddStakeDialogOpen(false)}>Cancel</Button>
              <Button onClick={handleAddStake} disabled={addStakeMutation.isPending}>
                {addStakeMutation.isPending ? 'Creating...' : 'Add Stake'}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Edit Stake Dialog */}
        <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
          <DialogContent>
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
                  value={editedStakeName}
                  onChange={(e) => setEditedStakeName(e.target.value)}
                  className="col-span-3"
                />
              </div>
              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="edit-description" className="text-right">
                  Description
                </Label>
                <Input
                  id="edit-description"
                  value={editedStakeDescription}
                  onChange={(e) => setEditedStakeDescription(e.target.value)}
                  className="col-span-3"
                />
              </div>
              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="edit-assign-mission" className="text-right">
                  Assign to Mission
                </Label>
                <Combobox
                  options={missionOptions}
                  value={editedStakeMissionId || ''}
                  onChange={(value) => setEditedStakeMissionId(value as number | null)}
                  placeholder="Select a mission..."
                  className="col-span-3"
                />
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setIsEditDialogOpen(false)}>Cancel</Button>
              <Button onClick={handleUpdateStake} disabled={updateStakeMutation.isPending}>
                {updateStakeMutation.isPending ? 'Updating...' : 'Update Stake'}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </CardContent>
    </Card>
  );
}