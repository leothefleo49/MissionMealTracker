import { useState, useEffect } from "react";
import { useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/use-auth";
import { ArrowLeft, Calendar, User, Settings, LogOut, Building, BarChart2 } from "lucide-react";
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
import { useMutation, useQuery } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { insertMissionarySchema } from "@shared/schema";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { WardSelector } from "@/components/ward-selector";
import { WardManagement } from "@/components/ward-management";
import MissionaryList from "../components/missionary-list";
import { MessageStatsComponent } from "@/components/message-stats";
import { TestMessageForm } from "@/components/test-message-form";

export default function Admin() {
  const [location, navigate] = useLocation();
  const { toast } = useToast();
  const [activeTab, setActiveTab] = useState("missionaries");
  const [selectedWardId, setSelectedWardId] = useState<number | null>(null);

  // Get current user and selected ward from auth context
  const { user, isLoading, selectedWard } = useAuth();
  
  // Set selected ward ID when selectedWard changes
  useEffect(() => {
    if (selectedWard) {
      setSelectedWardId(selectedWard.id);
    }
  }, [selectedWard]);

  // Check if user is authenticated and is admin
  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary"></div>
      </div>
    );
  }

  if (!user || !user.isAdmin) {
    navigate("/auth");
    return null;
  }

  // Form for adding a missionary
  const missionaryFormSchema = z.object({
    name: z.string().min(2, { message: "Missionary name is required" }),
    type: z.enum(["elders", "sisters"]),
    phoneNumber: z.string().min(10, { message: "Please enter a valid phone number" }),
    messengerAccount: z.string().optional(),
    preferredNotification: z.enum(["text", "messenger"]),
    active: z.boolean().default(true),
    dietaryRestrictions: z.string().optional(),
    notificationScheduleType: z.enum(["before_meal", "day_of", "weekly_summary", "multiple"]),
    hoursBefore: z.number().min(1).max(48).optional(),
    dayOfTime: z.string().optional(),
    weeklySummaryDay: z.enum(["sunday", "monday", "tuesday", "wednesday", "thursday", "friday", "saturday"]).optional(),
    weeklySummaryTime: z.string().optional(),
    multipleSettings: z.object({
      beforeMeal: z.boolean().optional(),
      beforeMealHours: z.number().min(1).max(48).optional(),
      dayOf: z.boolean().optional(),
      dayOfTime: z.string().optional(),
      weeklySummary: z.boolean().optional(),
      weeklySummaryDay: z.enum(["sunday", "monday", "tuesday", "wednesday", "thursday", "friday", "saturday"]).optional(),
      weeklySummaryTime: z.string().optional(),
    }).optional(),
    wardId: z.number().nullable().transform(val => val || 0),
  });

  const form = useForm({
    resolver: zodResolver(missionaryFormSchema),
    defaultValues: {
      name: "",
      type: "elders" as const,
      phoneNumber: "",
      messengerAccount: "",
      preferredNotification: "text" as const,
      active: true,
      dietaryRestrictions: "",
      notificationScheduleType: "before_meal" as const,
      hoursBefore: 3,
      dayOfTime: "08:00",
      weeklySummaryDay: "sunday" as const,
      weeklySummaryTime: "08:00",
      multipleSettings: {
        beforeMeal: true,
        beforeMealHours: 3,
        dayOf: false,
        dayOfTime: "08:00",
        weeklySummary: false,
        weeklySummaryDay: "sunday" as const,
        weeklySummaryTime: "08:00",
      },
      wardId: selectedWardId || 0,
    },
  });

  // Update wardId when selectedWardId changes
  if (selectedWardId && form.getValues("wardId") !== selectedWardId) {
    form.setValue("wardId", selectedWardId);
  }

  // Mutation for creating a missionary
  const createMissionary = useMutation({
    mutationFn: async (data: z.infer<typeof missionaryFormSchema>) => {
      const res = await apiRequest("POST", "/api/admin/missionaries", data);
      return await res.json();
    },
    onSuccess: () => {
      toast({
        title: "Missionary added",
        description: "The missionary has been successfully added.",
      });
      form.reset();
      queryClient.invalidateQueries({ queryKey: ["/api/missionaries"] });
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: error.message || "Failed to add missionary. Please try again.",
        variant: "destructive",
      });
    },
  });

  function onSubmit(data: z.infer<typeof missionaryFormSchema>) {
    // If no ward is selected, show error
    if (!selectedWardId) {
      toast({
        title: "Ward required",
        description: "Please select a ward before adding a missionary.",
        variant: "destructive",
      });
      return;
    }

    // Ensure wardId is a number
    const formData = {
      ...data,
      wardId: selectedWardId
    };

    // Process multipleSettings if selected
    if (formData.notificationScheduleType === "multiple" && formData.multipleSettings) {
      // Process settings based on selected options
      // This would be done on the server side
    }

    createMissionary.mutate(formData);
  }

  // Logout handler
  const handleLogout = async () => {
    try {
      await fetch('/api/logout', { method: 'POST' });
      queryClient.setQueryData(['/api/user'], null);
      navigate('/auth');
    } catch (error) {
      console.error('Logout error:', error);
    }
  };

  return (
    <div className="min-h-screen flex flex-col bg-gray-50 overflow-x-hidden">
      {/* Header */}
      <header className="bg-white shadow">
        <div className="max-w-7xl mx-auto px-3 sm:px-6 lg:px-8 py-4">
          <div className="flex justify-between items-center">
            <div className="flex items-center">
              <h1 className="text-xl sm:text-2xl font-bold text-gray-900">Admin Dashboard</h1>
            </div>
            <div>
              <Button onClick={handleLogout} variant="outline" size="sm">
                <LogOut className="h-4 w-4 mr-2" />
                <span className="sm:inline">Logout</span>
              </Button>
            </div>
          </div>
        </div>
      </header>
      
      {/* Mobile-friendly tab navigation */}
      <div className="bg-white border-b mb-6">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          {/* For very small screens (folding phones) - Vertical stacked buttons */}
          <div className="grid grid-cols-1 sm:hidden gap-1 py-1">
            <Button
              variant={activeTab === "missionaries" ? "default" : "ghost"}
              className="flex items-center justify-start py-2"
              onClick={() => setActiveTab("missionaries")}
            >
              <User className="mr-2 h-4 w-4 flex-shrink-0" />
              <span className="text-sm truncate">Missionaries</span>
            </Button>
            <Button
              variant={activeTab === "meals" ? "default" : "ghost"}
              className="flex items-center justify-start py-2"
              onClick={() => setActiveTab("meals")}
            >
              <Calendar className="mr-2 h-4 w-4 flex-shrink-0" />
              <span className="text-sm truncate">Meals</span>
            </Button>
            <Button
              variant={activeTab === "statistics" ? "default" : "ghost"}
              className="flex items-center justify-start py-2"
              onClick={() => setActiveTab("statistics")}
            >
              <BarChart2 className="mr-2 h-4 w-4 flex-shrink-0" />
              <span className="text-sm truncate">Statistics</span>
            </Button>
            <Button
              variant={activeTab === "wards" ? "default" : "ghost"}
              className="flex items-center justify-start py-2"
              onClick={() => setActiveTab("wards")}
            >
              <Settings className="mr-2 h-4 w-4 flex-shrink-0" />
              <span className="text-sm truncate">Wards</span>
            </Button>
          </div>
          
          {/* For regular mobile and larger screens - Horizontal buttons */}
          <div className="hidden sm:grid grid-cols-4 gap-2 py-2">
            <Button
              variant={activeTab === "missionaries" ? "default" : "ghost"}
              className="flex items-center justify-center py-2"
              onClick={() => setActiveTab("missionaries")}
            >
              <User className="mr-2 h-4 w-4" />
              <span className="text-sm">Missionaries</span>
            </Button>
            <Button
              variant={activeTab === "meals" ? "default" : "ghost"}
              className="flex items-center justify-center py-2"
              onClick={() => setActiveTab("meals")}
            >
              <Calendar className="mr-2 h-4 w-4" />
              <span className="text-sm">Meals</span>
            </Button>
            <Button
              variant={activeTab === "statistics" ? "default" : "ghost"}
              className="flex items-center justify-center py-2"
              onClick={() => setActiveTab("statistics")}
            >
              <BarChart2 className="mr-2 h-4 w-4" />
              <span className="text-sm">Statistics</span>
            </Button>
            <Button
              variant={activeTab === "wards" ? "default" : "ghost"}
              className="flex items-center justify-center py-2"
              onClick={() => setActiveTab("wards")}
            >
              <Settings className="mr-2 h-4 w-4" />
              <span className="text-sm">Wards</span>
            </Button>
          </div>
        </div>
      </div>

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
                            name="dietaryRestrictions"
                            render={({ field }) => (
                              <FormItem>
                                <FormLabel>Dietary Restrictions/Allergies (Optional)</FormLabel>
                                <FormControl>
                                  <Input placeholder="e.g. gluten-free, peanut allergy, etc." {...field} />
                                </FormControl>
                                <FormDescription>
                                  Enter any dietary restrictions or food allergies
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
                            
                            {form.watch("notificationScheduleType") && form.watch("notificationScheduleType").toString() === "before_meal" ? (
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
                                        onChange={(e) => field.onChange(parseInt(e.target.value) || 1)}
                                      />
                                    </FormControl>
                                    <FormDescription>
                                      How many hours before the meal should they be notified
                                    </FormDescription>
                                    <FormMessage />
                                  </FormItem>
                                )}
                              />
                            ) : null}
                            
                            {form.watch("notificationScheduleType") && form.watch("notificationScheduleType").toString() === "day_of" ? (
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
                            ) : null}
                            
                            {form.watch("notificationScheduleType") && form.watch("notificationScheduleType").toString() === "weekly_summary" ? (
                              <>
                                <FormField
                                  control={form.control}
                                  name="weeklySummaryDay"
                                  render={({ field }) => (
                                    <FormItem className="mb-4">
                                      <FormLabel>Day of the Week</FormLabel>
                                      <Select onValueChange={field.onChange} defaultValue={field.value}>
                                        <FormControl>
                                          <SelectTrigger>
                                            <SelectValue placeholder="Select day" />
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
                                        Which day of the week to send the weekly summary
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
                                      <FormLabel>Time of Day</FormLabel>
                                      <FormControl>
                                        <Input type="time" {...field} />
                                      </FormControl>
                                      <FormDescription>
                                        What time of day to send the weekly summary (24-hour format)
                                      </FormDescription>
                                      <FormMessage />
                                    </FormItem>
                                  )}
                                />
                              </>
                            ) : null}
                          </div>
                          
                          <Button type="submit" className="w-full mt-6">
                            Add Missionary
                          </Button>
                        </form>
                      </Form>
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
                      Select the ward to view and manage meals.
                    </p>
                    <WardSelector onWardChange={(ward) => setSelectedWardId(ward?.id || null)} />
                  </div>
                  
                  {/* Upcoming Meals (placeholder for now) */}
                  <div className="mb-8">
                    <h3 className="text-lg font-medium mb-4">Upcoming Meals</h3>
                    {selectedWardId ? (
                      <p className="text-sm text-muted-foreground">
                        Upcoming meal management features will be implemented here.
                      </p>
                    ) : (
                      <p className="text-sm text-muted-foreground">
                        Please select a ward above to manage upcoming meals.
                      </p>
                    )}
                  </div>
                </CardContent>
              </Card>
            </div>
          )}
          
          {/* Statistics Tab */}
          {activeTab === "statistics" && (
            <div>
              <Card>
                <CardHeader>
                  <CardTitle>Message Statistics</CardTitle>
                  <CardDescription>Track notification performance and costs</CardDescription>
                </CardHeader>
                <CardContent>
                  {/* Ward Selector */}
                  <div className="mb-6">
                    <div className="flex items-center mb-4">
                      <Building className="mr-2 h-5 w-5 text-muted-foreground" />
                      <h3 className="text-lg font-medium">Current Ward</h3>
                    </div>
                    <p className="text-sm text-muted-foreground mb-4">
                      Select a ward to view statistics or leave empty to see all wards.
                    </p>
                    <WardSelector onWardChange={(ward) => setSelectedWardId(ward?.id || null)} />
                  </div>
                  
                  {/* Test Message Feature */}
                  <div className="border rounded-lg p-4 mb-8 bg-gray-50">
                    <h3 className="text-lg font-medium mb-4">Test Notification System</h3>
                    <p className="text-sm text-muted-foreground mb-4">
                      Send test messages to verify your notification configuration.
                      You can send immediate or scheduled test messages to any phone number.
                    </p>
                    <TestMessageForm wardId={selectedWardId} />
                  </div>
                  
                  {/* Message Statistics Component */}
                  <div className="mb-8">
                    <MessageStatsComponent wardId={selectedWardId || undefined} />
                  </div>
                </CardContent>
              </Card>
            </div>
          )}
          
          {/* Wards Tab */}
          {activeTab === "wards" && (
            <div>
              <Card>
                <CardHeader>
                  <CardTitle>Ward Management</CardTitle>
                  <CardDescription>Manage wards and user access</CardDescription>
                </CardHeader>
                <CardContent>
                  <WardManagement />
                </CardContent>
              </Card>
            </div>
          )}
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