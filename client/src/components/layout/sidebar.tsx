import { Link, useLocation } from "wouter";
import { cn } from "@/lib/utils";
import { useAuth } from "@/hooks/use-auth";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import {
  LayoutDashboard,
  FileText,
  Globe,
  Users,
  LogOut,
  Menu,
  X
} from "lucide-react";
import { useState } from "react";

interface SidebarNavItem {
  title: string;
  href: string;
  icon: React.ReactNode;
  adminOnly?: boolean;
}

const navItems: SidebarNavItem[] = [
  {
    title: "Dashboard",
    href: "/",
    icon: <LayoutDashboard className="h-5 w-5" />
  },
  {
    title: "Landing Pages",
    href: "/landing-pages",
    icon: <FileText className="h-5 w-5" />
  },
  {
    title: "Domain Manager",
    href: "/domain-manager",
    icon: <Globe className="h-5 w-5" />
  },
  {
    title: "User Management",
    href: "/user-management",
    icon: <Users className="h-5 w-5" />,
    adminOnly: true
  }
];

export function Sidebar() {
  const [location] = useLocation();
  const { user, logoutMutation } = useAuth();
  const [isOpen, setIsOpen] = useState(false);

  const handleLogout = () => {
    logoutMutation.mutate();
  };

  const isAdmin = user?.role === "admin";
  const filteredNavItems = navItems.filter(item => !item.adminOnly || isAdmin);
  
  // Get user initials for avatar
  const getInitials = (name: string) => {
    return name.charAt(0).toUpperCase();
  };

  const SidebarContent = () => (
    <div className="flex flex-col flex-grow pt-5 overflow-y-auto bg-white dark:bg-gray-900 border-r border-slate-200 dark:border-slate-700">
      <div className="flex items-center justify-center px-4">
        <h1 className="text-xl font-bold text-primary">Landing Page CRM</h1>
      </div>
      <nav className="flex-1 px-2 mt-8 space-y-1">
        {filteredNavItems.map((item) => (
          <Link key={item.href} href={item.href}>
            <a
              className={cn(
                "flex items-center px-4 py-2 text-sm font-medium rounded-md transition-colors",
                location === item.href
                  ? "bg-primary text-primary-foreground"
                  : "text-muted-foreground hover:bg-accent hover:text-accent-foreground"
              )}
            >
              {item.icon}
              <span className="ml-3">{item.title}</span>
            </a>
          </Link>
        ))}
      </nav>
      
      {/* User profile section */}
      <div className="flex items-center px-4 py-3 mt-auto border-t border-gray-200 dark:border-gray-700">
        <Avatar>
          <AvatarFallback>{user ? getInitials(user.username) : "U"}</AvatarFallback>
        </Avatar>
        <div className="ml-3">
          <p className="text-sm font-medium">{user?.username || "User"}</p>
          <Button variant="link" size="sm" className="px-0 h-auto text-xs text-muted-foreground" onClick={handleLogout}>
            Sign out
          </Button>
        </div>
      </div>
    </div>
  );

  return (
    <>
      {/* Desktop sidebar */}
      <aside className="hidden md:flex md:w-64 flex-col fixed inset-y-0 z-50">
        <SidebarContent />
      </aside>
      
      {/* Mobile header */}
      <div className="sticky top-0 z-40 flex items-center justify-between w-full h-16 px-4 border-b border-gray-200 dark:border-gray-700 md:hidden bg-white dark:bg-gray-900">
        <button 
          type="button" 
          className="p-2 text-gray-500 rounded-md md:hidden"
          onClick={() => setIsOpen(true)}
        >
          <Menu />
        </button>
        <div className="flex items-center">
          <h1 className="text-lg font-bold text-primary">Landing Page CRM</h1>
        </div>
        <Avatar className="h-8 w-8">
          <AvatarFallback>{user ? getInitials(user.username) : "U"}</AvatarFallback>
        </Avatar>
      </div>
      
      {/* Mobile sidebar (hidden by default) */}
      {isOpen && (
        <div className="fixed inset-0 z-50 flex flex-col w-64 bg-white dark:bg-gray-900 border-r border-slate-200 dark:border-slate-700 md:hidden">
          <div className="flex items-center justify-between p-4 border-b border-gray-200 dark:border-gray-700">
            <h1 className="text-lg font-bold text-primary">Landing Page CRM</h1>
            <button 
              className="p-2 text-gray-500 rounded-md"
              onClick={() => setIsOpen(false)}
            >
              <X />
            </button>
          </div>
          <nav className="flex-1 px-2 mt-4 space-y-1 overflow-y-auto">
            {filteredNavItems.map((item) => (
              <Link key={item.href} href={item.href}>
                <a
                  className={cn(
                    "flex items-center px-4 py-2 text-sm font-medium rounded-md transition-colors",
                    location === item.href
                      ? "bg-primary text-primary-foreground"
                      : "text-muted-foreground hover:bg-accent hover:text-accent-foreground"
                  )}
                  onClick={() => setIsOpen(false)}
                >
                  {item.icon}
                  <span className="ml-3">{item.title}</span>
                </a>
              </Link>
            ))}
          </nav>
          <div className="flex items-center px-4 py-3 mt-auto border-t border-gray-200 dark:border-gray-700">
            <Avatar>
              <AvatarFallback>{user ? getInitials(user.username) : "U"}</AvatarFallback>
            </Avatar>
            <div className="ml-3">
              <p className="text-sm font-medium">{user?.username || "User"}</p>
              <Button variant="link" size="sm" className="px-0 h-auto text-xs text-muted-foreground" onClick={handleLogout}>
                Sign out
              </Button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
