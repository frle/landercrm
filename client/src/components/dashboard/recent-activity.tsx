import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { 
  Upload, 
  Download, 
  Globe, 
  Edit, 
  Clock,
  X
} from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { useAuth } from "@/hooks/use-auth";

interface Activity {
  id: number;
  userId: number;
  action: string;
  entityType: string;
  entityId: number | null;
  details: string | null;
  createdAt: string;
  user: {
    username: string;
  };
}

export function RecentActivity() {
  const { user } = useAuth();
  const isAdmin = user?.role === "admin";
  const [viewAllOpen, setViewAllOpen] = useState(false);
  
  // Fetch recent activity
  const { data: activities, isLoading } = useQuery<Activity[]>({
    queryKey: ["/api/dashboard/recent-activity"],
  });
  
  // Fetch all activity when dialog is open
  const { data: allActivities, isLoading: allActivitiesLoading } = useQuery<Activity[]>({
    queryKey: ["/api/dashboard/all-activity"],
    enabled: viewAllOpen, // Only fetch when dialog is open
  });

  // Get icon based on activity type
  const getActivityIcon = (activity: Activity) => {
    const { action, entityType } = activity;
    
    if (action === "create" && entityType === "landingPage") {
      return <Upload className="text-primary" />;
    } else if (action === "download") {
      return <Download className="text-violet-500" />;
    } else if (action === "domain-replace") {
      return <Globe className="text-green-500" />;
    } else if (action === "update") {
      return <Edit className="text-primary" />;
    } else {
      return <Clock className="text-gray-400" />;
    }
  };

  // Format date
  const formatDate = (date: string) => {
    return formatDistanceToNow(new Date(date), { addSuffix: true });
  };
  
  // Render activity items
  const renderActivityItems = (items: Activity[] | undefined, isLoading: boolean) => {
    if (isLoading) {
      return Array(4).fill(0).map((_, i) => (
        <div key={i} className="p-4 hover:bg-accent">
          <div className="flex items-start">
            <div className="flex-shrink-0 pt-1">
              <Skeleton className="h-5 w-5 rounded-full" />
            </div>
            <div className="ml-3 w-0 flex-1 space-y-2">
              <Skeleton className="h-4 w-3/4" />
              <Skeleton className="h-3 w-1/4" />
            </div>
          </div>
        </div>
      ));
    }
    
    if (!items || items.length === 0) {
      return (
        <div className="p-6 text-center text-muted-foreground">
          No activity found
        </div>
      );
    }
    
    return items.map((activity) => (
      <div key={activity.id} className="p-4 hover:bg-muted/40 transition-colors">
        <div className="flex items-start">
          <div className="flex-shrink-0 pt-1">
            {getActivityIcon(activity)}
          </div>
          <div className="ml-3 w-0 flex-1">
            <p className="text-sm">
              <span className="font-medium">{activity.user.username}</span>{' '}
              {activity.details}
            </p>
            <div className="mt-1 flex items-center text-xs text-muted-foreground">
              <span>{formatDate(activity.createdAt)}</span>
            </div>
          </div>
        </div>
      </div>
    ));
  };

  return (
    <>
      <Card className="h-full flex flex-col">
        <CardHeader className="border-b">
          <CardTitle>Recent Activity</CardTitle>
        </CardHeader>
        
        <CardContent className="p-0 flex-grow overflow-auto">
          <div className="divide-y">
            {renderActivityItems(activities, isLoading)}
          </div>
        </CardContent>
        
        <CardFooter className="border-t px-5 py-3">
          <Button 
            variant="link" 
            className="px-0 h-auto text-primary"
            onClick={() => setViewAllOpen(true)}
          >
            View all activity
          </Button>
        </CardFooter>
      </Card>
      
      {/* View All Activity Dialog */}
      <Dialog open={viewAllOpen} onOpenChange={setViewAllOpen}>
        <DialogContent className="sm:max-w-2xl">
          <DialogHeader className="flex items-center justify-between">
            <DialogTitle>All Activity</DialogTitle>
            <Button 
              variant="ghost" 
              size="icon"
              onClick={() => setViewAllOpen(false)}
            >
              <X className="h-4 w-4" />
            </Button>
          </DialogHeader>
          
          <div className="max-h-[70vh] overflow-y-auto">
            <div className="divide-y">
              {renderActivityItems(allActivities, allActivitiesLoading)}
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
