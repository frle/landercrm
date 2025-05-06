import { useState } from "react";
import { Sidebar } from "@/components/layout/sidebar";
import { Header } from "@/components/layout/header";
import { StatsCard } from "@/components/dashboard/stats-card";
import { RecentActivity } from "@/components/dashboard/recent-activity";
import { CategoryBreakdown } from "@/components/dashboard/category-breakdown";
import { LandingPageCard } from "@/components/landing-pages/landing-page-card";
import { LandingPageForm } from "@/components/landing-pages/landing-page-form";
import { useQuery } from "@tanstack/react-query";
import { LandingPage, Category } from "@shared/schema";
import { Plus, FileText, Download, Tag, Users } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/hooks/use-auth";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";

export default function HomePage() {
  const { user } = useAuth();
  const isAdmin = user?.role === "admin";
  const [landingPageFormOpen, setLandingPageFormOpen] = useState(false);
  const [viewLandingPageId, setViewLandingPageId] = useState<number | null>(null);

  // Fetch dashboard stats
  const { data: stats, isLoading: statsLoading } = useQuery({
    queryKey: ["/api/dashboard/stats"],
  });

  // Fetch recent landing pages
  const { data: recentLandingPages = [], isLoading: pagesLoading } = useQuery<LandingPage[]>({
    queryKey: ["/api/dashboard/recent-landing-pages"],
  });

  // Fetch categories (needed for displaying category names)
  const { data: categories = [] } = useQuery<Category[]>({
    queryKey: ["/api/categories"],
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

  // Handle landing page card view button
  const handleViewLandingPage = (id: number) => {
    setViewLandingPageId(id);
  };

  return (
    <div className="flex h-screen overflow-hidden">
      <Sidebar />
      
      <main className="flex-1 overflow-y-auto md:pl-64">
        <div className="py-6 px-4 sm:px-6 lg:px-8">
          {/* Page header */}
          <Header 
            title="Dashboard" 
            description="Welcome to your landing page library management system."
            action={isAdmin ? {
              label: "Add Landing Page",
              icon: <Plus className="h-4 w-4 mr-2" />,
              onClick: () => setLandingPageFormOpen(true)
            } : undefined}
          />

          {/* Stats cards */}
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4 mt-6">
            <StatsCard 
              title="Total Landing Pages" 
              value={statsLoading ? "..." : stats?.totalLandingPages} 
              icon={<FileText className="h-5 w-5" />}
              isLoading={statsLoading}
            />
            <StatsCard 
              title="Total Downloads" 
              value={statsLoading ? "..." : stats?.totalDownloads} 
              icon={<Download className="h-5 w-5" />}
              isLoading={statsLoading}
            />
            <StatsCard 
              title="Categories" 
              value={statsLoading ? "..." : stats?.categoriesCount} 
              icon={<Tag className="h-5 w-5" />}
              isLoading={statsLoading}
            />
            <StatsCard 
              title="Active Users" 
              value={statsLoading ? "..." : stats?.activeUsers} 
              icon={<Users className="h-5 w-5" />}
              isLoading={statsLoading}
            />
          </div>

          {/* Recent activity & Category breakdown */}
          <div className="grid grid-cols-1 gap-4 lg:grid-cols-2 mt-6">
            <RecentActivity />
            <CategoryBreakdown />
          </div>

          {/* Recently added landing pages */}
          <div className="mt-6">
            <h3 className="text-lg font-medium mb-4">Recently Added Landing Pages</h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {pagesLoading ? (
                // Loading skeletons
                Array(3).fill(0).map((_, i) => (
                  <div key={i} className="border rounded-lg shadow-sm h-[360px] animate-pulse bg-card">
                    <div className="h-48 w-full bg-muted rounded-t-lg"></div>
                    <div className="p-4">
                      <div className="h-4 w-3/4 bg-muted rounded mb-2"></div>
                      <div className="h-4 w-full bg-muted rounded mb-4"></div>
                      <div className="h-3 w-1/2 bg-muted rounded mt-4"></div>
                    </div>
                    <div className="border-t p-4 flex justify-between items-center">
                      <div className="h-3 w-16 bg-muted rounded"></div>
                      <div className="flex space-x-2">
                        <div className="h-8 w-16 bg-muted rounded"></div>
                        <div className="h-8 w-24 bg-muted rounded"></div>
                      </div>
                    </div>
                  </div>
                ))
              ) : recentLandingPages.length > 0 ? (
                recentLandingPages.map(landingPage => (
                  <LandingPageCard 
                    key={landingPage.id} 
                    landingPage={{
                      ...landingPage,
                      category: categories.find(c => c.id === landingPage.categoryId)
                    }}
                    onView={handleViewLandingPage}
                  />
                ))
              ) : (
                <div className="col-span-full text-center py-12 text-muted-foreground">
                  <p>No landing pages found. Add your first landing page to get started.</p>
                  {isAdmin && (
                    <Button onClick={() => setLandingPageFormOpen(true)} className="mt-4">
                      <Plus className="h-4 w-4 mr-2" />
                      Add Landing Page
                    </Button>
                  )}
                </div>
              )}
            </div>
            
            {recentLandingPages.length > 0 && (
              <div className="mt-4 text-center">
                <Button variant="outline" onClick={() => window.location.href = "/landing-pages"}>
                  View All Landing Pages
                </Button>
              </div>
            )}
          </div>
        </div>
      </main>

      {/* Landing page form dialog */}
      <LandingPageForm 
        isOpen={landingPageFormOpen} 
        onClose={() => setLandingPageFormOpen(false)} 
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
                    <Download className="h-4 w-4 mr-2" />
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
