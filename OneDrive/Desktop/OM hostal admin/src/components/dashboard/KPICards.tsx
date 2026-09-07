import { Users, IndianRupee, Clock, AlertTriangle, TrendingUp, BedDouble } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { formatCurrency } from '@/lib/utils';
import type { DashboardStats } from '@/types';

interface KPICardsProps {
  stats: DashboardStats;
}

const kpiConfig = [
  {
    key: 'totalStudents' as const,
    label: 'Total Students',
    icon: Users,
    color: 'text-blue-600 dark:text-blue-400',
    bgColor: 'bg-blue-50 dark:bg-blue-950/30',
    format: (v: number) => v.toLocaleString('en-IN'),
    subtitle: (stats: DashboardStats) => `${stats.activeStudents} active`,
  },
  {
    key: 'totalCollection' as const,
    label: 'Total Collection',
    icon: IndianRupee,
    color: 'text-emerald-600 dark:text-emerald-400',
    bgColor: 'bg-emerald-50 dark:bg-emerald-950/30',
    format: (v: number) => formatCurrency(v),
    subtitle: () => 'All time',
  },
  {
    key: 'monthCollection' as const,
    label: 'This Month',
    icon: TrendingUp,
    color: 'text-violet-600 dark:text-violet-400',
    bgColor: 'bg-violet-50 dark:bg-violet-950/30',
    format: (v: number) => formatCurrency(v),
    subtitle: () => new Date().toLocaleDateString('en-IN', { month: 'long', year: 'numeric' }),
  },
  {
    key: 'totalPending' as const,
    label: 'Pending Fees',
    icon: Clock,
    color: 'text-amber-600 dark:text-amber-400',
    bgColor: 'bg-amber-50 dark:bg-amber-950/30',
    format: (v: number) => formatCurrency(v),
    subtitle: (stats: DashboardStats) => `${stats.pendingStudents} students`,
  },
  {
    key: 'totalOverdue' as const,
    label: 'Overdue',
    icon: AlertTriangle,
    color: 'text-rose-600 dark:text-rose-400',
    bgColor: 'bg-rose-50 dark:bg-rose-950/30',
    format: (v: number) => formatCurrency(v),
    subtitle: (stats: DashboardStats) => `${stats.overdueStudents} students`,
  },
  {
    key: 'occupancyRate' as const,
    label: 'Occupancy',
    icon: BedDouble,
    color: 'text-cyan-600 dark:text-cyan-400',
    bgColor: 'bg-cyan-50 dark:bg-cyan-950/30',
    format: (v: number) => `${v}%`,
    subtitle: (stats: DashboardStats) => `${stats.occupiedBeds} / ${stats.totalBeds} Beds`,
  },
];

export default function KPICards({ stats }: KPICardsProps) {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4 stagger-children">
      {kpiConfig.map((kpi) => {
        const Icon = kpi.icon;
        return (
          <Card key={kpi.key} className="card-hover">
            <CardContent className="pt-5 pb-4 px-5">
              <div className="flex items-center justify-between mb-3">
                <div className={`h-10 w-10 rounded-lg ${kpi.bgColor} flex items-center justify-center`}>
                  <Icon className={`h-5 w-5 ${kpi.color}`} />
                </div>
              </div>
              <p className="text-2xl font-bold text-[var(--foreground)] tracking-tight">
                {kpi.format(stats[kpi.key])}
              </p>
              <p className="text-xs font-medium text-[var(--muted-foreground)] mt-1 uppercase tracking-wider">
                {kpi.label}
              </p>
              <p className="text-xs text-[var(--muted-foreground)] mt-0.5">
                {kpi.subtitle(stats)}
              </p>
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
}
