// client/src/components/stake-management.tsx
import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from '../hooks/use-toast';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from './ui/dialog';
import { Label } from './ui/label';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from './ui/table';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from './ui/card';
import { PlusCircle, Search, XCircle } from 'lucide-react';
import { Switch } from './ui/switch';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from './ui/tooltip';
import { Popover, PopoverContent, PopoverTrigger } from './ui/popover';
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from './ui/command'; // Import CommandList for scrolling
import { CaretSortIcon, CheckIcon } from '@radix-ui/react-icons';
import { cn } from '../lib/utils';
import type { Stake, Mission } from '@shared/schema';
import { zodResolver } from '@hookform/resolvers/zod';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { apiRequest } from '@/lib/queryClient';


// Define the zod schema for new stake creation (used for both create and edit forms)
const createStakeSchema = z.object({
  name: z.string().min(2, { message: "Stake name must be at least 2 characters" }),
  missionId: z.number().optional().nullable(),
  description: z.string().optional(),
});

type CreateStakeFormValues = z.infer<typeof createStakeSchema>;


// New component for Combobox (moved from within StakeManagement for reusability)
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
          className={cn("w-full justify-between", className)} // Changed to w-full
        >
          {value
            ? options.find((option) => option.value === value)?.label
            : placeholder}
          <CaretSortIcon className="ml-2 h-4 w-4 shrink-0 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-[var(--radix-popover-trigger-width)] p-0"> {/* Adjusted width */}
        <Command>
          <CommandInput placeholder="Search..." className="h-9" />
          <CommandEmpty>No results found.</CommandEmpty>
          <CommandList style={{ maxHeight: maxHeight, overflowY: 'auto' }}> {/* Added CommandList for scrolling */}
            <CommandGroup>
              {options.map((option) => (
                <CommandItem
                  key={String(option.value)}
                  value={String(option.label)} // Use label for searchability
                  onSelect={() => {
                    onChange(String(option.value) === String(value) ? undefined : option.value);
                    setOpen(false);
                  }}
                >
                  {option.label}
                  <CheckIcon
                    className={cn(
                      "ml-auto h-4 w-4",
                      String(option.value) === String(value) ? "opacity-100" : "opacity-0"
                    )}
                  />
                </CommandItem>
              ))}
            </CommandGroup>
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
};


