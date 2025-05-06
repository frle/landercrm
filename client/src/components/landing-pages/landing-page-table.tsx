import { useState } from "react";
import { 
  Table, 
  TableBody, 
  TableCell, 
  TableHead, 
  TableHeader, 
  TableRow 
} from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { 
  DropdownMenu, 
  DropdownMenuContent, 
  DropdownMenuItem, 
  DropdownMenuTrigger 
} from "@/components/ui/dropdown-menu";
import { LandingPage, Category } from "@shared/schema";
import { formatDistanceToNow } from "date-fns";
import { Eye, Edit, Trash, MoreVertical, Download } from "lucide-react";
import { useAuth } from "@/hooks/use-auth";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useMutation } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import { 
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

interface LandingPageTableProps {
  landingPages: LandingPage[];
  categories: Category[];
  onView: (id: number) => void;
  onEdit: (landingPage: LandingPage) => void;
  onRefresh: () => void;
}

export function LandingPageTable({ landingPages, categories, onView, onEdit, onRefresh }: LandingPageTableProps) {
  const { user } = useAuth();
  const { toast } = useToast();
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [landingPageToDelete, setLandingPageToDelete] = useState<LandingPage | null>(null);
  
  const isAdmin = user?.role === "admin";
  
  // Find category name by ID
  const getCategoryName = (categoryId: number | null) => {
    if (!categoryId) return "Uncategorized";
    const category = categories.find(c => c.id === categoryId);
    return category ? category.name : "Uncategorized";
  };
  
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
      link.download = "landing-page.zip";
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      
      // Invalidate queries to reflect new download count
      queryClient.invalidateQueries({ queryKey: ["/api/dashboard/stats"] });
      queryClient.invalidateQueries({ queryKey: ["/api/landing-pages"] });
      
      toast({
        title: "Download started",
        description: "The landing page template is now downloading."
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
  
  // Delete landing page mutation
  const deleteMutation = useMutation({
    mutationFn: async (id: number) => {
      await apiRequest("DELETE", `/api/landing-pages/${id}`);
    },
    onSuccess: () => {
      toast({
        title: "Success",
        description: "Landing page deleted successfully."
      });
      queryClient.invalidateQueries({ queryKey: ["/api/landing-pages"] });
      queryClient.invalidateQueries({ queryKey: ["/api/dashboard/stats"] });
      queryClient.invalidateQueries({ queryKey: ["/api/dashboard/recent-landing-pages"] });
      setLandingPageToDelete(null);
      onRefresh();
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive"
      });
    }
  });
  
  const handleDelete = (landingPage: LandingPage) => {
    setLandingPageToDelete(landingPage);
    setDeleteDialogOpen(true);
  };
  
  const confirmDelete = () => {
    if (landingPageToDelete) {
      deleteMutation.mutate(landingPageToDelete.id);
    }
    setDeleteDialogOpen(false);
  };

  return (
    <>
      <div className="rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Name</TableHead>
              <TableHead>Category</TableHead>
              <TableHead>Date Added</TableHead>
              <TableHead>Downloads</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {landingPages.length === 0 ? (
              <TableRow>
                <TableCell colSpan={5} className="text-center py-6 text-muted-foreground">
                  No landing pages found
                </TableCell>
              </TableRow>
            ) : (
              landingPages.map((landingPage) => (
                <TableRow key={landingPage.id}>
                  <TableCell>
                    <div className="flex items-center space-x-3">
                      <div className="h-10 w-10 flex-shrink-0 overflow-hidden rounded-md">
                        {landingPage.screenshotUrl ? (
                          <img 
                            src={landingPage.screenshotUrl} 
                            alt={landingPage.name} 
                            className="h-10 w-10 object-cover"
                          />
                        ) : (
                          <div className="h-10 w-10 bg-secondary flex items-center justify-center">
                            <span className="text-xs text-muted-foreground">No image</span>
                          </div>
                        )}
                      </div>
                      <div>
                        <div className="font-medium">{landingPage.name}</div>
                        <div className="text-sm text-muted-foreground line-clamp-1">
                          {landingPage.description || "No description"}
                        </div>
                      </div>
                    </div>
                  </TableCell>
                  <TableCell>
                    <Badge variant="secondary">
                      {getCategoryName(landingPage.categoryId)}
                    </Badge>
                  </TableCell>
                  <TableCell>{formatDate(landingPage.createdAt)}</TableCell>
                  <TableCell>{landingPage.downloadCount}</TableCell>
                  <TableCell className="text-right">
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="sm">
                          <MoreVertical className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem onClick={() => onView(landingPage.id)}>
                          <Eye className="mr-2 h-4 w-4" />
                          View
                        </DropdownMenuItem>
                        {landingPage.zipFileUrl && (
                          <DropdownMenuItem 
                            onClick={() => downloadMutation.mutate(landingPage.id)}
                            disabled={downloadMutation.isPending}
                          >
                            <Download className="mr-2 h-4 w-4" />
                            Download
                          </DropdownMenuItem>
                        )}
                        {isAdmin && (
                          <>
                            <DropdownMenuItem onClick={() => onEdit(landingPage)}>
                              <Edit className="mr-2 h-4 w-4" />
                              Edit
                            </DropdownMenuItem>
                            <DropdownMenuItem 
                              onClick={() => handleDelete(landingPage)}
                              className="text-destructive focus:text-destructive"
                            >
                              <Trash className="mr-2 h-4 w-4" />
                              Delete
                            </DropdownMenuItem>
                          </>
                        )}
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>
      
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Are you sure?</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently delete the landing page &quot;{landingPageToDelete?.name}&quot;.
              This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction 
              onClick={confirmDelete}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
