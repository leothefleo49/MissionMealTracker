import { useState, useEffect } from "react";
import { useAuth } from "@/hooks/use-auth";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Building, Users, Calendar, Settings, LogOut } from "lucide-react";
import { CongregationManagement } from "@/components/congregation-management";
import MissionaryList from "@/components/missionary-list";
import { MessageStatsComponent } from "@/components/message-stats";
import { TestMessageForm } from "@/components/test-message-form";
import { Skeleton } from "@/components/ui/skeleton";
import { MealManagement } from "@/components/meal-management";

export default function Admin() {
  const { user, logoutMutation, isLoading: isAuthLoading } = useAuth();
  const [selectedCongregation, setSelectedCongregation] = useState<{ id: number; name: string } | null>(null);

  const [activeTab, setActiveTab] = useState(user?.role === 'ward' ? "missionaries" : "hierarchy");

  useEffect(() => {
    // If the user is a ward admin, we can pre-select their congregation
    if (user?.role === 'ward' && user.congregationId) {
      // This assumes the user object from useAuth will eventually have the congregationId
      // You might need to adjust this based on your actual data structure
      // For now, let's assume a function getUserCongregation exists or is added to useAuth
      // setSelectedCongregation({ id: user.congregationId, name: 'My Ward' });
    }
  }, [user]);

  if (isAuthLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <Skeleton className="h-64 w-full max-w-4xl" />
      </div>
    );
  }

  if (!user || !['ultra', 'region', 'mission', 'stake', 'ward'].includes(user.role)) {
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
    { id: "hierarchy", label: "Hierarchy", icon: Building, roles: ['ultra', 'region', 'mission', 'stake'] },
    { id: "missionaries", label: "Missionaries", icon: Users },
    { id: "meals", label: "Meals", icon: Calendar },
    { id: "settings", label: "Settings", icon: Settings },
  ];

  const renderContent = () => {
    if (activeTab === "hierarchy") {
      return <CongregationManagement onSelectCongregation={setSelectedCongregation} />;
    }

    if (selectedCongregation) {
      switch (activeTab) {
        case "missionaries":
          return <MissionaryList congregationId={selectedCongregation.id} />;
        case "meals":
          return <MealManagement congregationId={selectedCongregation.id} />;
        case "settings":
          return (
            <div className="space-y-6">
              <Card>
                <CardHeader>
                  <CardTitle>Message Statistics</CardTitle>
                  <CardDescription>
                    View message statistics for {selectedCongregation.name}
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <MessageStatsComponent congregationId={selectedCongregation.id} />
                </CardContent>
              </Card>
              <Card>
                <CardHeader>
                  <CardTitle>Test Messages</CardTitle>
                  <CardDescription>
                    Send test messages to verify your notification settings for {selectedCongregation.name}
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <TestMessageForm congregationId={selectedCongregation.id} />
                </CardContent>
              </Card>
            </div>
          );
        default:
          return null;
      }
    } else if (user?.role !== 'ward') {
        return (
            <Card className="mt-6">
                <CardContent className="pt-6 text-center">
                    <Building className="mx-auto h-12 w-12 text-gray-300" />
                    <h3 className="mt-2 text-sm font-medium text-gray-900">No Congregation Selected</h3>
                    <p className="mt-1 text-sm text-gray-500">Please select a congregation from the hierarchy to view its details.</p>
                </CardContent>
            </Card>
        )
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      <header className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-3 sm:px-6 lg:px-8">
          <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center py-4 space-y-3 sm:space-y-0">
            <div className="flex flex-col">
              <h1 className="text-xl sm:text-2xl font-bold text-gray-900">Admin Dashboard</h1>
              <div className="flex flex-wrap items-center gap-2 mt-1">
                <p className="text-sm text-gray-600">Welcome, {user?.username}</p>
                 {user?.role === 'ultra' && <Badge variant="secondary" className="text-xs bg-purple-100 text-purple-800">Ultra Admin</Badge>}
                 {user?.role === 'region' && <Badge variant="secondary" className="text-xs bg-red-100 text-red-800">Region Admin</Badge>}
                 {user?.role === 'mission' && <Badge variant="secondary" className="text-xs bg-blue-100 text-blue-800">Mission Admin</Badge>}
                 {user?.role === 'stake' && <Badge variant="secondary" className="text-xs bg-green-100 text-green-800">Stake Admin</Badge>}
                 {user?.role === 'ward' && <Badge variant="outline" className="text-xs">Ward Admin</Badge>}
              </div>
            </div>
            <Button variant="outline" size="sm" onClick={() => logoutMutation.mutate()} className="flex items-center gap-2 w-auto">
              <LogOut className="h-4 w-4" />
              Logout
            </Button>
          </div>
        </div>
      </header>
      <nav className="bg-white border-b">
        <div className="max-w-7xl mx-auto px-3 sm:px-6 lg:px-8">
          <div className="flex flex-wrap gap-1 sm:gap-2 py-2 overflow-x-auto">
            {tabs.map((tab) => {
              if (tab.roles && !tab.roles.includes(user.role)) return null;
              if (user.role === 'ward' && tab.id === 'hierarchy') return null;

              const isDisabled = (tab.id !== 'hierarchy') && !selectedCongregation && user.role !== 'ward';
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
      <main className="flex-grow">
        <div className="max-w-7xl mx-auto px-3 sm:px-6 lg:px-8 py-6 overflow-x-hidden">
          {renderContent()}
        </div>
      </main>
    </div>
  );
}