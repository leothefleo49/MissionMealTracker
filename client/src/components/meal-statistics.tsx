import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Calendar, Users, TrendingUp, BarChart3 } from "lucide-react";
import { format, subMonths, startOfMonth, endOfMonth } from "date-fns";

interface MealStats {
  totalMeals: number;
  averageMealsPerWeek: number;
  averageMealsPerMonth: number;
  missionaryStats: {
    id: number;
    name: string;
    type: string;
    mealCount: number;
    lastMeal: string | null;
  }[];
  monthlyBreakdown: {
    month: string;
    mealCount: number;
  }[];
}

interface MealStatisticsProps {
  wardId: number;
}

export function MealStatistics({ wardId }: MealStatisticsProps) {
  const [timeRange, setTimeRange] = useState<'3months' | '6months' | '1year'>('6months');
  
  const endDate = new Date();
  const startDate = startOfMonth(subMonths(endDate, timeRange === '3months' ? 3 : timeRange === '6months' ? 6 : 12));
  
  const { data: stats, isLoading } = useQuery<MealStats>({
    queryKey: ['/api/meal-stats', wardId, timeRange],
    queryFn: () => fetch(`/api/meal-stats/${wardId}?startDate=${startDate.toISOString()}&endDate=${endDate.toISOString()}`).then(res => res.json()),
    staleTime: 1000, // 1 second
    refetchInterval: 1000, // Refetch every second
    refetchOnWindowFocus: true
  });

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <BarChart3 className="h-5 w-5" />
            Meal Statistics
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="animate-pulse space-y-4">
            <div className="h-4 bg-gray-200 rounded w-3/4"></div>
            <div className="h-4 bg-gray-200 rounded w-1/2"></div>
            <div className="h-4 bg-gray-200 rounded w-2/3"></div>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (!stats) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <BarChart3 className="h-5 w-5" />
            Meal Statistics
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-gray-500">No meal data available</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <BarChart3 className="h-5 w-5" />
          Meal Statistics
        </CardTitle>
        
        <div className="flex gap-2">
          <Button
            variant={timeRange === '3months' ? 'default' : 'outline'}
            size="sm"
            onClick={() => setTimeRange('3months')}
          >
            3 Months
          </Button>
          <Button
            variant={timeRange === '6months' ? 'default' : 'outline'}
            size="sm"
            onClick={() => setTimeRange('6months')}
          >
            6 Months
          </Button>
          <Button
            variant={timeRange === '1year' ? 'default' : 'outline'}
            size="sm"
            onClick={() => setTimeRange('1year')}
          >
            1 Year
          </Button>
        </div>
      </CardHeader>
      
      <CardContent>
        <Tabs defaultValue="overview" className="w-full">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="overview">Overview</TabsTrigger>
            <TabsTrigger value="missionaries">Missionaries</TabsTrigger>
            <TabsTrigger value="trends">Trends</TabsTrigger>
          </TabsList>
          
          <TabsContent value="overview" className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <Card>
                <CardContent className="p-4">
                  <div className="flex items-center gap-2">
                    <Calendar className="h-4 w-4 text-blue-600" />
                    <div>
                      <p className="text-sm text-gray-600">Total Meals</p>
                      <p className="text-2xl font-bold">{stats.totalMeals}</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
              
              <Card>
                <CardContent className="p-4">
                  <div className="flex items-center gap-2">
                    <TrendingUp className="h-4 w-4 text-green-600" />
                    <div>
                      <p className="text-sm text-gray-600">Avg per Week</p>
                      <p className="text-2xl font-bold">{stats.averageMealsPerWeek.toFixed(1)}</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
              
              <Card>
                <CardContent className="p-4">
                  <div className="flex items-center gap-2">
                    <BarChart3 className="h-4 w-4 text-purple-600" />
                    <div>
                      <p className="text-sm text-gray-600">Avg per Month</p>
                      <p className="text-2xl font-bold">{stats.averageMealsPerMonth.toFixed(1)}</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>
          
          <TabsContent value="missionaries" className="space-y-4">
            <div className="space-y-2">
              <h4 className="font-medium flex items-center gap-2">
                <Users className="h-4 w-4" />
                Missionary Meal Frequency
              </h4>
              
              {stats.missionaryStats.length === 0 ? (
                <p className="text-gray-500 text-sm">No missionary meal data available</p>
              ) : (
                <div className="space-y-2">
                  {stats.missionaryStats.map((missionary) => (
                    <div key={missionary.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                      <div className="flex items-center gap-3">
                        <div className={`w-3 h-3 rounded-full ${
                          missionary.type === 'elders' ? 'bg-blue-500' : 'bg-amber-500'
                        }`}></div>
                        <div>
                          <p className="font-medium text-sm">{missionary.name}</p>
                          <p className="text-xs text-gray-600">{missionary.type}</p>
                        </div>
                      </div>
                      
                      <div className="text-right">
                        <p className="font-bold text-sm">{missionary.mealCount} meals</p>
                        {missionary.lastMeal && (
                          <p className="text-xs text-gray-600">
                            Last: {format(new Date(missionary.lastMeal), 'MMM d')}
                          </p>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </TabsContent>
          
          <TabsContent value="trends" className="space-y-4">
            <div>
              <h4 className="font-medium mb-3">Monthly Breakdown</h4>
              
              {stats.monthlyBreakdown.length === 0 ? (
                <p className="text-gray-500 text-sm">No trend data available</p>
              ) : (
                <div className="space-y-2">
                  {stats.monthlyBreakdown.map((month) => (
                    <div key={month.month} className="flex items-center justify-between p-2">
                      <span className="text-sm">{month.month}</span>
                      <div className="flex items-center gap-2">
                        <div className="w-24 bg-gray-200 rounded-full h-2">
                          <div 
                            className="bg-blue-600 h-2 rounded-full" 
                            style={{ 
                              width: `${Math.min(100, (month.mealCount / Math.max(...stats.monthlyBreakdown.map(m => m.mealCount))) * 100)}%` 
                            }}
                          />
                        </div>
                        <span className="text-sm font-medium w-8 text-right">{month.mealCount}</span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  );
}