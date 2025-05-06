import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useLocation, Link } from "wouter";
import { Tag, ChevronDown, ChevronUp } from "lucide-react";
import { cn } from "@/lib/utils";
import { Category } from "@shared/schema";
import { CategoryForm } from "./category-form";
import { Badge } from "@/components/ui/badge";
import { useAuth } from "@/hooks/use-auth";

export function CategoriesList() {
  const [location] = useLocation();
  const [expanded, setExpanded] = useState(true);
  const { user } = useAuth();
  const isAdmin = user?.role === "admin";

  const { data: categories = [] } = useQuery<Category[]>({
    queryKey: ["/api/categories"],
  });

  return (
    <div className="px-2 py-2 mt-2">
      <div 
        className="flex items-center justify-between px-2 py-1.5 text-sm font-medium cursor-pointer text-muted-foreground hover:text-foreground transition-colors"
        onClick={() => setExpanded(!expanded)}
      >
        <div className="flex items-center">
          <Tag className="h-4 w-4 mr-2" />
          <span>Categories</span>
        </div>
        {expanded ? (
          <ChevronUp className="h-4 w-4" />
        ) : (
          <ChevronDown className="h-4 w-4" />
        )}
      </div>
      
      {expanded && (
        <div className="mt-1 space-y-1 pl-6">
          <Link href="/landing-pages">
            <a
              className={cn(
                "flex items-center justify-between px-2 py-1.5 text-sm rounded-md transition-colors",
                location === "/landing-pages" && !location.includes("/category/")
                  ? "bg-accent text-accent-foreground font-medium"
                  : "text-muted-foreground hover:text-foreground hover:bg-accent/50"
              )}
            >
              <span>All</span>
              <Badge variant="outline" className="ml-auto">
                {categories.reduce((acc, cat) => acc + (cat.pageCount || 0), 0)}
              </Badge>
            </a>
          </Link>

          {categories.map((category) => (
            <Link key={category.id} href={`/landing-pages/category/${category.id}`}>
              <a
                className={cn(
                  "flex items-center justify-between px-2 py-1.5 text-sm rounded-md transition-colors",
                  location === `/landing-pages/category/${category.id}`
                    ? "bg-accent text-accent-foreground font-medium"
                    : "text-muted-foreground hover:text-foreground hover:bg-accent/50"
                )}
              >
                <span>{category.name}</span>
                <Badge variant="outline" className="ml-auto">
                  {category.pageCount || 0}
                </Badge>
              </a>
            </Link>
          ))}
          
          {isAdmin && <CategoryForm />}
        </div>
      )}
    </div>
  );
}