import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";

interface CategoryBreakdown {
  categoryName: string;
  percentage: number;
}

export function CategoryBreakdown() {
  // Fetch category breakdown data
  const { data: categories, isLoading } = useQuery<CategoryBreakdown[]>({
    queryKey: ["/api/dashboard/category-breakdown"],
  });

  // Define colors for progress bars in a repeating pattern
  const colors = [
    "bg-primary",
    "bg-violet-500",
    "bg-green-500",
    "bg-amber-500",
    "bg-rose-500"
  ];

  return (
    <Card className="h-full">
      <CardHeader className="border-b">
        <CardTitle>Category Breakdown</CardTitle>
      </CardHeader>
      
      <CardContent className="p-5">
        <div className="space-y-4">
          {isLoading ? (
            // Loading skeletons
            Array(5).fill(0).map((_, i) => (
              <div key={i}>
                <div className="flex items-center justify-between mb-2">
                  <Skeleton className="h-4 w-24" />
                  <Skeleton className="h-4 w-12" />
                </div>
                <Skeleton className="h-2 w-full" />
              </div>
            ))
          ) : categories && categories.length > 0 ? (
            categories.map((category, index) => (
              <div key={category.categoryName}>
                <div className="flex items-center justify-between">
                  <div className="text-sm font-medium">{category.categoryName}</div>
                  <div className="text-sm font-medium">{category.percentage}%</div>
                </div>
                <div className="mt-2 w-full bg-secondary rounded-full h-2">
                  <div 
                    className={`${colors[index % colors.length]} h-2 rounded-full`} 
                    style={{ width: `${category.percentage}%` }}
                  ></div>
                </div>
              </div>
            ))
          ) : (
            <div className="py-6 text-center text-muted-foreground">
              No category data available
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
