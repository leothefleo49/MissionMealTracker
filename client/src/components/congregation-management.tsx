// client/src/components/congregation-management.tsx
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
import type { Congregation, Stake } from '@shared/schema';

// Re-using the Combobox component from stake-management.tsx, or assuming it's a shared utility
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

export function CongregationManagement() {
  const queryClient = useQueryClient();
  const [isAddCongregationDialogOpen, setIsAddCongregationDialogOpen] = useState(false);
  const [newCongregationName, setNewCongregationName] = useState('');
  const [newCongregationAccessCode, setNewCongregationAccessCode] = useState('');
  const [newCongregationStakeId, setNewCongregationStakeId] = useState<number | null>(null);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [currentCongregation, setCurrentCongregation] = useState<Congregation | null>(null);
  const [editedCongregationName, setEditedCongregationName] = useState('');
  const [editedCongregationAccessCode, setEditedCongregationAccessCode] = useState('');
  const [editedCongregationStakeId, setEditedCongregationStakeId] = useState<number | null>(null);
  const [showUnassignedOnly, setShowUnassignedOnly] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');

  // Fetch all congregations with filtering and search
  const { data: congregations, isLoading: isLoadingCongregations, error: congregationsError } = useQuery<Congregation[]>({
    queryKey: ['congregations', showUnassignedOnly, searchTerm],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (showUnassignedOnly) {
        params.append('unassignedOnly', 'true');
      }
      if (searchTerm) {
        params.append('searchTerm', searchTerm);
      }
      const response = await fetch(`/api/admin/congregations?${params.toString()}`);
      if (!response.ok) {
        throw new Error('Failed to fetch congregations');
      }
      return response.json();
    },
  });

  // Fetch all stakes for assignment dropdown
  const { data: stakes, isLoading: isLoadingStakes } = useQuery<Stake[]>({
    queryKey: ['stakes'],
    queryFn: async () => {
      const response = await fetch('/api/stakes');
      if (!response.ok) {
        throw new Error('Failed to fetch stakes');
      }
      return response.json();
    },
  });

  const stakeOptions = stakes?.map(stake => ({
    label: stake.name,
    value: stake.id,
  })) || [];

  const addCongregationMutation = useMutation({
    mutationFn: async (newCongregationData: { name: string; accessCode: string; stakeId?: number | null }) => {
      const response = await fetch('/api/admin/congregations', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newCongregationData),
      });
      if (!response.ok) {
        throw new Error('Failed to create congregation');
      }
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['congregations'] });
      queryClient.invalidateQueries({ queryKey: ['stakes'] }); // Invalidate stakes to update child congregations
      setIsAddCongregationDialogOpen(false);
      setNewCongregationName('');
      setNewCongregationAccessCode('');
      setNewCongregationStakeId(null);
      toast({ title: 'Congregation created successfully.' });
    },
    onError: (error) => {
      toast({ title: 'Failed to create congregation.', description: error.message, variant: 'destructive' });
    },
  });

  const updateCongregationMutation = useMutation({
    mutationFn: async (updatedCongregationData: Partial<Congregation> & { id: number }) => {
      const response = await fetch(`/api/admin/congregations/${updatedCongregationData.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updatedCongregationData),
      });
      if (!response.ok) {
        throw new Error('Failed to update congregation');
      }
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['congregations'] });
      queryClient.invalidateQueries({ queryKey: ['stakes'] }); // Invalidate stakes to update child congregations
      setIsEditDialogOpen(false);
      setCurrentCongregation(null);
      toast({ title: 'Congregation updated successfully.' });
    },
    onError: (error) => {
      toast({ title: 'Failed to update congregation.', description: error.message, variant: 'destructive' });
    },
  });

  // No delete mutation for congregations provided in the original file, assuming it's not needed for now
  // Or it might be handled differently, e.g., soft delete, which is a future feature.

  const handleAddCongregation = () => {
    addCongregationMutation.mutate({
      name: newCongregationName,
      accessCode: newCongregationAccessCode,
      stakeId: newCongregationStakeId,
    });
  };

  const handleEditCongregation = (congregation: Congregation) => {
    setCurrentCongregation(congregation);
    setEditedCongregationName(congregation.name);
    setEditedCongregationAccessCode(congregation.accessCode);
    setEditedCongregationStakeId(congregation.stakeId || null);
    setIsEditDialogOpen(true);
  };

  const handleUpdateCongregation = () => {
    if (currentCongregation) {
      updateCongregationMutation.mutate({
        id: currentCongregation.id,
        name: editedCongregationName,
        accessCode: editedCongregationAccessCode,
        stakeId: editedCongregationStakeId,
      });
    }
  };

  if (isLoadingCongregations || isLoadingStakes) {
    return <div>Loading congregations...</div>;
  }

  if (congregationsError) {
    return <div>Error: {congregationsError.message}</div>;
  }

  return (
    <Card className="w-full">
      <CardHeader>
        <CardTitle className="flex justify-between items-center">
          Congregations Management
          <div className="flex items-center space-x-2">
            <div className="relative">
              <Input
                placeholder="Search congregations..."
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
                    <Label htmlFor="unassigned-congregations-mode">Show Unassigned Only</Label>
                    <Switch
                      id="unassigned-congregations-mode"
                      checked={showUnassignedOnly}
                      onCheckedChange={setShowUnassignedOnly}
                    />
                  </div>
                </TooltipTrigger>
                <TooltipContent>
                  <p>Toggle to display only congregations not assigned to any stake.</p>
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
            <Button onClick={() => setIsAddCongregationDialogOpen(true)}>
              <PlusCircle className="mr-2 h-4 w-4" /> Add Congregation
            </Button>
          </div>
        </CardTitle>
      </CardHeader>
      <CardContent>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Name</TableHead>
              <TableHead>Access Code</TableHead>
              <TableHead>Assigned Stake</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {congregations?.map((congregation) => (
              <TableRow key={congregation.id}>
                <TableCell className="font-medium">{congregation.name}</TableCell>
                <TableCell>{congregation.accessCode}</TableCell>
                <TableCell>{congregation.stake?.name || 'Unassigned'}</TableCell>
                <TableCell className="text-right">
                  <Button variant="ghost" size="sm" onClick={() => handleEditCongregation(congregation)}>Edit</Button>
                  {/* <Button variant="destructive" size="sm" onClick={() => handleDeleteCongregation(congregation.id)}>Delete</Button> */}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>

        {/* Add Congregation Dialog */}
        <Dialog open={isAddCongregationDialogOpen} onOpenChange={setIsAddCongregationDialogOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Add New Congregation</DialogTitle>
            </DialogHeader>
            <div className="grid gap-4 py-4">
              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="name" className="text-right">
                  Name
                </Label>
                <Input
                  id="name"
                  value={newCongregationName}
                  onChange={(e) => setNewCongregationName(e.target.value)}
                  className="col-span-3"
                />
              </div>
              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="accessCode" className="text-right">
                  Access Code
                </Label>
                <Input
                  id="accessCode"
                  value={newCongregationAccessCode}
                  onChange={(e) => setNewCongregationAccessCode(e.target.value)}
                  className="col-span-3"
                />
              </div>
              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="assign-stake" className="text-right">
                  Assign to Stake
                </Label>
                <Combobox
                  options={stakeOptions}
                  value={newCongregationStakeId || ''}
                  onChange={(value) => setNewCongregationStakeId(value as number | null)}
                  placeholder="Select a stake..."
                  className="col-span-3"
                />
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setIsAddCongregationDialogOpen(false)}>Cancel</Button>
              <Button onClick={handleAddCongregation} disabled={addCongregationMutation.isPending}>
                {addCongregationMutation.isPending ? 'Creating...' : 'Add Congregation'}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Edit Congregation Dialog */}
        <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Edit Congregation</DialogTitle>
            </DialogHeader>
            <div className="grid gap-4 py-4">
              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="edit-name" className="text-right">
                  Name
                </Label>
                <Input
                  id="edit-name"
                  value={editedCongregationName}
                  onChange={(e) => setEditedCongregationName(e.target.value)}
                  className="col-span-3"
                />
              </div>
              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="edit-accessCode" className="text-right">
                  Access Code
                </Label>
                <Input
                  id="edit-accessCode"
                  value={editedCongregationAccessCode}
                  onChange={(e) => setEditedCongregationAccessCode(e.target.value)}
                  className="col-span-3"
                />
              </div>
              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="edit-assign-stake" className="text-right">
                  Assign to Stake
                </Label>
                <Combobox
                  options={stakeOptions}
                  value={editedCongregationStakeId || ''}
                  onChange={(value) => setEditedCongregationStakeId(value as number | null)}
                  placeholder="Select a stake..."
                  className="col-span-3"
                />
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setIsEditDialogOpen(false)}>Cancel</Button>
              <Button onClick={handleUpdateCongregation} disabled={updateCongregationMutation.isPending}>
                {updateCongregationMutation.isPending ? 'Updating...' : 'Update Congregation'}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </CardContent>
    </Card>
  );
}