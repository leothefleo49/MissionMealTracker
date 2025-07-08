import { z } from "zod";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation, useQuery } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { useState } from "react";
import { Pencil, Plus, RefreshCw, Copy, QrCode } from "lucide-react";
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
import { QrCodeDialog } from "./qr-code-dialog";

const createWardSchema = z.object({
  name: z.string().min(2, { message: "Ward name must be at least 2 characters" }),
  accessCode: z.string().min(6, { message: "Access code must be at least 6 characters" }).optional().or(z.literal('')),
  description: z.string().optional(),
  active: z.boolean().default(true),
});

type Ward = {
  id: number;
  name: string;
  accessCode: string;
  description?: string;
  active: boolean;
};

type CreateWardFormValues = z.infer<typeof createWardSchema>;

export function WardManagement() {
  const { toast } = useToast();
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [isQrCodeDialogOpen, setIsQrCodeDialogOpen] = useState(false);
  const [currentWard, setCurrentWard] = useState<Ward | null>(null);

  const createForm = useForm<CreateWardFormValues>({
    resolver: zodResolver(createWardSchema),
    defaultValues: {
      name: "",
      accessCode: "",
      description: "",
      active: true,
    },
  });

  const editForm = useForm<Partial<Ward> & { id?: number }>({
    resolver: zodResolver(createWardSchema.partial()),
    defaultValues: {
      id: undefined,
      name: "",
      accessCode: "",
      description: "",
      active: true
    },
  });

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

  function generateAccessCode() {
    const characters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
    let result = '';
    const length = 10;
    for (let i = 0; i < length; i++) {
      result += characters.charAt(Math.floor(Math.random() * characters.length));
    }
    return result;
  }

  const createWardMutation = useMutation({
    mutationFn: async (data: CreateWardFormValues) => {
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
      createForm.reset();
      queryClient.invalidateQueries({ queryKey: ["/api/admin/wards"] });
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: error.message || "Failed to create ward.",
        variant: "destructive",
      });
    },
  });

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
        description: error.message || "Failed to update ward.",
        variant: "destructive",
      });
    },
  });

  const regenerateAccessCodeMutation = useMutation({
    mutationFn: async (wardId: number) => {
      const newAccessCode = generateAccessCode();
      const res = await apiRequest("PATCH", `/api/admin/wards/${wardId}/access-code`, { accessCode: newAccessCode });
      return await res.json();
    },
    onSuccess: (data) => {
      toast({
        title: "Access code regenerated",
        description: "A new access code has been generated for this ward.",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/admin/wards"] });
      const updatedWard = wards?.find(w => w.id === data.id);
      if(updatedWard) {
        setCurrentWard({...updatedWard, accessCode: data.accessCode});
        setIsQrCodeDialogOpen(true);
      }
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: error.message || "Failed to regenerate access code.",
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
      active: ward.active,
    });
    setIsEditDialogOpen(true);
  }

  function handleRegenerateAccessCode(wardId: number) {
    regenerateAccessCodeMutation.mutate(wardId);
  }

  function copyAccessCodeToClipboard(accessCode: string) {
    navigator.clipboard.writeText(accessCode).then(() => {
      toast({
        title: "Copied to clipboard",
        description: "The access code has been copied to clipboard.",
      });
    });
  }

  function handleShowQrCode(ward: Ward) {
    setCurrentWard(ward);
    setIsQrCodeDialogOpen(true);
  }

  if (isLoading) return <p>Loading wards...</p>;
  if (error) return <p className="text-red-600">Error loading wards.</p>;

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
                Add a new ward to the system.
              </DialogDescription>
            </DialogHeader>
            <Form {...createForm}>
              <form onSubmit={createForm.handleSubmit(onCreateSubmit)} className="space-y-4">
                {/* Form fields... */}
                <DialogFooter className="mt-6">
                  <Button type="submit" disabled={createWardMutation.isPending}>
                    {createWardMutation.isPending ? "Creating..." : "Create Ward"}
                  </Button>
                </DialogFooter>
              </form>
            </Form>
          </DialogContent>
        </Dialog>
      </div>

      <div className="grid gap-4">
        {wards?.map((ward: Ward) => (
          <Card key={ward.id}>
            <CardHeader>
              <div className="flex justify-between items-start">
                  <div>
                    <CardTitle className="text-lg">{ward.name}</CardTitle>
                    <CardDescription>
                      {ward.description || 'No description'}
                    </CardDescription>
                  </div>
                  <Badge variant={ward.active ? "default" : "secondary"}>
                    {ward.active ? 'Active' : 'Inactive'}
                  </Badge>
                </div>
            </CardHeader>
            <CardContent>
              {/* Ward details and buttons */}
            </CardContent>
            <CardFooter>
                <div className="flex flex-wrap gap-2">
                  <AlertDialog>
                    <AlertDialogTrigger asChild>
                      <Button variant="outline" size="sm" className="whitespace-nowrap">
                        <RefreshCw className="h-4 w-4 mr-2" />
                        Regenerate
                      </Button>
                    </AlertDialogTrigger>
                    <AlertDialogContent>
                      <AlertDialogHeader>
                        <AlertDialogTitle>Are you sure?</AlertDialogTitle>
                        <AlertDialogDescription>
                          This will generate a new access code and invalidate the old one.
                        </AlertDialogDescription>
                      </AlertDialogHeader>
                      <AlertDialogFooter>
                        <AlertDialogCancel>Cancel</AlertDialogCancel>
                        <AlertDialogAction onClick={() => handleRegenerateAccessCode(ward.id)}>Regenerate</AlertDialogAction>
                      </AlertDialogFooter>
                    </AlertDialogContent>
                  </AlertDialog>
                  <Button variant="outline" size="sm" onClick={() => handleShowQrCode(ward)}>
                    <QrCode className="h-4 w-4 mr-2" />
                    QR Code
                  </Button>
                  <Button variant="outline" size="sm" onClick={() => handleEditWard(ward)}>
                    <Pencil className="h-4 w-4 mr-2" />
                    Edit
                  </Button>
                </div>
            </CardFooter>
            <CardContent>
               <WardUsers wardId={ward.id} />
            </CardContent>
          </Card>
        ))}
      </div>

      <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
          {/* Edit Dialog Content */}
      </Dialog>
      {currentWard && (
        <QrCodeDialog
          isOpen={isQrCodeDialogOpen}
          onClose={() => setIsQrCodeDialogOpen(false)}
          wardName={currentWard.name}
          accessCode={currentWard.accessCode}
        />
      )}
    </div>
  );
}