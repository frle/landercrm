import { useState } from "react";
import { Sidebar } from "@/components/layout/sidebar";
import { Header } from "@/components/layout/header";
import { UserTable } from "@/components/users/user-table";
import { UserForm } from "@/components/users/user-form";
import { Plus } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { User } from "@shared/schema";
import { useAuth } from "@/hooks/use-auth";
import { Skeleton } from "@/components/ui/skeleton";
import { Redirect } from "wouter";

export default function UserManagementPage() {
  const { user } = useAuth();
  const isAdmin = user?.role === "admin";
  const [formOpen, setFormOpen] = useState(false);
  const [userToEdit, setUserToEdit] = useState<User | undefined>(undefined);

  // Fetch users (admin only)
  const { data: users = [], isLoading } = useQuery<User[]>({
    queryKey: ["/api/users"],
    enabled: isAdmin,
  });

  // If not admin, redirect to dashboard
  if (!isAdmin) {
    return <Redirect to="/" />;
  }

  // Handle form open for editing
  const handleEdit = (user: User) => {
    setUserToEdit(user);
    setFormOpen(true);
  };

  // Handle form open for new user
  const handleAdd = () => {
    setUserToEdit(undefined);
    setFormOpen(true);
  };

  return (
    <div className="flex h-screen overflow-hidden">
      <Sidebar />
      
      <main className="flex-1 overflow-y-auto md:pl-64">
        <div className="py-6 px-4 sm:px-6 lg:px-8">
          {/* Page header */}
          <Header 
            title="User Management"
            description="Manage user accounts and permissions."
            action={{
              label: "Add User",
              icon: <Plus className="h-4 w-4 mr-2" />,
              onClick: handleAdd
            }}
          />

          {/* Users table */}
          <div className="mt-6">
            {isLoading ? (
              <div className="space-y-4">
                <Skeleton className="h-[500px] w-full rounded-md" />
              </div>
            ) : (
              <UserTable 
                users={users}
                onEdit={handleEdit}
              />
            )}
          </div>
        </div>
      </main>

      {/* User form dialog */}
      <UserForm 
        isOpen={formOpen} 
        onClose={() => {
          setFormOpen(false);
          setUserToEdit(undefined);
        }}
        user={userToEdit} 
      />
    </div>
  );
}
