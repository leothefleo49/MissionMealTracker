import { z } from "zod";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation, useQuery } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { useState } from "react";
import { Pencil, Plus, RefreshCw, Trash, Check, X, Copy } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
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
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { WardUsers } from "./ward-users";

// Define the zod schema for new ward creation
const createWardSchema = z.object({
  name: z.string().min(2, { message: "Ward name must be at least 2 characters" }),
  accessCode: z.string().min(6, { message: "Access code must be at least 6 characters" }).optional(),
  description: z.string().optional(),
  allowCombinedBookings: z.boolean().default(false),
  maxBookingsPerAddress: z.number().min(0).default(1),
  maxBookingsPerPhone: z.number().min(0).default(1),
  maxBookingsPerPeriod: z.number().min(0).default(0),
  bookingPeriodDays: z.number().min(1).default(30),
  active: z.boolean().default(true),
});

type Ward = {
  id: number;
  name: string;
  accessCode: string;
  description?: string;
  allowCombinedBookings: boolean;
  maxBookingsPerAddress: number;
  maxBookingsPerPhone: number;
  maxBookingsPerPeriod: number;
  bookingPeriodDays: number;
  active: boolean;
};

type CreateWardFormValues = z.infer<typeof createWardSchema>;

export function WardManagement() {
  const { toast } = useToast();
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [currentWard, setCurrentWard] = useState<Ward | null>(null);
  
  // Create form
  const createForm = useForm<CreateWardFormValues>({
    resolver: zodResolver(createWardSchema),
    defaultValues: {
      name: "",
      accessCode: "",
      description: "",
      allowCombinedBookings: false,
      maxBookingsPerAddress: 1,
      maxBookingsPerPhone: 1,
      maxBookingsPerPeriod: 0,
      bookingPeriodDays: 30,
      active: true,
    },
  });
  
  // Edit form
  const editForm = useForm<Partial<Ward> & { id?: number }>({
    resolver: zodResolver(createWardSchema.partial()),
    defaultValues: {
      id: undefined,
      name: "",
      accessCode: "",
      description: "",
      allowCombinedBookings: false,
      maxBookingsPerAddress: 1,
      maxBookingsPerPhone: 1,
      maxBookingsPerPeriod: 0,
      bookingPeriodDays: 30,
      active: true
    },
  });
  
  // Fetch wards
  const { data: wards, isLoading, error, refetch } = useQuery({
    queryKey: ["/api/admin/wards"],
    queryFn: async () => {
      const response = await fetch('/api/admin/wards');
      if (!response.ok) {
        throw new Error('Failed to fetch wards');
      }
      return response.json();
    },
  });
  
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
  
  // Create ward mutation
  const createWardMutation = useMutation({
    mutationFn: async (data: CreateWardFormValues) => {
      // If no access code provided, generate one
      if (!data.accessCode) {
        data.accessCode = generateAccessCode();
      }
      
      const res = await apiRequest("POST", "/api/admin/wards", data);
      return await res.json();
    },
    onSuccess: () => {
      toast({
        title: "Ward created",
        description: "Ward has been successfully created.",
      });
      setIsCreateDialogOpen(false);
      createForm.reset({
        name: "",
        accessCode: "",
        description: "",
        allowCombinedBookings: false,
        maxBookingsPerAddress: 1,
        maxBookingsPerPhone: 1,
        maxBookingsPerPeriod: 0,
        bookingPeriodDays: 30,
        active: true,
      });
      queryClient.invalidateQueries({ queryKey: ["/api/admin/wards"] });
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: error.message || "Failed to create ward. Please try again.",
        variant: "destructive",
      });
    },
  });
  
  // Edit ward mutation
  const editWardMutation = useMutation({
    mutationFn: async (data: Partial<Ward> & { id: number }) => {
      const res = await apiRequest("PATCH", `/api/admin/wards/${data.id}`, data);
      return await res.json();
    },
    onSuccess: () => {
      toast({
        title: "Ward updated",
        description: "Ward has been successfully updated.",
      });
      setIsEditDialogOpen(false);
      editForm.reset();
      queryClient.invalidateQueries({ queryKey: ["/api/admin/wards"] });
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: error.message || "Failed to update ward. Please try again.",
        variant: "destructive",
      });
    },
  });
  
  // Regenerate access code mutation
  const regenerateAccessCodeMutation = useMutation({
    mutationFn: async (wardId: number) => {
      const newAccessCode = generateAccessCode();
      const res = await apiRequest("PATCH", `/api/admin/wards/${wardId}/access-code`, { accessCode: newAccessCode });
      return await res.json();
    },
    onSuccess: () => {
      toast({
        title: "Access code regenerated",
        description: "A new access code has been generated for this ward.",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/admin/wards"] });
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: error.message || "Failed to regenerate access code. Please try again.",
        variant: "destructive",
      });
    },
  });
  
  function onCreateSubmit(values: CreateWardFormValues) {
    createWardMutation.mutate(values);
  }
  
  function onEditSubmit(values: Partial<Ward>) {
    if (currentWard?.id) {
      editWardMutation.mutate({ ...values, id: currentWard.id });
    }
  }
  
  function handleEditWard(ward: Ward) {
    setCurrentWard(ward);
    editForm.reset({
      name: ward.name,
      accessCode: ward.accessCode,
      description: ward.description,
      allowCombinedBookings: ward.allowCombinedBookings,
      maxBookingsPerAddress: ward.maxBookingsPerAddress,
      maxBookingsPerPhone: ward.maxBookingsPerPhone,
      maxBookingsPerPeriod: ward.maxBookingsPerPeriod,
      bookingPeriodDays: ward.bookingPeriodDays,
      active: ward.active,
    });
    setIsEditDialogOpen(true);
  }
  
  function handleRegenerateAccessCode(wardId: number) {
    regenerateAccessCodeMutation.mutate(wardId);
  }
  
  // Copy access code to clipboard
  function copyAccessCodeToClipboard(accessCode: string) {
    navigator.clipboard.writeText(accessCode).then(() => {
      toast({
        title: "Copied to clipboard",
        description: "The access code has been copied to clipboard.",
      });
    }).catch((err) => {
      console.error('Failed to copy text: ', err);
    });
  }
  
  if (isLoading) {
    return (
      <div className="py-4">
        <p>Loading wards...</p>
      </div>
    );
  }
  
  if (error) {
    return (
      <div className="py-4 text-red-600">
        <p>Error loading wards. Please try again.</p>
      </div>
    );
  }
  
  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-xl font-semibold">Ward Management</h2>
        <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="h-4 w-4 mr-2" />
              Add Ward
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-lg">
            <DialogHeader>
              <DialogTitle>Create New Ward</DialogTitle>
              <DialogDescription>
                Add a new ward to the system. You will need to provide a name and optionally a custom access code.
              </DialogDescription>
            </DialogHeader>
            
            <Form {...createForm}>
              <form onSubmit={createForm.handleSubmit(onCreateSubmit)} className="space-y-4">
                <FormField
                  control={createForm.control}
                  name="name"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Ward Name</FormLabel>
                      <FormControl>
                        <Input placeholder="e.g. North Ward" {...field} />
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
                      <FormLabel>Access Code (Optional)</FormLabel>
                      <div className="flex gap-2">
                        <FormControl>
                          <Input 
                            placeholder="Leave blank to auto-generate" 
                            {...field} 
                            value={field.value || ''} 
                          />
                        </FormControl>
                        <Button 
                          type="button" 
                          variant="outline" 
                          onClick={() => createForm.setValue("accessCode", generateAccessCode())}
                        >
                          <RefreshCw className="h-4 w-4" />
                        </Button>
                      </div>
                      <FormDescription>
                        This code will be used in the URL for ward-specific pages
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
                        <Textarea 
                          placeholder="Enter a brief description of this ward" 
                          {...field} 
                          value={field.value || ''} 
                        />
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
                          <Switch
                            checked={field.value}
                            onCheckedChange={field.onChange}
                          />
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
                  
                  <div className="grid md:grid-cols-2 gap-3">
                    <FormField
                      control={createForm.control}
                      name="maxBookingsPerAddress"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Max bookings per address</FormLabel>
                          <FormControl>
                            <Input
                              type="number"
                              min="0"
                              placeholder="1"
                              {...field}
                              onChange={(e) => field.onChange(parseInt(e.target.value) || 0)}
                            />
                          </FormControl>
                          <FormDescription>
                            0 for unlimited
                          </FormDescription>
                        </FormItem>
                      )}
                    />
                    
                    <FormField
                      control={createForm.control}
                      name="maxBookingsPerPhone"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Max bookings per phone number</FormLabel>
                          <FormControl>
                            <Input
                              type="number"
                              min="0"
                              placeholder="1"
                              {...field}
                              onChange={(e) => field.onChange(parseInt(e.target.value) || 0)}
                            />
                          </FormControl>
                          <FormDescription>
                            0 for unlimited
                          </FormDescription>
                        </FormItem>
                      )}
                    />
                  </div>
                  
                  <div className="grid md:grid-cols-2 gap-3 mt-3">
                    <FormField
                      control={createForm.control}
                      name="maxBookingsPerPeriod"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Max bookings per period</FormLabel>
                          <FormControl>
                            <Input
                              type="number"
                              min="0"
                              placeholder="0"
                              {...field}
                              onChange={(e) => field.onChange(parseInt(e.target.value) || 0)}
                            />
                          </FormControl>
                          <FormDescription>
                            0 for unlimited
                          </FormDescription>
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
                            <Input
                              type="number"
                              min="1"
                              placeholder="30"
                              {...field}
                              onChange={(e) => field.onChange(parseInt(e.target.value) || 30)}
                            />
                          </FormControl>
                          <FormDescription>
                            Time period for booking limits
                          </FormDescription>
                        </FormItem>
                      )}
                    />
                  </div>
                </div>
                
                <DialogFooter className="mt-6">
                  <Button 
                    type="submit" 
                    disabled={createWardMutation.isPending}
                  >
                    {createWardMutation.isPending ? (
                      <>Creating...</>
                    ) : (
                      <>Create Ward</>
                    )}
                  </Button>
                </DialogFooter>
              </form>
            </Form>
          </DialogContent>
        </Dialog>
      </div>
      
      {wards && wards.length > 0 ? (
        <div className="grid gap-4">
          {wards.map((ward: Ward) => (
            <Card key={ward.id}>
              <CardHeader className="pb-2">
                <div className="flex justify-between items-start">
                  <div>
                    <CardTitle className="text-lg">{ward.name}</CardTitle>
                    <CardDescription>
                      {ward.description || 'No description provided'}
                    </CardDescription>
                  </div>
                  <Badge variant={ward.active ? "default" : "secondary"}>
                    {ward.active ? (
                      <><Check className="h-3 w-3 mr-1" /> Active</>
                    ) : (
                      <><X className="h-3 w-3 mr-1" /> Inactive</>
                    )}
                  </Badge>
                </div>
              </CardHeader>
              <CardContent>
                <div className="mb-3">
                  <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
                    <div>
                      <p className="text-sm font-medium mb-1">Access Code:</p>
                      <div className="flex items-center gap-2 max-w-full overflow-x-auto">
                        <code className="bg-slate-100 px-2 py-1 rounded text-sm truncate max-w-[180px] sm:max-w-full">{ward.accessCode}</code>
                        <Button 
                          variant="ghost" 
                          size="sm" 
                          className="h-8 w-8 p-0 flex-shrink-0" 
                          onClick={() => copyAccessCodeToClipboard(ward.accessCode)}
                        >
                          <Copy className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                    <div className="flex flex-wrap gap-2">
                      <Button 
                        variant="outline" 
                        size="sm" 
                        onClick={() => handleRegenerateAccessCode(ward.id)}
                        disabled={regenerateAccessCodeMutation.isPending}
                        className="whitespace-nowrap"
                      >
                        <RefreshCw className="h-4 w-4 mr-2" />
                        <span className="hidden sm:inline">Regenerate Code</span>
                        <span className="sm:hidden">Regenerate</span>
                      </Button>
                      <Button 
                        variant="outline" 
                        size="sm" 
                        onClick={() => handleEditWard(ward)}
                      >
                        <Pencil className="h-4 w-4 mr-2" />
                        Edit
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
                        <span className="font-medium">
                          {ward.allowCombinedBookings ? 'Allowed' : 'Not allowed'}
                        </span>
                      </div>
                      <div className="flex flex-col xs:flex-row xs:justify-between">
                        <span className="whitespace-nowrap">Max bookings per address:</span>
                        <span className="font-medium">
                          {ward.maxBookingsPerAddress === 0 ? 'Unlimited' : ward.maxBookingsPerAddress}
                        </span>
                      </div>
                      <div className="flex flex-col xs:flex-row xs:justify-between">
                        <span className="whitespace-nowrap">Max bookings per phone:</span>
                        <span className="font-medium">
                          {ward.maxBookingsPerPhone === 0 ? 'Unlimited' : ward.maxBookingsPerPhone}
                        </span>
                      </div>
                      <div className="flex flex-col xs:flex-row xs:justify-between">
                        <span className="whitespace-nowrap">Max bookings per {ward.bookingPeriodDays} days:</span>
                        <span className="font-medium">
                          {ward.maxBookingsPerPeriod === 0 ? 'Unlimited' : ward.maxBookingsPerPeriod}
                        </span>
                      </div>
                    </div>
                  </div>
                  
                  <div>
                    <h4 className="text-sm font-medium mb-2">Ward Access</h4>
                    <WardUsers wardId={ward.id} />
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      ) : (
        <div className="text-center py-8 bg-slate-50 border rounded-md">
          <p className="text-gray-500">No wards have been created yet. Create your first ward to get started.</p>
        </div>
      )}
      
      {/* Edit Dialog */}
      <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Edit Ward</DialogTitle>
            <DialogDescription>
              Update the ward's information and settings.
            </DialogDescription>
          </DialogHeader>
          
          {currentWard && (
            <Form {...editForm}>
              <form onSubmit={editForm.handleSubmit(onEditSubmit)} className="space-y-4">
                <FormField
                  control={editForm.control}
                  name="name"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Ward Name</FormLabel>
                      <FormControl>
                        <Input {...field} />
                      </FormControl>
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
                        <Textarea 
                          placeholder="Enter a brief description" 
                          {...field} 
                          value={field.value || ''} 
                        />
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
                          <Switch
                            checked={field.value}
                            onCheckedChange={field.onChange}
                          />
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
                  
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <FormField
                      control={editForm.control}
                      name="maxBookingsPerAddress"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Max bookings per address</FormLabel>
                          <FormControl>
                            <Input
                              type="number"
                              min="0"
                              placeholder="1"
                              {...field}
                              onChange={(e) => field.onChange(parseInt(e.target.value) || 0)}
                              value={field.value}
                            />
                          </FormControl>
                          <FormDescription>
                            0 for unlimited
                          </FormDescription>
                        </FormItem>
                      )}
                    />
                    
                    <FormField
                      control={editForm.control}
                      name="maxBookingsPerPhone"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Max bookings per phone number</FormLabel>
                          <FormControl>
                            <Input
                              type="number"
                              min="0"
                              placeholder="1"
                              {...field}
                              onChange={(e) => field.onChange(parseInt(e.target.value) || 0)}
                              value={field.value}
                            />
                          </FormControl>
                          <FormDescription>
                            0 for unlimited
                          </FormDescription>
                        </FormItem>
                      )}
                    />
                  </div>
                  
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mt-3">
                    <FormField
                      control={editForm.control}
                      name="maxBookingsPerPeriod"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Max bookings per period</FormLabel>
                          <FormControl>
                            <Input
                              type="number"
                              min="0"
                              placeholder="0"
                              {...field}
                              onChange={(e) => field.onChange(parseInt(e.target.value) || 0)}
                              value={field.value}
                            />
                          </FormControl>
                          <FormDescription>
                            0 for unlimited
                          </FormDescription>
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
                            <Input
                              type="number"
                              min="1"
                              placeholder="30"
                              {...field}
                              onChange={(e) => field.onChange(parseInt(e.target.value) || 30)}
                              value={field.value}
                            />
                          </FormControl>
                          <FormDescription>
                            Time period for booking limits
                          </FormDescription>
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
                        <FormDescription>
                          When inactive, members cannot access this ward's pages
                        </FormDescription>
                      </div>
                      <FormControl>
                        <Switch
                          checked={field.value}
                          onCheckedChange={field.onChange}
                        />
                      </FormControl>
                    </FormItem>
                  )}
                />
                
                <DialogFooter className="mt-6">
                  <Button 
                    type="submit" 
                    disabled={editWardMutation.isPending}
                  >
                    {editWardMutation.isPending ? "Saving..." : "Save Changes"}
                  </Button>
                </DialogFooter>
              </form>
            </Form>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}