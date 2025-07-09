import { useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { MessageStats } from "@shared/schema";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useToast } from "@/hooks/use-toast";
import { Badge } from "@/components/ui/badge";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, PieChart, Pie, Cell } from "recharts";
import { CreditCard, MessageSquare, BarChart2, Calendar, Circle } from "lucide-react";
import { Progress } from "@/components/ui/progress";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

// Format a number as a currency (USD)
function formatCurrency(value: number): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  }).format(value);
}

// Format a number with commas
function formatNumber(value: number): string {
  return new Intl.NumberFormat('en-US').format(value);
}

interface MessageStatsProps {
  congregationId?: number;
}

export function MessageStatsComponent({ congregationId }: MessageStatsProps) {
  const { toast } = useToast();
  const [activeTab, setActiveTab] = useState("overview");
  const [timeFrame, setTimeFrame] = useState("all");

  // Fetch message statistics
  const { data: stats, isLoading, error } = useQuery<MessageStats>({
    queryKey: ['/api/message-stats', congregationId, timeFrame],
    queryFn: async () => {
      const queryParams = new URLSearchParams();
      if (congregationId) queryParams.append('congregationId', congregationId.toString());
      if (timeFrame !== 'all') queryParams.append('timeFrame', timeFrame);

      const url = `/api/message-stats${queryParams.toString() ? `?${queryParams.toString()}` : ''}`;
      const response = await fetch(url);

      if (!response.ok) {
        throw new Error('Failed to fetch message statistics');
      }

      return response.json();
    },
    enabled: true,
    // Return empty stats object as placeholder if data is not yet loaded
    placeholderData: {
      totalMessages: 0,
      totalSuccessful: 0,
      totalFailed: 0,
      totalCharacters: 0,
      totalSegments: 0,
      estimatedCost: 0,
      byNotificationMethod: {
        email: 0,
        whatsapp: 0,
        text: 0,
        messenger: 0,
      },
      byCongregation: [],
      byMissionary: [],
      byPeriod: [],
    },
  });

  // Use useEffect for error handling to avoid re-renders
  useEffect(() => {
    if (error) {
      toast({
        title: "Error",
        description: "Failed to load message statistics. Please try again.",
        variant: "destructive",
      });
    }
  }, [error, toast]);

  // Calculate success rate as a percentage
  const successRate = stats?.totalMessages
    ? ((stats.totalSuccessful / stats.totalMessages) * 100).toFixed(1)
    : "100.0";

  // Prepare data for the period chart
  const periodChartData = stats?.byPeriod.map(period => ({
    name: period.period === 'today'
      ? 'Today'
      : period.period === 'this_week'
        ? 'This Week'
        : period.period === 'this_month'
          ? 'This Month'
          : 'Last Month',
    messages: period.messageCount,
    segments: period.segments || 0,
    cost: period.estimatedCost,
  })) || [];

  // COLORS for charts
  const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884d8', '#82ca9d'];

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <h2 className="text-2xl font-bold">Message Statistics</h2>
        <Select value={timeFrame} onValueChange={setTimeFrame}>
          <SelectTrigger className="w-[180px]">
            <SelectValue placeholder="Select Time Frame" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Time</SelectItem>
            <SelectItem value="today">Today</SelectItem>
            <SelectItem value="this_week">This Week</SelectItem>
            <SelectItem value="this_month">This Month</SelectItem>
            <SelectItem value="last_month">Last Month</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {isLoading ? (
        <div className="flex justify-center items-center min-h-[400px]">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
        </div>
      ) : (
        <>
          {/* Stats Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <Card>
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-muted-foreground mb-1">Total Messages</p>
                    <h3 className="text-2xl font-bold">{formatNumber(stats?.totalMessages || 0)}</h3>
                  </div>
                  <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center">
                    <MessageSquare className="h-5 w-5 text-primary" />
                  </div>
                </div>
                <div className="mt-4">
                  <div className="flex items-center justify-between text-xs text-muted-foreground">
                    <span>Success Rate</span>
                    <span>{successRate}%</span>
                  </div>
                  <Progress value={parseFloat(successRate)} className="h-1 mt-1" />
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-muted-foreground mb-1">Notification Types</p>
                    <div className="flex items-center space-x-2">
                      <div className="text-sm">
                        <span className="inline-flex items-center px-2 py-1 rounded-full text-xs bg-blue-100 text-blue-800">
                          Gmail: {stats?.byNotificationMethod?.email || 0}
                        </span>
                      </div>
                      <div className="text-sm">
                        <span className="inline-flex items-center px-2 py-1 rounded-full text-xs bg-green-100 text-green-800">
                          WhatsApp: {stats?.byNotificationMethod?.whatsapp || 0}
                        </span>
                      </div>
                    </div>
                  </div>
                  <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center">
                    <BarChart2 className="h-5 w-5 text-primary" />
                  </div>
                </div>
                <div className="mt-4">
                  <div className="flex items-center justify-between text-xs text-muted-foreground">
                    <span>Avg. Characters per Message</span>
                    <span>
                      {stats?.totalMessages ?
                        Math.round(stats.totalCharacters / stats.totalMessages) : 0}
                    </span>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-muted-foreground mb-1">Operating Cost</p>
                    <h3 className="text-2xl font-bold text-green-600">FREE</h3>
                  </div>
                  <div className="h-10 w-10 rounded-full bg-green-100 flex items-center justify-center">
                    <CreditCard className="h-5 w-5 text-green-600" />
                  </div>
                </div>
                <div className="mt-4">
                  <div className="flex items-center justify-between text-xs text-muted-foreground">
                    <span>Gmail & WhatsApp</span>
                    <span className="text-green-600 font-medium">$0.00</span>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-muted-foreground mb-1">Message Status</p>
                    <div className="flex items-center space-x-2">
                      <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200">
                        {formatNumber(stats?.totalSuccessful || 0)} Successful
                      </Badge>
                      <Badge variant="outline" className="bg-red-50 text-red-700 border-red-200">
                        {formatNumber(stats?.totalFailed || 0)} Failed
                      </Badge>
                    </div>
                  </div>
                  <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center">
                    <Circle className="h-5 w-5 text-primary" />
                  </div>
                </div>
                <div className="mt-4">
                  <div className="flex items-center justify-between text-xs text-muted-foreground">
                    <span>Message Delivery Rate</span>
                    <span>{successRate}%</span>
                  </div>
                  <Progress value={parseFloat(successRate)} className="h-1 mt-1" />
                </div>
              </CardContent>
            </Card>
          </div>

          <Tabs value={activeTab} onValueChange={setActiveTab}>
            {/* For mobile devices, use a vertical list of buttons for better mobile UX */}
            <div className="block sm:hidden mb-4">
              <div className="flex flex-col space-y-2">
                <button
                  onClick={() => setActiveTab("overview")}
                  className={`w-full text-left px-3 py-2 rounded-md text-sm ${activeTab === "overview" ? "bg-primary text-white" : "bg-gray-100"}`}
                >
                  Overview
                </button>
                <button
                  onClick={() => setActiveTab("congregations")}
                  className={`w-full text-left px-3 py-2 rounded-md text-sm ${activeTab === "congregations" ? "bg-primary text-white" : "bg-gray-100"}`}
                >
                  By Congregation
                </button>
                <button
                  onClick={() => setActiveTab("missionaries")}
                  className={`w-full text-left px-3 py-2 rounded-md text-sm ${activeTab === "missionaries" ? "bg-primary text-white" : "bg-gray-100"}`}
                >
                  By Missionary
                </button>
              </div>
            </div>

            {/* For desktop, use the normal TabsList */}
            <div className="hidden sm:block">
              <TabsList className="grid grid-cols-3 w-full">
                <TabsTrigger value="overview">Overview</TabsTrigger>
                <TabsTrigger value="congregations">By Congregation</TabsTrigger>
                <TabsTrigger value="missionaries">By Missionary</TabsTrigger>
              </TabsList>
            </div>

            <TabsContent value="overview" className="mt-6">
              <Card>
                <CardHeader>
                  <CardTitle>Message Usage Over Time</CardTitle>
                  <CardDescription>
                    View message volume and cost breakdown by time period
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  {stats?.byPeriod.length === 0 ? (
                    <div className="flex justify-center items-center p-8">
                      <p className="text-muted-foreground">No message data available for the selected time period</p>
                    </div>
                  ) : (
                    <div className="h-[300px] sm:h-[400px]">
                      <ResponsiveContainer width="100%" height="100%">
                        <BarChart
                          data={periodChartData}
                          margin={{ top: 20, right: 30, left: 20, bottom: 70 }}
                        >
                          <CartesianGrid strokeDasharray="3 3" />
                          <XAxis dataKey="name" angle={-45} textAnchor="end" height={70} />
                          <YAxis yAxisId="left" orientation="left" stroke="#8884d8" />
                          <YAxis yAxisId="right" orientation="right" stroke="#82ca9d" />
                          <Tooltip
                            formatter={(value, name) => {
                              if (name === 'cost') return [formatCurrency(value as number), 'Cost'];
                              return [formatNumber(value as number), name === 'messages' ? 'Messages' : 'Segments'];
                            }}
                          />
                          <Legend />
                          <Bar yAxisId="left" dataKey="messages" name="Messages" fill="#8884d8" radius={[4, 4, 0, 0]} />
                          <Bar yAxisId="left" dataKey="segments" name="Segments" fill="#82ca9d" radius={[4, 4, 0, 0]} />
                          <Bar yAxisId="right" dataKey="cost" name="Cost" fill="#ffc658" radius={[4, 4, 0, 0]} />
                        </BarChart>
                      </ResponsiveContainer>
                    </div>
                  )}
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="congregations" className="mt-6">
              <Card>
                <CardHeader>
                  <CardTitle>Message Usage by Congregation</CardTitle>
                  <CardDescription>
                    View message volume and cost breakdown by congregation
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  {stats?.byCongregation.length === 0 ? (
                    <div className="flex justify-center items-center p-8">
                      <p className="text-muted-foreground">No congregation data available for the selected time period</p>
                    </div>
                  ) : (
                    <>
                      <div className="h-[300px] mb-8">
                        <ResponsiveContainer width="100%" height="100%">
                          <PieChart>
                            <Pie
                              data={stats?.byCongregation.map(congregation => ({
                                name: congregation.congregationName,
                                value: congregation.messageCount
                              }))}
                              cx="50%"
                              cy="50%"
                              labelLine={false}
                              outerRadius={80}
                              fill="#8884d8"
                              dataKey="value"
                              nameKey="name"
                              label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(0)}%`}
                            >
                              {stats?.byCongregation.map((_, index) => (
                                <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                              ))}
                            </Pie>
                            <Tooltip formatter={(value) => formatNumber(value as number)} />
                            <Legend />
                          </PieChart>
                        </ResponsiveContainer>
                      </div>

                      <div className="overflow-x-auto">
                        <table className="w-full border-collapse">
                          <thead>
                            <tr className="border-b">
                              <th className="text-left py-2 px-4">Congregation</th>
                              <th className="text-right py-2 px-4">Messages</th>
                              <th className="text-right py-2 px-4">Success Rate</th>
                              <th className="text-right py-2 px-4">Segments</th>
                              <th className="text-right py-2 px-4">Est. Cost</th>
                            </tr>
                          </thead>
                          <tbody>
                            {stats?.byCongregation.map((congregation) => (
                              <tr key={congregation.congregationId} className="border-b hover:bg-gray-50">
                                <td className="py-2 px-4">{congregation.congregationName}</td>
                                <td className="text-right py-2 px-4">{formatNumber(congregation.messageCount)}</td>
                                <td className="text-right py-2 px-4">{congregation.successRate.toFixed(1)}%</td>
                                <td className="text-right py-2 px-4">{formatNumber(congregation.segments || 0)}</td>
                                <td className="text-right py-2 px-4">{formatCurrency(congregation.estimatedCost)}</td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    </>
                  )}
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="missionaries" className="mt-6">
              <Card>
                <CardHeader>
                  <CardTitle className="text-base sm:text-lg md:text-xl">Message Usage by Missionary</CardTitle>
                  <CardDescription>
                    View message volume and cost breakdown by missionary
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  {stats?.byMissionary.length === 0 ? (
                    <div className="flex justify-center items-center p-8">
                      <p className="text-muted-foreground">No missionary data available for the selected time period</p>
                    </div>
                  ) : (
                    <>
                      <div className="overflow-x-auto">
                        <table className="w-full border-collapse">
                          <thead>
                            <tr className="border-b">
                              <th className="text-left py-2 px-4">Missionary</th>
                              <th className="text-right py-2 px-4">Messages</th>
                              <th className="text-right py-2 px-4">Success Rate</th>
                              <th className="text-right py-2 px-4">Segments</th>
                              <th className="text-right py-2 px-4">Est. Cost</th>
                            </tr>
                          </thead>
                          <tbody>
                            {stats?.byMissionary.map((missionary) => (
                              <tr key={missionary.missionaryId} className="border-b hover:bg-gray-50">
                                <td className="py-2 px-4">{missionary.missionaryName}</td>
                                <td className="text-right py-2 px-4">{formatNumber(missionary.messageCount)}</td>
                                <td className="text-right py-2 px-4">{missionary.successRate.toFixed(1)}%</td>
                                <td className="text-right py-2 px-4">{formatNumber(missionary.segments || 0)}</td>
                                <td className="text-right py-2 px-4">{formatCurrency(missionary.estimatedCost)}</td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    </>
                  )}
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        </>
      )}
    </div>
  );
}