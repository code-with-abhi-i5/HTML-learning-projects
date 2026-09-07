import { useState, useEffect } from 'react';
import { Filter, ScrollText } from 'lucide-react';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { getAuditLogs } from '@/services/firebase/auditLogs';
import type { AuditLog, AuditAction } from '@/types';
import { formatDateTime } from '@/lib/utils';

export default function AuditLogsPage() {
  const [logs, setLogs] = useState<AuditLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [actionFilter, setActionFilter] = useState<string>('all');

  useEffect(() => {
    fetchLogs();
  }, [actionFilter]);

  async function fetchLogs() {
    setLoading(true);
    try {
      const data = await getAuditLogs({
        action: actionFilter === 'all' ? undefined : actionFilter as AuditAction,
        limitCount: 200,
      });
      setLogs(data);
    } catch (error) {
      console.error(error);
    } finally {
      setLoading(false);
    }
  }

  const getActionBadge = (action: string) => {
    const colors: Record<string, 'success' | 'info' | 'warning' | 'error' | 'purple' | 'secondary'> = {
      LOGIN: 'info', LOGOUT: 'secondary',
      CREATE_STUDENT: 'success', UPDATE_STUDENT: 'warning', DEACTIVATE_STUDENT: 'error',
      RECORD_PAYMENT: 'success', UPDATE_PAYMENT: 'warning',
      DOWNLOAD_RECEIPT: 'info', CREATE_ROOM: 'success', UPDATE_ROOM: 'warning',
      EXPORT_REPORT: 'purple', UPDATE_SETTINGS: 'warning', GENERATE_MONTHLY_FEE: 'info',
    };
    return <Badge variant={colors[action] || 'secondary'} className="text-[10px] font-mono">{action}</Badge>;
  };

  const actions = [
    'LOGIN', 'LOGOUT', 'CREATE_STUDENT', 'UPDATE_STUDENT', 'DEACTIVATE_STUDENT',
    'RECORD_PAYMENT', 'DOWNLOAD_RECEIPT', 'CREATE_ROOM', 'EXPORT_REPORT', 'UPDATE_SETTINGS',
  ];

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-[var(--foreground)]">Audit Logs</h1>
          <p className="text-sm text-[var(--muted-foreground)]">Track all admin actions (read-only)</p>
        </div>
        <Select value={actionFilter} onValueChange={setActionFilter}>
          <SelectTrigger className="w-[200px]">
            <Filter className="h-4 w-4 mr-2" /><SelectValue placeholder="All Actions" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Actions</SelectItem>
            {actions.map((a) => <SelectItem key={a} value={a}>{a}</SelectItem>)}
          </SelectContent>
        </Select>
      </div>

      {loading ? (
        <div className="space-y-3">{Array.from({ length: 10 }).map((_, i) => <Skeleton key={i} className="h-16 w-full rounded-lg" />)}</div>
      ) : logs.length === 0 ? (
        <Card className="flex flex-col items-center justify-center py-16">
          <ScrollText className="h-12 w-12 text-[var(--muted-foreground)] mb-3" />
          <p className="text-lg font-medium">No audit logs yet</p>
          <p className="text-sm text-[var(--muted-foreground)] mt-1">Actions will be recorded here automatically</p>
        </Card>
      ) : (
        <div className="space-y-2">
          {logs.map((log) => (
            <Card key={log.id} className="hover:bg-[var(--accent)]/50 transition-colors">
              <div className="flex items-start gap-4 p-4">
                <div className="h-9 w-9 rounded-full bg-[var(--muted)] flex items-center justify-center flex-shrink-0 mt-0.5">
                  <ScrollText className="h-4 w-4 text-[var(--muted-foreground)]" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    {getActionBadge(log.action)}
                    <span className="text-sm font-medium text-[var(--foreground)]">{log.description}</span>
                  </div>
                  <div className="flex items-center gap-3 mt-1.5 text-xs text-[var(--muted-foreground)]">
                    <span>{log.adminEmail}</span>
                    <span>·</span>
                    <span>{log.timestamp ? formatDateTime(log.timestamp.toDate()) : '-'}</span>
                  </div>
                </div>
              </div>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
