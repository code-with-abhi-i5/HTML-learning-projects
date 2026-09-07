import { useState, useEffect } from 'react';
import { CreditCard, Search, Download, Filter } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { getPayments } from '@/services/firebase/payments';
import type { Payment } from '@/types';
import { formatCurrency, formatDate, getPaymentModeLabel } from '@/lib/utils';
import RecordPaymentDialog from '@/components/payments/RecordPaymentDialog';
import * as XLSX from 'xlsx';

export default function PaymentsPage() {
  const [payments, setPayments] = useState<Payment[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [modeFilter, setModeFilter] = useState('all');
  const [dialogOpen, setDialogOpen] = useState(false);

  useEffect(() => {
    fetchPayments();
  }, [modeFilter]);

  async function fetchPayments() {
    setLoading(true);
    try {
      const data = await getPayments({
        paymentMode: modeFilter === 'all' ? undefined : modeFilter,
      });
      setPayments(data);
    } catch (error) {
      console.error(error);
    } finally {
      setLoading(false);
    }
  }

  // Check URL for action=record
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    if (params.get('action') === 'record') {
      setDialogOpen(true);
      window.history.replaceState({}, '', '/payments');
    }
  }, []);

  const filtered = payments.filter((p) => {
    if (!searchQuery) return true;
    const q = searchQuery.toLowerCase();
    return (
      p.studentName.toLowerCase().includes(q) ||
      p.receiptNumber.toLowerCase().includes(q) ||
      (p.transactionId && p.transactionId.toLowerCase().includes(q))
    );
  });

  function handleExport() {
    const wsData = filtered.map((p) => ({
      'Receipt No': p.receiptNumber,
      'Student': p.studentName,
      'Month': p.feeMonthLabel,
      'Amount': p.amount,
      'Mode': getPaymentModeLabel(p.paymentMode),
      'Transaction ID': p.transactionId || '-',
      'Date': p.paymentDate,
    }));
    const ws = XLSX.utils.json_to_sheet(wsData);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Payments');
    XLSX.writeFile(wb, `OM_Hostel_Payments_${new Date().toISOString().split('T')[0]}.xlsx`);
  }

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-[var(--foreground)]">Payments</h1>
          <p className="text-sm text-[var(--muted-foreground)]">Manage all fee payments</p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={handleExport} className="gap-2">
            <Download className="h-4 w-4" /> Export
          </Button>
          <Button size="sm" onClick={() => setDialogOpen(true)} className="gap-2">
            <CreditCard className="h-4 w-4" /> Record Payment
          </Button>
        </div>
      </div>

      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-[var(--muted-foreground)]" />
          <Input placeholder="Search by student, receipt, transaction..." value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} className="pl-10" />
        </div>
        <Select value={modeFilter} onValueChange={setModeFilter}>
          <SelectTrigger className="w-[160px]">
            <Filter className="h-4 w-4 mr-2" />
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Modes</SelectItem>
            <SelectItem value="cash">Cash</SelectItem>
            <SelectItem value="upi">UPI</SelectItem>
            <SelectItem value="online">Online</SelectItem>
            <SelectItem value="bank_transfer">Bank Transfer</SelectItem>
            <SelectItem value="other">Other</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {loading ? (
        <div className="space-y-3">
          {Array.from({ length: 8 }).map((_, i) => <Skeleton key={i} className="h-14 w-full rounded-lg" />)}
        </div>
      ) : filtered.length === 0 ? (
        <Card className="flex flex-col items-center justify-center py-16">
          <p className="text-lg font-medium text-[var(--foreground)]">No payments found</p>
          <p className="text-sm text-[var(--muted-foreground)] mt-1">
            {searchQuery ? 'Try a different search' : 'Record your first payment to get started'}
          </p>
        </Card>
      ) : (
        <Card className="overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full data-table">
              <thead>
                <tr className="border-b border-[var(--border)]">
                  <th className="text-left px-4 py-3">Student</th>
                  <th className="text-left px-4 py-3 hidden sm:table-cell">Month</th>
                  <th className="text-right px-4 py-3">Amount</th>
                  <th className="text-left px-4 py-3 hidden md:table-cell">Mode</th>
                  <th className="text-left px-4 py-3 hidden lg:table-cell">Date</th>
                  <th className="text-left px-4 py-3 hidden lg:table-cell">Receipt</th>
                  <th className="text-center px-4 py-3">Status</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((p) => (
                  <tr key={p.id} className="border-b border-[var(--border)] last:border-0 hover:bg-[var(--accent)] transition-colors">
                    <td className="px-4 py-3">
                      <p className="text-sm font-medium">{p.studentName}</p>
                      <p className="text-xs text-[var(--muted-foreground)]">{p.studentId}</p>
                    </td>
                    <td className="px-4 py-3 text-sm hidden sm:table-cell">{p.feeMonthLabel}</td>
                    <td className="px-4 py-3 text-sm font-semibold text-right">{formatCurrency(p.amount)}</td>
                    <td className="px-4 py-3 text-sm hidden md:table-cell">{getPaymentModeLabel(p.paymentMode)}</td>
                    <td className="px-4 py-3 text-sm text-[var(--muted-foreground)] hidden lg:table-cell">{formatDate(p.paymentDate)}</td>
                    <td className="px-4 py-3 text-xs font-mono text-[var(--muted-foreground)] hidden lg:table-cell">{p.receiptNumber}</td>
                    <td className="px-4 py-3 text-center"><Badge variant="success">Paid</Badge></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      )}

      <RecordPaymentDialog open={dialogOpen} onOpenChange={setDialogOpen} onSuccess={() => { setDialogOpen(false); fetchPayments(); }} />
    </div>
  );
}
