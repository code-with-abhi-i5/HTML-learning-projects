import { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Loader2 } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { recordPayment } from '@/services/firebase/payments';
import { getAllActiveStudents } from '@/services/firebase/students';
import { createAuditLog } from '@/services/firebase/auditLogs';
import { useAuth } from '@/contexts/AuthContext';
import { formatCurrency } from '@/lib/utils';
import type { Student } from '@/types';
import { toast } from 'sonner';

const paymentSchema = z.object({
  studentId: z.string().min(1, 'Student is required'),
  feeMonth: z.coerce.number().min(1).max(12),
  feeYear: z.coerce.number().min(2020),
  amount: z.coerce.number().min(1, 'Amount must be greater than 0'),
  paymentMode: z.enum(['cash', 'upi', 'online', 'bank_transfer', 'other']),
  transactionId: z.string().optional().default(''),
  paymentDate: z.string().min(1, 'Payment date is required'),
  notes: z.string().optional().default(''),
});

type PaymentFormValues = z.infer<typeof paymentSchema>;

interface RecordPaymentDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  preSelectedStudent?: Student | null;
  preSelectedMonth?: number;
  preSelectedYear?: number;
  onSuccess?: () => void;
}

export default function RecordPaymentDialog({
  open,
  onOpenChange,
  preSelectedStudent,
  preSelectedMonth,
  preSelectedYear,
  onSuccess,
}: RecordPaymentDialogProps) {
  const { user } = useAuth();
  const [students, setStudents] = useState<Student[]>([]);
  const [selectedStudent, setSelectedStudent] = useState<Student | null>(preSelectedStudent || null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const currentMonth = new Date().getMonth() + 1;
  const currentYear = new Date().getFullYear();

  const form = useForm<PaymentFormValues>({
    resolver: zodResolver(paymentSchema) as any,
    defaultValues: {
      studentId: preSelectedStudent?.id || '',
      feeMonth: preSelectedMonth || currentMonth,
      feeYear: preSelectedYear || currentYear,
      amount: preSelectedStudent?.monthlyTotal || 0,
      paymentMode: 'cash',
      transactionId: '',
      paymentDate: new Date().toISOString().split('T')[0],
      notes: '',
    },
  });

  useEffect(() => {
    if (open && !preSelectedStudent) {
      getAllActiveStudents().then(setStudents);
    }
  }, [open, preSelectedStudent]);

  useEffect(() => {
    if (open) {
      if (preSelectedStudent) {
        setSelectedStudent(preSelectedStudent);
        form.setValue('studentId', preSelectedStudent.id);
        form.setValue('amount', preSelectedStudent.monthlyTotal);
      }
      if (preSelectedMonth) {
        form.setValue('feeMonth', preSelectedMonth);
      }
      if (preSelectedYear) {
        form.setValue('feeYear', preSelectedYear);
      }
    }
  }, [open, preSelectedStudent, preSelectedMonth, preSelectedYear, form]);

  const handleStudentChange = (studentId: string) => {
    const student = students.find((s) => s.id === studentId);
    setSelectedStudent(student || null);
    form.setValue('studentId', studentId);
    if (student) {
      form.setValue('amount', student.monthlyTotal);
    }
  };

  const paymentMode = form.watch('paymentMode');

  const onSubmit = async (data: PaymentFormValues) => {
    if (!user || !selectedStudent) return;
    setIsSubmitting(true);

    try {
      const result = await recordPayment(
        {
          studentId: data.studentId,
          feeMonth: data.feeMonth,
          feeYear: data.feeYear,
          amount: Number(data.amount) || 0,
          paymentMode: data.paymentMode,
          transactionId: data.transactionId || '',
          paymentDate: data.paymentDate,
          notes: data.notes || '',
        },
        {
          name: selectedStudent.name,
          fatherName: selectedStudent.fatherName || '',
          roomNumber: selectedStudent.roomNumber,
          class: selectedStudent.class,
          monthlyFee: selectedStudent.monthlyFee,
          otherFees: selectedStudent.otherFees,
          transportFee: selectedStudent.transportFee,
        },
        user.uid
      );

      await createAuditLog({
        adminId: user.uid,
        adminEmail: user.email || '',
        action: 'RECORD_PAYMENT',
        entity: 'payment',
        entityId: result.paymentId,
        description: `Recorded payment ${formatCurrency(data.amount)} for ${selectedStudent.name} (${result.receiptNumber})`,
        metadata: { receiptNumber: result.receiptNumber, amount: data.amount },
      });

      toast.success('Payment recorded successfully!', {
        description: `Receipt: ${result.receiptNumber}`,
      });

      form.reset();
      onSuccess?.();
    } catch (error) {
      console.error('Payment error:', error);
      toast.error('Failed to record payment');
    } finally {
      setIsSubmitting(false);
    }
  };

  const months = [
    { value: 1, label: 'January' }, { value: 2, label: 'February' },
    { value: 3, label: 'March' }, { value: 4, label: 'April' },
    { value: 5, label: 'May' }, { value: 6, label: 'June' },
    { value: 7, label: 'July' }, { value: 8, label: 'August' },
    { value: 9, label: 'September' }, { value: 10, label: 'October' },
    { value: 11, label: 'November' }, { value: 12, label: 'December' },
  ];

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Record Payment</DialogTitle>
          <DialogDescription>Record a fee payment for a student</DialogDescription>
        </DialogHeader>

        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
          {/* Student Selection */}
          {!preSelectedStudent ? (
            <div className="space-y-2">
              <Label>Student <span className="text-[var(--destructive)]">*</span></Label>
              <Select onValueChange={handleStudentChange}>
                <SelectTrigger>
                  <SelectValue placeholder="Select student" />
                </SelectTrigger>
                <SelectContent>
                  {students.map((s) => (
                    <SelectItem key={s.id} value={s.id}>
                      {s.name} ({s.studentId})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {form.formState.errors.studentId && (
                <p className="text-xs text-[var(--destructive)]">{form.formState.errors.studentId.message}</p>
              )}
            </div>
          ) : (
            <div className="bg-[var(--muted)] rounded-lg p-3">
              <p className="text-sm font-medium">{preSelectedStudent.name}</p>
              <p className="text-xs text-[var(--muted-foreground)]">{preSelectedStudent.studentId} · Room {preSelectedStudent.roomNumber}</p>
            </div>
          )}

          {/* Fee Month */}
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-2">
              <Label>Fee Month <span className="text-[var(--destructive)]">*</span></Label>
              <Select
                value={String(form.watch('feeMonth'))}
                onValueChange={(v) => form.setValue('feeMonth', Number(v))}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {months.map((m) => (
                    <SelectItem key={m.value} value={String(m.value)}>{m.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Year <span className="text-[var(--destructive)]">*</span></Label>
              <Select
                value={String(form.watch('feeYear'))}
                onValueChange={(v) => form.setValue('feeYear', Number(v))}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {[currentYear - 1, currentYear, currentYear + 1].map((y) => (
                    <SelectItem key={y} value={String(y)}>{y}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Amount */}
          <div className="space-y-2">
            <Label>Amount (₹) <span className="text-[var(--destructive)]">*</span></Label>
            <Input type="number" {...form.register('amount', { valueAsNumber: true })} />
            {selectedStudent && (
              <p className="text-xs text-[var(--muted-foreground)]">
                Monthly total: {formatCurrency(selectedStudent.monthlyTotal)}
              </p>
            )}
            {form.formState.errors.amount && (
              <p className="text-xs text-[var(--destructive)]">{form.formState.errors.amount.message}</p>
            )}
          </div>

          {/* Payment Mode */}
          <div className="space-y-2">
            <Label>Payment Mode <span className="text-[var(--destructive)]">*</span></Label>
            <Select
              value={form.watch('paymentMode')}
              onValueChange={(v) => form.setValue('paymentMode', v as PaymentFormValues['paymentMode'])}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="cash">Cash</SelectItem>
                <SelectItem value="upi">UPI</SelectItem>
                <SelectItem value="online">Online</SelectItem>
                <SelectItem value="bank_transfer">Bank Transfer</SelectItem>
                <SelectItem value="other">Other</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Transaction ID */}
          {paymentMode !== 'cash' && (
            <div className="space-y-2">
              <Label>Transaction ID</Label>
              <Input placeholder="Enter transaction ID" {...form.register('transactionId')} />
            </div>
          )}

          {/* Payment Date */}
          <div className="space-y-2">
            <Label>Payment Date <span className="text-[var(--destructive)]">*</span></Label>
            <Input type="date" {...form.register('paymentDate')} />
          </div>

          {/* Notes */}
          <div className="space-y-2">
            <Label>Notes</Label>
            <Textarea placeholder="Optional notes..." rows={2} {...form.register('notes')} />
          </div>

          {/* Submit */}
          <div className="flex justify-end gap-3 pt-2">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
            <Button type="submit" disabled={isSubmitting} className="gap-2">
              {isSubmitting ? (
                <><Loader2 className="h-4 w-4 animate-spin" /> Recording...</>
              ) : (
                'Record Payment'
              )}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
