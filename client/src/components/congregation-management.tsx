// client/src/components/congregation-management.tsx
import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { PlusCircle, Edit, Trash2, Check, X, Users, Filter } from 'lucide-react';
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


interface Congregation {
  id: number;
  name: string;
  accessCode: string;
  active: boolean;
  stakeId?: number | null;
  stake?: {
    id: number;
    name: string;
  } | null;
}

interface Stake {
  id: number;
  name: string;
}

export function CongregationManagement() {
  const queryClient = useQueryClient();
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [currentCongregation, setCurrentCongregation] = useState<Congregation | null>(null);
  const [congregationName, setCongregationName] = useState('');
  const [congregationAccessCode, setCongregationAccessCode] = useState('');
  const [congregationActive, setCongregationActive] = useState(true);
  const [selectedStakeId, setSelectedStakeId] = useState<string | null>(null);
  const [showUnassignedOnly, setShowUnassignedOnly] = useState(false);

  const { data: congregations, isLoading: isLoadingCongregations, isError: isErrorCongregations } = useQuery<Congregation[]>({
    queryKey: ['congregations', showUnassignedOnly],
    queryFn: async () => {
      const res = await fetch(`/api/admin/congregations?unassignedOnly=${showUnassignedOnly}`);
      if (!res.ok) {
        throw new Error('Failed to fetch congregations');
      }
      return res.json();
    },
  });

  const { data: stakes, isLoading: isLoadingStakes } = useQuery<Stake[]>({
    queryKey: ['stakes'],
    queryFn: async () => {
      const res = await fetch('/api/stakes');
      if (!res.ok) {
        throw new Error('Failed to fetch stakes');
      }
      return res.json();
    },
  });

  const addCongregationMutation = useMutation({
    mutationFn: async (newCongregation: { name: string; accessCode: string; active: boolean; stakeId?: number | null }) => {
      const res = await fetch('/api/admin/congregations', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newCongregation),
      });
      if (!res.ok) {
        const errorData = await res.json();
        throw new Error(errorData.message || 'Failed to add congregation');
      }
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['congregations'] });
      queryClient.invalidateQueries({ queryKey: ['stakes'] }); // Invalidate stakes to refresh hierarchy
      setIsAddDialogOpen(false);
      setCongregationName('');
      setCongregationAccessCode('');
      setCongregationActive(true);
      setSelectedStakeId(null);
      toast({
        title: 'Congregation Added',
        description: 'The new congregation has been successfully added.',
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

  const updateCongregationMutation = useMutation({
    mutationFn: async (updatedCongregation: Partial<Congregation> & { id: number }) => {
      const res = await fetch(`/api/admin/congregations/${updatedCongregation.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updatedCongregation),
      });
      if (!res.ok) {
        const errorData = await res.json();
        throw new Error(errorData.message || 'Failed to update congregation');
      }
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['congregations'] });
      queryClient.invalidateQueries({ queryKey: ['stakes'] }); // Invalidate stakes to refresh hierarchy
      setIsEditDialogOpen(false);
      setCurrentCongregation(null);
      setCongregationName('');
      setCongregationAccessCode('');
      setCongregationActive(true);
      setSelectedStakeId(null);
      toast({
        title: 'Congregation Updated',
        description: 'The congregation has been successfully updated.',
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

  const handleAddCongregation = () => {
    const newCongregation = {
      name: congregationName,
      accessCode: congregationAccessCode,
      active: congregationActive,
      stakeId: selectedStakeId ? parseInt(selectedStakeId, 10) : null,
    };
    addCongregationMutation.mutate(newCongregation);
  };

  const handleEditCongregation = () => {
    if (currentCongregation) {
      const updatedCongregation = {
        id: currentCongregation.id,
        name: congregationName,
        accessCode: congregationAccessCode,
        active: congregationActive,
        stakeId: selectedStakeId ? parseInt(selectedStakeId, 10) : null,
      };
      updateCongregationMutation.mutate(updatedCongregation);
    }
  };

  const openEditDialog = (congregation: Congregation) => {
    setCurrentCongregation(congregation);
    setCongregationName(congregation.name);
    setCongregationAccessCode(congregation.accessCode);
    setCongregationActive(congregation.active);
    setSelectedStakeId(congregation.stakeId ? String(congregation.stakeId) : null);
    setIsEditDialogOpen(true);
  };

  if (isLoadingCongregations || isLoadingStakes) {
    return (
      <div className="flex justify-center items-center h-48">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    );
  }

  if (isErrorCongregations) {
    return (
      <Alert variant="destructive">
        <AlertTitle>Error</AlertTitle>
        <AlertDescription>Failed to load congregations. Please try again later.</AlertDescription>
      </Alert>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-bold flex items-center">
          <Users className="mr-2" /> Congregation Management
        </h2>
        <div className="flex items-center space-x-4">
          <div className="flex items-center space-x-2">
            <Switch
              id="unassigned-congregations-filter"
              checked={showUnassignedOnly}
              onCheckedChange={setShowUnassignedOnly}
            />
            <Label htmlFor="unassigned-congregations-filter">Show Unassigned Only</Label>
          </div>
          <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
            <DialogTrigger asChild>
              <Button>
                <PlusCircle className="mr-2 h-4 w-4" /> Add Congregation
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-[425px]">
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
                    value={congregationName}
                    onChange={(e) => setCongregationName(e.target.value)}
                    className="col-span-3"
                  />
                </div>
                <div className="grid grid-cols-4 items-center gap-4">
                  <Label htmlFor="accessCode" className="text-right">
                    Access Code
                  </Label>
                  <Input
                    id="accessCode"
                    value={congregationAccessCode}
                    onChange={(e) => setCongregationAccessCode(e.target.value)}
                    className="col-span-3"
                  />
                </div>
                <div className="grid grid-cols-4 items-center gap-4">
                  <Label htmlFor="active" className="text-right">
                    Active
                  </Label>
                  <Switch
                    id="active"
                    checked={congregationActive}
                    onCheckedChange={setCongregationActive}
                    className="col-span-3"
                  />
                </div>
                <div className="grid grid-cols-4 items-center gap-4">
                  <Label htmlFor="stake" className="text-right">
                    Stake
                  </Label>
                  <Select
                    onValueChange={(value) => setSelectedStakeId(value === 'null' ? null : value)}
                    value={selectedStakeId || 'null'}
                  >
                    <SelectTrigger className="col-span-3">
                      <SelectValue placeholder="Select a Stake (Optional)" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="null">Unassigned</SelectItem>
                      {stakes?.map((stake) => (
                        <SelectItem key={stake.id} value={String(stake.id)}>
                          {stake.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <DialogFooter>
                <Button onClick={handleAddCongregation} disabled={addCongregationMutation.isPending}>
                  {addCongregationMutation.isPending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Check className="mr-2 h-4 w-4" />}
                  Add Congregation
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
            <TableHead>Access Code</TableHead>
            <TableHead>Active</TableHead>
            <TableHead>Stake</TableHead>
            <TableHead className="text-right">Actions</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {congregations?.map((congregation) => (
            <TableRow key={congregation.id}>
              <TableCell className="font-medium">{congregation.name}</TableCell>
              <TableCell>{congregation.accessCode}</TableCell>
              <TableCell>{congregation.active ? 'Yes' : 'No'}</TableCell>
              <TableCell>{congregation.stake?.name || 'Unassigned'}</TableCell>
              <TableCell className="text-right">
                <Button variant="ghost" size="icon" onClick={() => openEditDialog(congregation)}>
                  <Edit className="h-4 w-4" />
                </Button>
                {/* Delete functionality for congregations is not yet implemented in routes.ts */}
                {/* <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => deleteCongregationMutation.mutate(congregation.id)}
                  disabled={deleteCongregationMutation.isPending}
                >
                  <Trash2 className="h-4 w-4" />
                </Button> */}
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>

      <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
        <DialogContent className="sm:max-w-[425px]">
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
                value={congregationName}
                onChange={(e) => setCongregationName(e.target.value)}
                className="col-span-3"
              />
            </div>
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="edit-accessCode" className="text-right">
                Access Code
              </Label>
              <Input
                id="edit-accessCode"
                value={congregationAccessCode}
                onChange={(e) => setCongregationAccessCode(e.target.value)}
                className="col-span-3"
              />
            </div>
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="edit-active" className="text-right">
                Active
              </Label>
              <Switch
                id="edit-active"
                checked={congregationActive}
                onCheckedChange={setCongregationActive}
                className="col-span-3"
              />
            </div>
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="edit-stake" className="text-right">
                Stake
              </Label>
              <Select
                onValueChange={(value) => setSelectedStakeId(value === 'null' ? null : value)}
                value={selectedStakeId || 'null'}
              >
                <SelectTrigger className="col-span-3">
                  <SelectValue placeholder="Select a Stake (Optional)" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="null">Unassigned</SelectItem>
                  {stakes?.map((stake) => (
                    <SelectItem key={stake.id} value={String(stake.id)}>
                      {stake.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button onClick={handleEditCongregation} disabled={updateCongregationMutation.isPending}>
              {updateCongregationMutation.isPending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Check className="mr-2 h-4 w-4" />}
              Save Changes
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}