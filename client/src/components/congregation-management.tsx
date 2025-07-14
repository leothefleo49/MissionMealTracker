// client/src/components/congregation-management.tsx
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
import type { Congregation, Stake } from '@shared/schema';
import { zodResolver } from '@hookform/resolvers/zod';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { apiRequest } from '@/lib/queryClient';


// Re-using the Combobox component
interface ComboboxProps {
  options: { label: string; value: string | number }[];
  value: string | number | null | undefined;
  onChange: (value: string | number | null | undefined) => void;
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


// Define the zod schema for new congregation creation
const createCongregationSchema = z.object({
  name: z.string().min(2, { message: "Congregation name must be at least 2 characters" }),
  accessCode: z.string().min(6, { message: "Access code must be at least 6 characters" }).optional().or(z.literal('')),
  description: z.string().optional(),
  allowCombinedBookings: z.boolean().default(false),
  maxBookingsPerAddress: z.number().min(0).default(1),
  maxBookingsPerPhone: z.number().min(0).default(1),
  maxBookingsPerPeriod: z.number().min(0).default(0),
  bookingPeriodDays: z.number().min(1).default(30),
  active: z.boolean().default(true),
  stakeId: z.number().optional().nullable(), // Added stakeId
});

type CreateCongregationFormValues = z.infer<typeof createCongregationSchema>;

export function CongregationManagement() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [isAddCongregationDialogOpen, setIsAddCongregationDialogOpen] = useState(false);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [currentCongregation, setCurrentCongregation] = useState<Congregation | null>(null);
  const [showUnassignedOnly, setShowUnassignedOnly] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');

  // Create form
  const createForm = useForm<CreateCongregationFormValues>({
    resolver: zodResolver(createCongregationSchema),
    defaultValues: {
      name: "",
      accessCode: "",
      description: "",
      allowCombinedBookings: false,
      maxBookingsPerPeriod: 0,
      bookingPeriodDays: 30,
      active: true,
      stakeId: null, // Default to null
    },
  });

