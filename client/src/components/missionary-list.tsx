// client/src/components/missionary-list.tsx
import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { PlusCircle, Edit, Trash2, Check, X, User, Search } from 'lucide-react'; // Import Search icon
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
import { AddMissionaryDialog } from './add-missionary-dialog';
import { EditMissionaryDialog } from './edit-missionary-dialog';
import { EmailVerificationDialog } from './email-verification-dialog';


interface Missionary {
  id: number;
  name: string;
  type: 'elders' | 'sisters';
  congregationId: number;
  phoneNumber?: string | null;
  emailAddress?: string | null;
  messengerAccount?: string | null;
  active: boolean;
  preferredNotification: 'none' | 'email' | 'text' | 'messenger';
  notificationScheduleType: 'before_meal' | 'day_of' | 'weekly_summary';
  hoursBefore?: number | null;
  dayOfTime?: string | null;
  weeklySummaryDay?: string | null;
  weeklySummaryTime?: string | null;
  emailVerified: boolean;
  consentStatus: 'pending' | 'granted' | 'denied';
}

interface Congregation {
  id: number;
  name: string;
  accessCode: string;
}

export function MissionaryList({ congregationId }: { congregationId?: number }) {
  const queryClient = useQueryClient();
  const [isAddMissionaryDialogOpen, setIsAddMissionaryDialogOpen] = useState(false);
  const [isEditMissionaryDialogOpen, setIsEditMissionaryDialogOpen] = useState(false);
  const [isEmailVerificationDialogOpen, setIsEmailVerificationDialogOpen] = useState(false);
  const [currentMissionary, setCurrentMissionary] = useState<Missionary | null>(null);
  const [searchTerm, setSearchTerm] = useState(''); // New state for search term


  const { data: missionaries, isLoading: isLoadingMissionaries, isError: isErrorMissionaries } = useQuery<Missionary[]>({
    queryKey: ['missionaries', congregationId, searchTerm], // Add searchTerm to queryKey
    queryFn: async () => {
      const params = new URLSearchParams();
      if (searchTerm) {
        params.append('searchTerm', searchTerm); // Pass searchTerm to the API
      }

      let url = '/api/missionaries';
      if (congregationId) {
        url = `/api/admin/missionaries/congregation/${congregationId}`;
      }

      const res = await fetch(`${url}?${params.toString()}`);
      if (!res.ok) {
        throw new Error('Failed to fetch missionaries');
      }
      return res.json();
    },
  });

  const deleteMissionaryMutation = useMutation({
    mutationFn: async (id: number) => {
      const res = await fetch(`/api/missionaries/${id}`, {
        method: 'DELETE',
      });
      if (!res.ok) {
        const errorData = await res.json();
        throw new Error(errorData.message || 'Failed to delete missionary');
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['missionaries'] });
      toast({
        title: 'Missionary Deleted',
        description: 'The missionary has been successfully deleted.',
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

  const openEditDialog = (missionary: Missionary) => {
    setCurrentMissionary(missionary);
    setIsEditMissionaryDialogOpen(true);
  };

  const openEmailVerificationDialog = (missionary: Missionary) => {
    setCurrentMissionary(missionary);
    setIsEmailVerificationDialogOpen(true);
  };

  if (isLoadingMissionaries) {
    return (
      <div className="flex justify-center items-center h-48">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    );
  }

  if (isErrorMissionaries) {
    return (
      <Alert variant="destructive">
        <AlertTitle>Error</AlertTitle>
        <AlertDescription>Failed to load missionaries. Please try again later.</AlertDescription>
      </Alert>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-bold flex items-center">
          <User className="mr-2" /> Missionary List
        </h2>
        <div className="flex items-center space-x-4">
          {/* Search Input */}
          <div className="relative">
            <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search missionaries..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-8"
            />
          </div>
          <AddMissionaryDialog
            isOpen={isAddMissionaryDialogOpen}
            onOpenChange={setIsAddMissionaryDialogOpen}
            congregationId={congregationId}
          />
        </div>
      </div>

      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Name</TableHead>
            <TableHead>Type</TableHead>
            <TableHead>Phone Number</TableHead>
            <TableHead>Email Address</TableHead>
            <TableHead>Active</TableHead>
            <TableHead>Email Verified</TableHead>
            <TableHead>Consent Status</TableHead>
            <TableHead className="text-right">Actions</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {missionaries?.map((missionary) => (
            <TableRow key={missionary.id}>
              <TableCell className="font-medium">{missionary.name}</TableCell>
              <TableCell>{missionary.type}</TableCell>
              <TableCell>{missionary.phoneNumber || 'N/A'}</TableCell>
              <TableCell>
                {missionary.emailAddress || 'N/A'}
                {!missionary.emailVerified && missionary.emailAddress && (
                  <Button
                    variant="link"
                    size="sm"
                    onClick={() => openEmailVerificationDialog(missionary)}
                    className="ml-2"
                  >
                    Verify
                  </Button>
                )}
              </TableCell>
              <TableCell>{missionary.active ? 'Yes' : 'No'}</TableCell>
              <TableCell>{missionary.emailVerified ? 'Yes' : 'No'}</TableCell>
              <TableCell>{missionary.consentStatus}</TableCell>
              <TableCell className="text-right">
                <Button variant="ghost" size="icon" onClick={() => openEditDialog(missionary)}>
                  <Edit className="h-4 w-4" />
                </Button>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => deleteMissionaryMutation.mutate(missionary.id)}
                  disabled={deleteMissionaryMutation.isPending}
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>

      {currentMissionary && (
        <>
          <EditMissionaryDialog
            isOpen={isEditMissionaryDialogOpen}
            onOpenChange={setIsEditMissionaryDialogOpen}
            missionary={currentMissionary}
          />
          <EmailVerificationDialog
            isOpen={isEmailVerificationDialogOpen}
            onOpenChange={setIsEmailVerificationDialogOpen}
            missionary={currentMissionary}
          />
        </>
      )}
    </div>
  );
}