// client/src/components/missionary-list.tsx
import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Pencil, Trash2, PlusCircle, UserPlus, Mail, Phone, MessageSquare, Search } from 'lucide-react';
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow
} from './ui/table';
import { Button } from './ui/button';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter
} from './ui/dialog';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { toast } from '../hooks/use-toast';
import { Loader2 } from 'lucide-react';
import { Switch } from './ui/switch';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select';
import { Checkbox } from './ui/checkbox';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from './ui/alert-dialog';
import { AddMissionaryDialog } from './add-missionary-dialog';
import { EditMissionaryDialog } from './edit-missionary-dialog';
import { EmailVerificationDialog } from './email-verification-dialog';
import { Badge } from './ui/badge';

interface Missionary {
  id: number;
  name: string;
  type: string;
  phoneNumber: string;
  personalPhone: string | null;
  emailAddress: string | null;
  whatsappNumber: string | null;
  messengerAccount: string | null;
  preferredNotification: string;
  active: boolean;
  congregationId: number;
  emailVerified: boolean;
  consentStatus: string;
  consentDate: string | null;
}

interface MissionaryListProps {
  congregationId: number;
  adminRole: 'ultra' | 'region' | 'mission' | 'stake' | 'ward'; // Added adminRole
}

export function MissionaryList({ congregationId, adminRole }: MissionaryListProps) {
  const queryClient = useQueryClient();
  const [isAddMissionaryDialogOpen, setIsAddMissionaryDialogOpen] = useState(false);
  const [isEditMissionaryDialogOpen, setIsEditMissionaryDialogOpen] = useState(false);
  const [isEmailVerificationDialogOpen, setIsEmailVerificationDialogOpen] = useState(false);
  const [currentMissionary, setCurrentMissionary] = useState<Missionary | null>(null);
  const [emailVerificationMissionaryId, setEmailVerificationMissionaryId] = useState<number | null>(null);
  const [searchTerm, setSearchTerm] = useState(''); // New state for search term


  const { data: missionaries, isLoading, isError } = useQuery<Missionary[]>({
    queryKey: ['missionaries', congregationId, searchTerm], // Add searchTerm to query key
    queryFn: async () => {
      const params = new URLSearchParams();
      if (searchTerm) {
        params.append('searchTerm', searchTerm);
      }
      const res = await fetch(`/api/admin/missionaries/congregation/${congregationId}?${params.toString()}`);
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
        throw new Error('Failed to delete missionary');
      }
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['missionaries', congregationId] });
      toast({
        title: 'Missionary Deleted',
        description: 'The missionary has been successfully deleted.',
      });
    },
    onError: (error) => {
      toast({
        title: 'Error',
        description: error.message || 'Failed to delete missionary.',
        variant: 'destructive',
      });
    },
  });

  const updateMissionaryActiveStatusMutation = useMutation({
    mutationFn: async ({ id, active }: { id: number; active: boolean }) => {
      const res = await fetch(`/api/admin/missionaries/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ active }),
      });
      if (!res.ok) {
        throw new Error('Failed to update missionary status');
      }
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['missionaries', congregationId] });
      toast({
        title: 'Missionary Status Updated',
        description: 'The missionary\'s active status has been successfully updated.',
      });
    },
    onError: (error) => {
      toast({
        title: 'Error',
        description: error.message || 'Failed to update missionary status.',
        variant: 'destructive',
      });
    },
  });

  const requestConsentMutation = useMutation({
    mutationFn: async (missionaryId: number) => {
      const res = await fetch(`/api/missionaries/${missionaryId}/request-consent`, {
        method: 'POST',
      });
      if (!res.ok) {
        const errorData = await res.json();
        throw new Error(errorData.message || 'Failed to send consent request');
      }
      return res.json();
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['missionaries', congregationId] });
      toast({
        title: 'Consent Request Sent',
        description: data.message,
      });
    },
    onError: (error) => {
      toast({
        title: 'Error Sending Consent Request',
        description: error.message || 'There was an error sending the consent request.',
        variant: 'destructive',
      });
    },
  });


  const handleOpenEditDialog = (missionary: Missionary) => {
    setCurrentMissionary(missionary);
    setIsEditMissionaryDialogOpen(true);
  };

  const handleToggleActive = (missionaryId: number, currentStatus: boolean) => {
    updateMissionaryActiveStatusMutation.mutate({ id: missionaryId, active: !currentStatus });
  };

  const handleOpenEmailVerificationDialog = (missionaryId: number) => {
    setEmailVerificationMissionaryId(missionaryId);
    setIsEmailVerificationDialogOpen(true);
  };

  const isSuperAdmin = ['ultra', 'region', 'mission', 'stake'].includes(adminRole);

  if (isLoading) {
    return (
      <div className="flex justify-center items-center h-48">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    );
  }

  if (isError) {
    return <p className="text-center text-red-500">Error loading missionaries.</p>;
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-bold">Missionaries ({missionaries?.length || 0})</h2>
        <div className="flex items-center space-x-4"> {/* Added a div for layout */}
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
                congregationId={congregationId}
                isOpen={isAddMissionaryDialogOpen}
                onOpenChange={setIsAddMissionaryDialogOpen}
            />
        </div>
      </div>

      <div className="bg-white rounded-lg shadow-sm overflow-hidden border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Name</TableHead>
              <TableHead>Type</TableHead>
              <TableHead>Contact Info</TableHead>
              <TableHead>Notifications</TableHead>
              <TableHead>Active</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {missionaries && missionaries.length > 0 ? (
              missionaries.map((missionary) => (
                <TableRow key={missionary.id}>
                  <TableCell className="font-medium">{missionary.name}</TableCell>
                  <TableCell>{missionary.type}</TableCell>
                  <TableCell>
                    {missionary.emailAddress && (
                      <div className="flex items-center text-sm">
                        <Mail className="h-4 w-4 mr-1" /> {missionary.emailAddress}
                        {!missionary.emailVerified && missionary.emailAddress.endsWith('@missionary.org') && (
                          <Badge variant="outline" className="ml-2 text-orange-500 border-orange-300 bg-orange-50">
                            Unverified
                          </Badge>
                        )}
                      </div>
                    )}
                    {missionary.phoneNumber && (
                      <div className="flex items-center text-sm">
                        <Phone className="h-4 w-4 mr-1" /> {missionary.phoneNumber}
                        {missionary.preferredNotification === 'text' && missionary.consentStatus !== 'granted' && (
                          <Badge variant="outline" className="ml-2 text-red-500 border-red-300 bg-red-50">
                            No SMS Consent ({missionary.consentStatus})
                          </Badge>
                        )}
                      </div>
                    )}
                    {missionary.messengerAccount && (
                      <div className="flex items-center text-sm">
                        <MessageSquare className="h-4 w-4 mr-1" /> {missionary.messengerAccount} (Messenger)
                      </div>
                    )}
                  </TableCell>
                  <TableCell>
                    <div className="capitalize">{missionary.preferredNotification}</div>
                    {missionary.preferredNotification === 'text' && missionary.consentStatus !== 'granted' && (
                      <Button
                        variant="link"
                        className="h-auto p-0 text-xs mt-1 text-blue-600"
                        onClick={() => requestConsentMutation.mutate(missionary.id)}
                        disabled={requestConsentMutation.isPending}
                      >
                        {requestConsentMutation.isPending ? 'Sending...' : 'Request SMS Consent'}
                      </Button>
                    )}
                  </TableCell>
                  <TableCell>
                    <Switch
                      checked={missionary.active}
                      onCheckedChange={() => handleToggleActive(missionary.id, missionary.active)}
                      disabled={updateMissionaryActiveStatusMutation.isPending}
                    />
                  </TableCell>
                  <TableCell className="text-right flex space-x-2 justify-end">
                    {missionary.emailAddress && !missionary.emailVerified && missionary.emailAddress.endsWith('@missionary.org') && (
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleOpenEmailVerificationDialog(missionary.id)}
                      >
                        Verify Email
                      </Button>
                    )}
                    <Button variant="ghost" size="icon" onClick={() => handleOpenEditDialog(missionary)}>
                      <Pencil className="h-4 w-4" />
                    </Button>
                    <AlertDialog>
                      <AlertDialogTrigger asChild>
                        <Button variant="destructive" size="icon">
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </AlertDialogTrigger>
                      <AlertDialogContent>
                        <AlertDialogHeader>
                          <AlertDialogTitle>Are you absolutely sure?</AlertDialogTitle>
                          <AlertDialogDescription>
                            This action cannot be undone. This will permanently delete {missionary.name} and all associated meal bookings.
                          </AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter>
                          <AlertDialogCancel>Cancel</AlertDialogCancel>
                          <AlertDialogAction onClick={() => deleteMissionaryMutation.mutate(missionary.id)}>
                            Delete
                          </AlertDialogAction>
                        </AlertDialogFooter>
                      </AlertDialogContent>
                    </AlertDialog>
                  </TableCell>
                </TableRow>
              ))
            ) : (
              <TableRow>
                <TableCell colSpan={6} className="text-center text-muted-foreground py-8">
                  No missionaries found for this congregation.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>

      {currentMissionary && (
        <EditMissionaryDialog
          missionary={currentMissionary}
          isOpen={isEditMissionaryDialogOpen}
          onOpenChange={setIsEditMissionaryDialogOpen}
          congregationId={congregationId}
        />
      )}

      {emailVerificationMissionaryId && (
        <EmailVerificationDialog
          missionaryId={emailVerificationMissionaryId}
          isOpen={isEmailVerificationDialogOpen}
          onOpenChange={setIsEmailVerificationDialogOpen}
        />
      )}
    </div>
  );
}