import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Pencil, Trash2, Check, X } from "lucide-react";
import { Switch } from "@/components/ui/switch";
import { Skeleton } from "@/components/ui/skeleton";
import { Separator } from "@/components/ui/separator";
import { EditMissionaryDialog } from "./edit-missionary-dialog";

interface Missionary {
  id: number;
  name: string;
  type: "elders" | "sisters";
  phoneNumber: string;
  messengerAccount?: string;
  preferredNotification: "text" | "messenger";
  active: boolean;
  notificationScheduleType: string;
  hoursBefore?: number;
  dayOfTime?: string;
  weeklySummaryDay?: string;
  weeklySummaryTime?: string;
  dietaryRestrictions?: string;
  wardId: number;
}

interface MissionaryListProps {
  wardId: number;
}

export default function MissionaryList({ wardId }: MissionaryListProps) {
  const [editingMissionary, setEditingMissionary] = useState<Missionary | null>(null);
  
  const { data: missionaries, isLoading, error } = useQuery({
    queryKey: ["/api/admin/missionaries/ward", wardId],
    queryFn: async () => {
      const response = await fetch(`/api/admin/missionaries/ward/${wardId}`);
      if (!response.ok) {
        throw new Error("Failed to fetch missionaries");
      }
      const data = await response.json();
      console.log("Missionaries data:", data); // Debug log
      return data;
    },
    enabled: !!wardId,
  });

  if (isLoading) {
    return (
      <div className="space-y-4">
        {[1, 2, 3].map((i) => (
          <Card key={i} className="overflow-hidden">
            <CardContent className="p-4">
              <div className="flex justify-between items-center">
                <div className="space-y-2">
                  <Skeleton className="h-4 w-[250px]" />
                  <Skeleton className="h-4 w-[200px]" />
                </div>
                <Skeleton className="h-6 w-14" />
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-4 bg-red-50 border border-red-200 rounded-md text-red-700">
        Error loading missionaries. Please try again later.
      </div>
    );
  }

  if (!missionaries || missionaries.length === 0) {
    return (
      <div className="p-6 bg-gray-50 border border-gray-200 rounded-md text-gray-500 text-center">
        No missionaries found for this ward. Add your first missionary below.
      </div>
    );
  }

  // Safe rendering function for the missionary list
  const renderMissionaryList = () => {
    try {
      return (
        <div className="space-y-4">
          {Array.isArray(missionaries) && missionaries.map((missionary: Missionary) => {
            // Skip any invalid missionary data
            if (!missionary || typeof missionary !== 'object') {
              console.warn('Invalid missionary data:', missionary);
              return null;
            }
            
            return (
              <Card key={missionary.id || 'unknown'} className="overflow-hidden">
                <CardContent className="p-4">
                  <div className="flex justify-between items-center">
                    <div>
                      <div className="flex items-center gap-2 mb-1">
                        <h3 className="font-medium text-lg">{missionary.name || 'Unnamed Missionary'}</h3>
                        <Badge variant={missionary.type === "elders" ? "default" : "secondary"}>
                          {(missionary.type && typeof missionary.type === 'string')
                            ? missionary.type.charAt(0).toUpperCase() + missionary.type.slice(1)
                            : 'Unknown'}
                        </Badge>
                        {missionary.active !== false ? (
                          <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200">
                            <Check className="h-3 w-3 mr-1" /> Active
                          </Badge>
                        ) : (
                          <Badge variant="outline" className="bg-red-50 text-red-700 border-red-200">
                            <X className="h-3 w-3 mr-1" /> Inactive
                          </Badge>
                        )}
                      </div>
                      <div className="text-sm text-gray-500">
                        {missionary.preferredNotification === "text" ? "SMS: " : "Messenger: "}
                        {missionary.preferredNotification === "text" 
                          ? missionary.phoneNumber || 'No phone'
                          : missionary.messengerAccount || "Not provided"}
                      </div>
                      <div className="text-xs text-gray-400 mt-1">
                        Notifications: {
                          (missionary.notificationScheduleType && typeof missionary.notificationScheduleType === 'string')
                            ? missionary.notificationScheduleType.replace(/_/g, " ")
                            : "default"
                        }
                        {missionary.notificationScheduleType === "before_meal" && missionary.hoursBefore && 
                          ` (${missionary.hoursBefore} hours before)`}
                      </div>
                      
                      {missionary.dietaryRestrictions && (
                        <div className="text-xs text-amber-600 font-medium mt-1">
                          Dietary: {missionary.dietaryRestrictions}
                        </div>
                      )}
                    </div>
                    <div className="flex gap-2">
                      <Button 
                        variant="outline" 
                        size="sm" 
                        className="h-8 px-2"
                        onClick={() => setEditingMissionary(missionary)}
                      >
                        <Pencil className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      );
    } catch (error) {
      console.error('Error rendering missionary list:', error);
      return (
        <div className="p-4 bg-red-50 border border-red-200 rounded-md text-red-700">
          An error occurred while displaying missionaries. Please try refreshing the page.
        </div>
      );
    }
  };
  
  return (
    <>
      {renderMissionaryList()}
      
      {editingMissionary && (
        <EditMissionaryDialog
          isOpen={!!editingMissionary}
          onClose={() => setEditingMissionary(null)}
          missionary={editingMissionary}
        />
      )}
    </>
  );
}