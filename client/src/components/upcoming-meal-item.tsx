import { useState } from "react";
import { format, parseISO } from "date-fns";
import { Button } from "@/components/ui/button";
import { formatTimeFrom24To12 } from "@/lib/utils";
import { CancelMealDialog } from "./cancel-meal-dialog";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";

type UpcomingMealItemProps = {
  id: number;
  date: string; // ISO date string
  startTime: string; // 24-hour format: "HH:MM"
  hostName: string;
  hostPhone: string;
  mealDescription?: string;
  missionaryType: "elders" | "sisters";
  onEdit?: (id: number) => void;
};

export function UpcomingMealItem({
  id,
  date,
  startTime,
  hostName,
  hostPhone,
  mealDescription,
  missionaryType,
  onEdit,
}: UpcomingMealItemProps) {
  const [showCancelDialog, setShowCancelDialog] = useState(false);
  const { toast } = useToast();
  const queryClient = useQueryClient();
  
  const parsedDate = parseISO(date);
  const formattedDate = format(parsedDate, "EEEE, MMMM do");
  const formattedTime = formatTimeFrom24To12(startTime);
  const dayNumber = format(parsedDate, "d");
  const monthShort = format(parsedDate, "MMM");
  
  // Colors based on missionary type
  const bgColorClass = missionaryType === "elders" 
    ? "bg-primary bg-opacity-10" 
    : "bg-amber-500 bg-opacity-10";
  
  const textColorClass = missionaryType === "elders"
    ? "text-primary"
    : "text-amber-500";
  
  // Edit meal handler
  const handleEdit = () => {
    if (onEdit) {
      onEdit(id);
    }
  };
  
  // Cancel meal mutation
  const cancelMealMutation = useMutation({
    mutationFn: async (reason: string) => {
      return apiRequest("POST", `/api/meals/${id}/cancel`, { reason });
    },
    onSuccess: () => {
      toast({
        title: "Meal Cancelled",
        description: "The missionaries have been notified of the cancellation.",
      });
      
      // Invalidate queries to refresh data
      queryClient.invalidateQueries({ queryKey: ['/api/meals'] });
    },
    onError: (error) => {
      console.error("Cancel error:", error);
      toast({
        title: "Cancellation Failed",
        description: "There was an error cancelling the meal. Please try again.",
        variant: "destructive",
      });
    },
  });
  
  const handleCancelConfirm = (reason: string) => {
    cancelMealMutation.mutate(reason);
    setShowCancelDialog(false);
  };
  
  return (
    <>
      <div className="px-4 py-5 sm:px-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center">
            <div className={`flex-shrink-0 h-12 w-12 ${bgColorClass} rounded-full flex flex-col items-center justify-center`}>
              <span className={`${textColorClass} font-medium`}>{dayNumber}</span>
              <span className={`${textColorClass} text-xs`}>{monthShort}</span>
            </div>
            <div className="ml-4">
              <h4 className="text-lg font-medium text-gray-900">
                Dinner with {missionaryType === "elders" ? "Elders" : "Sisters"}
              </h4>
              <p className="text-sm text-gray-500">{formattedDate} at {formattedTime}</p>
            </div>
          </div>
          <div className="flex space-x-2">
            <Button
              variant="outline"
              size="sm"
              onClick={handleEdit}
            >
              Edit
            </Button>
            <Button
              variant="destructive"
              size="sm"
              onClick={() => setShowCancelDialog(true)}
            >
              Cancel
            </Button>
          </div>
        </div>
        <div className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-3">
          <div>
            <h5 className="text-xs font-medium text-gray-500 uppercase tracking-wider">Host</h5>
            <p className="mt-1 text-sm text-gray-900">{hostName}</p>
          </div>
          <div>
            <h5 className="text-xs font-medium text-gray-500 uppercase tracking-wider">Contact</h5>
            <p className="mt-1 text-sm text-gray-900">{hostPhone}</p>
          </div>
          <div>
            <h5 className="text-xs font-medium text-gray-500 uppercase tracking-wider">Meal</h5>
            <p className="mt-1 text-sm text-gray-900">
              {mealDescription || "Not specified"}
            </p>
          </div>
        </div>
      </div>
      
      {/* Cancel Dialog */}
      <CancelMealDialog
        open={showCancelDialog}
        onOpenChange={setShowCancelDialog}
        onConfirm={handleCancelConfirm}
        mealInfo={{
          date: formattedDate,
          time: formattedTime,
          missionaryType: missionaryType === "elders" ? "Elders" : "Sisters"
        }}
      />
    </>
  );
}
