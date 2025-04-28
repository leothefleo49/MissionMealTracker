import { useState, useEffect } from "react";
import { useAuth } from "@/hooks/use-auth";
import { useQuery, useMutation } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { Ward, User } from "@shared/schema";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useToast } from "@/hooks/use-toast";
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
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { WardSelector } from "./ward-selector";
import { Badge } from "@/components/ui/badge";
import { Trash2 } from "lucide-react";

// Define the schema for adding a user to a ward
const addUserSchema = z.object({
  username: z.string().min(3, "Username must be at least 3 characters"),
  password: z.string().min(6, "Password must be at least 6 characters"),
  isAdmin: z.boolean().default(false),
});

type AddUserFormValues = z.infer<typeof addUserSchema>;

export function WardUsers() {
  const { user, selectedWard } = useAuth();
  const { toast } = useToast();
  const [isAddUserDialogOpen, setIsAddUserDialogOpen] = useState(false);

  // Fetch users for the selected ward
  const { data: wardUsers, isLoading } = useQuery<User[], Error>({
    queryKey: ["/api/admin/wards", selectedWard?.id, "users"],
    queryFn: async () => {
      if (!selectedWard) return [];
      const res = await fetch(`/api/admin/wards/${selectedWard.id}/users`);
      if (!res.ok) {
        throw new Error("Failed to fetch ward users");
      }
      return res.json();
    },
    enabled: !!selectedWard,
  });

  // Form for adding a new user
  const addUserForm = useForm<AddUserFormValues>({
    resolver: zodResolver(addUserSchema),
    defaultValues: {
      username: "",
      password: "",
      isAdmin: false,
    },
  });

  // Create user mutation
  const createUserMutation = useMutation({
    mutationFn: async (data: AddUserFormValues) => {
      if (!selectedWard) throw new Error("No ward selected");
      
      // First create the user
      const createRes = await apiRequest("POST", "/api/admin/users", data);
      if (!createRes.ok) {
        const errorData = await createRes.json();
        throw new Error(errorData.message || "Failed to create user");
      }
      const newUser = await createRes.json();
      
      // Then add the user to the ward
      const addToWardRes = await apiRequest(
        "POST",
        `/api/admin/wards/${selectedWard.id}/users`,
        { userId: newUser.id }
      );
      
      if (!addToWardRes.ok) {
        const errorData = await addToWardRes.json();
        throw new Error(errorData.message || "Failed to add user to ward");
      }
      
      return newUser;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ 
        queryKey: ["/api/admin/wards", selectedWard?.id, "users"] 
      });
      setIsAddUserDialogOpen(false);
      addUserForm.reset();
      toast({
        title: "User added",
        description: "The user has been created and added to the ward.",
        variant: "default",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Failed to add user",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  // Remove user from ward mutation
  const removeUserMutation = useMutation({
    mutationFn: async ({ userId }: { userId: number }) => {
      if (!selectedWard) throw new Error("No ward selected");
      
      const res = await apiRequest(
        "DELETE",
        `/api/admin/wards/${selectedWard.id}/users/${userId}`,
        null
      );
      
      if (!res.ok) {
        const errorData = await res.json();
        throw new Error(errorData.message || "Failed to remove user from ward");
      }
      
      return { userId };
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ 
        queryKey: ["/api/admin/wards", selectedWard?.id, "users"] 
      });
      toast({
        title: "User removed",
        description: "The user has been removed from the ward.",
        variant: "default",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Failed to remove user",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  // Handler for add user form submission
  function onAddUserSubmit(values: AddUserFormValues) {
    createUserMutation.mutate(values);
  }

  // Handler for removing a user from a ward
  function handleRemoveUser(userId: number) {
    if (window.confirm("Are you sure you want to remove this user from the ward?")) {
      removeUserMutation.mutate({ userId });
    }
  }

  if (!user?.isAdmin) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Ward Users</CardTitle>
          <CardDescription>
            You need admin privileges to manage ward users.
          </CardDescription>
        </CardHeader>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h2 className="text-2xl font-bold">Ward Users</h2>
          <p className="text-muted-foreground">
            Manage users who have access to the ward
          </p>
        </div>
        <div className="flex flex-col sm:flex-row gap-2 w-full md:w-auto">
          <WardSelector className="w-full sm:w-48" />
          {selectedWard && (
            <Dialog open={isAddUserDialogOpen} onOpenChange={setIsAddUserDialogOpen}>
              <DialogTrigger asChild>
                <Button variant="default">Add New User</Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Add User to Ward</DialogTitle>
                  <DialogDescription>
                    Create a new user and add them to {selectedWard.name}.
                  </DialogDescription>
                </DialogHeader>
                <Form {...addUserForm}>
                  <form onSubmit={addUserForm.handleSubmit(onAddUserSubmit)} className="space-y-4">
                    <FormField
                      control={addUserForm.control}
                      name="username"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Username</FormLabel>
                          <FormControl>
                            <Input placeholder="Enter username" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={addUserForm.control}
                      name="password"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Password</FormLabel>
                          <FormControl>
                            <Input 
                              type="password" 
                              placeholder="Enter password" 
                              {...field} 
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={addUserForm.control}
                      name="isAdmin"
                      render={({ field }) => (
                        <FormItem className="flex items-center space-x-2">
                          <FormControl>
                            <input
                              type="checkbox"
                              checked={field.value}
                              onChange={field.onChange}
                              id="isAdmin"
                              className="rounded text-primary border-input"
                            />
                          </FormControl>
                          <div className="space-y-1">
                            <FormLabel htmlFor="isAdmin">Admin</FormLabel>
                            <FormDescription>
                              Admin users can manage missionaries and view all meals
                            </FormDescription>
                          </div>
                        </FormItem>
                      )}
                    />
                    <DialogFooter>
                      <Button
                        type="submit"
                        disabled={createUserMutation.isPending}
                      >
                        {createUserMutation.isPending ? "Adding..." : "Add User"}
                      </Button>
                    </DialogFooter>
                  </form>
                </Form>
              </DialogContent>
            </Dialog>
          )}
        </div>
      </div>

      {!selectedWard ? (
        <Card>
          <CardHeader>
            <CardTitle>No Ward Selected</CardTitle>
            <CardDescription>
              Please select a ward to manage its users.
            </CardDescription>
          </CardHeader>
        </Card>
      ) : isLoading ? (
        <div>Loading users...</div>
      ) : !wardUsers || wardUsers.length === 0 ? (
        <Card>
          <CardHeader>
            <CardTitle>No Users Found</CardTitle>
            <CardDescription>
              There are no users assigned to this ward. Add a new user to get started.
            </CardDescription>
          </CardHeader>
        </Card>
      ) : (
        <Card>
          <CardHeader>
            <CardTitle>Users in {selectedWard.name}</CardTitle>
            <CardDescription>
              These users have access to manage this ward.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Username</TableHead>
                  <TableHead>Role</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {wardUsers.map((wardUser) => (
                  <TableRow key={wardUser.id}>
                    <TableCell>{wardUser.username}</TableCell>
                    <TableCell>
                      {wardUser.isSuperAdmin ? (
                        <Badge variant="default" className="bg-purple-500">Super Admin</Badge>
                      ) : wardUser.isAdmin ? (
                        <Badge variant="default">Admin</Badge>
                      ) : (
                        <Badge variant="outline">User</Badge>
                      )}
                    </TableCell>
                    <TableCell className="text-right">
                      {/* Don't allow removing super admin or yourself */}
                      {!wardUser.isSuperAdmin && wardUser.id !== user?.id && (
                        <TooltipProvider>
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <Button
                                variant="ghost"
                                size="icon"
                                onClick={() => handleRemoveUser(wardUser.id)}
                                disabled={removeUserMutation.isPending}
                              >
                                <Trash2 className="h-4 w-4 text-red-500" />
                              </Button>
                            </TooltipTrigger>
                            <TooltipContent>
                              Remove from ward
                            </TooltipContent>
                          </Tooltip>
                        </TooltipProvider>
                      )}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}
    </div>
  );
}