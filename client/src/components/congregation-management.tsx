import { useState, useEffect } from "react";
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
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "./ui/select";
import { PlusCircle, ChevronLeft, Building, Map, Globe, Trash2, Pencil } from "lucide-react";

type HierarchyItem = {
  id: number;
  name: string;
  type: 'region' | 'mission' | 'stake' | 'congregation';
  children?: HierarchyItem[];
  parent?: HierarchyItem;
  regionId?: number;
  missionId?: number;
  stakeId?: number;
};

const formSchema = z.object({
  name: z.string().min(2, "Name is required"),
  parentId: z.number().optional(),
});
type FormValues = z.infer<typeof formSchema>;

export function CongregationManagement() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const { toast } = useToast();

  const [navigationPath, setNavigationPath] = useState<HierarchyItem[]>([]);
  const currentItem = navigationPath.length > 0 ? navigationPath[navigationPath.length - 1] : null;

  const { data: hierarchyData, isLoading } = useQuery<HierarchyItem[]>({
    queryKey: ['hierarchy', user?.role, user?.id],
    queryFn: async () => {
      // This will be a new endpoint that fetches the relevant hierarchy based on user role
      // For now, we'll mock the data fetching logic on the client-side
      if (user?.role === 'ultra') {
        const regionsRes = await apiRequest("GET", "/api/regions");
        const regions = await regionsRes.json();
        return regions.map((r: any) => ({ ...r, type: 'region' }));
      }
      // Add logic for other roles here
      return [];
    },
    enabled: !!user,
  });

  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);

  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
  });

  const getEntityType = () => {
    if (!currentItem) {
      if (user?.role === 'ultra') return 'region';
      if (user?.role === 'region') return 'mission';
      if (user?.role === 'mission') return 'stake';
      if (user?.role === 'stake') return 'congregation';
    }
    switch (currentItem.type) {
      case 'region': return 'mission';
      case 'mission': return 'stake';
      case 'stake': return 'congregation';
      default: return null;
    }
  };

  const handleAddItem = (data: FormValues) => {
    const entityType = getEntityType();
    // Logic to call the correct API endpoint based on entityType
    toast({ title: `${entityType} added`, description: `The new ${entityType} has been created.` });
    setIsAddDialogOpen(false);
  };

  const handleNavigate = (item: HierarchyItem) => {
    setNavigationPath([...navigationPath, item]);
  };

  const handleBack = () => {
    setNavigationPath(navigationPath.slice(0, -1));
  };

  const renderList = () => {
    const itemsToRender = currentItem ? currentItem.children : hierarchyData;

    if (isLoading) return <p>Loading...</p>

    return itemsToRender?.map(item => (
      <Card key={item.id} className="cursor-pointer hover:bg-muted/50" onClick={() => handleNavigate(item)}>
        <CardHeader>
          <CardTitle className="flex items-center">
            {item.type === 'region' && <Globe className="mr-2"/>}
            {item.type === 'mission' && <Map className="mr-2"/>}
            {item.type === 'stake' && <Building className="mr-2"/>}
            {item.name}
          </CardTitle>
          <CardDescription>
            {item.type.charAt(0).toUpperCase() + item.type.slice(1)}
          </CardDescription>
        </CardHeader>
      </Card>
    ));
  };

  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <div>
          <h2 className="text-xl font-semibold">Hierarchy Management</h2>
          <div className="flex items-center text-sm text-muted-foreground">
            {navigationPath.length > 0 && (
              <Button variant="ghost" size="sm" onClick={handleBack}><ChevronLeft className="h-4 w-4 mr-1"/> Back</Button>
            )}
            <span>{currentItem ? currentItem.name : "Top Level"}</span>
          </div>
        </div>
        <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
          <DialogTrigger asChild>
            <Button><PlusCircle className="mr-2 h-4 w-4" /> Add New</Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Add New {getEntityType()}</DialogTitle>
            </DialogHeader>
            <Form {...form}>
              <form onSubmit={form.handleSubmit(handleAddItem)} className="space-y-4">
                <FormField
                  control={form.control}
                  name="name"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Name</FormLabel>
                      <FormControl>
                        <Input placeholder="Enter name" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <DialogFooter>
                  <Button type="submit">Add</Button>
                </DialogFooter>
              </form>
            </Form>
          </DialogContent>
        </Dialog>
      </div>
      <div className="space-y-4">
        {renderList()}
      </div>
    </div>
  );
}