export function StakeManagement() {
  const queryClient = useQueryClient();
  const [isAddStakeDialogOpen, setIsAddStakeDialogOpen] = useState(false);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [currentStake, setCurrentStake] = useState<Stake | null>(null);
  const [showUnassignedOnly, setShowUnassignedOnly] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');

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

  // Fetch all stakes with filtering and search
  const { data: stakes, isLoading: isLoadingStakes, error: stakesError } = useQuery<Stake[]>({
    queryKey: ['stakes', showUnassignedOnly, searchTerm], // Add filters for stakes list
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
        const errorData = await response.json();
        throw new Error(errorData.message || 'Failed to fetch stakes');
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
        const errorData = await response.json();
        throw new Error(errorData.message || 'Failed to fetch missions');
      }
      return response.json();
    },
    staleTime: 5 * 60 * 1000,
  });

  const missionOptions = missions?.map(mission => ({
    label: mission.name,
    value: mission.id,
  })) || [];


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
      setIsAddStakeDialogOpen(false);
      createForm.reset({ name: "", missionId: null, description: "" });
      queryClient.invalidateQueries({ queryKey: ["stakes"] });
      queryClient.invalidateQueries({ queryKey: ["missions"] }); // Invalidate missions query to reflect new stake assignments
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: error.message || "Failed to create stake. Please try again.",
        variant: "destructive",
      });
    },
  });

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
      queryClient.invalidateQueries({ queryKey: ["missions"] }); // Invalidate missions query to reflect updated stake assignments
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: error.message || "Failed to update stake. Please try again.",
        variant: "destructive",
      });
    },
  });

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
      queryClient.invalidateQueries({ queryKey: ["missions"] }); // Invalidate missions query
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
    if (window.confirm('Are you sure you want to delete this stake? This will also unassign any congregations linked to it.')) {
      deleteStakeMutation.mutate(stakeId);
    }
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


  if (isLoadingStakes || isLoadingMissions) {
    return (
      <div className="py-4">
        <p className="text-center text-muted-foreground">Loading stakes...</p>
      </div>
    );
  }

  if (stakesError) {
    return (
      <div className="py-4 text-destructive">
        <p>Error loading stakes: {stakesError.message}. Please try again.</p>
      </div>
    );
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex justify-between items-center">
          <div>
            <CardTitle>Stake Management</CardTitle>
            <CardDescription>Create and manage stakes within your missions.</CardDescription>
          </div>
          <div className="flex items-center space-x-4">
            <div className="relative">
              <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search stakes..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-8"
              />
            </div>
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Switch
                    checked={showUnassignedOnly}
                    onCheckedChange={setShowUnassignedOnly}
                    aria-label="Show unassigned stakes only"
                  />
                </TooltipTrigger>
                <TooltipContent>
                  Show Unassigned Stakes Only
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>

            <Dialog open={isAddStakeDialogOpen} onOpenChange={setIsAddStakeDialogOpen}>
              <DialogTrigger asChild>
                <Button>
                  <PlusCircle className="mr-2 h-4 w-4" /> Add Stake
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
                            <Input placeholder="e.g. Riverton Stake" {...field} />
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
                          <Combobox
                            options={missionOptions || []}
                            value={field.value !== null && field.value !== undefined ? String(field.value) : "null"}
                            onValueChange={(value) => field.onChange(value === "null" ? null : Number(value))}
                            placeholder="Select a mission"
                            searchPlaceholder="Search missions..."
                            noResultsMessage="No mission found."
                            displayKey="name"
                            valueKey="id"
                            className="w-full"
                            contentClassName="max-h-[200px] overflow-y-auto" // Added max-height and overflow
                          />
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
                            <Textarea placeholder="Enter a brief description of this stake" {...field} value={field.value || ""} />
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
                      <CardTitle className="lg:text-lg">{stake.name}</CardTitle>
                      <CardDescription>
                        {stake.description || 'No description provided'}
                      </CardDescription>
                    </div>
                    {stake.mission && (
                      <Badge variant="outline" className="flex items-center gap-1">
                        <MapPin className="h-3 w-3" /> {stake.mission.name}
                      </Badge>
                    )}
                    {!stake.mission && (
                      <Badge variant="secondary" className="flex items-center gap-1 bg-yellow-100 text-yellow-800">
                        Unassigned
                      </Badge>
                    )}
                  </div>
                </CardHeader>
                <CardContent>
                  <p className="text-sm text-muted-foreground mb-2">{stake.congregations?.length || 0} congregations</p>
                  <div className="flex flex-wrap gap-2 mb-4">
                    <Button variant="outline" size="sm" onClick={() => handleEditStake(stake)}>
                      <Pencil className="h-4 w-4 mr-2" /> Edit
                    </Button>
                    <AlertDialog>
                      <AlertDialogTrigger asChild>
                        <Button variant="destructive" size="sm">
                          <Trash className="h-4 w-4 mr-2" /> Delete
                        </Button>
                      </AlertDialogTrigger>
                      <AlertDialogContent>
                        <AlertDialogHeader>
                          <AlertDialogTitle>Are you absolutely sure?</AlertDialogTitle>
                          <AlertDialogDescription>
                            This action cannot be undone. This will permanently delete the
                            <span className="font-bold text-gray-900 mx-1">{stake.name}</span> stake
                            and any associated data (congregations, missionaries).
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
                  {stake.congregations && stake.congregations.length > 0 ? (
                    <div className="mt-4">
                      <h4 className="text-sm font-medium mb-2">Congregations in this Stake:</h4>
                      <ul className="list-disc pl-5 space-y-1 text-sm text-muted-foreground">
                        {stake.congregations.map(congregation => (
                          <li key={congregation.id}>{congregation.name}</li>
                        ))}
                      </ul>
                    </div>
                  ) : (
                    <p className="text-sm text-muted-foreground mt-4">No congregations in this stake yet.</p>
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

      {/* Edit Stake Dialog */}
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
                      <Combobox
                        options={missionOptions || []}
                        value={field.value !== null && field.value !== undefined ? String(field.value) : "null"}
                        onValueChange={(value) => field.onChange(value === "null" ? null : Number(value))}
                        placeholder="Select a mission"
                        searchPlaceholder="Search missions..."
                        noResultsMessage="No mission found."
                        displayKey="name"
                        valueKey="id"
                        className="w-full"
                        maxHeight="200px" // Ensure max-height for scrolling
                        contentClassName="max-h-[200px] overflow-y-auto" // Added max-height and overflow
                      />
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
                            <Textarea placeholder="Enter a brief description" {...field} value={field.value || ""} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                  )}
                />
                <DialogFooter className="mt-6">
                  <Button type="submit" disabled={editStakeMutation.isPending}>
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