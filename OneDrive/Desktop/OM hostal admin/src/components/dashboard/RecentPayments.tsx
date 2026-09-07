import { useNavigate } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { formatCurrency, formatRelativeDate, getPaymentModeLabel } from '@/lib/utils';
import { ArrowRight } from 'lucide-react';

interface RecentPaymentsProps {
  payments: Record<string, unknown>[];
  loading: boolean;
}

export default function RecentPayments({ payments, loading }: RecentPaymentsProps) {
  const navigate = useNavigate();

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle className="text-base">Recent Payments</CardTitle>
        <Button variant="ghost" size="sm" onClick={() => navigate('/payments')} className="gap-1 text-xs">
          View All <ArrowRight className="h-3 w-3" />
        </Button>
      </CardHeader>
      <CardContent>
        {loading ? (
          <div className="space-y-3">
            {Array.from({ length: 5 }).map((_, i) => (
              <Skeleton key={i} className="h-12 w-full rounded-lg" />
            ))}
          </div>
        ) : payments.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-8 text-[var(--muted-foreground)]">
            <p className="text-sm font-medium">No payments yet</p>
            <p className="text-xs mt-1">Payments will appear here once recorded</p>
          </div>
        ) : (
          <div className="space-y-2">
            {payments.map((p, idx) => (
              <div
                key={idx}
                className="flex items-center justify-between rounded-lg px-3 py-2.5 hover:bg-[var(--accent)] transition-colors"
              >
                <div className="flex items-center gap-3 min-w-0">
                  <div className="h-9 w-9 rounded-full bg-[var(--primary)]/10 flex items-center justify-center text-xs font-bold text-[var(--primary)] flex-shrink-0">
                    {(p.studentName as string)?.substring(0, 2).toUpperCase() || '??'}
                  </div>
                  <div className="min-w-0">
                    <p className="text-sm font-medium text-[var(--foreground)] truncate">
                      {p.studentName as string}
                    </p>
                    <p className="text-xs text-[var(--muted-foreground)]">
                      {p.paymentDate ? formatRelativeDate(p.paymentDate as string) : ''}
                      {' · '}
                      {getPaymentModeLabel(p.paymentMode as string)}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-2 flex-shrink-0">
                  <span className="text-sm font-semibold text-[var(--foreground)]">
                    {formatCurrency(p.amount as number)}
                  </span>
                  <Badge variant="success" className="text-[10px]">Paid</Badge>
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
