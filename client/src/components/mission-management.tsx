// client/src/components/mission-management.tsx
import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { PlusCircle, Edit, Trash2, Check, X, Globe, Filter, Search } from 'lucide-react'; // Import Search icon
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


interface Mission {
  id: number;
  name: string;
  regionId?: number | null;
  description?: string;
  region?: {
    id: number;
    name: string;
  } | null;
}

interface Region {
  id: number;
  name: string;
}

export function MissionManagement() {
  const queryClient = useQueryClient();
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [currentMission, setCurrentMission] = useState<Mission | null>(null);
  const [missionName, setMissionName] = useState('');
  const [missionDescription, setMissionDescription] = useState('');
  const [selectedRegionId, setSelectedRegionId] = useState<string | null>(null);
  const [showUnassignedOnly, setShowUnassignedOnly] = useState(false);
  const [searchTerm, setSearchTerm] = useState(''); // New state for search term

  const { data: missions, isLoading: isLoadingMissions, isError: isErrorMissions } = useQuery<Mission[]>({
    queryKey: ['missions', showUnassignedOnly, searchTerm], // Add searchTerm to queryKey
    queryFn: async () => {
      const params = new URLSearchParams();
      if (showUnassignedOnly) {
        params.append('unassignedOnly', 'true');
      }
      if (searchTerm) {
        params.append('searchTerm', searchTerm); // Pass searchTerm to the API
      }
      const res = await fetch(`/api/missions?${params.toString()}`);
      if (!res.ok) {
        throw new Error('Failed to fetch missions');
      }
      return res.json();
    },
  });

  const { data: regions, isLoading: isLoadingRegions } = useQuery<Region[]>({
    queryKey: ['regions'],
    queryFn: async () => {
      const res = await fetch('/api/regions');
      if (!res.ok) {
        throw new Error('Failed to fetch regions');
      }
      return res.json();
    },
  });

  const addMissionMutation = useMutation({
    mutationFn: async (newMission: { name: string; regionId?: number | null; description?: string }) => {
      const res = await fetch('/api/missions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newMission),
      });
      if (!res.ok) {
        const errorData = await res.json();
        throw new Error(errorData.message || 'Failed to add mission');
      }
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['missions'] });
      queryClient.invalidateQueries({ queryKey: ['regions'] }); // Invalidate regions to refresh hierarchy display
      setIsAddDialogOpen(false);
      setMissionName('');
      setMissionDescription('');
      setSelectedRegionId(null);
      toast({
        title: 'Mission Added',
        description: 'The new mission has been successfully added.',
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

  const updateMissionMutation = useMutation({
    mutationFn: async (updatedMission: Partial<Mission> & { id: number }) => {
      const res = await fetch(`/api/missions/${updatedMission.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updatedMission),
      });
      if (!res.ok) {
        const errorData = await res.json();
        throw new Error(errorData.message || 'Failed to update mission');
      }
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['missions'] });
      queryClient.invalidateQueries({ queryKey: ['regions'] }); // Invalidate regions to refresh hierarchy display
      setIsEditDialogOpen(false);
      setCurrentMission(null);
      setMissionName('');
      setMissionDescription('');
      setSelectedRegionId(null);
      toast({
        title: 'Mission Updated',
        description: 'The mission has been successfully updated.',
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

  const deleteMissionMutation = useMutation({
    mutationFn: async (id: number) => {
      const res = await fetch(`/api/missions/${id}`, {
        method: 'DELETE',
      });
      if (!res.ok) {
        const errorData = await res.json();
        throw new Error(errorData.message || 'Failed to delete mission');
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['missions'] });
      queryClient.invalidateQueries({ queryKey: ['regions'] }); // Invalidate regions to refresh hierarchy display
      toast({
        title: 'Mission Deleted',
        description: 'The mission has been successfully deleted.',
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

  const handleAddMission = () => {
    const newMission = {
      name: missionName,
      description: missionDescription,
      regionId: selectedRegionId ? parseInt(selectedRegionId, 10) : null,
    };
    addMissionMutation.mutate(newMission);
  };

  const handleEditMission = () => {
    if (currentMission) {
      const updatedMission = {
        id: currentMission.id,
        name: missionName,
        description: missionDescription,
        regionId: selectedRegionId ? parseInt(selectedRegionId, 10) : null,
      };
      updateMissionMutation.mutate(updatedMission);
    }
  };

  const openEditDialog = (mission: Mission) => {
    setCurrentMission(mission);
    setMissionName(mission.name);
    setMissionDescription(mission.description || '');
    setSelectedRegionId(mission.regionId ? String(mission.regionId) : null);
    setIsEditDialogOpen(true);
  };

  if (isLoadingMissions || isLoadingRegions) {
    return (
      <div className="flex justify-center items-center h-48">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    );
  }

  if (isErrorMissions) {
    return (
      <Alert variant="destructive">
        <AlertTitle>Error</AlertTitle>
        <AlertDescription>Failed to load missions. Please try again later.</AlertDescription>
      </Alert>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-bold flex items-center">
          <Globe className="mr-2" /> Mission Management
        </h2>
        <div className="flex items-center space-x-4">
          {/* Search Input */}
          <div className="relative">
            <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search missions..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-8"
            />
          </div>

          <div className="flex items-center space-x-2">
            <Switch
              id="unassigned-missions-filter"
              checked={showUnassignedOnly}
              onCheckedChange={setShowUnassignedOnly}
            />
            <Label htmlFor="unassigned-missions-filter">Show Unassigned Only</Label>
          </div>
          <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
            <DialogTrigger asChild>
              <Button>
                <PlusCircle className="mr-2 h-4 w-4" /> Add Mission
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-[425px]">
              <DialogHeader>
                <DialogTitle>Add New Mission</DialogTitle>
              </DialogHeader>
              <div className="grid gap-4 py-4">
                <div className="grid grid-cols-4 items-center gap-4">
                  <Label htmlFor="name" className="text-right">
                    Name
                  </Label>
                  <Input
                    id="name"
                    value={missionName}
                    onChange={(e) => setMissionName(e.target.value)}
                    className="col-span-3"
                  />
                </div>
                <div className="grid grid-cols-4 items-center gap-4">
                  <Label htmlFor="description" className="text-right">
                    Description
                  </Label>
                  <Input
                    id="description"
                    value={missionDescription}
                    onChange={(e) => setMissionDescription(e.target.value)}
                    className="col-span-3"
                  />
                </div>
                <div className="grid grid-cols-4 items-center gap-4">
                  <Label htmlFor="region" className="text-right">
                    Region
                  </Label>
                  <Select
                    onValueChange={(value) => setSelectedRegionId(value === 'null' ? null : value)}
                    value={selectedRegionId || 'null'}
                  >
                    <SelectTrigger className="col-span-3">
                      <SelectValue placeholder="Select a Region (Optional)" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="null">Unassigned</SelectItem>
                      {regions?.map((region) => (
                        <SelectItem key={region.id} value={String(region.id)}>
                          {region.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <DialogFooter>
                <Button onClick={handleAddMission} disabled={addMissionMutation.isPending}>
                  {addMissionMutation.isPending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Check className="mr-2 h-4 w-4" />}
                  Add Mission
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
            <TableHead>Region</TableHead>
            <TableHead className="text-right">Actions</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {missions?.map((mission) => (
            <TableRow key={mission.id}>
              <TableCell className="font-medium">{mission.name}</TableCell>
              <TableCell>{mission.description || 'N/A'}</TableCell>
              <TableCell>{mission.region?.name || 'Unassigned'}</TableCell>
              <TableCell className="text-right">
                <Button variant="ghost" size="icon" onClick={() => openEditDialog(mission)}>
                  <Edit className="h-4 w-4" />
                </Button>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => deleteMissionMutation.mutate(mission.id)}
                  disabled={deleteMissionMutation.isPending}
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
            <DialogTitle>Edit Mission</DialogTitle>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="edit-name" className="text-right">
                Name
              </Label>
              <Input
                id="edit-name"
                value={missionName}
                onChange={(e) => setMissionName(e.target.value)}
                className="col-span-3"
              />
            </div>
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="edit-description" className="text-right">
                Description
              </Label>
              <Input
                id="edit-description"
                value={missionDescription}
                onChange={(e) => setMissionDescription(e.target.value)}
                className="col-span-3"
              />
            </div>
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="edit-region" className="text-right">
                Region
              </Label>
              <Select
                onValueChange={(value) => setSelectedRegionId(value === 'null' ? null : value)}
                value={selectedRegionId || 'null'}
              >
                <SelectTrigger className="col-span-3">
                  <SelectValue placeholder="Select a Region (Optional)" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="null">Unassigned</SelectItem>
                  {regions?.map((region) => (
                    <SelectItem key={region.id} value={String(region.id)}>
                      {region.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button onClick={handleEditMission} disabled={updateMissionMutation.isPending}>
              {updateMissionMutation.isPending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Check className="mr-2 h-4 w-4" />}
              Save Changes
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}