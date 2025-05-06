import { LandingPage, Category } from "@shared/schema";
import { Card, CardContent, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { formatDistanceToNow } from "date-fns";
import { Eye, Download } from "lucide-react";
import { useAuth } from "@/hooks/use-auth";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useMutation } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";

interface LandingPageCardProps {
  landingPage: LandingPage & { category?: Category };
  onView: (id: number) => void;
}

export function LandingPageCard({ landingPage, onView }: LandingPageCardProps) {
  const { user } = useAuth();
  const { toast } = useToast();
  
  // Format date 
  const formatDate = (date: Date | string) => {
    return formatDistanceToNow(new Date(date), { addSuffix: true });
  };

  // Handle download
  const downloadMutation = useMutation({
    mutationFn: async (id: number) => {
      const res = await apiRequest("POST", `/api/landing-pages/${id}/download`);
      return await res.json();
    },
    onSuccess: (data) => {
      // Create temporary link to download the file
      const link = document.createElement("a");
      link.href = data.zipFileUrl;
      link.download = `${landingPage.name}.zip`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      
      // Invalidate queries to reflect new download count
      queryClient.invalidateQueries({ queryKey: ["/api/dashboard/stats"] });
      queryClient.invalidateQueries({ queryKey: ["/api/landing-pages"] });
      queryClient.invalidateQueries({ queryKey: ["/api/dashboard/recent-landing-pages"] });
      
      toast({
        title: "Download started",
        description: `The ${landingPage.name} template is now downloading.`
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Download failed",
        description: error.message,
        variant: "destructive"
      });
    }
  });

  const handleDownload = () => {
    downloadMutation.mutate(landingPage.id);
  };

  return (
    <Card className="flex flex-col h-full">
      <div className="relative">
        {landingPage.screenshotUrl ? (
          <img 
            src={landingPage.screenshotUrl} 
            alt={landingPage.name} 
            className="w-full h-48 object-cover rounded-t-lg"
          />
        ) : (
          <div className="w-full h-48 bg-muted flex items-center justify-center rounded-t-lg">
            <p className="text-muted-foreground">No Screenshot</p>
          </div>
        )}
        {landingPage.category && (
          <Badge className="absolute top-2 right-2" variant="secondary">
            {landingPage.category.name}
          </Badge>
        )}
      </div>
      <CardContent className="p-4 flex-grow">
        <h4 className="text-lg font-medium mb-1">{landingPage.name}</h4>
        <p className="text-sm text-muted-foreground line-clamp-2 mb-2">
          {landingPage.description || "No description provided"}
        </p>
        <p className="text-sm text-muted-foreground mt-2">
          Added: {formatDate(landingPage.createdAt)}
        </p>
      </CardContent>
      <CardFooter className="border-t p-4 flex justify-between items-center">
        <span className="text-xs text-muted-foreground">{landingPage.downloadCount} downloads</span>
        <div className="flex space-x-2">
          <Button 
            variant="outline" 
            size="sm"
            onClick={() => onView(landingPage.id)}
          >
            <Eye className="h-4 w-4 mr-1" />
            View
          </Button>
          <Button 
            size="sm"
            onClick={handleDownload}
            disabled={!landingPage.zipFileUrl || downloadMutation.isPending}
          >
            <Download className="h-4 w-4 mr-1" />
            Download
          </Button>
        </div>
      </CardFooter>
    </Card>
  );
}