  // Edit form
  const editForm = useForm<Partial<Congregation> & { id?: number }>({
    resolver: zodResolver(createCongregationSchema.partial()),
    defaultValues: {
      id: undefined,
      name: "",
      accessCode: "",
      description: "",
      allowCombinedBookings: false,
      maxBookingsPerPeriod: 0,
      bookingPeriodDays: 30,
      active: true,
      stakeId: null, // Default to null
    },
  });

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
        const errorData = await response.json();
        throw new Error(errorData.message || 'Failed to fetch congregations');
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
        const errorData = await response.json();
        throw new Error(errorData.message || 'Failed to fetch stakes');
      }
      return response.json();
    },
    staleTime: 5 * 60 * 1000,
  });

  const stakeOptions = stakes?.map(stake => ({
    label: stake.name,
    value: stake.id,
  })) || [];

  // Generate a random access code
  function generateAccessCode() {
    const characters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
    let result = '';
    const length = 10;
    for (let i = 0; i < length; i++) {
      result += characters.charAt(Math.floor(Math.random() * characters.length));
    }
    return result;
  }

  // Create congregation mutation
  const createCongregationMutation = useMutation({
    mutationFn: async (data: CreateCongregationFormValues) => {
      if (!data.accessCode) {
        data.accessCode = generateAccessCode();
      }

      const res = await apiRequest("POST", "/api/admin/congregations", data);
      return await res.json();
    },
    onSuccess: () => {
      toast({
        title: "Congregation created",
        description: "Congregation has been successfully created.",
      });
      setIsAddCongregationDialogOpen(false);
      createForm.reset({
        name: "",
        accessCode: "",
        description: "",
        allowCombinedBookings: false,
        maxBookingsPerPeriod: 0,
        bookingPeriodDays: 30,
        active: true,
        stakeId: null,
      });
      queryClient.invalidateQueries({ queryKey: ["congregations"] });
      queryClient.invalidateQueries({ queryKey: ["stakes"] }); // Invalidate stakes query to reflect new congregation assignments
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: error.message || "Failed to create congregation. Please try again.",
        variant: "destructive",
      });
    },
  });

  // Edit congregation mutation
  const editCongregationMutation = useMutation({
    mutationFn: async (data: Partial<Congregation> & { id: number }) => {
      const res = await apiRequest("PATCH", `/api/admin/congregations/${data.id}`, data);
      return await res.json();
    },
    onSuccess: () => {
      toast({
        title: "Congregation updated",
        description: "Congregation has been successfully updated.",
      });
      setIsEditDialogOpen(false);
      editForm.reset();
      queryClient.invalidateQueries({ queryKey: ["congregations"] });
      queryClient.invalidateQueries({ queryKey: ["stakes"] }); // Invalidate stakes query to reflect updated congregation assignments
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: error.message || "Failed to update congregation. Please try again.",
        variant: "destructive",
      });
    },
  });

  // Delete congregation mutation
  const deleteCongregationMutation = useMutation({
    mutationFn: async (congregationId: number) => {
      await apiRequest("DELETE", `/api/admin/congregations/${congregationId}`);
    },
    onSuccess: () => {
      toast({
        title: "Congregation deleted",
        description: "Congregation has been successfully deleted.",
      });
      queryClient.invalidateQueries({ queryKey: ["congregations"] });
      queryClient.invalidateQueries({ queryKey: ["stakes"] }); // Invalidate stakes query
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: error.message || "Failed to delete congregation. Please try again.",
        variant: "destructive",
      });
    },
  });

  function onCreateSubmit(values: CreateCongregationFormValues) {
    createCongregationMutation.mutate(values);
  }

  function onEditSubmit(values: Partial<Congregation>) {
    if (currentCongregation?.id) {
      editCongregationMutation.mutate({ ...values, id: currentCongregation.id });
    }
  }

  const handleDeleteCongregation = (congregationId: number) => {
    if (window.confirm('Are you sure you want to delete this congregation? This action cannot be undone and will delete all associated data (missionaries, meals, users).')) {
      deleteCongregationMutation.mutate(congregationId);
    }
  };

  const handleEditCongregation = (congregation: Congregation) => {
    setCurrentCongregation(congregation);
    editForm.reset({
      id: congregation.id,
      name: congregation.name,
      accessCode: congregation.accessCode,
      description: congregation.description || "",
      allowCombinedBookings: congregation.allowCombinedBookings,
      maxBookingsPerPeriod: congregation.maxBookingsPerPeriod,
      bookingPeriodDays: congregation.bookingPeriodDays,
      active: congregation.active,
      stakeId: congregation.stakeId === undefined ? null : congregation.stakeId,
    });
    setIsEditDialogOpen(true);
  };


  if (isLoadingCongregations || isLoadingStakes) {
    return (
      <div className="py-4">
        <p className="text-center text-muted-foreground">Loading congregations...</p>
      </div>
    );
  }

  if (congregationsError) {
    return (
      <div className="py-4 text-destructive">
        <p>Error loading congregations: {congregationsError.message}. Please try again.</p>
      </div>
    );
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex justify-between items-center">
          <div>
            <CardTitle>Congregation Management</CardTitle>
            <CardDescription>Create and manage congregations within your stakes.</CardDescription>
          </div>
          <div className="flex items-center space-x-4">
            <div className="relative">
              <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search congregations..."
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
                    aria-label="Show unassigned congregations only"
                  />
                </TooltipTrigger>
                <TooltipContent>
                  Show Unassigned Congregations Only
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>

            <Dialog open={isAddCongregationDialogOpen} onOpenChange={setIsAddCongregationDialogOpen}>
              <DialogTrigger asChild>
                <Button>
                  <PlusCircle className="mr-2 h-4 w-4" /> Add Congregation
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
                <DialogHeader>
                  <DialogTitle>Create New Congregation</DialogTitle>
                  <DialogDescription>
                    Add a new congregation to the system and assign it to a stake.
                  </DialogDescription>
                </DialogHeader>
                <Form {...createForm}>
                  <form onSubmit={createForm.handleSubmit(onCreateSubmit)} className="space-y-4">
                    <FormField
                      control={createForm.control}
                      name="name"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Congregation Name</FormLabel>
                          <FormControl>
                            <Input placeholder="e.g. Oak Hills Ward" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={createForm.control}
                      name="accessCode"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Access Code (Optional - will auto-generate if empty)</FormLabel>
                          <FormControl>
                            <Input placeholder="Leave blank to auto-generate" {...field} value={field.value || ""} />
                          </FormControl>
                          <FormDescription>
                            Unique code for public access to the meal calendar.
                          </FormDescription>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={createForm.control}
                      name="stakeId"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Stake (Optional)</FormLabel>
                          <Combobox
                            options={stakeOptions || []}
                            value={field.value !== null && field.value !== undefined ? String(field.value) : "null"}
                            onValueChange={(value) => field.onChange(value === "null" ? null : Number(value))}
                            placeholder="Select a stake"
                            searchPlaceholder="Search stakes..."
                            noResultsMessage="No stake found."
                            displayKey="name"
                            valueKey="id"
                            className="w-full"
                            contentClassName="max-h-[200px] overflow-y-auto" // Added max-height and overflow
                          />
                          <FormDescription>
                            Assign this congregation to a specific stake.
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
                            <Textarea placeholder="Enter a brief description of this congregation" {...field} value={field.value || ""} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <div className="bg-slate-50 p-4 rounded-md border">
                      <h3 className="text-sm font-medium mb-3">Scheduling Settings</h3>
                      <FormField
                        control={createForm.control}
                        name="allowCombinedBookings"
                        render={({ field }) => (
                          <FormItem className="flex flex-row items-start space-x-3 space-y-0 rounded-md border p-4 mb-3">
                            <FormControl>
                              <Switch checked={field.value} onCheckedChange={field.onChange} />
                            </FormControl>
                            <div className="space-y-1 leading-none">
                              <FormLabel>Allow Elders and Sisters to be booked together</FormLabel>
                              <FormDescription>
                                When enabled, both types of missionaries can be scheduled at the same address on the same day
                              </FormDescription>
                            </div>
                          </FormItem>
                        )}
                      />
                      <div className="grid md:grid-cols-2 gap-3 mt-3">
                        <FormField
                          control={createForm.control}
                          name="maxBookingsPerPeriod"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Max bookings per period</FormLabel>
                              <FormControl>
                                <Input type="number" min="0" placeholder="0" {...field} onChange={(e) => field.onChange(parseInt(e.target.value) || 0)} />
                              </FormControl>
                              <FormDescription>0 for unlimited</FormDescription>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                        <FormField
                          control={createForm.control}
                          name="bookingPeriodDays"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Booking period (days)</FormLabel>
                              <FormControl>
                                <Input type="number" min="1" placeholder="30" {...field} onChange={(e) => field.onChange(parseInt(e.target.value) || 30)} />
                              </FormControl>
                              <FormDescription>Time period for booking limits</FormDescription>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                      </div>
                    </div>
                    <DialogFooter className="mt-6">
                      <Button type="submit" disabled={createCongregationMutation.isPending}>
                        {createCongregationMutation.isPending ? "Creating..." : "Create Congregation"}
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
        {congregations && congregations.length > 0 ? (
          <div className="grid gap-4">
            {congregations.map(congregation => (
              <Card key={congregation.id}>
                <CardHeader className="pb-2">
                  <div className="flex justify-between items-start">
                    <div>
                      <CardTitle className="text-lg">{congregation.name}</CardTitle>
                      <CardDescription>
                        {congregation.description || 'No description provided'}
                      </CardDescription>
                    </div>
                    {congregation.stake && (
                      <Badge variant="outline" className="flex items-center gap-1">
                        <MapPin className="h-3 w-3" /> {congregation.stake.name}
                      </Badge>
                    )}
                    {!congregation.stake && (
                      <Badge variant="secondary" className="flex items-center gap-1 bg-yellow-100 text-yellow-800">
                        Unassigned
                      </Badge>
                    )}
                    <Badge variant={congregation.active ? "default" : "secondary"}>
                      {congregation.active ? (<><Check className="h-3 w-3 mr-1" /> Active</>) : (<><XCircle className="h-3 w-3 mr-1" /> Inactive</>)}
                    </Badge>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="mb-3">
                    <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
                      <div>
                        <p className="text-sm font-medium mb-1">Access Code:</p>
                        <div className="flex items-center gap-2 max-w-full overflow-x-auto">
                          <code className="bg-slate-100 px-2 py-1 rounded text-sm truncate max-w-[180px] sm:max-w-full">{congregation.accessCode}</code>
                          <Button variant="ghost" size="sm" className="h-8 w-8 p-0 flex-shrink-0" onClick={() => navigator.clipboard.writeText(congregation.accessCode).then(() => toast({ title: "Access code copied!", description: "Access code copied to clipboard." }))}>
                            <Copy className="h-4 w-4" />
                          </Button>
                        </div>
                        <p className="text-sm font-medium mb-1 mt-3">Congregation Calendar Link:</p>
                        <div className="flex items-center gap-2 w-full overflow-x-auto">
                          <code className="bg-slate-100 px-2 py-1 rounded text-sm truncate max-w-[180px] sm:max-w-full">{window.location.origin}/congregation/{congregation.accessCode}</code>
                          <Button variant="ghost" size="sm" className="h-8 w-8 p-0 flex-shrink-0" onClick={() => {
                            const link = `${window.location.origin}/congregation/${congregation.accessCode}`;
                            navigator.clipboard.writeText(link);
                            toast({ title: "Link copied!", description: "Congregation link copied to clipboard." });
                          }}>
                            <Copy className="h-4 w-4" />
                          </Button>
                        </div>
                      </div>
                      <div className="flex flex-wrap gap-2">
                        <AlertDialog>
                          <AlertDialogTrigger asChild>
                            <Button variant="outline" size="sm" className="whitespace-nowrap">
                              <RefreshCw className="h-4 w-4 mr-2" /> <span className="hidden sm:inline">Regenerate Code</span> <span className="sm:hidden">Regenerate</span>
                            </Button>
                          </AlertDialogTrigger>
                          <AlertDialogContent>
                            <AlertDialogHeader>
                              <AlertDialogTitle>Are you absolutely sure?</AlertDialogTitle>
                              <AlertDialogDescription>
                                This action will generate a new access code, invalidating the old calendar link and any existing QR codes. You will need to redistribute the new access information to congregation members.
                              </AlertDialogDescription>
                            </AlertDialogHeader>
                            <AlertDialogFooter>
                              <AlertDialogCancel>Cancel</AlertDialogCancel>
                              <AlertDialogAction onClick={() => { /* regenerateAccessCodeMutation.mutate(congregation.id) */ toast({ title: "Feature not yet implemented", description: "This feature is currently under development. Please contact support for assistance.", variant: "destructive" }); }}>
                                Regenerate Code
                              </AlertDialogAction>
                            </AlertDialogFooter>
                          </AlertDialogContent>
                        </AlertDialog>
                        <Button variant="outline" size="sm" onClick={() => { /* setIsQrCodeDialogOpen(true); setCurrentCongregation(congregation); */ toast({ title: "Feature not yet implemented", description: "This feature is currently under development. Please contact support for assistance.", variant: "destructive" }); }}>
                          <QrCode className="h-4 w-4 mr-2" /> Show QR
                        </Button>
                        <Button variant="outline" size="sm" onClick={() => handleEditCongregation(congregation)}>
                          <Pencil className="h-4 w-4 mr-2" /> Edit
                        </Button>
                      </div>
                    </div>
                  </div>
                  <div className="mt-4 grid gap-4">
                    <div>
                      <h4 className="text-sm font-medium mb-2">Scheduling Settings</h4>
                      <div className="bg-slate-50 p-3 rounded-md border text-sm space-y-2">
                        <div className="flex flex-col xs:flex-row xs:justify-between">
                          <span className="whitespace-nowrap">Combined bookings:</span>
                          <span className="font-medium">{congregation.allowCombinedBookings ? "Allowed" : "Not allowed"}</span>
                        </div>
                        <div className="flex flex-col xs:flex-row xs:justify-between">
                          <span className="whitespace-nowrap">Max bookings per {congregation.bookingPeriodDays} days:</span>
                          <span className="font-medium">{congregation.maxBookingsPerPeriod === 0 ? "Unlimited" : congregation.maxBookingsPerPeriod}</span>
                        </div>
                      </div>
                    </div>
                    <div>
                      <h4 className="text-sm font-medium mb-2">Congregation Admins</h4>
                      <CongregationUsers congregationId={congregation.id} />
                    </div>
                  </div>
                </CardContent>
                <CardFooter className="flex justify-end p-4">
                  <AlertDialog>
                    <AlertDialogTrigger asChild>
                      <Button variant="destructive" size="sm">
                        <Trash className="h-4 w-4 mr-2" /> Delete Congregation
                      </Button>
                    </AlertDialogTrigger>
                    <AlertDialogContent>
                      <AlertDialogHeader>
                        <AlertDialogTitle>Are you absolutely sure?</AlertDialogTitle>
                        <AlertDialogDescription>
                          This action cannot be undone. This will permanently delete the
                          <span className="font-bold text-gray-900 mx-1">{congregation.name}</span> congregation
                          and all associated missionaries, meals, and admin users.
                        </AlertDialogDescription>
                      </AlertDialogHeader>
                      <AlertDialogFooter>
                        <AlertDialogCancel>Cancel</AlertDialogCancel>
                        <AlertDialogAction onClick={() => handleDeleteCongregation(congregation.id)}>
                          Delete
                        </AlertDialogAction>
                      </AlertDialogFooter>
                    </AlertDialogContent>
                  </AlertDialog>
                </CardFooter>
              </Card>
            ))}
          </div>
        ) : (
          <div className="text-center py-8 bg-slate-50 border rounded-md">
            <p className="text-gray-500">No congregations have been created yet. Create your first congregation to get started.</p>
          </div>
        )}
      </CardContent>

      {/* Edit Congregation Dialog */}
      <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Edit Congregation</DialogTitle>
            <DialogDescription>
              Update the congregation's information and settings.
            </DialogDescription>
          </DialogHeader>
          {currentCongregation && (
            <Form {...editForm}>
              <form onSubmit={editForm.handleSubmit(onEditSubmit)} className="space-y-4">
                <FormField
                  control={editForm.control}
                  name="name"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Congregation Name</FormLabel>
                      <FormControl>
                        <Input {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={editForm.control}
                  name="accessCode"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Access Code</FormLabel>
                      <FormControl>
                        <Input {...field} disabled value={field.value || ""} />
                      </FormControl>
                      <FormDescription>
                        Access code can only be regenerated, not manually edited.
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={editForm.control}
                  name="stakeId"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Stake (Optional)</FormLabel>
                      <Combobox
                        options={stakeOptions || []}
                        value={field.value !== null && field.value !== undefined ? String(field.value) : "null"}
                        onValueChange={(value) => field.onChange(value === "null" ? null : Number(value))}
                        placeholder="Select a stake"
                        searchPlaceholder="Search stakes..."
                        noResultsMessage="No stake found."
                        displayKey="name"
                        valueKey="id"
                        className="w-full"
                        maxHeight="200px" // Ensure max-height for scrolling
                        contentClassName="max-h-[200px] overflow-y-auto" // Added max-height and overflow
                      />
                      <FormDescription>
                        Assign this congregation to a specific stake.
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
                <div className="bg-slate-50 p-4 rounded-md border">
                  <h3 className="text-sm font-medium mb-3">Scheduling Settings</h3>
                  <FormField
                    control={editForm.control}
                    name="allowCombinedBookings"
                    render={({ field }) => (
                      <FormItem className="flex flex-row items-start space-x-3 space-y-0 rounded-md border p-4 mb-3">
                        <FormControl>
                          <Switch checked={field.value} onCheckedChange={field.onChange} />
                        </FormControl>
                        <div className="space-y-1 leading-none">
                          <FormLabel>Allow Elders and Sisters to be booked together</FormLabel>
                          <FormDescription>
                            When enabled, both types of missionaries can be scheduled at the same address on the same day
                          </FormDescription>
                        </div>
                      </FormItem>
                    )}
                  />
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mt-3">
                    <FormField
                      control={editForm.control}
                      name="maxBookingsPerPeriod"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Max bookings per period</FormLabel>
                          <FormControl>
                            <Input type="number" min="0" placeholder="0" {...field} onChange={(e) => field.onChange(parseInt(e.target.value) || 0)} value={field.value} />
                          </FormControl>
                          <FormDescription>0 for unlimited</FormDescription>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={editForm.control}
                      name="bookingPeriodDays"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Booking period (days)</FormLabel>
                          <FormControl>
                            <Input type="number" min="1" placeholder="30" {...field} onChange={(e) => field.onChange(parseInt(e.target.value) || 30)} value={field.value} />
                          </FormControl>
                          <FormDescription>Time period for booking limits</FormDescription>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>
                </div>
                <FormField
                  control={editForm.control}
                  name="active"
                  render={({ field }) => (
                    <FormItem className="flex flex-row items-center justify-between rounded-lg border p-3 shadow-sm">
                      <div className="space-y-0.5">
                        <FormLabel>Active Status</FormLabel>
                        <FormDescription>When inactive, members cannot access this congregation's pages</FormDescription>
                      </div>
                      <FormControl>
                        <Switch checked={field.value} onCheckedChange={field.onChange} />
                      </FormControl>
                    </FormItem>
                  )}
                />
                <DialogFooter className="mt-6">
                  <Button type="submit" disabled={editCongregationMutation.isPending}>
                    {editCongregationMutation.isPending ? "Saving..." : "Save Changes"}
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