import { useState } from "react";
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
  wardId?: number;
}

export function MessageStatsComponent({ wardId }: MessageStatsProps) {
  const { toast } = useToast();
  const [activeTab, setActiveTab] = useState("overview");
  const [timeFrame, setTimeFrame] = useState("all");
  
  // Fetch message statistics
  const { data: stats, isLoading, error } = useQuery<MessageStats>({
    queryKey: ['/api/message-stats', wardId, timeFrame],
    queryFn: async () => {
      const queryParams = new URLSearchParams();
      if (wardId) queryParams.append('wardId', wardId.toString());
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
      byWard: [],
      byMissionary: [],
      byPeriod: [],
    },
  });
  
  // Handle error state
  if (error) {
    toast({
      title: "Error",
      description: "Failed to load message statistics. Please try again.",
      variant: "destructive",
    });
  }
  
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
                    <p className="text-sm font-medium text-muted-foreground mb-1">Message Segments</p>
                    <h3 className="text-2xl font-bold">{formatNumber(stats?.totalSegments || 0)}</h3>
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
                  <Progress 
                    value={stats?.totalMessages ? 
                      Math.min((stats.totalCharacters / stats.totalMessages) / 1.6, 100) : 0} 
                    className="h-1 mt-1" 
                  />
                </div>
              </CardContent>
            </Card>
            
            <Card>
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-muted-foreground mb-1">Estimated Cost</p>
                    <h3 className="text-2xl font-bold">{formatCurrency(stats?.estimatedCost || 0)}</h3>
                  </div>
                  <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center">
                    <CreditCard className="h-5 w-5 text-primary" />
                  </div>
                </div>
                <div className="mt-4">
                  <div className="flex items-center justify-between text-xs text-muted-foreground">
                    <span>Cost per Message</span>
                    <span>
                      {stats?.totalMessages ? 
                        formatCurrency(stats.estimatedCost / stats.totalMessages) : '$0.00'}
                    </span>
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
            <TabsList className="grid grid-cols-1 sm:grid-cols-3 w-full">
              <TabsTrigger value="overview">Overview</TabsTrigger>
              <TabsTrigger value="wards">By Ward</TabsTrigger>
              <TabsTrigger value="missionaries">By Missionary</TabsTrigger>
            </TabsList>
            
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
            
            <TabsContent value="wards" className="mt-6">
              <Card>
                <CardHeader>
                  <CardTitle>Message Usage by Ward</CardTitle>
                  <CardDescription>
                    View message volume and cost breakdown by ward
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  {stats?.byWard.length === 0 ? (
                    <div className="flex justify-center items-center p-8">
                      <p className="text-muted-foreground">No ward data available for the selected time period</p>
                    </div>
                  ) : (
                    <>
                      <div className="h-[300px] mb-8">
                        <ResponsiveContainer width="100%" height="100%">
                          <PieChart>
                            <Pie
                              data={stats?.byWard.map(ward => ({
                                name: ward.wardName,
                                value: ward.messageCount
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
                              {stats?.byWard.map((_, index) => (
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
                              <th className="text-left py-2 px-4">Ward</th>
                              <th className="text-right py-2 px-4">Messages</th>
                              <th className="text-right py-2 px-4">Success Rate</th>
                              <th className="text-right py-2 px-4">Segments</th>
                              <th className="text-right py-2 px-4">Est. Cost</th>
                            </tr>
                          </thead>
                          <tbody>
                            {stats?.byWard.map((ward) => (
                              <tr key={ward.wardId} className="border-b hover:bg-gray-50">
                                <td className="py-2 px-4">{ward.wardName}</td>
                                <td className="text-right py-2 px-4">{formatNumber(ward.messageCount)}</td>
                                <td className="text-right py-2 px-4">{ward.successRate.toFixed(1)}%</td>
                                <td className="text-right py-2 px-4">{formatNumber(ward.segments || 0)}</td>
                                <td className="text-right py-2 px-4">{formatCurrency(ward.estimatedCost)}</td>
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
                  <CardTitle>Message Usage by Missionary</CardTitle>
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