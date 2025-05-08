import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { PieChart, Pie, Cell, ResponsiveContainer, Legend, Tooltip, Label } from "recharts";

interface CategoryBreakdown {
  categoryName: string;
  percentage: number;
}

export function CategoryBreakdown() {
  // Fetch category breakdown data
  const { data: categories, isLoading } = useQuery<CategoryBreakdown[]>({
    queryKey: ["/api/dashboard/category-breakdown"],
    queryFn: async () => {
      const response = await fetch("/api/dashboard/category-breakdown");
      if (!response.ok) throw new Error("Failed to fetch category breakdown");
      return response.json();
    }
  });

  // Define colors for chart elements in a repeating pattern
  const COLORS = [
    "#0ea5e9", // sky-500 (primary-like)
    "#8b5cf6", // violet-500
    "#22c55e", // green-500
    "#f59e0b", // amber-500
    "#f43f5e"  // rose-500
  ];

  // Prepare data for the pie chart
  const chartData = categories?.map(cat => ({
    name: cat.categoryName,
    value: cat.percentage
  }));

  // Custom tooltip for pie chart
  const CustomTooltip = ({ active, payload }: any) => {
    if (active && payload && payload.length) {
      return (
        <div className="bg-background border p-2 rounded-md text-sm shadow-md">
          <p className="font-medium">{`${payload[0].name}: ${payload[0].value}%`}</p>
        </div>
      );
    }
    return null;
  };

  return (
    <Card className="h-full">
      <CardHeader className="border-b">
        <CardTitle>Category Breakdown</CardTitle>
      </CardHeader>
      
      <CardContent className="p-5">
        {isLoading ? (
          // Loading skeleton
          <div className="flex flex-col space-y-4 items-center justify-center h-60">
            <Skeleton className="h-40 w-40 rounded-full" />
            <Skeleton className="h-4 w-40" />
            <Skeleton className="h-4 w-32" />
          </div>
        ) : categories && categories.length > 0 ? (
          <div className="flex flex-col space-y-4">
            {/* Pie Chart */}
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={chartData}
                    cx="50%"
                    cy="50%"
                    innerRadius={60}
                    outerRadius={80}
                    paddingAngle={2}
                    dataKey="value"
                    label
                  >
                    {chartData?.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                    <Label 
                      value="Categories" 
                      position="center" 
                      className="text-xs font-medium text-muted-foreground" 
                    />
                  </Pie>
                  <Tooltip content={<CustomTooltip />} />
                  <Legend 
                    layout="vertical" 
                    verticalAlign="middle" 
                    align="right"
                    formatter={(value) => <span className="text-xs">{value}</span>}
                  />
                </PieChart>
              </ResponsiveContainer>
            </div>
            
            {/* Category list with bars */}
            <div className="space-y-3 mt-2">
              {categories.map((category, index) => (
                <div key={category.categoryName} className="flex flex-col">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center">
                      <div 
                        className="w-3 h-3 rounded-full mr-2" 
                        style={{ backgroundColor: COLORS[index % COLORS.length] }}
                      ></div>
                      <div className="text-sm font-medium">{category.categoryName}</div>
                    </div>
                    <div className="text-sm font-medium">{category.percentage}%</div>
                  </div>
                  <div className="mt-1 w-full bg-secondary rounded-full h-1.5">
                    <div 
                      style={{ 
                        width: `${category.percentage}%`, 
                        backgroundColor: COLORS[index % COLORS.length],
                        height: '6px',
                        borderRadius: '9999px'
                      }} 
                    ></div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        ) : (
          <div className="py-16 text-center text-muted-foreground flex flex-col items-center">
            <svg
              className="h-12 w-12 text-muted-foreground/30 mb-3"
              xmlns="http://www.w3.org/2000/svg"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z"
              />
            </svg>
            <p>No category data available</p>
            <p className="text-xs mt-1">Add landing pages with categories to see data</p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
