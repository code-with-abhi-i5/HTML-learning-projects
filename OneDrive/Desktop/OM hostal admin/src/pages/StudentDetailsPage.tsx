import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, Edit, CreditCard, Download, User, Phone, Mail, Home, Calendar, BookOpen, Trash2, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Checkbox } from '@/components/ui/checkbox';
import { getStudent, deleteStudent } from '@/services/firebase/students';
import { getStudentMonthlyFees, getStudentPayments, toggleMonthlyFeeStatus } from '@/services/firebase/payments';
import { downloadReceipt } from '@/services/pdf/receiptGenerator';
import { createAuditLog } from '@/services/firebase/auditLogs';
import { useAuth } from '@/contexts/AuthContext';
import type { Student, MonthlyFee, Payment, Receipt } from '@/types';
import { formatCurrency, formatDate, getPaymentModeLabel, getMonthLabel } from '@/lib/utils';
import RecordPaymentDialog from '@/components/payments/RecordPaymentDialog';
import { toast } from 'sonner';

export default function StudentDetailsPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();
  const [student, setStudent] = useState<Student | null>(null);
  const [monthlyFees, setMonthlyFees] = useState<MonthlyFee[]>([]);
  const [payments, setPayments] = useState<Payment[]>([]);
  const [loading, setLoading] = useState(true);
  const [paymentDialogOpen, setPaymentDialogOpen] = useState(false);
  const [togglingId, setTogglingId] = useState<string | null>(null);

  useEffect(() => {
    if (id) fetchData();
  }, [id]);

  async function fetchData() {
    if (!id) return;
    setLoading(true);
    try {
      const [studentData, feesData, paymentsData] = await Promise.all([
        getStudent(id),
        getStudentMonthlyFees(id),
        getStudentPayments(id),
      ]);
      setStudent(studentData);
      setMonthlyFees(feesData);
      setPayments(paymentsData);
    } catch (error) {
      console.error('Error:', error);
      toast.error('Failed to load student details');
    } finally {
      setLoading(false);
    }
  }

  let synthesizedFees: MonthlyFee[] = [...monthlyFees];
  let calculatedOutstanding = 0;

  if (student) {
    const joinDate = student.joiningDate ? new Date(student.joiningDate) : new Date();
    const currentDate = new Date();
    const todayStr = currentDate.toISOString().split('T')[0];
    const endOfCurrentMonth = new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 0);

    // Calculate elapsed months from joining date
    const monthsElapsed =
      (currentDate.getFullYear() - joinDate.getFullYear()) * 12 +
      (currentDate.getMonth() - joinDate.getMonth()) + 1;

    // Generate at least 12 months (1 full year) from joining date, or more if student has stayed longer
    const totalMonthsToShow = Math.max(12, Math.max(1, monthsElapsed));

    for (let i = 0; i < totalMonthsToShow; i++) {
      const targetDate = new Date(joinDate.getFullYear(), joinDate.getMonth() + i, 1);
      const m = targetDate.getMonth() + 1;
      const y = targetDate.getFullYear();
      const dueDate = `${y}-${String(m).padStart(2, '0')}-10`;
      const isPastDue = dueDate < todayStr;

      const existingIndex = synthesizedFees.findIndex((f) => f.month === m && f.year === y);
      if (existingIndex === -1) {
        synthesizedFees.push({
          id: `synthetic-${y}-${m}`,
          studentId: student.id,
          studentName: student.name,
          month: m,
          year: y,
          monthLabel: getMonthLabel(m, y),
          totalAmount: student.monthlyTotal,
          paidAmount: 0,
          dueAmount: student.monthlyTotal,
          status: isPastDue ? 'overdue' : 'pending',
          dueDate,
          createdAt: null as any,
          updatedAt: null as any,
        });
      }
    }

    // Sort chronologically from joining date forward (Month 1 -> Month 12)
    synthesizedFees.sort((a, b) => {
      if (a.year !== b.year) return a.year - b.year;
      return a.month - b.month;
    });

    // Total outstanding: only past and current months contribute to dues
    calculatedOutstanding = synthesizedFees.reduce((acc, fee) => {
      const feeDate = new Date(fee.year, fee.month - 1, 1);
      if (feeDate <= endOfCurrentMonth && (fee.dueAmount || 0) > 0) {
        return acc + fee.dueAmount;
      }
      return acc;
    }, 0);
  }

  const currentMonth = new Date().getMonth() + 1;
  const currentYear = new Date().getFullYear();
  const currentMonthFee = synthesizedFees.find((f) => f.month === currentMonth && f.year === currentYear);
  const paidMonthsCount = synthesizedFees.filter((f) => f.status === 'paid').length;

  const handleToggleFeeStatus = async (fee: MonthlyFee, markPaid: boolean) => {
    if (!student || !user) return;
    const label = fee.monthLabel || getMonthLabel(fee.month, fee.year);
    try {
      setTogglingId(fee.id);

      // Optimistic update
      setMonthlyFees((prev) => {
        const index = prev.findIndex((f) => f.month === fee.month && f.year === fee.year);
        const updatedItem: MonthlyFee = {
          ...(index >= 0 ? prev[index] : fee),
          status: markPaid ? 'paid' : 'pending',
          paidAmount: markPaid ? fee.totalAmount : 0,
          dueAmount: markPaid ? 0 : fee.totalAmount,
        };
        if (index >= 0) {
          const next = [...prev];
          next[index] = updatedItem;
          return next;
        }
        return [...prev, updatedItem];
      });

      await toggleMonthlyFeeStatus(
        student,
        fee.month,
        fee.year,
        markPaid,
        user.uid
      );

      await createAuditLog({
        adminId: user.uid,
        adminEmail: user.email || '',
        action: markPaid ? 'RECORD_PAYMENT' : 'UPDATE_PAYMENT',
        entity: 'monthlyFee',
        entityId: `${student.id}-${fee.year}-${fee.month}`,
        description: markPaid
          ? `Ticked ${label} as Paid for ${student.name}`
          : `Unticked ${label} as Unpaid for ${student.name}`,
      });

      toast.success(markPaid ? `${label} marked as Paid ✓` : `${label} marked as Pending`);
      await fetchData();
    } catch (error) {
      console.error('Error toggling fee status:', error);
      toast.error('Failed to update fee status');
      await fetchData();
    } finally {
      setTogglingId(null);
    }
  };


  const handleDownloadReceipt = async (payment: Payment) => {
    if (!student || !user) return;
    const receipt: Receipt = {
      id: '',
      receiptNumber: payment.receiptNumber,
      paymentId: payment.id,
      studentId: student.studentId,
      studentName: student.name,
      fatherName: student.fatherName,
      roomNumber: student.roomNumber,
      studentClass: student.class,
      feeMonth: payment.feeMonth,
      feeYear: payment.feeYear,
      feeMonthLabel: payment.feeMonthLabel,
      monthlyFee: student.monthlyFee,
      otherFees: student.otherFees,
      transportFee: student.transportFee,
      amount: payment.amount,
      paymentMode: payment.paymentMode,
      transactionId: payment.transactionId,
      paymentDate: payment.paymentDate,
      issuedAt: payment.createdAt,
      issuedBy: payment.createdBy,
    };
    downloadReceipt(receipt);
    await createAuditLog({
      adminId: user.uid,
      adminEmail: user.email || '',
      action: 'DOWNLOAD_RECEIPT',
      entity: 'receipt',
      entityId: payment.receiptNumber,
      description: `Downloaded receipt ${payment.receiptNumber} for ${student.name}`,
    });
  };

  const handleDelete = async () => {
    if (!student || !user) return;
    if (!window.confirm(`Are you sure you want to permanently delete ${student.name}? This action cannot be undone.`)) return;

    try {
      setLoading(true);
      await deleteStudent(student.id);
      await createAuditLog({
        adminId: user.uid,
        adminEmail: user.email || '',
        action: 'DELETE_STUDENT',
        entity: 'student',
        entityId: student.id,
        description: `Deleted student ${student.name} (${student.studentId})`,
      });
      toast.success('Student deleted successfully');
      navigate('/students');
    } catch (error) {
      console.error('Error deleting student:', error);
      toast.error('Failed to delete student');
      setLoading(false);
    }
  };

  const getStatusBadge = (status: string) => {
    const variants: Record<string, 'success' | 'warning' | 'error' | 'info' | 'secondary'> = {
      paid: 'success', partial: 'warning', pending: 'info', overdue: 'error',
    };
    return <Badge variant={variants[status] || 'secondary'}>{status}</Badge>;
  };

  if (loading) {
    return (
      <div className="max-w-5xl mx-auto space-y-6">
        <Skeleton className="h-12 w-64" />
        <Skeleton className="h-48 w-full rounded-xl" />
        <Skeleton className="h-96 w-full rounded-xl" />
      </div>
    );
  }

  if (!student) {
    return (
      <div className="flex flex-col items-center justify-center py-20">
        <p className="text-lg font-medium">Student not found</p>
        <Button className="mt-4" onClick={() => navigate('/students')}>Back to Students</Button>
      </div>
    );
  }

  return (
    <div className="max-w-5xl mx-auto space-y-6 animate-fade-in">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" onClick={() => navigate('/students')}>
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div>
            <h1 className="text-2xl font-bold text-[var(--foreground)]">{student.name}</h1>
            <p className="text-sm text-[var(--muted-foreground)]">{student.studentId} · Room {student.roomNumber}</p>
          </div>
          <Badge variant={student.status === 'active' ? 'success' : 'secondary'} className="ml-2">
            {student.status}
          </Badge>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={() => navigate(`/students/${id}/edit`)} className="gap-2">
            <Edit className="h-4 w-4" /> Edit
          </Button>
          <Button variant="destructive" size="sm" onClick={handleDelete} className="gap-2">
            <Trash2 className="h-4 w-4" /> Delete
          </Button>
          <Button size="sm" onClick={() => setPaymentDialogOpen(true)} className="gap-2">
            <CreditCard className="h-4 w-4" /> Record Payment
          </Button>
        </div>
      </div>

      {/* Profile Card */}
      <Card>
        <CardContent className="pt-6">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {[
              { icon: User, label: 'Student ID', value: student.studentId },
              { icon: User, label: 'Father', value: student.fatherName || '-' },
              { icon: User, label: 'Mother', value: student.motherName || '-' },
              { icon: Mail, label: 'Email', value: student.email || '-' },
              { icon: Phone, label: 'Student Mobile', value: student.studentMobile },
              { icon: Phone, label: 'Parent Mobile', value: student.parentMobile || '-' },
              { icon: BookOpen, label: 'Class', value: student.class },
              { icon: Home, label: 'Room / Bed', value: `${student.roomNumber} / ${student.bedNumber || '-'}` },
              { icon: Calendar, label: 'Joining Date', value: student.joiningDate ? formatDate(student.joiningDate) : '-' },
            ].map((item) => (
              <div key={item.label} className="flex items-start gap-3">
                <div className="h-9 w-9 rounded-lg bg-[var(--muted)] flex items-center justify-center flex-shrink-0">
                  <item.icon className="h-4 w-4 text-[var(--muted-foreground)]" />
                </div>
                <div>
                  <p className="text-xs text-[var(--muted-foreground)]">{item.label}</p>
                  <p className="text-sm font-medium text-[var(--foreground)]">{item.value}</p>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Fee Summary */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="card-hover">
          <CardContent className="pt-5 pb-4 px-5">
            <p className="text-xs font-medium text-[var(--muted-foreground)] uppercase tracking-wider">Monthly Fee</p>
            <p className="text-xl font-bold text-[var(--foreground)] mt-1">{formatCurrency(student.monthlyTotal)}</p>
          </CardContent>
        </Card>
        <Card className="card-hover">
          <CardContent className="pt-5 pb-4 px-5">
            <p className="text-xs font-medium text-[var(--muted-foreground)] uppercase tracking-wider">Paid This Month</p>
            <p className="text-xl font-bold text-emerald-600 dark:text-emerald-400 mt-1">
              {formatCurrency(currentMonthFee?.paidAmount || 0)}
            </p>
          </CardContent>
        </Card>
        <Card className="card-hover">
          <CardContent className="pt-5 pb-4 px-5">
            <p className="text-xs font-medium text-[var(--muted-foreground)] uppercase tracking-wider">Current Due</p>
            <p className="text-xl font-bold text-amber-600 dark:text-amber-400 mt-1">
              {formatCurrency(currentMonthFee?.dueAmount || 0)}
            </p>
          </CardContent>
        </Card>
        <Card className="card-hover">
          <CardContent className="pt-5 pb-4 px-5">
            <p className="text-xs font-medium text-[var(--muted-foreground)] uppercase tracking-wider">Total Outstanding</p>
            <p className="text-xl font-bold text-rose-600 dark:text-rose-400 mt-1">
              {formatCurrency(calculatedOutstanding)}
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Month-wise Fees */}
      <Card>
        <CardHeader className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 pb-4">
          <div>
            <CardTitle className="text-base flex items-center gap-2">
              Month-wise Fee Status
              <span className="text-xs font-normal text-[var(--muted-foreground)]">(1 Year Register)</span>
            </CardTitle>
            <p className="text-xs text-[var(--muted-foreground)] mt-0.5">
              1 Year cycle from joining date · Tick / Un-tick checkbox to instantly update fee status
            </p>
          </div>
          <div className="flex items-center gap-2">
            <Badge variant={paidMonthsCount === synthesizedFees.length ? 'success' : 'secondary'} className="font-mono text-xs">
              {paidMonthsCount} / {synthesizedFees.length} Paid
            </Badge>
          </div>
        </CardHeader>
        <CardContent>
          {synthesizedFees.length === 0 ? (
            <p className="text-sm text-[var(--muted-foreground)] text-center py-8">
              No monthly fee records yet
            </p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full data-table">
                <thead>
                  <tr className="border-b border-[var(--border)] bg-[var(--muted)]/40">
                    <th className="text-center px-4 py-3 w-16">
                      <span className="text-xs font-semibold uppercase tracking-wider">Tick</span>
                    </th>
                    <th className="text-left px-3 py-3 w-12 text-xs font-semibold uppercase tracking-wider">#</th>
                    <th className="text-left px-4 py-3 text-xs font-semibold uppercase tracking-wider">Month</th>
                    <th className="text-right px-4 py-3 text-xs font-semibold uppercase tracking-wider">Fee</th>
                    <th className="text-right px-4 py-3 text-xs font-semibold uppercase tracking-wider">Paid</th>
                    <th className="text-right px-4 py-3 text-xs font-semibold uppercase tracking-wider">Due</th>
                    <th className="text-center px-4 py-3 text-xs font-semibold uppercase tracking-wider">Status</th>
                  </tr>
                </thead>
                <tbody>
                  {synthesizedFees.map((fee, idx) => {
                    const isPaid = fee.status === 'paid';
                    const isToggling = togglingId === fee.id;
                    const isCurrent = fee.month === currentMonth && fee.year === currentYear;
                    return (
                      <tr
                        key={fee.id}
                        className={`border-b border-[var(--border)] last:border-0 transition-colors ${
                          isPaid
                            ? 'bg-emerald-500/5 hover:bg-emerald-500/10'
                            : isCurrent
                            ? 'bg-blue-500/5 hover:bg-blue-500/10'
                            : 'hover:bg-[var(--accent)]'
                        }`}
                      >
                        <td className="px-4 py-3 text-center">
                          <div className="flex items-center justify-center">
                            {isToggling ? (
                              <Loader2 className="h-4 w-4 animate-spin text-[var(--primary)]" />
                            ) : (
                              <Checkbox
                                checked={isPaid}
                                onCheckedChange={(checked) => handleToggleFeeStatus(fee, checked === true)}
                                className="h-5 w-5 data-[state=checked]:bg-emerald-600 data-[state=checked]:border-emerald-600 cursor-pointer"
                                aria-label={`Toggle paid status for ${fee.monthLabel || getMonthLabel(fee.month, fee.year)}`}
                              />
                            )}
                          </div>
                        </td>
                        <td className="px-3 py-3 text-xs text-[var(--muted-foreground)] font-mono font-medium">
                          M{idx + 1}
                        </td>
                        <td className="px-4 py-3 text-sm font-medium">
                          <span>{fee.monthLabel || getMonthLabel(fee.month, fee.year)}</span>
                          {isCurrent && (
                            <span className="ml-2 text-[10px] font-semibold uppercase px-1.5 py-0.5 rounded bg-[var(--primary)]/10 text-[var(--primary)]">
                              Current
                            </span>
                          )}
                        </td>
                        <td className="px-4 py-3 text-sm text-right font-mono">{formatCurrency(fee.totalAmount)}</td>
                        <td className="px-4 py-3 text-sm text-right font-mono text-emerald-600 dark:text-emerald-400 font-semibold">
                          {formatCurrency(fee.paidAmount)}
                        </td>
                        <td className="px-4 py-3 text-sm text-right font-mono text-rose-600 dark:text-rose-400 font-semibold">
                          {formatCurrency(fee.dueAmount)}
                        </td>
                        <td className="px-4 py-3 text-center">{getStatusBadge(fee.status)}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Payment History */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Payment History</CardTitle>
        </CardHeader>
        <CardContent>
          {payments.length === 0 ? (
            <p className="text-sm text-[var(--muted-foreground)] text-center py-8">
              No payments recorded yet
            </p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full data-table">
                <thead>
                  <tr className="border-b border-[var(--border)]">
                    <th className="text-left px-4 py-3">Receipt</th>
                    <th className="text-left px-4 py-3">Month</th>
                    <th className="text-right px-4 py-3">Amount</th>
                    <th className="text-left px-4 py-3 hidden md:table-cell">Date</th>
                    <th className="text-left px-4 py-3 hidden lg:table-cell">Mode</th>
                    <th className="text-left px-4 py-3 hidden lg:table-cell">Txn ID</th>
                    <th className="text-center px-4 py-3">Receipt</th>
                  </tr>
                </thead>
                <tbody>
                  {payments.map((payment) => (
                    <tr key={payment.id} className="border-b border-[var(--border)] last:border-0">
                      <td className="px-4 py-3 text-sm font-mono text-xs">{payment.receiptNumber}</td>
                      <td className="px-4 py-3 text-sm">{payment.feeMonthLabel}</td>
                      <td className="px-4 py-3 text-sm font-medium text-right">{formatCurrency(payment.amount)}</td>
                      <td className="px-4 py-3 text-sm text-[var(--muted-foreground)] hidden md:table-cell">
                        {payment.paymentDate ? formatDate(payment.paymentDate) : '-'}
                      </td>
                      <td className="px-4 py-3 text-sm hidden lg:table-cell">{getPaymentModeLabel(payment.paymentMode)}</td>
                      <td className="px-4 py-3 text-sm font-mono text-xs text-[var(--muted-foreground)] hidden lg:table-cell">
                        {payment.transactionId || '-'}
                      </td>
                      <td className="px-4 py-3 text-center">
                        <Button
                          variant="ghost"
                          size="icon-sm"
                          onClick={() => handleDownloadReceipt(payment)}
                        >
                          <Download className="h-4 w-4" />
                        </Button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Payment Dialog */}
      <RecordPaymentDialog
        open={paymentDialogOpen}
        onOpenChange={setPaymentDialogOpen}
        preSelectedStudent={student}
        onSuccess={() => {
          fetchData();
          setPaymentDialogOpen(false);
        }}
      />
    </div>
  );
}
