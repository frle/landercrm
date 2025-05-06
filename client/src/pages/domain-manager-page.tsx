import { useState } from "react";
import { Sidebar } from "@/components/layout/sidebar";
import { Header } from "@/components/layout/header";
import { DomainReplaceForm } from "@/components/domain/domain-replace-form";
import { DomainHistoryTable } from "@/components/domain/domain-history-table";
import { useAuth } from "@/hooks/use-auth";

export default function DomainManagerPage() {
  const { user } = useAuth();
  const isAdmin = user?.role === "admin";
  const [refreshTrigger, setRefreshTrigger] = useState(0);

  // Function to be called when domain history needs to be refreshed
  const handleHistoryChange = () => {
    setRefreshTrigger(prev => prev + 1);
  };

  return (
    <div className="flex h-screen overflow-hidden">
      <Sidebar />
      
      <main className="flex-1 overflow-y-auto md:pl-64">
        <div className="py-6 px-4 sm:px-6 lg:px-8">
          {/* Page header */}
          <Header 
            title="Domain Manager"
            description="Replace domains across all landing pages."
          />

          {/* Domain replace form (admin only) */}
          {isAdmin && (
            <div className="mt-6">
              <DomainReplaceForm onHistoryChange={handleHistoryChange} />
            </div>
          )}

          {/* Domain changes history */}
          <div className="mt-6">
            <DomainHistoryTable refreshTrigger={refreshTrigger} />
          </div>
        </div>
      </main>
    </div>
  );
}
