import { z } from "zod";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation, useQuery } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { useState } from "react";
import { Pencil, Plus, RefreshCw, Trash, Check, X, Copy, QrCode } from "lucide-react";
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
} from "@/components/ui/alert-dialog";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { WardUsers } from "./ward-users";
import { QRCodeDialog } from "./qr-code-dialog";

// Define the zod schema for new ward creation
const createWardSchema = z.object({
  name: z.string().min(2, { message: "Ward name must be at least 2 characters" }),
  accessCode: z.string().min(6, { message: "Access code must be at least 6 characters" }).optional().or(z.literal('')),
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
  const [isQrCodeDialogOpen, setIsQrCodeDialogOpen] = useState(false);
  const [currentWard, setCurrentWard] = useState<Ward | null>(null);

  // Create form
  const createForm = useForm<CreateWardFormValues>({
    resolver: zodResolver(createWardSchema),
    defaultValues: {
      name: "",
      accessCode: "",
      description: "",
      allowCombinedBookings: false,
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
      maxBookingsPerPeriod: 0,
      bookingPeriodDays: 30,
      active: true
    },
  });

  // Fetch wards
  const { data: wards, isLoading, error } = useQuery<Ward[]>({
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

  // Regenerate all access mutation
  const regenerateAllMutation = useMutation({
    mutationFn: async (wardId: number) => {
      const newAccessCode = generateAccessCode();
      const res = await apiRequest("PATCH", `/api/admin/wards/${wardId}`, { accessCode: newAccessCode });
      return await res.json();
    },
    onSuccess: (updatedWard) => {
      toast({
        title: "Access Regenerated",
        description: "A new access code has been generated for this ward.",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/admin/wards"] });
      // Immediately open the QR code dialog for the new link
      setCurrentWard(updatedWard);
      setIsQrCodeDialogOpen(true);
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: error.message || "Failed to regenerate access. Please try again.",
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
      maxBookingsPerPeriod: ward.maxBookingsPerPeriod,
      bookingPeriodDays: ward.bookingPeriodDays,
      active: ward.active,
    });
    setIsEditDialogOpen(true);
  }

  function handleShowQrCode(ward: Ward) {
    setCurrentWard(ward);
    setIsQrCodeDialogOpen(true);
  }

  // Copy access code to clipboard
  function copyToClipboard(text: string, message: string) {
    navigator.clipboard.writeText(text).then(() => {
      toast({
        title: "Copied!",
        description: message,
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
          <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Create New Ward</DialogTitle>
              <DialogDescription>
                Add a new ward to the system. You can auto-generate or provide a custom access code.
              </DialogDescription>
            </DialogHeader>

            <Form {...createForm}>
              <form onSubmit={createForm.handleSubmit(onCreateSubmit)} className="space-y-4">
                {/* ... existing form fields ... */}
                <DialogFooter className="mt-6">
                  <Button
                    type="submit"
                    disabled={createWardMutation.isPending}
                  >
                    {createWardMutation.isPending ? "Creating..." : "Create Ward"}
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
                      <p className="text-sm font-medium mb-1">Ward Calendar Link:</p>
                      <div className="flex items-center gap-2 w-full overflow-x-auto">
                        <code className="bg-slate-100 px-2 py-1 rounded text-sm truncate max-w-[180px] sm:max-w-full">
                          {`${window.location.origin}/ward/${ward.accessCode}`}
                        </code>
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-8 w-8 p-0 flex-shrink-0"
                          onClick={() => copyToClipboard(`${window.location.origin}/ward/${ward.accessCode}`, "Ward link copied to clipboard.")}
                        >
                          <Copy className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                    <div className="flex flex-wrap gap-2">
                      <AlertDialog>
                        <AlertDialogTrigger asChild>
                          <Button variant="destructive" size="sm" className="whitespace-nowrap">
                            <RefreshCw className="h-4 w-4 mr-2" />
                            Regenerate All
                          </Button>
                        </AlertDialogTrigger>
                        <AlertDialogContent>
                          <AlertDialogHeader>
                            <AlertDialogTitle>Are you absolutely sure?</AlertDialogTitle>
                            <AlertDialogDescription>
                              This action will generate a new access code, invalidating the current ward calendar link and any existing QR codes. You will need to redistribute the new link/QR code to ward members.
                            </AlertDialogDescription>
                          </AlertDialogHeader>
                          <AlertDialogFooter>
                            <AlertDialogCancel>Cancel</AlertDialogCancel>
                            <AlertDialogAction onClick={() => regenerateAllMutation.mutate(ward.id)}>
                              Regenerate All
                            </AlertDialogAction>
                          </AlertDialogFooter>
                        </AlertDialogContent>
                      </AlertDialog>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleShowQrCode(ward)}
                      >
                        <QrCode className="h-4 w-4 mr-2" />
                        Show QR Code
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

                {/* ... existing card content ... */}
                <div>
                    <h4 className="text-sm font-medium mb-2">Ward Admins</h4>
                    <WardUsers wardId={ward.id} />
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
                {/* ... existing form fields ... */}
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

      {/* QR Code Dialog */}
      {currentWard && (
        <QRCodeDialog
          isOpen={isQrCodeDialogOpen}
          onClose={() => setIsQrCodeDialogOpen(false)}
          qrCodeUrl={`https://api.qrserver.com/v1/create-qr-code/?size=256x256&data=${encodeURIComponent(`${window.location.origin}/ward/${currentWard.accessCode}`)}`}
          wardName={currentWard.name}
        />
      )}
    </div>
  );
}