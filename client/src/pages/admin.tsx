// client/src/pages/admin.tsx
import React, { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Link, useNavigate } from "react-router-dom";
import {
  Building, Users, Calendar, Settings, LogOut, LucideIcon
} from "lucide-react";
import { CongregationManagement } from "@/components/congregation-management";
import { MissionaryList } from "@/components/missionary-list"; // Corrected: Changed to named import
import { MessageStatsComponent } from "@/components/message-stats";
import { TestMessageForm } from "@/components/test-message-form";
import { StakeManagement } from "@/components/stake-management";
import { MissionManagement } from "@/components/mission-management";
import { RegionManagement } from "@/components/region-management";
import {
  Tabs, TabsContent, TabsList, TabsTrigger
} from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger
} from "@/components/ui/dropdown-menu";
import { Separator } from "@/components/ui/separator";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Loader2 } from "lucide-react";
import { useAuth } from "@/hooks/use-auth";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";


interface TabItem {
  value: string;
  label: string;
  icon: LucideIcon;
  component: React.ReactNode;
  roles: string[]; // Roles that can see this tab
}

export function AdminPage() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { user, logout } = useAuth();
  const [activeTab, setActiveTab] = useState("dashboard"); // Default to dashboard

  const handleLogout = async () => {
    await logout();
    navigate("/auth");
  };

  // Define tabs based on user roles
  const adminTabs: TabItem[] = [
    {
      value: "dashboard",
      label: "Dashboard",
      icon: Calendar, // Using Calendar as a generic icon for dashboard
      component: (
        <Alert>
          <AlertTitle>Welcome!</AlertTitle>
          <AlertDescription>
            This is your admin dashboard. Use the tabs above to manage different aspects of the application.
          </AlertDescription>
        </Alert>
      ),
      roles: ['ultra', 'region', 'mission', 'stake', 'ward'],
    },
    {
      value: "missionaries",
      label: "Missionaries",
      icon: Users,
      component: <MissionaryList />,
      roles: ['ultra', 'region', 'mission', 'stake', 'ward'],
    },
    {
      value: "congregations",
      label: "Congregations",
      icon: Building,
      component: <CongregationManagement />,
      roles: ['ultra', 'region', 'mission', 'stake'], // Only SuperAdmins and UltraAdmin
    },
    {
      value: "stakes",
      label: "Stakes",
      icon: Building,
      component: <StakeManagement />,
      roles: ['ultra', 'region', 'mission'], // Only Ultra and Region/Mission Admins
    },
    {
      value: "missions",
      label: "Missions",
      icon: Globe,
      component: <MissionManagement />,
      roles: ['ultra', 'region'], // Only Ultra and Region Admins
    },
    {
      value: "regions",
      label: "Regions",
      icon: Globe,
      component: <RegionManagement />,
      roles: ['ultra'], // Only Ultra Admins
    },
    {
      value: "messages",
      label: "Messages",
      icon: Settings,
      component: <MessageStatsComponent />,
      roles: ['ultra', 'region', 'mission', 'stake', 'ward'],
    },
    {
      value: "test-message",
      label: "Test Message",
      icon: Settings, // Using Settings as a generic icon
      component: <TestMessageForm />,
      roles: ['ultra', 'region', 'mission', 'stake', 'ward'],
    },
    // Future: Meal statistics, user management
  ].filter(tab => user && tab.roles.includes(user.role));

  if (!user) {
    return (
      <div className="flex justify-center items-center h-screen">
        <Loader2 className="h-8 w-8 animate-spin" />
        <p className="ml-2">Loading user data...</p>
      </div>
    );
  }

  // Determine the default active tab based on roles
  React.useEffect(() => {
    if (user && adminTabs.length > 0 && !adminTabs.some(tab => tab.value === activeTab)) {
      setActiveTab(adminTabs[0].value);
    }
  }, [user, adminTabs, activeTab]);


  return (
    <div className="flex h-screen bg-gray-100">
      {/* Sidebar */}
      <aside className="w-64 bg-white shadow-md p-6 flex flex-col justify-between">
        <div>
          <h1 className="text-2xl font-bold mb-6 text-center">Admin Panel</h1>
          <nav>
            <Tabs value={activeTab} onValueChange={setActiveTab} orientation="vertical" className="space-y-4">
              <TabsList className="flex flex-col h-auto p-0">
                {adminTabs.map((tab) => (
                  <TabsTrigger
                    key={tab.value}
                    value={tab.value}
                    className="w-full justify-start py-2 px-4 data-[state=active]:bg-blue-500 data-[state=active]:text-white"
                  >
                    <tab.icon className="mr-2 h-4 w-4" />
                    {tab.label}
                  </TabsTrigger>
                ))}
              </TabsList>
            </Tabs>
          </nav>
        </div>
        <div className="mt-auto">
          <Separator className="my-4" />
          <div className="flex items-center space-x-3">
            <Avatar>
              <AvatarImage src="https://github.com/shadcn.png" alt="@shadcn" />
              <AvatarFallback>{user.username.substring(0, 2).toUpperCase()}</AvatarFallback>
            </Avatar>
            <div>
              <p className="text-sm font-medium">{user.username}</p>
              <p className="text-xs text-gray-500 capitalize">{user.role} Admin</p>
            </div>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="icon" className="ml-auto">
                  <Settings className="h-4 w-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuLabel>My Account</DropdownMenuLabel>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={handleLogout}>
                  <LogOut className="mr-2 h-4 w-4" />
                  Log Out
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>
      </aside>

      {/* Main content */}
      <main className="flex-1 p-8 overflow-auto">
        <ScrollArea className="h-full pr-4">
          {adminTabs.map((tab) => (
            <TabsContent key={tab.value} value={tab.value}>
              {tab.component}
            </TabsContent>
          ))}
        </ScrollArea>
      </main>
    </div>
  );
}