import { useState } from "react";
import { Sidebar } from "@/components/layout/sidebar";
import { Header } from "@/components/layout/header";
import { LandingPageTable } from "@/components/landing-pages/landing-page-table";
import { LandingPageForm } from "@/components/landing-pages/landing-page-form";
import { LandingPage, Category } from "@shared/schema";
import { Plus, Search, Filter } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { useQuery } from "@tanstack/react-query";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Pagination, PaginationContent, PaginationItem, PaginationLink, PaginationNext, PaginationPrevious } from "@/components/ui/pagination";
import { Skeleton } from "@/components/ui/skeleton";

export default function LandingPagesPage() {
  const [searchTerm, setSearchTerm] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("");
  const [dateFilter, setDateFilter] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const [formOpen, setFormOpen] = useState(false);
  const [landingPageToEdit, setLandingPageToEdit] = useState<LandingPage | undefined>(undefined);
  const [viewLandingPageId, setViewLandingPageId] = useState<number | null>(null);
  const [refreshTrigger, setRefreshTrigger] = useState(0);
  
  const limit = 10; // Items per page

  // Fetch categories
  const { data: categories = [] } = useQuery<Category[]>({
    queryKey: ["/api/categories"],
  });

  // Fetch landing pages with filters
  const { data, isLoading, refetch } = useQuery({
    queryKey: ["/api/landing-pages", searchTerm, categoryFilter, dateFilter, currentPage, refreshTrigger],
    queryFn: async () => {
      const searchParams = new URLSearchParams();
      if (searchTerm) searchParams.append("search", searchTerm);
      if (categoryFilter) searchParams.append("category", categoryFilter);
      if (dateFilter) searchParams.append("date", dateFilter);
      searchParams.append("page", currentPage.toString());
      searchParams.append("limit", limit.toString());
      
      const res = await fetch(`/api/landing-pages?${searchParams.toString()}`);
      if (!res.ok) throw new Error("Failed to fetch landing pages");
      return res.json();
    },
  });

  // Fetch landing page details for the view dialog
  const { data: viewLandingPage, isLoading: viewLandingPageLoading } = useQuery({
    queryKey: ["/api/landing-pages", viewLandingPageId],
    queryFn: async () => {
      if (!viewLandingPageId) return null;
      const res = await fetch(`/api/landing-pages/${viewLandingPageId}`);
      if (!res.ok) throw new Error("Failed to fetch landing page");
      return res.json();
    },
    enabled: !!viewLandingPageId,
  });

  // Get category name by ID
  const getCategoryName = (categoryId: number | null) => {
    if (!categoryId) return "Uncategorized";
    const category = categories.find(c => c.id === categoryId);
    return category ? category.name : "Uncategorized";
  };

  // Handle form open for editing
  const handleEdit = (landingPage: LandingPage) => {
    setLandingPageToEdit(landingPage);
    setFormOpen(true);
  };

  // Handle form open for new landing page
  const handleAdd = () => {
    setLandingPageToEdit(undefined);
    setFormOpen(true);
  };

  // Handle view landing page
  const handleView = (id: number) => {
    setViewLandingPageId(id);
  };

  // Handle refresh after actions
  const handleRefresh = () => {
    setRefreshTrigger(prev => prev + 1);
    refetch();
  };

  // Handle filter application
  const applyFilters = () => {
    setCurrentPage(1); // Reset to first page
    refetch();
  };

  // Handle pagination
  const totalPages = data ? Math.ceil(data.total / limit) : 0;
  
  const handlePreviousPage = () => {
    if (currentPage > 1) {
      setCurrentPage(currentPage - 1);
    }
  };
  
  const handleNextPage = () => {
    if (currentPage < totalPages) {
      setCurrentPage(currentPage + 1);
    }
  };

  return (
    <div className="flex h-screen overflow-hidden">
      <Sidebar />
      
      <main className="flex-1 overflow-y-auto md:pl-64">
        <div className="py-6 px-4 sm:px-6 lg:px-8">
          {/* Page header */}
          <Header 
            title="Landing Pages" 
            description="Manage all your landing page templates in one place."
            action={{
              label: "Add Landing Page",
              icon: <Plus className="h-4 w-4 mr-2" />,
              onClick: handleAdd
            }}
          />

          {/* Search and filters */}
          <Card className="mt-6">
            <CardContent className="p-4">
              <div className="grid grid-cols-1 gap-4 md:grid-cols-4">
                <div className="space-y-2">
                  <Label htmlFor="search">Search</Label>
                  <div className="relative">
                    <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
                    <Input
                      id="search"
                      placeholder="Search landing pages..."
                      className="pl-8"
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                    />
                  </div>
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="category">Category</Label>
                  <Select value={categoryFilter} onValueChange={setCategoryFilter}>
                    <SelectTrigger id="category">
                      <SelectValue placeholder="All Categories" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="">All Categories</SelectItem>
                      {categories.map((category) => (
                        <SelectItem key={category.id} value={category.id.toString()}>
                          {category.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="date">Date Added</Label>
                  <Select value={dateFilter} onValueChange={setDateFilter}>
                    <SelectTrigger id="date">
                      <SelectValue placeholder="All Time" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="">All Time</SelectItem>
                      <SelectItem value="today">Today</SelectItem>
                      <SelectItem value="week">This Week</SelectItem>
                      <SelectItem value="month">This Month</SelectItem>
                      <SelectItem value="year">This Year</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                
                <div className="flex items-end">
                  <Button className="w-full" onClick={applyFilters}>
                    <Filter className="h-4 w-4 mr-2" />
                    Apply Filters
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Landing pages table */}
          <div className="mt-6">
            {isLoading ? (
              <div className="space-y-4">
                <Skeleton className="h-[500px] w-full rounded-md" />
              </div>
            ) : (
              <LandingPageTable 
                landingPages={data?.landingPages || []}
                categories={categories}
                onView={handleView}
                onEdit={handleEdit}
                onRefresh={handleRefresh}
              />
            )}
            
            {/* Pagination */}
            {data && data.total > 0 && (
              <div className="mt-4 flex items-center justify-between">
                <div className="text-sm text-muted-foreground">
                  Showing {(currentPage - 1) * limit + 1} to {Math.min(currentPage * limit, data.total)} of {data.total} results
                </div>
                <Pagination>
                  <PaginationContent>
                    <PaginationItem>
                      <PaginationPrevious 
                        onClick={handlePreviousPage} 
                        className={currentPage === 1 ? "pointer-events-none opacity-50" : "cursor-pointer"}
                      />
                    </PaginationItem>
                    
                    {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                      // Show a window of pages around the current page
                      let pageNum;
                      if (totalPages <= 5) {
                        pageNum = i + 1;
                      } else if (currentPage <= 3) {
                        pageNum = i + 1;
                      } else if (currentPage >= totalPages - 2) {
                        pageNum = totalPages - 4 + i;
                      } else {
                        pageNum = currentPage - 2 + i;
                      }
                      
                      return (
                        <PaginationItem key={pageNum}>
                          <PaginationLink
                            onClick={() => setCurrentPage(pageNum)}
                            isActive={currentPage === pageNum}
                          >
                            {pageNum}
                          </PaginationLink>
                        </PaginationItem>
                      );
                    })}
                    
                    <PaginationItem>
                      <PaginationNext 
                        onClick={handleNextPage} 
                        className={currentPage === totalPages ? "pointer-events-none opacity-50" : "cursor-pointer"}
                      />
                    </PaginationItem>
                  </PaginationContent>
                </Pagination>
              </div>
            )}
          </div>
        </div>
      </main>

      {/* Landing page form dialog */}
      <LandingPageForm 
        isOpen={formOpen} 
        onClose={() => {
          setFormOpen(false);
          setLandingPageToEdit(undefined);
        }}
        landingPage={landingPageToEdit} 
      />

      {/* View landing page dialog */}
      <Dialog open={!!viewLandingPageId} onOpenChange={(open) => !open && setViewLandingPageId(null)}>
        <DialogContent className="sm:max-w-2xl">
          <DialogHeader>
            <DialogTitle>{viewLandingPage?.name}</DialogTitle>
          </DialogHeader>
          
          {viewLandingPageLoading ? (
            <div className="py-8 flex justify-center">
              <div className="animate-spin h-8 w-8 border-4 border-primary border-t-transparent rounded-full"></div>
            </div>
          ) : viewLandingPage ? (
            <div className="space-y-4">
              {viewLandingPage.screenshotUrl && (
                <div className="rounded-md overflow-hidden border">
                  <img 
                    src={viewLandingPage.screenshotUrl} 
                    alt={viewLandingPage.name} 
                    className="w-full object-cover max-h-[300px]"
                  />
                </div>
              )}
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <h4 className="text-sm font-medium text-muted-foreground">Category</h4>
                  <p>{getCategoryName(viewLandingPage.categoryId)}</p>
                </div>
                
                <div>
                  <h4 className="text-sm font-medium text-muted-foreground">Downloads</h4>
                  <p>{viewLandingPage.downloadCount}</p>
                </div>
                
                {viewLandingPage.mainHeadline && (
                  <div className="col-span-full">
                    <h4 className="text-sm font-medium text-muted-foreground">Main Headline</h4>
                    <p>{viewLandingPage.mainHeadline}</p>
                  </div>
                )}
                
                {viewLandingPage.description && (
                  <div className="col-span-full">
                    <h4 className="text-sm font-medium text-muted-foreground">Description</h4>
                    <p>{viewLandingPage.description}</p>
                  </div>
                )}
                
                {viewLandingPage.liveUrl && (
                  <div className="col-span-full">
                    <h4 className="text-sm font-medium text-muted-foreground">Live URL</h4>
                    <a 
                      href={viewLandingPage.liveUrl} 
                      target="_blank" 
                      rel="noopener noreferrer"
                      className="text-primary hover:underline"
                    >
                      {viewLandingPage.liveUrl}
                    </a>
                  </div>
                )}
              </div>
              
              <div className="flex justify-end pt-4">
                {viewLandingPage.zipFileUrl && (
                  <Button onClick={() => {
                    fetch(`/api/landing-pages/${viewLandingPage.id}/download`, { 
                      method: 'POST',
                      credentials: 'include'
                    })
                    .then(res => res.json())
                    .then(data => {
                      const link = document.createElement('a');
                      link.href = data.zipFileUrl;
                      link.download = `${viewLandingPage.name}.zip`;
                      document.body.appendChild(link);
                      link.click();
                      document.body.removeChild(link);
                    });
                  }}>
                    <Plus className="h-4 w-4 mr-2" />
                    Download Template
                  </Button>
                )}
              </div>
            </div>
          ) : (
            <div className="py-8 text-center text-muted-foreground">
              Landing page not found
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
