import { 
  Table, 
  TableBody, 
  TableCell, 
  TableHead, 
  TableHeader, 
  TableRow 
} from "@/components/ui/table";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { DomainChange } from "@shared/schema";
import { formatDistanceToNow } from "date-fns";
import { useQuery } from "@tanstack/react-query";
import { Skeleton } from "@/components/ui/skeleton";

interface DomainHistoryTableProps {
  refreshTrigger?: number;
}

export function DomainHistoryTable({ refreshTrigger }: DomainHistoryTableProps) {
  // Fetch domain change history
  const { data: domainChanges, isLoading } = useQuery<DomainChange[]>({
    queryKey: ["/api/domains/history", refreshTrigger],
  });
  
  // Format date
  const formatDate = (date: Date | string) => {
    return formatDistanceToNow(new Date(date), { addSuffix: true });
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Recent Domain Changes</CardTitle>
      </CardHeader>
      <CardContent>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Date</TableHead>
              <TableHead>Old Domain</TableHead>
              <TableHead>New Domain</TableHead>
              <TableHead>Changed By</TableHead>
              <TableHead>Records Affected</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              Array(3).fill(0).map((_, i) => (
                <TableRow key={i}>
                  <TableCell><Skeleton className="h-4 w-24" /></TableCell>
                  <TableCell><Skeleton className="h-4 w-32" /></TableCell>
                  <TableCell><Skeleton className="h-4 w-32" /></TableCell>
                  <TableCell><Skeleton className="h-4 w-24" /></TableCell>
                  <TableCell><Skeleton className="h-4 w-16" /></TableCell>
                </TableRow>
              ))
            ) : domainChanges && domainChanges.length > 0 ? (
              domainChanges.map((change) => (
                <TableRow key={change.id}>
                  <TableCell className="text-muted-foreground">
                    {formatDate(change.changedAt)}
                  </TableCell>
                  <TableCell>{change.oldDomain}</TableCell>
                  <TableCell>{change.newDomain}</TableCell>
                  <TableCell>Admin User</TableCell> {/* Replace with actual user data if available */}
                  <TableCell>{change.recordsAffected}</TableCell>
                </TableRow>
              ))
            ) : (
              <TableRow>
                <TableCell colSpan={5} className="text-center py-6 text-muted-foreground">
                  No domain changes found
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  );
}
