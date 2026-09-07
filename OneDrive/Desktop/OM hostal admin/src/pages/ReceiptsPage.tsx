import { useState, useEffect } from 'react';
import { Search, Download, Filter, Printer } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { getReceipts } from '@/services/firebase/payments';
import { downloadReceipt, printReceipt } from '@/services/pdf/receiptGenerator';
import { createAuditLog } from '@/services/firebase/auditLogs';
import { useAuth } from '@/contexts/AuthContext';
import type { Receipt } from '@/types';
import { formatCurrency, formatDate, getPaymentModeLabel } from '@/lib/utils';
import { toast } from 'sonner';

export default function ReceiptsPage() {
  const { user } = useAuth();
  const [receipts, setReceipts] = useState<Receipt[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [monthFilter, setMonthFilter] = useState('all');
  const currentYear = new Date().getFullYear();

  useEffect(() => {
    fetchReceipts();
  }, [monthFilter]);

  async function fetchReceipts() {
    setLoading(true);
    try {
      const filters: { month?: number; year?: number } = {};
      if (monthFilter !== 'all') {
        filters.month = parseInt(monthFilter);
        filters.year = currentYear;
      }
      const data = await getReceipts(filters);
      setReceipts(data);
    } catch (error) {
      console.error(error);
    } finally {
      setLoading(false);
    }
  }

  const filtered = receipts.filter((r) => {
    if (!searchQuery) return true;
    const q = searchQuery.toLowerCase();
    return (
      r.studentName.toLowerCase().includes(q) ||
      r.receiptNumber.toLowerCase().includes(q)
    );
  });

  async function handleDownload(receipt: Receipt) {
    downloadReceipt(receipt);
    if (user) {
      await createAuditLog({
        adminId: user.uid,
        adminEmail: user.email || '',
        action: 'DOWNLOAD_RECEIPT',
        entity: 'receipt',
        entityId: receipt.receiptNumber,
        description: `Downloaded receipt ${receipt.receiptNumber}`,
      });
    }
    toast.success('Receipt downloaded');
  }

  function handlePrint(receipt: Receipt) {
    printReceipt(receipt);
  }

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
          <h1 className="text-2xl font-bold text-[var(--foreground)]">Receipts</h1>
          <p className="text-sm text-[var(--muted-foreground)]">View and download payment receipts</p>
        </div>
      </div>

      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-[var(--muted-foreground)]" />
          <Input placeholder="Search by student or receipt number..." value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} className="pl-10" />
        </div>
        <Select value={monthFilter} onValueChange={setMonthFilter}>
          <SelectTrigger className="w-[160px]">
            <Filter className="h-4 w-4 mr-2" />
            <SelectValue placeholder="All Months" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Months</SelectItem>
            {months.map((m) => (
              <SelectItem key={m.value} value={m.value}>{m.label}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {loading ? (
        <div className="space-y-3">
          {Array.from({ length: 6 }).map((_, i) => <Skeleton key={i} className="h-14 w-full rounded-lg" />)}
        </div>
      ) : filtered.length === 0 ? (
        <Card className="flex flex-col items-center justify-center py-16">
          <p className="text-lg font-medium">No receipts found</p>
          <p className="text-sm text-[var(--muted-foreground)] mt-1">Receipts are generated automatically when payments are recorded</p>
        </Card>
      ) : (
        <Card className="overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full data-table">
              <thead>
                <tr className="border-b border-[var(--border)]">
                  <th className="text-left px-4 py-3">Receipt No.</th>
                  <th className="text-left px-4 py-3">Student</th>
                  <th className="text-left px-4 py-3 hidden sm:table-cell">Month</th>
                  <th className="text-right px-4 py-3">Amount</th>
                  <th className="text-left px-4 py-3 hidden md:table-cell">Mode</th>
                  <th className="text-left px-4 py-3 hidden lg:table-cell">Date</th>
                  <th className="text-center px-4 py-3">Actions</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((r) => (
                  <tr key={r.id} className="border-b border-[var(--border)] last:border-0 hover:bg-[var(--accent)] transition-colors">
                    <td className="px-4 py-3 text-sm font-mono">{r.receiptNumber}</td>
                    <td className="px-4 py-3">
                      <p className="text-sm font-medium">{r.studentName}</p>
                      <p className="text-xs text-[var(--muted-foreground)]">Room {r.roomNumber}</p>
                    </td>
                    <td className="px-4 py-3 text-sm hidden sm:table-cell">{r.feeMonthLabel}</td>
                    <td className="px-4 py-3 text-sm font-semibold text-right">{formatCurrency(r.amount)}</td>
                    <td className="px-4 py-3 text-sm hidden md:table-cell">{getPaymentModeLabel(r.paymentMode)}</td>
                    <td className="px-4 py-3 text-sm text-[var(--muted-foreground)] hidden lg:table-cell">{formatDate(r.paymentDate)}</td>
                    <td className="px-4 py-3">
                      <div className="flex items-center justify-center gap-1">
                        <Button variant="ghost" size="icon-sm" onClick={() => handleDownload(r)} title="Download">
                          <Download className="h-4 w-4" />
                        </Button>
                        <Button variant="ghost" size="icon-sm" onClick={() => handlePrint(r)} title="Print">
                          <Printer className="h-4 w-4" />
                        </Button>
                      </div>
                    </td>
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
