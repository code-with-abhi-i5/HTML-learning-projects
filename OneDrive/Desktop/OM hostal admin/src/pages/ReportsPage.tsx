import { useState } from 'react';
import { Download, FileText, BarChart3 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { getPayments, getOverdueMonthlyFees } from '@/services/firebase/payments';
import { exportStudents } from '@/services/firebase/students';
import { getRooms } from '@/services/firebase/rooms';
import { createAuditLog } from '@/services/firebase/auditLogs';
import { useAuth } from '@/contexts/AuthContext';
import { getPaymentModeLabel } from '@/lib/utils';
import { toast } from 'sonner';
import * as XLSX from 'xlsx';
import jsPDF from 'jspdf';

export default function ReportsPage() {
  const { user } = useAuth();
  const [reportType, setReportType] = useState('collection');
  const [startDate, setStartDate] = useState(new Date().toISOString().split('T')[0]);
  const [endDate, setEndDate] = useState(new Date().toISOString().split('T')[0]);
  const [generating, setGenerating] = useState(false);

  async function generateReport(format: 'excel' | 'csv' | 'pdf') {
    if (!user) return;
    setGenerating(true);
    try {
      let data: Record<string, unknown>[] = [];
      let sheetName = 'Report';

      switch (reportType) {
        case 'collection': {
          const payments = await getPayments();
          data = payments.filter((p) => p.paymentDate >= startDate && p.paymentDate <= endDate)
            .map((p) => ({
              'Receipt No': p.receiptNumber,
              'Student': p.studentName,
              'Month': p.feeMonthLabel,
              'Amount': p.amount,
              'Mode': getPaymentModeLabel(p.paymentMode),
              'Date': p.paymentDate,
              'Transaction ID': p.transactionId || '-',
            }));
          sheetName = 'Collection Report';
          break;
        }
        case 'due': {
          const fees = await getOverdueMonthlyFees();
          data = fees.filter((f) => f.dueAmount > 0).map((f) => ({
            'Student': f.studentName,
            'Month': f.monthLabel,
            'Total Fee': f.totalAmount,
            'Paid': f.paidAmount,
            'Due': f.dueAmount,
            'Status': f.status,
            'Due Date': f.dueDate,
          }));
          sheetName = 'Due Report';
          break;
        }
        case 'overdue': {
          const overdueFees = await getOverdueMonthlyFees();
          data = overdueFees.filter((f) => f.status === 'overdue').map((f) => ({
            'Student': f.studentName,
            'Month': f.monthLabel,
            'Total Fee': f.totalAmount,
            'Paid': f.paidAmount,
            'Due': f.dueAmount,
            'Due Date': f.dueDate,
          }));
          sheetName = 'Overdue Report';
          break;
        }
        case 'students': {
          const students = await exportStudents();
          data = students.map((s) => ({
            'Student ID': s.studentId,
            'Name': s.name,
            'Father': s.fatherName,
            'Class': s.class,
            'Room': s.roomNumber,
            'Mobile': s.studentMobile,
            'Monthly Fee': s.monthlyTotal,
            'Status': s.status,
          }));
          sheetName = 'Student Report';
          break;
        }
        case 'payment_mode': {
          const allPayments = await getPayments();
          const modes: Record<string, { count: number; total: number }> = {};
          allPayments.forEach((p) => {
            const mode = getPaymentModeLabel(p.paymentMode);
            if (!modes[mode]) modes[mode] = { count: 0, total: 0 };
            modes[mode].count += 1;
            modes[mode].total += p.amount;
          });
          data = Object.entries(modes).map(([mode, v]) => ({
            'Payment Mode': mode,
            'Transactions': v.count,
            'Total Amount': v.total,
          }));
          sheetName = 'Payment Mode Report';
          break;
        }
        case 'occupancy': {
          const rooms = await getRooms();
          data = rooms.map((r) => ({
            'Room': r.roomNumber,
            'Floor': r.floor,
            'Capacity': r.capacity,
            'Occupied': r.occupied,
            'Available': r.available,
            'Status': r.status,
          }));
          sheetName = 'Occupancy Report';
          break;
        }
      }

      if (data.length === 0) {
        toast.error('No data available for this report');
        return;
      }

      if (format === 'excel' || format === 'csv') {
        const ws = XLSX.utils.json_to_sheet(data);
        const wb = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(wb, ws, sheetName);
        const ext = format === 'csv' ? 'csv' : 'xlsx';
        XLSX.writeFile(wb, `OM_Hostel_${sheetName.replace(/\s/g, '_')}_${new Date().toISOString().split('T')[0]}.${ext}`);
      } else {
        const doc = new jsPDF('l', 'mm', 'a4');
        doc.setFontSize(16);
        doc.text(`OM Hostel - ${sheetName}`, 14, 20);
        doc.setFontSize(10);
        doc.text(`Generated on: ${new Date().toLocaleDateString('en-IN')}`, 14, 28);

        const headers = Object.keys(data[0]);
        const rows = data.map((row) => headers.map((h) => String(row[h] ?? '')));

        let y = 38;
        doc.setFontSize(8);
        doc.setFont('helvetica', 'bold');
        const colWidth = (doc.internal.pageSize.getWidth() - 28) / headers.length;
        headers.forEach((h, i) => { doc.text(h, 14 + i * colWidth, y); });
        y += 6;
        doc.setFont('helvetica', 'normal');
        rows.forEach((row) => {
          if (y > doc.internal.pageSize.getHeight() - 20) {
            doc.addPage();
            y = 20;
          }
          row.forEach((cell, i) => { doc.text(cell, 14 + i * colWidth, y); });
          y += 5;
        });
        doc.save(`OM_Hostel_${sheetName.replace(/\s/g, '_')}.pdf`);
      }

      await createAuditLog({
        adminId: user.uid,
        adminEmail: user.email || '',
        action: 'EXPORT_REPORT',
        entity: 'report',
        entityId: reportType,
        description: `Exported ${sheetName} as ${format.toUpperCase()}`,
      });

      toast.success(`${sheetName} exported successfully`);
    } catch (error) {
      console.error(error);
      toast.error('Failed to generate report');
    } finally {
      setGenerating(false);
    }
  }

  const reports = [
    { value: 'collection', title: 'Collection Report', desc: 'Daily, weekly, monthly, or yearly payment collection', icon: BarChart3 },
    { value: 'due', title: 'Due Report', desc: 'Students with outstanding balance', icon: FileText },
    { value: 'overdue', title: 'Overdue Report', desc: 'Students with past-due payments', icon: FileText },
    { value: 'students', title: 'Student Report', desc: 'Complete student list with details', icon: FileText },
    { value: 'payment_mode', title: 'Payment Mode Report', desc: 'Cash vs UPI vs Online vs Bank Transfer', icon: BarChart3 },
    { value: 'occupancy', title: 'Room Occupancy Report', desc: 'Room and bed occupancy status', icon: FileText },
  ];

  return (
    <div className="space-y-6 animate-fade-in">
      <div>
        <h1 className="text-2xl font-bold text-[var(--foreground)]">Reports</h1>
        <p className="text-sm text-[var(--muted-foreground)]">Generate and export reports</p>
      </div>

      {/* Report Type Selection */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {reports.map((r) => {
          const Icon = r.icon;
          return (
            <Card
              key={r.value}
              className={`card-hover cursor-pointer ${reportType === r.value ? 'ring-2 ring-[var(--primary)]' : ''}`}
              onClick={() => setReportType(r.value)}
            >
              <CardContent className="pt-5 pb-4 px-5">
                <div className="flex items-start gap-3">
                  <div className="h-10 w-10 rounded-lg bg-[var(--primary)]/10 flex items-center justify-center flex-shrink-0">
                    <Icon className="h-5 w-5 text-[var(--primary)]" />
                  </div>
                  <div>
                    <p className="text-sm font-semibold text-[var(--foreground)]">{r.title}</p>
                    <p className="text-xs text-[var(--muted-foreground)] mt-0.5">{r.desc}</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Date Range (for collection report) */}
      {reportType === 'collection' && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Date Range</CardTitle>
          </CardHeader>
          <CardContent className="flex flex-col sm:flex-row gap-4">
            <div className="space-y-2 flex-1">
              <Label>Start Date</Label>
              <Input type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} />
            </div>
            <div className="space-y-2 flex-1">
              <Label>End Date</Label>
              <Input type="date" value={endDate} onChange={(e) => setEndDate(e.target.value)} />
            </div>
          </CardContent>
        </Card>
      )}

      {/* Export Buttons */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Export Report</CardTitle>
          <CardDescription>Choose a format to download the selected report</CardDescription>
        </CardHeader>
        <CardContent className="flex flex-wrap gap-3">
          <Button onClick={() => generateReport('excel')} disabled={generating} variant="outline" className="gap-2">
            <Download className="h-4 w-4" /> Excel (.xlsx)
          </Button>
          <Button onClick={() => generateReport('csv')} disabled={generating} variant="outline" className="gap-2">
            <Download className="h-4 w-4" /> CSV
          </Button>
          <Button onClick={() => generateReport('pdf')} disabled={generating} variant="outline" className="gap-2">
            <Download className="h-4 w-4" /> PDF
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
