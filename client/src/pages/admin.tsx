import { useState } from "react";
import { useAuth } from "@/hooks/use-auth";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Building, Users, Calendar, Settings, LogOut } from "lucide-react";
import { Separator } from "@/components/ui/separator";
import WardSelector from "@/components/ward-selector";
import MissionaryList from "@/components/missionary-list";
import WardManagement from "@/components/ward-management";
import MessageStatsComponent from "@/components/message-stats";
import TestMessageForm from "@/components/test-message-form";

export default function Admin() {
  const { user, logoutMutation } = useAuth();
  const [activeTab, setActiveTab] = useState("missionaries");
  const [selectedWardId, setSelectedWardId] = useState<number | null>(null);

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

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      {/* Header */}
      <header className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-3 sm:px-6 lg:px-8">
          <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center py-4 space-y-3 sm:space-y-0">
            <div className="flex flex-col">
              <h1 className="text-xl sm:text-2xl font-bold text-gray-900">Admin Dashboard</h1>
              <div className="flex flex-wrap items-center gap-2 mt-1">
                <p className="text-sm text-gray-600">Welcome, {user?.username}</p>
                {user?.isSuperAdmin && (
                  <Badge variant="secondary" className="text-xs">Super Admin</Badge>
                )}
                {user?.isAdmin && !user?.isSuperAdmin && (
                  <Badge variant="outline" className="text-xs">Admin</Badge>
                )}
              </div>
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={() => logoutMutation.mutate()}
              className="flex items-center gap-2 w-full sm:w-auto"
            >
              <LogOut className="h-4 w-4" />
              Logout
            </Button>
          </div>
        </div>
      </header>

      {/* Navigation Tabs */}
      <nav className="bg-white border-b">
        <div className="max-w-7xl mx-auto px-3 sm:px-6 lg:px-8">
          <div className="flex flex-wrap gap-1 sm:gap-2 py-2 overflow-x-auto">
            {tabs.map((tab) => {
              const Icon = tab.icon;
              return (
                <Button
                  key={tab.id}
                  variant={activeTab === tab.id ? "default" : "ghost"}
                  size="sm"
                  onClick={() => setActiveTab(tab.id)}
                  className="flex items-center gap-2 whitespace-nowrap flex-shrink-0 min-w-0"
                >
                  <Icon className="h-4 w-4" />
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
        <div className="max-w-7xl mx-auto px-3 sm:px-6 lg:px-8 pb-10 overflow-x-hidden">
          
          {/* Missionary Management Tab */}
          {activeTab === "missionaries" && (
            <div>
              {/* Ward Selector */}
              <Card className="mb-6">
                <CardContent className="pt-6">
                  <div className="flex items-center mb-4">
                    <Building className="mr-2 h-5 w-5 text-muted-foreground" />
                    <h3 className="text-lg font-medium">Current Ward</h3>
                  </div>
                  <p className="text-sm text-muted-foreground mb-4">
                    Select the ward you want to manage. Missionaries are specific to each ward.
                  </p>
                  <WardSelector onWardChange={(ward) => setSelectedWardId(ward?.id || null)} />
                </CardContent>
              </Card>

              {selectedWardId && (
                <>
                  {/* Missionary List */}
                  <Card className="mb-6">
                    <CardHeader>
                      <CardTitle>Missionary List</CardTitle>
                      <CardDescription>View and manage current missionaries</CardDescription>
                    </CardHeader>
                    <CardContent>
                      <MissionaryList wardId={selectedWardId} />
                    </CardContent>
                  </Card>

                  {/* Missionary Registration Notice */}
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
              )}
            </div>
          )}
          
          {/* Meals Tab */}
          {activeTab === "meals" && (
            <div>
              <Card>
                <CardHeader>
                  <CardTitle>Meal Management</CardTitle>
                  <CardDescription>View and manage upcoming meals</CardDescription>
                </CardHeader>
                <CardContent>
                  {/* Ward Selector */}
                  <div className="mb-6">
                    <div className="flex items-center mb-4">
                      <Building className="mr-2 h-5 w-5 text-muted-foreground" />
                      <h3 className="text-lg font-medium">Current Ward</h3>
                    </div>
                    <p className="text-sm text-muted-foreground mb-4">
                      Select the ward you want to view meals for.
                    </p>
                    <WardSelector onWardChange={(ward) => setSelectedWardId(ward?.id || null)} />
                  </div>

                  {selectedWardId && (
                    <div>
                      <p className="text-sm text-gray-500">
                        Meal management features coming soon. Ward members can schedule meals through the ward page.
                      </p>
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>
          )}
          
          {/* Ward Management Tab */}
          {activeTab === "wards" && (
            <div>
              <WardManagement />
            </div>
          )}
          
          {/* Settings Tab */}
          {activeTab === "settings" && (
            <div>
              <div className="space-y-6">
                {/* Message Stats */}
                <Card>
                  <CardHeader>
                    <CardTitle>Message Statistics</CardTitle>
                    <CardDescription>
                      View message statistics and estimated costs for your ward
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="mb-6">
                      <div className="flex items-center mb-4">
                        <Building className="mr-2 h-5 w-5 text-muted-foreground" />
                        <h3 className="text-lg font-medium">Select Ward for Stats</h3>
                      </div>
                      <WardSelector onWardChange={(ward) => setSelectedWardId(ward?.id || null)} />
                    </div>
                    
                    {selectedWardId && (
                      <MessageStatsComponent wardId={selectedWardId} />
                    )}
                  </CardContent>
                </Card>
                
                {/* Test Message Form */}
                <Card>
                  <CardHeader>
                    <CardTitle>Test Messages</CardTitle>
                    <CardDescription>
                      Send test messages to verify your notification settings
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    {selectedWardId && (
                      <TestMessageForm wardId={selectedWardId} />
                    )}
                  </CardContent>
                </Card>
              </div>
            </div>
          )}
          
        </div>
      </main>
      
      {/* Footer */}
      <footer className="bg-white border-t">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <p className="text-center text-sm text-gray-500">
            Ward Missionary Meal Scheduler - Admin Dashboard
          </p>
        </div>
      </footer>
    </div>
  );
}