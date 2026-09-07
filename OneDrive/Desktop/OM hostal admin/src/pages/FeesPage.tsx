import { useState, useEffect } from 'react';
import { Filter } from 'lucide-react';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { getAllMonthlyFees } from '@/services/firebase/payments';
import { getAllActiveStudents } from '@/services/firebase/students';
import type { MonthlyFee } from '@/types';
import { formatCurrency, getMonthLabel } from '@/lib/utils';

export default function FeesPage() {
  const [fees, setFees] = useState<MonthlyFee[]>([]);
  const [loading, setLoading] = useState(true);
  const [monthFilter, setMonthFilter] = useState(String(new Date().getMonth() + 1));
  const [yearFilter, setYearFilter] = useState(String(new Date().getFullYear()));

  useEffect(() => {
    fetchFees();
  }, [monthFilter, yearFilter]);

  async function fetchFees() {
    setLoading(true);
    try {
      const mInt = parseInt(monthFilter);
      const yInt = parseInt(yearFilter);

      const [data, students] = await Promise.all([
        getAllMonthlyFees(mInt, yInt),
        getAllActiveStudents()
      ]);

      const synthesized: MonthlyFee[] = [...data];
      const today = new Date();
      const isOverdue = new Date(yInt, mInt - 1, 10) < today;

      students.forEach(student => {
        if (!student.joiningDate) return;

        const joinDate = new Date(student.joiningDate);
        const feeMonthStart = new Date(yInt, mInt - 1, 1);
        const joinMonthStart = new Date(joinDate.getFullYear(), joinDate.getMonth(), 1);

        // Only synthesize if student joined on or before the selected month
        if (joinMonthStart <= feeMonthStart) {
          const exists = data.some(f => f.studentId === student.id);
          if (!exists) {
            synthesized.push({
              id: `synthetic-${student.id}-${yInt}-${mInt}`,
              studentId: student.id,
              studentName: student.name,
              month: mInt,
              year: yInt,
              monthLabel: getMonthLabel(mInt, yInt),
              totalAmount: student.monthlyTotal,
              paidAmount: 0,
              dueAmount: student.monthlyTotal,
              status: isOverdue ? 'pending' : 'pending',
              dueDate: `${yInt}-${String(mInt).padStart(2, '0')}-10`,
              createdAt: null as any,
              updatedAt: null as any,
            });
          }
        }
      });

      synthesized.sort((a, b) => (a.studentName || '').localeCompare(b.studentName || ''));
      setFees(synthesized);
    } catch (error) {
      console.error(error);
    } finally {
      setLoading(false);
    }
  }

  const getStatusBadge = (status: string) => {
    const variants: Record<string, 'success' | 'warning' | 'error' | 'info' | 'secondary'> = {
      paid: 'success', partial: 'warning', pending: 'info', overdue: 'error',
    };
    return <Badge variant={variants[status] || 'secondary'}>{status}</Badge>;
  };

  const totalFee = fees.reduce((s, f) => s + f.totalAmount, 0);
  const totalPaid = fees.reduce((s, f) => s + f.paidAmount, 0);
  const totalDue = fees.reduce((s, f) => s + f.dueAmount, 0);

  const months = [
    { value: '1', label: 'January' }, { value: '2', label: 'February' },
    { value: '3', label: 'March' }, { value: '4', label: 'April' },
    { value: '5', label: 'May' }, { value: '6', label: 'June' },
    { value: '7', label: 'July' }, { value: '8', label: 'August' },
    { value: '9', label: 'September' }, { value: '10', label: 'October' },
    { value: '11', label: 'November' }, { value: '12', label: 'December' },
  ];

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-[var(--foreground)]">Fee Management</h1>
          <p className="text-sm text-[var(--muted-foreground)]">Monthly fee status for all students</p>
        </div>
        <div className="flex gap-2">
          <Select value={monthFilter} onValueChange={setMonthFilter}>
            <SelectTrigger className="w-[140px]">
              <Filter className="h-4 w-4 mr-2" /><SelectValue />
            </SelectTrigger>
            <SelectContent>
              {months.map((m) => <SelectItem key={m.value} value={m.value}>{m.label}</SelectItem>)}
            </SelectContent>
          </Select>
          <Select value={yearFilter} onValueChange={setYearFilter}>
            <SelectTrigger className="w-[100px]"><SelectValue /></SelectTrigger>
            <SelectContent>
              {[2025, 2026, 2027].map((y) => <SelectItem key={y} value={String(y)}>{y}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Summary */}
      {!loading && fees.length > 0 && (
        <div className="grid grid-cols-3 gap-4">
          <Card className="p-5"><p className="text-xs text-[var(--muted-foreground)] uppercase tracking-wider">Total Fee</p><p className="text-xl font-bold mt-1">{formatCurrency(totalFee)}</p></Card>
          <Card className="p-5"><p className="text-xs text-[var(--muted-foreground)] uppercase tracking-wider">Collected</p><p className="text-xl font-bold text-emerald-600 dark:text-emerald-400 mt-1">{formatCurrency(totalPaid)}</p></Card>
          <Card className="p-5"><p className="text-xs text-[var(--muted-foreground)] uppercase tracking-wider">Pending</p><p className="text-xl font-bold text-rose-600 dark:text-rose-400 mt-1">{formatCurrency(totalDue)}</p></Card>
        </div>
      )}

      {loading ? (
        <div className="space-y-3">{Array.from({ length: 8 }).map((_, i) => <Skeleton key={i} className="h-14 w-full rounded-lg" />)}</div>
      ) : fees.length === 0 ? (
        <Card className="flex flex-col items-center justify-center py-16">
          <p className="text-lg font-medium">No fee records for this month</p>
          <p className="text-sm text-[var(--muted-foreground)] mt-1">Fee records are created when payments are recorded</p>
        </Card>
      ) : (
        <Card className="overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full data-table">
              <thead>
                <tr className="border-b border-[var(--border)]">
                  <th className="text-left px-4 py-3">Student</th>
                  <th className="text-right px-4 py-3">Monthly Fee</th>
                  <th className="text-right px-4 py-3">Paid</th>
                  <th className="text-right px-4 py-3">Due</th>
                  <th className="text-center px-4 py-3">Status</th>
                </tr>
              </thead>
              <tbody>
                {fees.map((fee) => (
                  <tr key={fee.id} className="border-b border-[var(--border)] last:border-0 hover:bg-[var(--accent)] transition-colors">
                    <td className="px-4 py-3">
                      <p className="text-sm font-medium">{fee.studentName}</p>
                    </td>
                    <td className="px-4 py-3 text-sm text-right">{formatCurrency(fee.totalAmount)}</td>
                    <td className="px-4 py-3 text-sm text-right text-emerald-600 dark:text-emerald-400">{formatCurrency(fee.paidAmount)}</td>
                    <td className="px-4 py-3 text-sm text-right text-rose-600 dark:text-rose-400">{formatCurrency(fee.dueAmount)}</td>
                    <td className="px-4 py-3 text-center">{getStatusBadge(fee.status)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      )}
    </div>
  );
}
