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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"; // NEW: Import Select components for role assignment

interface WardUsersProps {
  wardId: number;
}

interface User {
  id: number;
  username: string;
  isAdmin: boolean;
  isSuperAdmin: boolean;
  isMissionAdmin: boolean;
  isStakeAdmin: boolean;
}

interface WardUser {
  userId: number;
  wardId: number;
  username: string;
  isAdmin: boolean;
  isSuperAdmin: boolean;
  isMissionAdmin: boolean;
  isStakeAdmin: boolean;
}

export function WardUsers({ wardId }: WardUsersProps) {
  const { toast } = useToast();
  const [isAddUserDialogOpen, setIsAddUserDialogOpen] = useState(false);
  const [username, setUsername] = useState("");
  const [userToRemove, setUserToRemove] = useState<WardUser | null>(null);
  const [isRemoveDialogOpen, setIsRemoveDialogOpen] = useState(false);
  const [selectedRole, setSelectedRole] = useState<string>('ward_admin'); // State for new role assignment

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
    mutationFn: async ({ username, role }: { username: string; role: string }) => {
      // Determine admin flags based on selected role
      const isAdmin = role === 'ward_admin' || role === 'stake_admin' || role === 'mission_admin' || role === 'super_admin';
      const isSuperAdmin = role === 'super_admin';
      const isMissionAdmin = role === 'mission_admin';
      const isStakeAdmin = role === 'stake_admin';

      const res = await apiRequest("POST", `/api/admin/wards/${wardId}/users`, { 
        username, 
        isAdmin, 
        isSuperAdmin, 
        isMissionAdmin, 
        isStakeAdmin 
      });
      return await res.json();
    },
    onSuccess: () => {
      toast({
        title: "Admin added",
        description: "Admin has been successfully added to the ward.",
      });
      setIsAddUserDialogOpen(false);
      setUsername("");
      setSelectedRole('ward_admin'); // Reset role selection
      queryClient.invalidateQueries({ queryKey: ["/api/admin/wards", wardId, "users"] });
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: error.message || "Failed to add admin. Admin might not exist or is already added to this ward.",
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
        title: "Admin removed",
        description: "Admin has been successfully removed from the ward.",
      });
      setIsRemoveDialogOpen(false);
      setUserToRemove(null);
      queryClient.invalidateQueries({ queryKey: ["/api/admin/wards", wardId, "users"] });
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: error.message || "Failed to remove admin. Please try again.",
        variant: "destructive",
      });
    },
  });

  // Handle add user submission
  function handleAddUser() {
    if (username.trim()) {
      addUserMutation.mutate({ username, role: selectedRole });
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
        Loading ward admins...
      </div>
    );
  }

  return (
    <div>
      <div className="flex justify-between items-center mb-4">
        <h3 className="text-sm font-medium">Ward Admins</h3>
        <Dialog open={isAddUserDialogOpen} onOpenChange={setIsAddUserDialogOpen}>
          <DialogTrigger asChild>
            <Button variant="outline" size="sm">
              <UserPlus className="h-4 w-4 mr-1" />
              Add Admin
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Add Admin to Ward</DialogTitle>
              <DialogDescription>
                Enter the username of an existing user to grant them admin access to this ward.
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
              {/* NEW: Role selection when adding a user */}
              <div className="space-y-2">
                <label className="text-sm font-medium" htmlFor="role">
                  Assign Role
                </label>
                <Select onValueChange={setSelectedRole} value={selectedRole}>
                  <SelectTrigger id="role">
                    <SelectValue placeholder="Select a role" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="ward_admin">Ward Admin</SelectItem>
                    <SelectItem value="stake_admin">Stake Admin</SelectItem>
                    <SelectItem value="mission_admin">Mission Admin</SelectItem>
                    <SelectItem value="super_admin">Super Admin</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <DialogFooter>
              <Button 
                disabled={!username.trim() || addUserMutation.isPending} 
                onClick={handleAddUser}
              >
                {addUserMutation.isPending ? "Adding..." : "Add Admin"}
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
                    ) : user.isMissionAdmin ? (
                      <Badge className="bg-purple-100 text-purple-800 border-purple-200 hover:bg-purple-100">
                        Mission Admin
                      </Badge>
                    ) : user.isStakeAdmin ? (
                      <Badge className="bg-green-100 text-green-800 border-green-200 hover:bg-green-100">
                        Stake Admin
                      </Badge>
                    ) : user.isAdmin ? (
                      <Badge className="bg-blue-100 text-blue-800 border-blue-200 hover:bg-blue-100">
                        Ward Admin
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
            No admins have access to this ward yet.
          </p>
        </div>
      )}

      {/* Remove User Dialog */}
      <AlertDialog open={isRemoveDialogOpen} onOpenChange={setIsRemoveDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Remove Admin</AlertDialogTitle>
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
              {removeUserMutation.isPending ? "Removing..." : "Remove Admin"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
