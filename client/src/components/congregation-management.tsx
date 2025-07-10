// client/src/components/congregation-management.tsx
import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { RegionManagement } from "./region-management";
import { MissionManagement } from "./mission-management";
import { StakeManagement } from "./stake-management";
import { WardManagement } from "./ward-management";

interface CongregationManagementProps {
  onSelectCongregation: (congregation: { id: number; name: string } | null) => void;
}

export function CongregationManagement({ onSelectCongregation }: CongregationManagementProps) {
  const [showUnassignedOnly, setShowUnassignedOnly] = useState(false); // New state for unassigned filter

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold tracking-tight">Organization Hierarchy</h2>
        <div className="flex items-center space-x-2">
          <Switch
            id="unassigned-filter"
            checked={showUnassignedOnly}
            onCheckedChange={setShowUnassignedOnly}
          />
          <Label htmlFor="unassigned-filter">Show Unassigned Only</Label>
        </div>
      </div>
      <Tabs defaultValue="regions" className="space-y-4">
        <TabsList>
          <TabsTrigger value="regions">Regions</TabsTrigger>
          <TabsTrigger value="missions">Missions</TabsTrigger>
          <TabsTrigger value="stakes">Stakes</TabsTrigger>
          <TabsTrigger value="wards">Wards</TabsTrigger>
        </TabsList>
        <TabsContent value="regions" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Regions</CardTitle>
              <CardDescription>
                Manage the top-level regions in your organization.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <RegionManagement />
            </CardContent>
          </Card>
        </TabsContent>
        <TabsContent value="missions" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Missions</CardTitle>
              <CardDescription>
                Manage missions and their assignment to regions.
              </CardDescription>
            </CardHeader>
            <CardContent>
              {/* Pass the new filter prop to MissionManagement */}
              <MissionManagement showUnassignedOnly={showUnassignedOnly} />
            </CardContent>
          </Card>
        </TabsContent>
        <TabsContent value="stakes" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Stakes</CardTitle>
              <CardDescription>
                Manage stakes and their assignment to missions.
              </CardDescription>
            </CardHeader>
            <CardContent>
              {/* StakeManagement will also need showUnassignedOnly prop */}
              <StakeManagement />
            </CardContent>
          </Card>
        </TabsContent>
        <TabsContent value="wards" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Wards</CardTitle>
              <CardDescription>
                Manage wards/congregations and their assignment to stakes.
              </CardDescription>
            </CardHeader>
            <CardContent>
              {/* WardManagement will also need showUnassignedOnly prop */}
              <WardManagement />
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}