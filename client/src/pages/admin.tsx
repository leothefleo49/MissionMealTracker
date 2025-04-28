import { useState } from "react";
import { useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useToast } from "@/hooks/use-toast";
import { ArrowLeft, Calendar, User, Settings, LogOut, Building } from "lucide-react";
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { useAuth } from "@/hooks/use-auth";

// Import ward management components
import { WardManagement } from "@/components/ward-management";
import { WardUsers } from "@/components/ward-users";
import { WardSelector } from "@/components/ward-selector";

// Validation schema for missionary form
const missionaryFormSchema = z.object({
  name: z.string().min(2, { message: "Name must be at least 2 characters" }),
  type: z.enum(["elders", "sisters"]),
  phoneNumber: z.string().min(10, { message: "Please enter a valid phone number" }),
  messengerAccount: z.string().optional(),
  preferredNotification: z.enum(["text", "messenger"]),
  active: z.boolean().default(true),
  wardId: z.number().optional(), // Ward ID will be set from the selected ward
  
  // Notification settings
  notificationScheduleType: z.enum(["before_meal", "day_of", "weekly_summary", "multiple"]).default("before_meal"),
  hoursBefore: z.number().min(1).max(48).default(3),
  dayOfTime: z.string().default("09:00"),
  weeklySummaryDay: z.enum(["sunday", "monday", "tuesday", "wednesday", "thursday", "friday", "saturday"]).default("sunday"),
  weeklySummaryTime: z.string().default("18:00"),
  useMultipleNotifications: z.boolean().default(false),
});

