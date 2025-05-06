import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";

interface StatsCardProps {
  title: string;
  value: number | string;
  icon: React.ReactNode;
  isLoading?: boolean;
}

export function StatsCard({ title, value, icon, isLoading = false }: StatsCardProps) {
  return (
    <Card>
      <CardContent className="p-5">
        <div className="flex items-center">
          <div className="flex-shrink-0 p-3 rounded-md bg-primary/10 text-primary">
            {icon}
          </div>
          <div className="ml-5 w-0 flex-1">
            {isLoading ? (
              <>
                <Skeleton className="h-4 w-20 mb-2" />
                <Skeleton className="h-8 w-16" />
              </>
            ) : (
              <>
                <p className="text-sm font-medium text-muted-foreground truncate">{title}</p>
                <p className="text-lg font-medium">{value}</p>
              </>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
