import { useState } from "react";
import { useMutation, useQuery } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Plus, Trash, User, UserPlus } from "lucide-react";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
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

interface WardUsersProps {
  wardId: number;
}

interface User {
  id: number;
  username: string;
  isAdmin: boolean;
  isSuperAdmin: boolean;
}

interface WardUser {
  userId: number;
  wardId: number;
  username: string;
  isAdmin: boolean;
  isSuperAdmin: boolean;
}

export function WardUsers({ wardId }: WardUsersProps) {
  const { toast } = useToast();
  const [isAddUserDialogOpen, setIsAddUserDialogOpen] = useState(false);
  const [username, setUsername] = useState("");
  const [userToRemove, setUserToRemove] = useState<WardUser | null>(null);
  const [isRemoveDialogOpen, setIsRemoveDialogOpen] = useState(false);
  
  // Fetch ward users
  const { data: wardUsers, isLoading } = useQuery<WardUser[]>({
    queryKey: ["/api/admin/wards", wardId, "users"],
    queryFn: async () => {
      const response = await fetch(`/api/admin/wards/${wardId}/users`);
      if (!response.ok) {
        throw new Error('Failed to fetch ward users');
      }
      return response.json();
    },
    enabled: !!wardId,
  });
  
  // Add user mutation
  const addUserMutation = useMutation({
    mutationFn: async (username: string) => {
      const res = await apiRequest("POST", `/api/admin/wards/${wardId}/users`, { username });
      return await res.json();
    },
    onSuccess: () => {
      toast({
        title: "User added",
        description: "User has been successfully added to the ward.",
      });
      setIsAddUserDialogOpen(false);
      setUsername("");
      queryClient.invalidateQueries({ queryKey: ["/api/admin/wards", wardId, "users"] });
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: error.message || "Failed to add user. User might not exist or is already added to this ward.",
        variant: "destructive",
      });
    },
  });
  
  // Remove user mutation
  const removeUserMutation = useMutation({
    mutationFn: async (userId: number) => {
      const res = await apiRequest("DELETE", `/api/admin/wards/${wardId}/users/${userId}`);
      return res.ok;
    },
    onSuccess: () => {
      toast({
        title: "User removed",
        description: "User has been successfully removed from the ward.",
      });
      setIsRemoveDialogOpen(false);
      setUserToRemove(null);
      queryClient.invalidateQueries({ queryKey: ["/api/admin/wards", wardId, "users"] });
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: error.message || "Failed to remove user. Please try again.",
        variant: "destructive",
      });
    },
  });
  
  // Handle add user submission
  function handleAddUser() {
    if (username.trim()) {
      addUserMutation.mutate(username);
    }
  }
  
  // Handle user removal confirmation
  function handleRemoveUser() {
    if (userToRemove) {
      removeUserMutation.mutate(userToRemove.userId);
    }
  }
  
  function openRemoveDialog(user: WardUser) {
    setUserToRemove(user);
    setIsRemoveDialogOpen(true);
  }
  
  if (isLoading) {
    return (
      <div className="py-2 text-sm text-gray-500">
        Loading ward users...
      </div>
    );
  }
  
  return (
    <div>
      <div className="flex justify-between items-center mb-4">
        <h3 className="text-sm font-medium">Ward Users</h3>
        <Dialog open={isAddUserDialogOpen} onOpenChange={setIsAddUserDialogOpen}>
          <DialogTrigger asChild>
            <Button variant="outline" size="sm">
              <UserPlus className="h-4 w-4 mr-1" />
              Add User
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Add User to Ward</DialogTitle>
              <DialogDescription>
                Enter the username of the user you want to add to this ward. The user must already exist in the system.
              </DialogDescription>
            </DialogHeader>
            
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <label className="text-sm font-medium" htmlFor="username">
                  Username
                </label>
                <Input
                  id="username"
                  placeholder="Enter username"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                />
              </div>
            </div>
            
            <DialogFooter>
              <Button 
                disabled={!username.trim() || addUserMutation.isPending} 
                onClick={handleAddUser}
              >
                {addUserMutation.isPending ? "Adding..." : "Add User"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
      
      {wardUsers && wardUsers.length > 0 ? (
        <div className="border rounded-md overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="whitespace-nowrap">Username</TableHead>
                <TableHead className="whitespace-nowrap">Role</TableHead>
                <TableHead className="w-16 text-right whitespace-nowrap">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {wardUsers.map((user) => (
                <TableRow key={user.userId}>
                  <TableCell className="font-medium whitespace-nowrap">
                    <div className="flex items-center">
                      <User className="h-4 w-4 mr-2 text-gray-500 flex-shrink-0" />
                      <span className="truncate max-w-[120px] sm:max-w-none">{user.username}</span>
                    </div>
                  </TableCell>
                  <TableCell className="whitespace-nowrap">
                    {user.isSuperAdmin ? (
                      <Badge className="bg-purple-100 text-purple-800 border-purple-200 hover:bg-purple-100">
                        Super Admin
                      </Badge>
                    ) : user.isAdmin ? (
                      <Badge className="bg-blue-100 text-blue-800 border-blue-200 hover:bg-blue-100">
                        Admin
                      </Badge>
                    ) : (
                      <Badge variant="outline">
                        User
                      </Badge>
                    )}
                  </TableCell>
                  <TableCell className="text-right whitespace-nowrap">
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8"
                      onClick={() => openRemoveDialog(user)}
                    >
                      <Trash className="h-4 w-4 text-red-500" />
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      ) : (
        <div className="text-center py-4 border rounded-md bg-slate-50">
          <p className="text-sm text-gray-500">
            No users have access to this ward yet.
          </p>
        </div>
      )}
      
      {/* Remove User Dialog */}
      <AlertDialog open={isRemoveDialogOpen} onOpenChange={setIsRemoveDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Remove User</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to remove {userToRemove?.username} from this ward? 
              They will no longer have access to this ward's data.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => setUserToRemove(null)}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleRemoveUser}
              className="bg-red-500 text-white hover:bg-red-600"
            >
              {removeUserMutation.isPending ? "Removing..." : "Remove User"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}