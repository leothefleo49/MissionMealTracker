import { useState, useMemo } from "react";
import { useAuth } from "@/hooks/use-auth";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { z } from "zod";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "./ui/card";
import { Button } from "./ui/button";
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
import { Input } from "./ui/input";
import { Textarea } from "./ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "./ui/select";
import { PlusCircle, ChevronLeft, Building, Map, Globe, Trash2, Pencil, Search } from "lucide-react";

type HierarchyType = 'region' | 'mission' | 'stake' | 'congregation';

type HierarchyItem = {
  id: number;
  name: string;
  description?: string;
  type: HierarchyType;
  regionId?: number;
  missionId?: number;
  stakeId?: number;
};

const formSchema = z.object({
  name: z.string().min(2, "Name is required"),
  description: z.string().optional(),
  parentId: z.number().optional().nullable(),
});
type FormValues = z.infer<typeof formSchema>;

export function CongregationManagement() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const { toast } = useToast();

  const [view, setView] = useState<HierarchyType | 'all'>('all');
  const [searchQuery, setSearchQuery] = useState("");

  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [addDialogEntityType, setAddDialogEntityType] = useState<HierarchyType>('region');

  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [selectedItem, setSelectedItem] = useState<HierarchyItem | null>(null);

  const { data: hierarchyData, isLoading } = useQuery<{
    regions: HierarchyItem[],
    missions: HierarchyItem[],
    stakes: HierarchyItem[],
    congregations: HierarchyItem[],
  }>({
    queryKey: ['hierarchy-all', user?.id],
    queryFn: async () => {
      const [regionsRes, missionsRes, stakesRes, congregationsRes] = await Promise.all([
        apiRequest("GET", "/api/regions"),
        apiRequest("GET", "/api/missions"),
        apiRequest("GET", "/api/stakes"),
        apiRequest("GET", "/api/admin/congregations"),
      ]);
      return {
        regions: (await regionsRes.json()).map((r: any) => ({ ...r, type: 'region' })),
        missions: (await missionsRes.json()).map((m: any) => ({ ...m, type: 'mission' })),
        stakes: (await stakesRes.json()).map((s: any) => ({ ...s, type: 'stake' })),
        congregations: (await congregationsRes.json()).map((c: any) => ({ ...c, type: 'congregation' })),
      };
    },
    enabled: !!user,
  });

  const filteredData = useMemo(() => {
    if (!hierarchyData) return [];
    const dataToFilter = view === 'all'
      ? [...hierarchyData.regions, ...hierarchyData.missions, ...hierarchyData.stakes, ...hierarchyData.congregations]
      : hierarchyData[view] || [];

    return dataToFilter.filter(item =>
      item.name.toLowerCase().includes(searchQuery.toLowerCase())
    );
  }, [hierarchyData, view, searchQuery]);

  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
  });

  const mutationOptions = {
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['hierarchy-all'] });
      setIsAddDialogOpen(false);
      setIsEditDialogOpen(false);
      setIsDeleteDialogOpen(false);
    },
    onError: (error: Error) => {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    },
  };

  const addMutation = useMutation({
    mutationFn: (data: { entityType: HierarchyType; values: FormValues }) => {
      let url = `/api/${data.entityType}s`;
      let payload: any = { name: data.values.name, description: data.values.description };
      if (data.entityType === 'mission') payload.regionId = data.values.parentId;
      if (data.entityType === 'stake') payload.missionId = data.values.parentId;
      if (data.entityType === 'congregation') payload.stakeId = data.values.parentId;

      return apiRequest("POST", url, payload);
    },
    ...mutationOptions,
    onSuccess: () => {
      mutationOptions.onSuccess();
      toast({ title: "Success", description: "Item created successfully." });
    },
  });

  const editMutation = useMutation({
    mutationFn: (data: { item: HierarchyItem, values: FormValues }) => {
      let url = `/api/${data.item.type}s/${data.item.id}`;
      let payload: any = { name: data.values.name, description: data.values.description };
      if (data.item.type === 'mission') payload.regionId = data.values.parentId;
      if (data.item.type === 'stake') payload.missionId = data.values.parentId;
      if (data.item.type === 'congregation') payload.stakeId = data.values.parentId;

      return apiRequest("PATCH", url, payload);
    },
    ...mutationOptions,
    onSuccess: () => {
        mutationOptions.onSuccess();
        toast({ title: "Success", description: "Item updated successfully." });
    }
  });

  const deleteMutation = useMutation({
    mutationFn: (item: HierarchyItem) => {
      let url = `/api/${item.type}s/${item.id}`;
      return apiRequest("DELETE", url);
    },
    ...mutationOptions,
    onSuccess: () => {
        mutationOptions.onSuccess();
        toast({ title: "Success", description: "Item deleted successfully." });
    }
  });

  const handleAddSubmit = (values: FormValues) => {
    addMutation.mutate({ entityType: addDialogEntityType, values });
  };

  const handleEditSubmit = (values: FormValues) => {
    if(selectedItem) {
      editMutation.mutate({ item: selectedItem, values });
    }
  };

  const openAddDialog = (type: HierarchyType) => {
    form.reset({ name: "", description: "", parentId: null });
    setAddDialogEntityType(type);
    setIsAddDialogOpen(true);
  };

  const openEditDialog = (item: HierarchyItem) => {
    setSelectedItem(item);
    let parentId: number | undefined | null = null;
    if (item.type === 'mission') parentId = item.regionId;
    if (item.type === 'stake') parentId = item.missionId;
    if (item.type === 'congregation') parentId = item.stakeId;
    form.reset({ name: item.name, description: item.description, parentId: parentId });
    setIsEditDialogOpen(true);
  };

  const openDeleteDialog = (item: HierarchyItem) => {
    setSelectedItem(item);
    setIsDeleteDialogOpen(true);
  };

  const renderButtons = () => {
    const buttons = [
        { label: 'All', type: 'all' },
        { label: 'Regions', type: 'region' },
        { label: 'Missions', type: 'mission' },
        { label: 'Stakes', type: 'stake' },
        { label: 'Congregations', type: 'congregation' }
    ];

    return buttons.map(b => {
      if(user?.role !== 'ultra' && b.type === 'region') return null;
      if(!['ultra', 'region'].includes(user?.role || '') && b.type === 'mission') return null;
      if(!['ultra', 'region', 'mission'].includes(user?.role || '') && b.type === 'stake') return null;

      return (
        <Button key={b.type} variant={view === b.type ? 'default' : 'outline'} onClick={() => setView(b.type as HierarchyType | 'all')}>
          {b.label}
        </Button>
      )
    });
  };

  const getParentSelector = (entityType: HierarchyType) => {
    let parentType: HierarchyType | null = null;
    let parents: HierarchyItem[] = [];
    switch(entityType) {
      case 'mission':
        parentType = 'region';
        parents = hierarchyData?.regions || [];
        break;
      case 'stake':
        parentType = 'mission';
        parents = hierarchyData?.missions || [];
        break;
      case 'congregation':
        parentType = 'stake';
        parents = hierarchyData?.stakes || [];
        break;
    }

    if (!parentType) return null;

    return (
      <FormField
        control={form.control}
        name="parentId"
        render={({ field }) => (
          <FormItem>
            <FormLabel>{parentType.charAt(0).toUpperCase() + parentType.slice(1)}</FormLabel>
            <Select onValueChange={(value) => field.onChange(value === "null" ? null : Number(value))} defaultValue={field.value ? String(field.value) : undefined}>
              <FormControl>
                <SelectTrigger>
                  <SelectValue placeholder={`Select a ${parentType}`} />
                </SelectTrigger>
              </FormControl>
              <SelectContent>
                <SelectItem value="null">None</SelectItem>
                {parents.map((parent) => (
                  <SelectItem key={parent.id} value={String(parent.id)}>{parent.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <FormMessage />
          </FormItem>
        )}
      />
    );
  };

  const getAddOptions = () => {
    const options: { label: string, type: HierarchyType }[] = [];
    if (user?.role === 'ultra') options.push({ label: 'Add Region', type: 'region' });
    if (['ultra', 'region'].includes(user?.role || '')) options.push({ label: 'Add Mission', type: 'mission' });
    if (['ultra', 'region', 'mission'].includes(user?.role || '')) options.push({ label: 'Add Stake', type: 'stake' });
    if (['ultra', 'region', 'mission', 'stake'].includes(user?.role || '')) options.push({ label: 'Add Congregation', type: 'congregation' });

    return (
        <Select onValueChange={(type) => openAddDialog(type as HierarchyType)}>
            <SelectTrigger className="w-[180px]">
                <SelectValue placeholder="Add New..." />
            </SelectTrigger>
            <SelectContent>
                {options.map(option => (
                    <SelectItem key={option.type} value={option.type}>{option.label}</SelectItem>
                ))}
            </SelectContent>
        </Select>
    );
  }

  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-xl font-semibold">Hierarchy Management</h2>
        {getAddOptions()}
      </div>
      <div className="flex gap-2 mb-4 flex-wrap">
        {renderButtons()}
      </div>
      <div className="relative mb-4">
        <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
        <Input
          type="search"
          placeholder="Search..."
          className="w-full pl-8"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
        />
      </div>
      <div className="space-y-4">
        {isLoading && <p>Loading...</p>}
        {filteredData.map(item => (
          <Card key={`${item.type}-${item.id}`}>
            <CardHeader>
              <div className="flex justify-between items-center">
                <CardTitle className="flex items-center">
                  {item.type === 'region' && <Globe className="mr-2"/>}
                  {item.type === 'mission' && <Map className="mr-2"/>}
                  {item.type === 'stake' && <Building className="mr-2"/>}
                  {item.type === 'congregation' && <Building className="mr-2"/>}
                  {item.name}
                </CardTitle>
                <div className="flex space-x-2">
                  <Button variant="ghost" size="icon" onClick={() => openEditDialog(item)}>
                    <Pencil className="h-4 w-4" />
                  </Button>
                  <Button variant="ghost" size="icon" onClick={() => openDeleteDialog(item)}>
                    <Trash2 className="h-4 w-4 text-red-500" />
                  </Button>
                </div>
              </div>
              <CardDescription>{item.description}</CardDescription>
            </CardHeader>
          </Card>
        ))}
      </div>

      <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit {selectedItem?.type}</DialogTitle>
          </DialogHeader>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(handleEditSubmit)} className="space-y-4">
              <FormField control={form.control} name="name" render={({ field }) => (
                  <FormItem>
                    <FormLabel>Name</FormLabel>
                    <FormControl><Input placeholder="Enter name" {...field} /></FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField control={form.control} name="description" render={({ field }) => (
                  <FormItem>
                    <FormLabel>Description</FormLabel>
                    <FormControl><Textarea placeholder="Enter description" {...field} /></FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              {selectedItem && getParentSelector(selectedItem.type)}
              <DialogFooter>
                <Button type="submit">Save Changes</Button>
              </DialogFooter>
            </form>
          </Form>
        </DialogContent>
      </Dialog>

      <AlertDialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Are you sure?</AlertDialogTitle>
            <AlertDialogDescription>
              This action cannot be undone. This will permanently delete the {selectedItem?.type}.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={() => selectedItem && deleteMutation.mutate(selectedItem)}>Delete</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}