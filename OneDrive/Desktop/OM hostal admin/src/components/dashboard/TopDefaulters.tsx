import { useNavigate } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { formatCurrency } from '@/lib/utils';
import { AlertTriangle } from 'lucide-react';

interface TopDefaultersProps {
  defaulters: { studentId: string; studentName: string; totalDue: number }[];
  loading: boolean;
}

export default function TopDefaulters({ defaulters, loading }: TopDefaultersProps) {
  const navigate = useNavigate();

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base flex items-center gap-2">
          <AlertTriangle className="h-4 w-4 text-rose-500" />
          Top Defaulters
        </CardTitle>
      </CardHeader>
      <CardContent>
        {loading ? (
          <div className="space-y-3">
            {Array.from({ length: 5 }).map((_, i) => (
              <Skeleton key={i} className="h-10 w-full rounded-lg" />
            ))}
          </div>
        ) : defaulters.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-8 text-[var(--muted-foreground)]">
            <p className="text-sm font-medium">No defaulters 🎉</p>
            <p className="text-xs mt-1">All students are up to date</p>
          </div>
        ) : (
          <div className="space-y-2">
            {defaulters.map((d, idx) => (
              <button
                key={d.studentId}
                onClick={() => navigate(`/students/${d.studentId}`)}
                className="flex items-center justify-between w-full rounded-lg px-3 py-2.5 hover:bg-[var(--accent)] transition-colors cursor-pointer text-left"
              >
                <div className="flex items-center gap-3">
                  <span className="h-7 w-7 rounded-full bg-rose-50 dark:bg-rose-950/30 text-rose-600 dark:text-rose-400 flex items-center justify-center text-xs font-bold">
                    {idx + 1}
                  </span>
                  <span className="text-sm font-medium text-[var(--foreground)]">{d.studentName}</span>
                </div>
                <span className="text-sm font-semibold text-rose-600 dark:text-rose-400">
                  {formatCurrency(d.totalDue)}
                </span>
              </button>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
