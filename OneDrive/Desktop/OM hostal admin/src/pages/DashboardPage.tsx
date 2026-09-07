import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { UserPlus, CreditCard, FileText, BarChart3 } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { getGreeting, formatCurrency } from '@/lib/utils';
import { getDashboardStats, getCollectionChartData, getPaymentModeStats, getTopDefaulters, getRecentPayments } from '@/services/firebase/dashboard';
import type { DashboardStats, CollectionDataPoint, PaymentModeData } from '@/types';
import KPICards from '@/components/dashboard/KPICards';
import CollectionChart from '@/components/dashboard/CollectionChart';
import PaymentModeChart from '@/components/dashboard/PaymentModeChart';
import TopDefaulters from '@/components/dashboard/TopDefaulters';
import RecentPayments from '@/components/dashboard/RecentPayments';

export default function DashboardPage() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [chartData, setChartData] = useState<CollectionDataPoint[]>([]);
  const [modeStats, setModeStats] = useState<PaymentModeData[]>([]);
  const [defaulters, setDefaulters] = useState<{ studentId: string; studentName: string; totalDue: number }[]>([]);
  const [recentPayments, setRecentPayments] = useState<Record<string, unknown>[]>([]);

  useEffect(() => {
    async function fetchData() {
      try {
        const [statsData, chartD, modeD, defaulterD, recentD] = await Promise.all([
          getDashboardStats(),
          getCollectionChartData(new Date().getFullYear()),
          getPaymentModeStats(),
          getTopDefaulters(5),
          getRecentPayments(5),
        ]);
        setStats(statsData);
        setChartData(chartD);
        setModeStats(modeD);
        setDefaulters(defaulterD);
        setRecentPayments(recentD);
      } catch (error) {
        console.error('Dashboard fetch error:', error);
      } finally {
        setLoading(false);
      }
    }
    fetchData();
  }, []);

  return (
    <div className="space-y-8 animate-fade-in">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-[var(--foreground)]">
            {getGreeting()}, {user?.displayName || 'Admin'} 👋
          </h1>
          <p className="text-[var(--muted-foreground)] mt-1">
            OM Hostel Overview — Here&apos;s what&apos;s happening today
          </p>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          <Button onClick={() => navigate('/students/add')} size="sm" className="gap-2">
            <UserPlus className="h-4 w-4" /> Add Student
          </Button>
          <Button onClick={() => navigate('/payments?action=record')} variant="outline" size="sm" className="gap-2">
            <CreditCard className="h-4 w-4" /> Record Payment
          </Button>
          <Button onClick={() => navigate('/receipts')} variant="outline" size="sm" className="gap-2">
            <FileText className="h-4 w-4" /> Receipts
          </Button>
          <Button onClick={() => navigate('/reports')} variant="outline" size="sm" className="gap-2">
            <BarChart3 className="h-4 w-4" /> Reports
          </Button>
        </div>
      </div>

      {/* KPI Cards */}
      {loading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4">
          {Array.from({ length: 6 }).map((_, i) => (
            <Skeleton key={i} className="h-32 rounded-xl" />
          ))}
        </div>
      ) : stats ? (
        <KPICards stats={stats} />
      ) : null}

      {/* Collection Summary Cards */}
      {!loading && stats && (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {[
            { label: "Today's Collection", value: stats.todayCollection },
            { label: 'Last 7 Days', value: stats.weekCollection },
            { label: 'This Month', value: stats.monthCollection },
            { label: 'This Year', value: stats.yearCollection },
          ].map((item) => (
            <Card key={item.label} className="card-hover cursor-pointer" onClick={() => navigate('/reports')}>
              <CardContent className="pt-5 pb-4 px-5">
                <p className="text-xs font-medium text-[var(--muted-foreground)] uppercase tracking-wider">{item.label}</p>
                <p className="text-xl font-bold text-[var(--foreground)] mt-1">{formatCurrency(item.value)}</p>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Charts Row */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Collection Overview</CardTitle>
            </CardHeader>
            <CardContent>
              {loading ? (
                <Skeleton className="h-64 w-full rounded-lg" />
              ) : (
                <CollectionChart data={chartData} />
              )}
            </CardContent>
          </Card>
        </div>
        <div>
          <Card className="h-full">
            <CardHeader>
              <CardTitle className="text-base">Payment Methods</CardTitle>
            </CardHeader>
            <CardContent>
              {loading ? (
                <Skeleton className="h-64 w-full rounded-lg" />
              ) : (
                <PaymentModeChart data={modeStats} />
              )}
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Bottom Row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <TopDefaulters defaulters={defaulters} loading={loading} />
        <RecentPayments payments={recentPayments} loading={loading} />
      </div>
    </div>
  );
}
