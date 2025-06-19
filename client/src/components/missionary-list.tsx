import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Pencil, Trash2, Check, X, RefreshCw, MessageCircle } from "lucide-react";
import { Switch } from "@/components/ui/switch";
import { Skeleton } from "@/components/ui/skeleton";
import { Separator } from "@/components/ui/separator";
import { EditMissionaryDialog } from "./edit-missionary-dialog";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";

interface Missionary {
  id: number;
  name: string;
  type: "elders" | "sisters";
  phoneNumber: string;
  emailAddress?: string;
  whatsappNumber?: string;
  messengerAccount?: string;
  preferredNotification: "email" | "whatsapp" | "text" | "messenger";
  active: boolean;
  notificationScheduleType: string;
  hoursBefore?: number;
  dayOfTime?: string;
  weeklySummaryDay?: string;
  weeklySummaryTime?: string;
  dietaryRestrictions?: string;
  wardId: number;
  // Consent management fields
  consentStatus: "pending" | "granted" | "denied";
  consentDate?: Date | null;
  consentVerificationToken?: string | null;
  consentVerificationSentAt?: Date | null;
}

interface MissionaryListProps {
  wardId: number;
}

export default function MissionaryList({ wardId }: MissionaryListProps) {
  const [editingMissionary, setEditingMissionary] = useState<Missionary | null>(null);
  const { toast } = useToast();
  
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
  
  // Mutation to request consent from a missionary
  const requestConsentMutation = useMutation({
    mutationFn: async (missionaryId: number) => {
      const response = await apiRequest(
        "POST", 
        `/api/missionaries/${missionaryId}/request-consent`
      );
      return await response.json();
    },
    onSuccess: () => {
      toast({
        title: "Consent request sent",
        description: "The missionary will receive a text message asking for consent.",
        variant: "default",
      });
      // Refetch missionaries to update consent status
      queryClient.invalidateQueries({ queryKey: ["/api/admin/missionaries/ward", wardId] });
    },
    onError: (error) => {
      console.error("Error sending consent request:", error);
      toast({
        title: "Failed to send consent request",
        description: "There was an error sending the consent request. Please try again.",
        variant: "destructive",
      });
    }
  });
  
  // Helper function to format date
  const formatDate = (dateString?: Date | null) => {
    if (!dateString) return "N/A";
    const date = new Date(dateString);
    return date.toLocaleDateString() + " " + date.toLocaleTimeString();
  };

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
                      
                      {/* Consent status display */}
                      <div className="mt-2 pt-2 border-t border-gray-100">
                        <div className="flex items-center gap-2">
                          <span className="text-xs font-medium text-gray-600">Consent Status:</span>
                          {missionary.consentStatus === "granted" ? (
                            <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200">
                              <Check className="h-3 w-3 mr-1" /> Consent Granted
                            </Badge>
                          ) : missionary.consentStatus === "denied" ? (
                            <Badge variant="outline" className="bg-red-50 text-red-700 border-red-200">
                              <X className="h-3 w-3 mr-1" /> Consent Denied
                            </Badge>
                          ) : missionary.consentStatus === "pending" && missionary.consentVerificationSentAt ? (
                            <Badge variant="outline" className="bg-yellow-50 text-yellow-700 border-yellow-200">
                              <RefreshCw className="h-3 w-3 mr-1" /> Verification Sent
                            </Badge>
                          ) : (
                            <Badge variant="outline" className="bg-gray-50 text-gray-700 border-gray-200">
                              No Consent Requested
                            </Badge>
                          )}
                        </div>
                        
                        {missionary.consentDate && (
                          <div className="text-xs text-gray-500 mt-1">
                            Last updated: {formatDate(missionary.consentDate)}
                          </div>
                        )}
                        
                        {missionary.consentVerificationSentAt && missionary.consentStatus === "pending" && (
                          <div className="text-xs text-gray-500 mt-1">
                            Verification sent: {formatDate(missionary.consentVerificationSentAt)}
                          </div>
                        )}
                      </div>
                    </div>
                    <div className="flex flex-col gap-2">
                      <Button 
                        variant="outline" 
                        size="sm" 
                        className="h-8 px-2"
                        onClick={() => setEditingMissionary(missionary)}
                      >
                        <Pencil className="h-4 w-4" />
                      </Button>
                      
                      {/* Consent request button */}
                      <Button
                        variant="outline"
                        size="sm"
                        className={`h-8 px-2 ${
                          missionary.consentStatus === "granted" 
                            ? "border-green-200 text-green-700 hover:bg-green-50" 
                            : "border-blue-200 text-blue-700 hover:bg-blue-50"
                        }`}
                        onClick={() => requestConsentMutation.mutate(missionary.id)}
                        disabled={requestConsentMutation.isPending || missionary.consentStatus === "granted"}
                        title={
                          missionary.consentStatus === "granted" 
                            ? "Consent already granted" 
                            : "Send consent request"
                        }
                      >
                        {requestConsentMutation.isPending ? (
                          <RefreshCw className="h-4 w-4 animate-spin" />
                        ) : (
                          <MessageCircle className="h-4 w-4" />
                        )}
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