import { useState } from "react";
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
import { Textarea } from "@/components/ui/textarea";
import { AlertTriangle } from "lucide-react";

type CancelMealDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onConfirm: (reason: string) => void;
  mealInfo: {
    date: string;
    time: string;
    missionaryType: string;
  };
};

export function CancelMealDialog({
  open,
  onOpenChange,
  onConfirm,
  mealInfo,
}: CancelMealDialogProps) {
  const [reason, setReason] = useState("");
  
  const handleConfirm = () => {
    onConfirm(reason);
    setReason(""); // Reset reason after confirmation
  };
  
  const handleCancel = () => {
    onOpenChange(false);
    setReason(""); // Reset reason when dialog is dismissed
  };
  
  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent className="sm:max-w-lg">
        <AlertDialogHeader>
          <div className="mx-auto flex items-center justify-center h-12 w-12 rounded-full bg-red-100">
            <AlertTriangle className="h-6 w-6 text-red-600" />
          </div>
          <AlertDialogTitle className="text-center">
            Cancel this meal appointment?
          </AlertDialogTitle>
          <AlertDialogDescription className="text-center">
            Are you sure you want to cancel your meal appointment with the {mealInfo.missionaryType} on {mealInfo.date} at {mealInfo.time}? This action cannot be undone. The missionaries will be notified of the cancellation.
          </AlertDialogDescription>
        </AlertDialogHeader>
        
        <div className="mt-4">
          <label htmlFor="cancel-reason" className="block text-sm font-medium text-gray-700 text-left mb-1">
            Reason for cancellation (optional)
          </label>
          <Textarea
            id="cancel-reason"
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            placeholder="Please provide a reason for cancelling this meal appointment"
            className="resize-none"
            rows={3}
          />
        </div>
        
        <AlertDialogFooter className="sm:grid-cols-2 gap-3">
          <AlertDialogCancel onClick={handleCancel}>
            Go Back
          </AlertDialogCancel>
          <AlertDialogAction
            onClick={handleConfirm}
            className="bg-red-600 hover:bg-red-700 focus:ring-red-500"
          >
            Confirm Cancellation
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