export default function Admin() {
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [activeTab, setActiveTab] = useState("missionaries");
  const { user, logoutMutation, selectedWard } = useAuth();
  
  // Handle logout
  const handleLogout = () => {
    logoutMutation.mutate(undefined, {
      onSuccess: () => {
        setLocation('/auth');
      }
    });
  };
  
  // Set up form for adding/editing missionaries
  const form = useForm<z.infer<typeof missionaryFormSchema>>({
    resolver: zodResolver(missionaryFormSchema),
    defaultValues: {
      name: "",
      type: "elders",
      phoneNumber: "",
      messengerAccount: "",
      preferredNotification: "text",
      active: true,
      
      // Default notification settings
      notificationScheduleType: "before_meal",
      hoursBefore: 3,
      dayOfTime: "09:00",
      weeklySummaryDay: "sunday",
      weeklySummaryTime: "18:00",
      useMultipleNotifications: false,
    },
  });
  
  // Fetch missionaries for the selected ward
  const { data: missionaries, isLoading } = useQuery<any[]>({
    queryKey: ['/api/wards', selectedWard?.id, 'missionaries'],
    queryFn: async () => {
      if (!selectedWard) return [];
      
      // Fetch both elders and sisters for the selected ward
      const eldersRes = await fetch(`/api/wards/${selectedWard.id}/missionaries/elders`);
      const sistersRes = await fetch(`/api/wards/${selectedWard.id}/missionaries/sisters`);
      
      if (!eldersRes.ok || !sistersRes.ok) {
        throw new Error("Failed to fetch missionaries");
      }
      
      const elders = await eldersRes.json();
      const sisters = await sistersRes.json();
      
      return [...elders, ...sisters];
    },
    enabled: !!selectedWard,
    initialData: [],
  });
  
  // Mutation for adding a new missionary
  const addMissionaryMutation = useMutation({
    mutationFn: async (data: z.infer<typeof missionaryFormSchema>) => {
      return apiRequest("POST", "/api/admin/missionaries", data);
    },
    onSuccess: () => {
      toast({
        title: "Missionary Added",
        description: "The new missionary has been added successfully.",
      });
      form.reset();
      
      // Invalidate the ward-specific missionaries query
      if (selectedWard) {
        queryClient.invalidateQueries({ 
          queryKey: ['/api/wards', selectedWard.id, 'missionaries'] 
        });
      }
    },
    onError: (error: any) => {
      const errorMessage = error?.message || "Failed to add missionary. Please try again.";
      toast({
        title: "Error",
        description: errorMessage,
        variant: "destructive",
      });
      
      // If unauthorized or forbidden, redirect to login
      if (error?.status === 401 || error?.status === 403) {
        setLocation('/auth');
      }
    },
  });
  
  // Handle missionary form submission
  function onSubmit(data: z.infer<typeof missionaryFormSchema>) {
    if (!selectedWard) {
      toast({
        title: "No Ward Selected",
        description: "Please select a ward before adding missionaries.",
        variant: "destructive",
      });
      return;
    }
    
    // Add the wardId to the missionary data
    const missionaryData = {
      ...data,
      wardId: selectedWard.id
    };
    
    addMissionaryMutation.mutate(missionaryData);
  }
  
  return (
    <div className="min-h-screen flex flex-col bg-gray-50">
      {/* Header */}
      <header className="bg-white shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center">
            <div className="flex items-center mb-3 sm:mb-0">
              <Settings className="h-8 w-8 text-primary flex-shrink-0" />
              <div className="ml-2">
                <h1 className="text-xl font-bold text-gray-900 leading-tight">Admin Panel</h1>
                {user && (
                  <div className="text-xs sm:text-sm text-gray-500">
                    Logged in as: <span className="font-medium">{user.username}</span>
                  </div>
                )}
              </div>
            </div>
            <div className="flex space-x-2">
              <Button 
                variant="ghost" 
                size="sm"
                className="flex items-center"
                onClick={() => setLocation('/')}
              >
                <ArrowLeft className="mr-1 h-4 w-4" />
                <span className="sm:inline">Home</span>
              </Button>
              <Button 
                variant="outline" 
                size="sm"
                className="flex items-center"
                onClick={handleLogout}
              >
                <LogOut className="mr-1 h-4 w-4" />
                <span className="sm:inline">Logout</span>
              </Button>
            </div>
          </div>
        </div>
      </header>
      
      {/* Main Content */}
      <main className="flex-grow">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <Card className="mb-8">
            <CardHeader>
              <CardTitle>Admin Dashboard</CardTitle>
              <CardDescription>
                Manage missionary information and view meal scheduling statistics.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Tabs defaultValue={activeTab} value={activeTab} onValueChange={setActiveTab}>
                <TabsList className="mb-6 grid grid-cols-1 sm:grid-cols-3 gap-2 w-full">
                  <TabsTrigger value="missionaries" className="flex items-center justify-center w-full">
                    <User className="mr-2 h-4 w-4" />
                    <span className="text-sm">Missionaries</span>
                  </TabsTrigger>
                  <TabsTrigger value="meals" className="flex items-center justify-center w-full">
                    <Calendar className="mr-2 h-4 w-4" />
                    <span className="text-sm">Meals</span>
                  </TabsTrigger>
                  <TabsTrigger value="wards" className="flex items-center justify-center w-full">
                    <Settings className="mr-2 h-4 w-4" />
                    <span className="text-sm">Wards</span>
                  </TabsTrigger>
                </TabsList>
                
                <TabsContent value="missionaries">
                  {/* Ward Selector */}
                  <div className="mb-6">
                    <Card>
                      <CardContent className="pt-6">
                        <div className="flex items-center mb-4">
                          <Building className="mr-2 h-5 w-5 text-muted-foreground" />
                          <h3 className="text-lg font-medium">Current Ward</h3>
                        </div>
                        <p className="text-sm text-muted-foreground mb-4">
                          Select the ward you want to manage. Missionaries are specific to each ward.
                        </p>
                        <WardSelector />
                      </CardContent>
                    </Card>
                  </div>

                  <div className="grid grid-cols-1 gap-6">
                    <div>
                      <h3 className="text-lg font-medium mb-4">Add Missionary</h3>
                      <Form {...form}>
                        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                          <FormField
                            control={form.control}
                            name="name"
                            render={({ field }) => (
                              <FormItem>
                                <FormLabel>Missionary Name(s)</FormLabel>
                                <FormControl>
                                  <Input placeholder="e.g. Elder Smith & Elder Johnson" {...field} />
                                </FormControl>
                                <FormDescription>
                                  Enter the names of the missionaries
                                </FormDescription>
                                <FormMessage />
                              </FormItem>
                            )}
                          />
                          
                          <FormField
                            control={form.control}
                            name="type"
                            render={({ field }) => (
                              <FormItem>
                                <FormLabel>Missionary Type</FormLabel>
                                <Select onValueChange={field.onChange} defaultValue={field.value}>
                                  <FormControl>
                                    <SelectTrigger>
                                      <SelectValue placeholder="Select missionary type" />
                                    </SelectTrigger>
                                  </FormControl>
                                  <SelectContent>
                                    <SelectItem value="elders">Elders</SelectItem>
                                    <SelectItem value="sisters">Sisters</SelectItem>
                                  </SelectContent>
                                </Select>
                                <FormMessage />
                              </FormItem>
                            )}
                          />
                          
                          <FormField
                            control={form.control}
                            name="phoneNumber"
                            render={({ field }) => (
                              <FormItem>
                                <FormLabel>Phone Number</FormLabel>
                                <FormControl>
                                  <Input placeholder="e.g. 5551234567" {...field} />
                                </FormControl>
                                <FormDescription>
                                  Enter the phone number for SMS notifications
                                </FormDescription>
                                <FormMessage />
                              </FormItem>
                            )}
                          />
                          
                          <FormField
                            control={form.control}
                            name="messengerAccount"
                            render={({ field }) => (
                              <FormItem>
                                <FormLabel>Messenger Account (Optional)</FormLabel>
                                <FormControl>
                                  <Input placeholder="e.g. missionaries.elders" {...field} />
                                </FormControl>
                                <FormDescription>
                                  Enter their Facebook Messenger account name
                                </FormDescription>
                                <FormMessage />
                              </FormItem>
                            )}
                          />
                          
                          <FormField
                            control={form.control}
                            name="preferredNotification"
                            render={({ field }) => (
                              <FormItem>
                                <FormLabel>Preferred Notification Method</FormLabel>
                                <Select onValueChange={field.onChange} defaultValue={field.value}>
                                  <FormControl>
                                    <SelectTrigger>
                                      <SelectValue placeholder="Select notification method" />
                                    </SelectTrigger>
                                  </FormControl>
                                  <SelectContent>
                                    <SelectItem value="text">Text Message</SelectItem>
                                    <SelectItem value="messenger">Facebook Messenger</SelectItem>
                                  </SelectContent>
                                </Select>
                                <FormMessage />
                              </FormItem>
                            )}
                          />
                          
                          <FormField
                            control={form.control}
                            name="active"
                            render={({ field }) => (
                              <FormItem className="flex flex-row items-center justify-between rounded-lg border p-3 shadow-sm">
                                <div className="space-y-0.5">
                                  <FormLabel>Active</FormLabel>
                                  <FormDescription>
                                    Set as active to make available for scheduling
                                  </FormDescription>
                                </div>
                                <FormControl>
                                  <Switch
                                    checked={field.value}
                                    onCheckedChange={field.onChange}
                                  />
                                </FormControl>
                              </FormItem>
                            )}
                          />
                          
                          {/* Notification Settings Section */}
                          <div className="bg-gray-50 p-4 rounded-lg border">
                            <h4 className="text-base font-medium mb-2">Notification Settings</h4>
                            <p className="text-sm text-gray-500 mb-4">Configure when and how missionaries receive notifications about meals</p>
                            
                            <FormField
                              control={form.control}
                              name="notificationScheduleType"
                              render={({ field }) => (
                                <FormItem className="mb-4">
                                  <FormLabel>Notification Schedule Type</FormLabel>
                                  <Select onValueChange={field.onChange} defaultValue={field.value}>
                                    <FormControl>
                                      <SelectTrigger>
                                        <SelectValue placeholder="Select notification type" />
                                      </SelectTrigger>
                                    </FormControl>
                                    <SelectContent>
                                      <SelectItem value="before_meal">Before Each Meal</SelectItem>
                                      <SelectItem value="day_of">Morning of Meal Day</SelectItem>
                                      <SelectItem value="weekly_summary">Weekly Summary</SelectItem>
                                      <SelectItem value="multiple">Multiple Notifications</SelectItem>
                                    </SelectContent>
                                  </Select>
                                  <FormDescription>
                                    Choose when missionaries should receive notifications about meals
                                  </FormDescription>
                                  <FormMessage />
                                </FormItem>
                              )}
                            />
                            
                            {form.watch("notificationScheduleType") === "before_meal" && (
                              <FormField
                                control={form.control}
                                name="hoursBefore"
                                render={({ field }) => (
                                  <FormItem className="mb-4">
                                    <FormLabel>Hours Before Meal</FormLabel>
                                    <FormControl>
                                      <Input
                                        type="number"
                                        min={1}
                                        max={48}
                                        placeholder="e.g. 3"
                                        {...field}
                                        onChange={(e) => field.onChange(parseInt(e.target.value))}
                                      />
                                    </FormControl>
                                    <FormDescription>
                                      How many hours before the meal should they be notified
                                    </FormDescription>
                                    <FormMessage />
                                  </FormItem>
                                )}
                              />
                            )}
                            
                            {form.watch("notificationScheduleType") === "day_of" && (
                              <FormField
                                control={form.control}
                                name="dayOfTime"
                                render={({ field }) => (
                                  <FormItem className="mb-4">
                                    <FormLabel>Time of Day</FormLabel>
                                    <FormControl>
                                      <Input type="time" {...field} />
                                    </FormControl>
                                    <FormDescription>
                                      What time of day to send the notification (24-hour format)
                                    </FormDescription>
                                    <FormMessage />
                                  </FormItem>
                                )}
                              />
                            )}
                            
                            {form.watch("notificationScheduleType") === "weekly_summary" && (
                              <>
                                <FormField
                                  control={form.control}
                                  name="weeklySummaryDay"
                                  render={({ field }) => (
                                    <FormItem className="mb-4">
                                      <FormLabel>Weekly Summary Day</FormLabel>
                                      <Select onValueChange={field.onChange} defaultValue={field.value}>
                                        <FormControl>
                                          <SelectTrigger>
                                            <SelectValue placeholder="Select day of week" />
                                          </SelectTrigger>
                                        </FormControl>
                                        <SelectContent>
                                          <SelectItem value="sunday">Sunday</SelectItem>
                                          <SelectItem value="monday">Monday</SelectItem>
                                          <SelectItem value="tuesday">Tuesday</SelectItem>
                                          <SelectItem value="wednesday">Wednesday</SelectItem>
                                          <SelectItem value="thursday">Thursday</SelectItem>
                                          <SelectItem value="friday">Friday</SelectItem>
                                          <SelectItem value="saturday">Saturday</SelectItem>
                                        </SelectContent>
                                      </Select>
                                      <FormDescription>
                                        Day of the week to send the weekly summary
                                      </FormDescription>
                                      <FormMessage />
                                    </FormItem>
                                  )}
                                />
                                
                                <FormField
                                  control={form.control}
                                  name="weeklySummaryTime"
                                  render={({ field }) => (
                                    <FormItem className="mb-4">
                                      <FormLabel>Weekly Summary Time</FormLabel>
                                      <FormControl>
                                        <Input type="time" {...field} />
                                      </FormControl>
                                      <FormDescription>
                                        Time to send the weekly summary (24-hour format)
                                      </FormDescription>
                                      <FormMessage />
                                    </FormItem>
                                  )}
                                />
                              </>
                            )}
                            
                            {form.watch("notificationScheduleType") === "multiple" && (
                              <FormField
                                control={form.control}
                                name="useMultipleNotifications"
                                render={({ field }) => (
                                  <FormItem className="flex flex-row items-center justify-between rounded-lg border p-3 shadow-sm mb-4">
                                    <div className="space-y-0.5">
                                      <FormLabel>Enable Multiple Notifications</FormLabel>
                                      <FormDescription>
                                        Send both immediate and weekly summary notifications
                                      </FormDescription>
                                    </div>
                                    <FormControl>
                                      <Switch
                                        checked={field.value}
                                        onCheckedChange={field.onChange}
                                      />
                                    </FormControl>
                                  </FormItem>
                                )}
                              />
                            )}
                          </div>
                          
                          <Button type="submit" className="w-full">Add Missionary</Button>
                        </form>
                      </Form>
                    </div>
                    
                    <div>
                      <h3 className="text-lg font-medium mb-4">Current Missionaries</h3>
                      {isLoading ? (
                        <p>Loading missionaries...</p>
                      ) : missionaries && missionaries.length > 0 ? (
                        <div className="space-y-4">
                          {missionaries.map((missionary: any) => (
                            <Card key={missionary.id}>
                              <CardContent className="p-4">
                                <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between">
                                  <div className="mb-4 sm:mb-0">
                                    <h4 className="font-medium">{missionary.name}</h4>
                                    <p className="text-sm text-gray-500">
                                      {missionary.type.charAt(0).toUpperCase() + missionary.type.slice(1)} • 
                                      Phone: {missionary.phoneNumber}
                                    </p>
                                    <p className="text-xs text-gray-400 mb-2">
                                      Notifications via {missionary.preferredNotification}
                                    </p>
                                    
                                    {/* Notification schedule info */}
                                    <div className="mt-2 text-xs text-gray-500 bg-gray-50 p-2 rounded border">
                                      <div className="font-medium mb-1">Notification Schedule:</div>
                                      {missionary.notificationScheduleType === "before_meal" && (
                                        <p>Notified {missionary.hoursBefore} hours before each meal</p>
                                      )}
                                      {missionary.notificationScheduleType === "day_of" && (
                                        <p>Notified at {missionary.dayOfTime} on the day of each meal</p>
                                      )}
                                      {missionary.notificationScheduleType === "weekly_summary" && (
                                        <p>Receives weekly summary every {missionary.weeklySummaryDay} at {missionary.weeklySummaryTime}</p>
                                      )}
                                      {missionary.notificationScheduleType === "multiple" && (
                                        <p>Receives multiple notifications (custom schedule)</p>
                                      )}
                                    </div>
                                  </div>
                                  <div className="flex items-center">
                                    <div className={`w-3 h-3 rounded-full mr-2 ${missionary.active ? 'bg-green-500' : 'bg-red-500'}`}></div>
                                    <span className="text-sm">{missionary.active ? 'Active' : 'Inactive'}</span>
                                  </div>
                                </div>
                              </CardContent>
                            </Card>
                          ))}
                        </div>
                      ) : (
                        <p>No missionaries found. Add one to get started.</p>
                      )}
                    </div>
                  </div>
                </TabsContent>
                
                <TabsContent value="meals">
                  {/* Ward Selector */}
                  <div className="mb-6">
                    <Card>
                      <CardContent className="pt-6">
                        <div className="flex items-center mb-4">
                          <Building className="mr-2 h-5 w-5 text-muted-foreground" />
                          <h3 className="text-lg font-medium">Current Ward</h3>
                        </div>
                        <p className="text-sm text-muted-foreground mb-4">
                          Select the ward to view meal schedules. Each ward has its own meal calendar.
                        </p>
                        <WardSelector />
                      </CardContent>
                    </Card>
                  </div>
                
                  <div className="grid gap-6">
                    <Card>
                      <CardHeader>
                        <CardTitle>Upcoming Meal Schedule Overview</CardTitle>
                        <CardDescription>
                          View and manage all scheduled meals for missionaries.
                        </CardDescription>
                      </CardHeader>
                      <CardContent>
                        <p>This section would display a list of all upcoming meals with options to filter by date range, missionary, or host.</p>
                        <p className="text-sm text-gray-500 mt-2">Note: This functionality would be fully implemented in a production application.</p>
                      </CardContent>
                    </Card>
                    
                    <Card>
                      <CardHeader>
                        <CardTitle>Scheduling Statistics</CardTitle>
                        <CardDescription>
                          View meal scheduling statistics and trends.
                        </CardDescription>
                      </CardHeader>
                      <CardContent>
                        <p>This section would display statistics like:</p>
                        <ul className="list-disc list-inside mt-2 space-y-1">
                          <li>Total meals scheduled for the month</li>
                          <li>Most active hosts</li>
                          <li>Days with no scheduled meals</li>
                          <li>Cancellation rate</li>
                        </ul>
                        <p className="text-sm text-gray-500 mt-2">Note: This functionality would be fully implemented in a production application.</p>
                      </CardContent>
                    </Card>
                  </div>
                </TabsContent>
                
                <TabsContent value="wards">
                  <div className="space-y-8">
                    {/* Display the Ward Management component for super admins only */}
                    {user?.isSuperAdmin && (
                      <div className="bg-white rounded-lg border shadow-sm">
                        <div className="p-6">
                          <h3 className="text-lg font-semibold mb-4">Ward Management</h3>
                          <WardManagement />
                        </div>
                      </div>
                    )}
                    
                    {/* Display the Ward Users component for all admins */}
                    <WardUsers />
                    
                    {/* Selected Ward Information */}
                    {selectedWard && (
                      <Card>
                        <CardHeader>
                          <CardTitle>Selected Ward: {selectedWard.name}</CardTitle>
                          <CardDescription>
                            Share the following link with ward members to access the meal calendar
                          </CardDescription>
                        </CardHeader>
                        <CardContent>
                          <div className="bg-gray-100 p-3 rounded-md font-mono text-sm break-all overflow-x-auto">
                            <code className="text-xs sm:text-sm select-all">
                              {`${window.location.origin}/ward/${selectedWard.accessCode}`}
                            </code>
                          </div>
                          <p className="mt-4 text-sm text-muted-foreground">
                            Ward members will use this link to access the ward-specific calendar
                            without needing to sign in. This URL contains a unique access code and should
                            only be shared with trusted ward members.
                          </p>
                        </CardContent>
                        <CardFooter>
                          <Button
                            onClick={() => {
                              navigator.clipboard.writeText(`${window.location.origin}/ward/${selectedWard.accessCode}`);
                              toast({
                                title: "Link Copied",
                                description: "The ward link has been copied to your clipboard.",
                              });
                            }}
                            className="w-full sm:w-auto"
                          >
                            Copy Ward Link
                          </Button>
                        </CardFooter>
                      </Card>
                    )}
                  </div>
                </TabsContent>
              </Tabs>
            </CardContent>
          </Card>
        </div>
      </main>
      
      {/* Footer */}
      <footer className="bg-white mt-auto">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <div className="flex flex-col items-center justify-between md:flex-row">
            <div className="flex items-center">
              <p className="text-sm text-gray-500">&copy; {new Date().getFullYear()} Missionary Meal Calendar Admin</p>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}
