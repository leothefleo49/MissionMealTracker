import { useState } from "react";
import { useAuth } from "@/hooks/use-auth";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Building, Users, Calendar, Settings, LogOut } from "lucide-react";
import { WardSelector } from "@/components/ward-selector";
import MissionaryList from "@/components/missionary-list";
import { WardManagement } from "@/components/ward-management";
import { MessageStatsComponent } from "@/components/message-stats";
import { TestMessageForm } from "@/components/test-message-form";
import { Skeleton } from "@/components/ui/skeleton";

export default function Admin() {
  // Use selectedWard from the Auth context as the single source of truth.
  const { user, logoutMutation, selectedWard, isLoading: isAuthLoading, userWards } = useAuth();
  const [activeTab, setActiveTab] = useState("missionaries");

  if (isAuthLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <Skeleton className="h-64 w-full max-w-4xl" />
      </div>
    );
  }

  if (!user?.isAdmin && !user?.isSuperAdmin) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <Card className="w-full max-w-md">
          <CardHeader>
            <CardTitle>Access Denied</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-gray-600">
              You don't have permission to access the admin dashboard.
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  const tabs = [
    { id: "missionaries", label: "Missionaries", icon: Users },
    { id: "meals", label: "Meals", icon: Calendar },
    { id: "wards", label: "Wards", icon: Building },
    { id: "settings", label: "Settings", icon: Settings },
  ];

  const renderContent = () => {
    // SuperAdmins can always see the Ward Management tab
    if (activeTab === "wards" && user?.isSuperAdmin) {
      return <WardManagement />;
    }

    // For other tabs, we need a selected ward.
    if (!selectedWard) {
      if (userWards && userWards.length > 0) {
        return (
          <Card className="mt-6">
            <CardContent className="pt-6 text-center">
              <Building className="mx-auto h-12 w-12 text-gray-300" />
              <h3 className="mt-2 text-sm font-medium text-gray-900">No Ward Selected</h3>
              <p className="mt-1 text-sm text-gray-500">Please select a ward from the dropdown above to continue.</p>
            </CardContent>
          </Card>
        )
      }
      return (
         <Card className="mt-6">
            <CardContent className="pt-6 text-center">
              <Building className="mx-auto h-12 w-12 text-gray-300" />
              <h3 className="mt-2 text-sm font-medium text-gray-900">No Wards Found</h3>
              <p className="mt-1 text-sm text-gray-500">Super Admins can create a new ward in the "Wards" tab.</p>
            </CardContent>
          </Card>
      )
    }

    switch (activeTab) {
      case "missionaries":
        return (
          <>
            <Card className="mb-6">
              <CardHeader>
                <CardTitle>Missionary List</CardTitle>
                <CardDescription>View and manage current missionaries in {selectedWard.name}</CardDescription>
              </CardHeader>
              <CardContent>
                <MissionaryList wardId={selectedWard.id} />
              </CardContent>
            </Card>
            <Card>
              <CardHeader>
                <CardTitle>Missionary Registration</CardTitle>
                <CardDescription>How missionaries join the system</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="text-sm text-gray-600 space-y-2">
                  <p>Missionaries must register themselves using the missionary portal with their @missionary.org email address.</p>
                  <p>Share the ward access code with missionaries so they can:</p>
                  <ul className="list-disc list-inside ml-4 space-y-1">
                    <li>Register with their missionary email</li>
                    <li>Verify their email address</li>
                    <li>Set up their meal preferences</li>
                    <li>Access their meal schedule</li>
                  </ul>
                </div>
              </CardContent>
            </Card>
          </>
        );
      case "meals":
        return (
          <Card>
            <CardHeader>
              <CardTitle>Meal Management</CardTitle>
              <CardDescription>View and manage upcoming meals for {selectedWard.name}</CardDescription>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-gray-500">
                Meal management features coming soon. Ward members can schedule meals through the ward page.
              </p>
            </CardContent>
          </Card>
        );
       case "settings":
        return (
          <div className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Message Statistics</CardTitle>
                <CardDescription>
                  View message statistics for {selectedWard.name}
                </CardDescription>
              </CardHeader>
              <CardContent>
                <MessageStatsComponent wardId={selectedWard.id} />
              </CardContent>
            </Card>
            <Card>
              <CardHeader>
                <CardTitle>Test Messages</CardTitle>
                <CardDescription>
                  Send test messages to verify your notification settings for {selectedWard.name}
                </CardDescription>
              </CardHeader>
              <CardContent>
                <TestMessageForm wardId={selectedWard.id} />
              </CardContent>
            </Card>
          </div>
        );
      default:
        return null;
    }
  };


  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      {/* Header */}
      <header className="bg-white shadow-sm border-b sticky top-0 z-20">
        <div className="max-w-7xl mx-auto px-3 sm:px-6 lg:px-8">
          <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center py-4 space-y-3 sm:space-y-0">
            <div className="flex flex-col">
              <h1 className="text-xl sm:text-2xl font-bold text-gray-900">Admin Dashboard</h1>
              <div className="flex flex-wrap items-center gap-2 mt-1">
                <p className="text-sm text-gray-600">Welcome, {user?.username}</p>
                 {user?.isSuperAdmin && <Badge variant="secondary" className="text-xs bg-purple-100 text-purple-800">Super Admin</Badge>}
                 {user?.isMissionAdmin && <Badge variant="secondary" className="text-xs bg-blue-100 text-blue-800">Mission Admin</Badge>}
                 {user?.isStakeAdmin && <Badge variant="secondary" className="text-xs bg-green-100 text-green-800">Stake Admin</Badge>}
                 {user?.isAdmin && !user.isSuperAdmin && !user.isMissionAdmin && !user.isStakeAdmin && <Badge variant="outline" className="text-xs">Admin</Badge>}
              </div>
            </div>
            <div className="flex items-center gap-2">
              <WardSelector className="w-full sm:w-56" />
              <Button
                variant="outline"
                size="sm"
                onClick={() => logoutMutation.mutate()}
                className="flex items-center gap-2 w-auto"
              >
                <LogOut className="h-4 w-4" />
                Logout
              </Button>
            </div>
          </div>
        </div>
      </header>

      {/* Navigation Tabs */}
      <nav className="bg-white border-b sticky top-[98px] z-20">
        <div className="max-w-7xl mx-auto px-3 sm:px-6 lg:px-8">
          <div className="flex flex-wrap gap-1 sm:gap-2 py-2 overflow-x-auto">
            {tabs.map((tab) => {
              const isDisabled = tab.id !== 'wards' && !selectedWard;
              return (
                <Button
                  key={tab.id}
                  variant={activeTab === tab.id ? "default" : "ghost"}
                  size="sm"
                  onClick={() => setActiveTab(tab.id)}
                  disabled={isDisabled}
                  className="flex items-center gap-2 whitespace-nowrap flex-shrink-0 min-w-0"
                >
                  <tab.icon className="h-4 w-4" />
                  <span className="hidden sm:inline">{tab.label}</span>
                  <span className="sm:hidden">{tab.label.slice(0, 4)}</span>
                </Button>
              );
            })}
          </div>
        </div>
      </nav>

      {/* Main Content */}
      <main className="flex-grow">
        <div className="max-w-7xl mx-auto px-3 sm:px-6 lg:px-8 py-6 overflow-x-hidden">
          {renderContent()}
        </div>
      </main>

      {/* Footer */}
      <footer className="bg-white border-t mt-auto">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <p className="text-center text-sm text-gray-500">
            Ward Missionary Meal Scheduler - Admin Dashboard
          </p>
        </div>
      </footer>
    </div>
  );
}