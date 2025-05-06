import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { useMutation } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { LandingPage } from "@shared/schema";
import { RefreshCw, Search } from "lucide-react";

interface DomainReplaceFormProps {
  onHistoryChange: () => void;
}

export function DomainReplaceForm({ onHistoryChange }: DomainReplaceFormProps) {
  const { toast } = useToast();
  const [oldDomain, setOldDomain] = useState("");
  const [newDomain, setNewDomain] = useState("");
  const [previewMode, setPreviewMode] = useState(true);
  const [previewResults, setPreviewResults] = useState<{
    recordsAffected: number;
    affectedPages: LandingPage[];
  } | null>(null);

  // Preview domain replace mutation
  const previewMutation = useMutation({
    mutationFn: async () => {
      const res = await apiRequest("POST", "/api/domains/replace", {
        oldDomain,
        newDomain,
        previewMode: true
      });
      return await res.json();
    },
    onSuccess: (data) => {
      setPreviewResults(data);
      
      toast({
        title: "Preview generated",
        description: `${data.recordsAffected} landing pages would be affected by this change.`
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Preview failed",
        description: error.message,
        variant: "destructive"
      });
    }
  });

  // Execute domain replace mutation
  const replaceMutation = useMutation({
    mutationFn: async () => {
      const res = await apiRequest("POST", "/api/domains/replace", {
        oldDomain,
        newDomain,
        previewMode: false
      });
      return await res.json();
    },
    onSuccess: (data) => {
      setPreviewResults(null);
      setOldDomain("");
      setNewDomain("");
      
      toast({
        title: "Domain replaced successfully",
        description: `Updated ${data.recordsAffected} landing pages.`
      });
      
      // Invalidate queries
      queryClient.invalidateQueries({ queryKey: ["/api/domains/history"] });
      queryClient.invalidateQueries({ queryKey: ["/api/landing-pages"] });
      queryClient.invalidateQueries({ queryKey: ["/api/dashboard/recent-activity"] });
      
      // Notify parent component
      onHistoryChange();
    },
    onError: (error: Error) => {
      toast({
        title: "Domain replacement failed",
        description: error.message,
        variant: "destructive"
      });
    }
  });

  const handlePreview = () => {
    if (!oldDomain || !newDomain) {
      toast({
        title: "Validation error",
        description: "Please enter both old and new domains.",
        variant: "destructive"
      });
      return;
    }
    
    previewMutation.mutate();
  };

  const handleReplace = () => {
    if (!oldDomain || !newDomain) {
      toast({
        title: "Validation error",
        description: "Please enter both old and new domains.",
        variant: "destructive"
      });
      return;
    }
    
    replaceMutation.mutate();
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Mass Domain Replacement</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          <div className="space-y-2">
            <Label htmlFor="old-domain">Old Domain</Label>
            <Input 
              id="old-domain" 
              placeholder="e.g. olddomain.com" 
              value={oldDomain}
              onChange={(e) => setOldDomain(e.target.value)}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="new-domain">New Domain</Label>
            <Input 
              id="new-domain" 
              placeholder="e.g. newdomain.com" 
              value={newDomain}
              onChange={(e) => setNewDomain(e.target.value)}
            />
          </div>
        </div>
        
        <div className="mt-4 flex items-center space-x-2">
          <Checkbox 
            id="preview-mode" 
            checked={previewMode}
            onCheckedChange={(checked) => setPreviewMode(checked as boolean)}
          />
          <Label htmlFor="preview-mode" className="text-sm cursor-pointer">
            Enable preview mode (no changes will be made)
          </Label>
        </div>
        
        <div className="mt-6 flex flex-col space-y-3 sm:flex-row sm:space-y-0 sm:space-x-3">
          {previewMode ? (
            <Button 
              onClick={handlePreview}
              disabled={previewMutation.isPending || !oldDomain || !newDomain}
            >
              <Search className="mr-2 h-4 w-4" />
              Preview Affected Records
            </Button>
          ) : (
            <Button 
              onClick={handleReplace}
              disabled={replaceMutation.isPending || !oldDomain || !newDomain}
            >
              <RefreshCw className="mr-2 h-4 w-4" />
              Replace Domains
            </Button>
          )}
        </div>
        
        {/* Preview results */}
        {previewResults && (
          <div className="mt-6 border rounded-md p-4">
            <h3 className="font-medium mb-2">Preview Results</h3>
            <p className="text-sm text-muted-foreground mb-4">
              {previewResults.recordsAffected} landing pages will be affected by this change.
            </p>
            
            {previewResults.affectedPages.length > 0 ? (
              <div className="space-y-2">
                <p className="text-sm font-medium">Affected landing pages:</p>
                <ul className="text-sm space-y-1">
                  {previewResults.affectedPages.map((page) => (
                    <li key={page.id} className="text-muted-foreground">
                      {page.name} {page.liveUrl && `(${page.liveUrl})`}
                    </li>
                  ))}
                </ul>
                
                {previewMode && (
                  <Button 
                    className="mt-4" 
                    onClick={() => {
                      setPreviewMode(false);
                      handleReplace();
                    }}
                    disabled={replaceMutation.isPending}
                  >
                    <RefreshCw className="mr-2 h-4 w-4" />
                    Apply Changes
                  </Button>
                )}
              </div>
            ) : (
              <p className="text-sm text-muted-foreground">
                No landing pages contain the specified domain.
              </p>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
