import { useState, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { format, parseISO } from "date-fns";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { PlusCircle, Calendar, Users } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { MealEditDialog } from "./meal-edit-dialog"; // This will be the next file
import { CancelMealDialog } from "./cancel-meal-dialog";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";

interface MealManagementProps {
  wardId: number;
}

export function MealManagement({ wardId }: MealManagementProps) {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [isCancelDialogOpen, setIsCancelDialogOpen] = useState(false);
  const [selectedMeal, setSelectedMeal] = useState<any | null>(null);
  const [filter, setFilter] = useState("upcoming");

  const { data: meals = [], isLoading: isLoadingMeals } = useQuery<any[]>({
    queryKey: ['/api/wards', wardId, 'meals'],
    queryFn: async () => {
      const response = await fetch(`/api/wards/${wardId}/meals?startDate=1970-01-01&endDate=2100-01-01`);
      if (!response.ok) throw new Error("Failed to fetch meals");
      return response.json();
    },
    enabled: !!wardId,
  });

  const cancelMealMutation = useMutation({
    mutationFn: async ({ mealId, reason }: { mealId: number; reason: string }) => {
      return apiRequest("POST", `/api/meals/${mealId}/cancel`, { reason });
    },
    onSuccess: () => {
      toast({ title: "Meal Cancelled", description: "The meal has been successfully cancelled." });
      queryClient.invalidateQueries({ queryKey: ['/api/wards', wardId, 'meals'] });
      setIsCancelDialogOpen(false);
      setSelectedMeal(null);
    },
    onError: (error: any) => {
      toast({ title: "Cancellation Failed", description: error.message, variant: "destructive" });
    },
  });

  const handleCancelConfirm = (reason: string) => {
    if (selectedMeal) {
      cancelMealMutation.mutate({ mealId: selectedMeal.id, reason });
    }
  };

  const filteredAndSortedMeals = useMemo(() => {
    const now = new Date();
    let filtered = meals;

    if (filter === "upcoming") {
      filtered = meals.filter(meal => !meal.cancelled && new Date(meal.date) >= now);
    } else if (filter === "past") {
      filtered = meals.filter(meal => !meal.cancelled && new Date(meal.date) < now);
    } else if (filter === "cancelled") {
      filtered = meals.filter(meal => meal.cancelled);
    }

    return filtered.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  }, [meals, filter]);

  const handleAddNewMeal = () => {
    setSelectedMeal(null);
    setIsEditDialogOpen(true);
  };

  const handleEditMeal = (meal: any) => {
    setSelectedMeal(meal);
    setIsEditDialogOpen(true);
  };

  const handleCancelMeal = (meal: any) => {
    setSelectedMeal(meal);
    setIsCancelDialogOpen(true);
  };

  return (
    <>
      <Card>
        <CardHeader>
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
            <div>
              <CardTitle>Meal Management</CardTitle>
              <CardDescription>View, add, edit, or cancel meal appointments.</CardDescription>
            </div>
            <div className="flex flex-col sm:flex-row gap-2 w-full sm:w-auto">
                <Select value={filter} onValueChange={setFilter}>
                    <SelectTrigger className="w-full sm:w-[180px]">
                        <SelectValue placeholder="Filter meals" />
                    </SelectTrigger>
                    <SelectContent>
                        <SelectItem value="upcoming">Upcoming</SelectItem>
                        <SelectItem value="past">Past</SelectItem>
                        <SelectItem value="cancelled">Cancelled</SelectItem>
                        <SelectItem value="all">All Meals</SelectItem>
                    </SelectContent>
                </Select>
                <Button onClick={handleAddNewMeal} className="w-full sm:w-auto">
                    <PlusCircle className="mr-2 h-4 w-4" /> Add Meal
                </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {isLoadingMeals ? (
            <Skeleton className="h-40 w-full" />
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Date & Time</TableHead>
                    <TableHead>Host</TableHead>
                    <TableHead>Missionaries</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredAndSortedMeals.length > 0 ? (
                    filteredAndSortedMeals.map((meal) => (
                      <TableRow key={meal.id}>
                        <TableCell>
                          <div className="font-medium">{format(parseISO(meal.date), "EEE, MMM d, yyyy")}</div>
                          <div className="text-sm text-muted-foreground">{meal.startTime}</div>
                        </TableCell>
                        <TableCell>
                            <div>{meal.hostName}</div>
                            <div className="text-sm text-muted-foreground">{meal.hostPhone}</div>
                        </TableCell>
                        <TableCell>{meal.missionary.name}</TableCell>
                        <TableCell>
                          {meal.cancelled ? (
                            <Badge variant="destructive">Cancelled</Badge>
                          ) : new Date(meal.date) < new Date() ? (
                            <Badge variant="outline">Completed</Badge>
                          ) : (
                            <Badge className="bg-green-100 text-green-800">Upcoming</Badge>
                          )}
                        </TableCell>
                        <TableCell className="text-right">
                          <Button variant="ghost" size="sm" onClick={() => handleEditMeal(meal)}>Edit</Button>
                          {!meal.cancelled && (
                            <Button variant="ghost" size="sm" className="text-red-600 hover:text-red-700" onClick={() => handleCancelMeal(meal)}>
                              Cancel
                            </Button>
                          )}
                        </TableCell>
                      </TableRow>
                    ))
                  ) : (
                    <TableRow>
                      <TableCell colSpan={5} className="text-center h-24">
                        No meals found for the selected filter.
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      {isEditDialogOpen && (
        <MealEditDialog
          isOpen={isEditDialogOpen}
          onClose={() => setIsEditDialogOpen(false)}
          meal={selectedMeal}
          wardId={wardId}
        />
      )}

      {isCancelDialogOpen && selectedMeal && (
        <CancelMealDialog
          open={isCancelDialogOpen}
          onOpenChange={setIsCancelDialogOpen}
          onConfirm={handleCancelConfirm}
          mealInfo={{
            date: format(parseISO(selectedMeal.date), "EEEE, MMMM do"),
            time: selectedMeal.startTime,
            missionaryType: selectedMeal.missionary.type,
          }}
        />
      )}
    </>
  );
}