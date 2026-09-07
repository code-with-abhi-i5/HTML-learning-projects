import jsPDF from 'jspdf';
import type { Receipt } from '@/types';
import { numberToWords, getPaymentModeLabel } from '@/lib/utils';

export function generateReceiptPDF(receipt: Receipt): jsPDF {
  const doc = new jsPDF('p', 'mm', 'a4');
  const pageWidth = doc.internal.pageSize.getWidth();
  const margin = 20;
  const contentWidth = pageWidth - margin * 2;
  let y = margin;

  // ─── Header ─────────────────────────────────────────────
  doc.setFillColor(37, 99, 235); // primary blue
  doc.rect(0, 0, pageWidth, 50, 'F');

  doc.setTextColor(255, 255, 255);
  doc.setFontSize(24);
  doc.setFont('helvetica', 'bold');
  doc.text('OM HOSTEL', pageWidth / 2, 22, { align: 'center' });

  doc.setFontSize(12);
  doc.setFont('helvetica', 'normal');
  doc.text('Fee Payment Receipt', pageWidth / 2, 32, { align: 'center' });

  y = 55;

  // ─── Receipt Info ───────────────────────────────────────
  doc.setTextColor(0, 0, 0);
  doc.setFontSize(10);

  // Receipt number and date
  doc.setFont('helvetica', 'bold');
  doc.text('Receipt No:', margin, y + 8);
  doc.setFont('helvetica', 'normal');
  doc.text(receipt.receiptNumber, margin + 28, y + 8);

  doc.setFont('helvetica', 'bold');
  doc.text('Date:', pageWidth - margin - 50, y + 8);
  doc.setFont('helvetica', 'normal');
  doc.text(formatDateForReceipt(receipt.paymentDate), pageWidth - margin - 36, y + 8);

  y += 18;

  // ─── Divider ────────────────────────────────────────────
  doc.setDrawColor(226, 232, 240);
  doc.setLineWidth(0.5);
  doc.line(margin, y, pageWidth - margin, y);
  y += 10;

  // ─── Student Details Section ────────────────────────────
  doc.setFillColor(248, 250, 252);
  doc.roundedRect(margin, y, contentWidth, 52, 3, 3, 'F');

  doc.setFontSize(11);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(37, 99, 235);
  doc.text('Student Details', margin + 8, y + 10);

  doc.setTextColor(0, 0, 0);
  doc.setFontSize(10);
  const labelX = margin + 8;
  const valueX = margin + 50;

  y += 18;
  doc.setFont('helvetica', 'bold');
  doc.text('Student ID:', labelX, y);
  doc.setFont('helvetica', 'normal');
  doc.text(receipt.studentId || '-', valueX, y);

  y += 7;
  doc.setFont('helvetica', 'bold');
  doc.text('Name:', labelX, y);
  doc.setFont('helvetica', 'normal');
  doc.text(receipt.studentName, valueX, y);

  y += 7;
  doc.setFont('helvetica', 'bold');
  doc.text("Father's Name:", labelX, y);
  doc.setFont('helvetica', 'normal');
  doc.text(receipt.fatherName || '-', valueX + 10, y);

  y += 7;
  doc.setFont('helvetica', 'bold');
  doc.text('Room No:', labelX, y);
  doc.setFont('helvetica', 'normal');
  doc.text(receipt.roomNumber || '-', valueX, y);

  // Right column
  const rightLabelX = pageWidth / 2 + 10;
  const rightValueX = pageWidth / 2 + 45;
  const baseY = y - 21;

  doc.setFont('helvetica', 'bold');
  doc.text('Class:', rightLabelX, baseY);
  doc.setFont('helvetica', 'normal');
  doc.text(receipt.studentClass || '-', rightValueX, baseY);

  y += 12;

  // ─── Payment Details Section ────────────────────────────
  doc.setFillColor(248, 250, 252);
  doc.roundedRect(margin, y, contentWidth, 70, 3, 3, 'F');

  doc.setFontSize(11);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(37, 99, 235);
  doc.text('Payment Details', margin + 8, y + 10);

  doc.setTextColor(0, 0, 0);
  doc.setFontSize(10);

  y += 18;
  doc.setFont('helvetica', 'bold');
  doc.text('Fee Month:', labelX, y);
  doc.setFont('helvetica', 'normal');
  doc.text(receipt.feeMonthLabel, valueX, y);

  y += 8;
  doc.setFont('helvetica', 'bold');
  doc.text('Monthly Fee:', labelX, y);
  doc.setFont('helvetica', 'normal');
  doc.text(`₹${receipt.monthlyFee.toLocaleString('en-IN')}`, valueX, y);

  y += 7;
  doc.setFont('helvetica', 'bold');
  doc.text('Other Fees:', labelX, y);
  doc.setFont('helvetica', 'normal');
  doc.text(`₹${receipt.otherFees.toLocaleString('en-IN')}`, valueX, y);

  y += 7;
  doc.setFont('helvetica', 'bold');
  doc.text('Transport Fee:', labelX, y);
  doc.setFont('helvetica', 'normal');
  doc.text(`₹${receipt.transportFee.toLocaleString('en-IN')}`, valueX, y);

  y += 10;
  doc.setDrawColor(37, 99, 235);
  doc.setLineWidth(0.3);
  doc.line(labelX, y, margin + contentWidth - 8, y);
  y += 7;

  // Total amount
  doc.setFontSize(12);
  doc.setFont('helvetica', 'bold');
  doc.text('Amount Paid:', labelX, y);
  doc.setTextColor(37, 99, 235);
  doc.text(`₹${receipt.amount.toLocaleString('en-IN')}`, valueX + 10, y);

  y += 15;

  // Payment mode and transaction
  doc.setTextColor(0, 0, 0);
  doc.setFontSize(10);
  doc.setFont('helvetica', 'bold');
  doc.text('Payment Mode:', labelX, y);
  doc.setFont('helvetica', 'normal');
  doc.text(getPaymentModeLabel(receipt.paymentMode), valueX + 10, y);

  if (receipt.transactionId) {
    y += 7;
    doc.setFont('helvetica', 'bold');
    doc.text('Transaction ID:', labelX, y);
    doc.setFont('helvetica', 'normal');
    doc.text(receipt.transactionId, valueX + 10, y);
  }

  y += 15;

  // ─── Amount in Words ────────────────────────────────────
  doc.setFillColor(239, 246, 255);
  doc.roundedRect(margin, y, contentWidth, 18, 3, 3, 'F');

  doc.setFontSize(9);
  doc.setFont('helvetica', 'bold');
  doc.text('Amount in Words:', margin + 8, y + 8);
  doc.setFont('helvetica', 'italic');
  doc.text(numberToWords(receipt.amount), margin + 45, y + 8);

  y += 28;

  // ─── Status Badge ──────────────────────────────────────
  doc.setFillColor(16, 185, 129);
  doc.roundedRect(pageWidth / 2 - 15, y, 30, 8, 2, 2, 'F');
  doc.setTextColor(255, 255, 255);
  doc.setFontSize(8);
  doc.setFont('helvetica', 'bold');
  doc.text('PAID', pageWidth / 2, y + 5.5, { align: 'center' });

  y += 20;

  // ─── Signature Section ─────────────────────────────────
  doc.setTextColor(0, 0, 0);
  doc.setDrawColor(200, 200, 200);
  doc.line(pageWidth - margin - 60, y + 10, pageWidth - margin, y + 10);
  doc.setFontSize(9);
  doc.setFont('helvetica', 'normal');
  doc.text('Authorized Signature', pageWidth - margin - 30, y + 18, { align: 'center' });

  // ─── Footer ─────────────────────────────────────────────
  y = doc.internal.pageSize.getHeight() - 25;
  doc.setDrawColor(226, 232, 240);
  doc.line(margin, y, pageWidth - margin, y);
  y += 7;

  doc.setFontSize(8);
  doc.setTextColor(148, 163, 184);
  doc.text('This is a computer-generated receipt.', pageWidth / 2, y, { align: 'center' });
  doc.text('OM Hostel — Hostel Management System', pageWidth / 2, y + 5, { align: 'center' });

  return doc;
}

function formatDateForReceipt(date: string): string {
  const d = new Date(date);
  const months = ['January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December'];
  return `${String(d.getDate()).padStart(2, '0')} ${months[d.getMonth()]} ${d.getFullYear()}`;
}

export function downloadReceipt(receipt: Receipt): void {
  const doc = generateReceiptPDF(receipt);
  doc.save(`${receipt.receiptNumber}.pdf`);
}

export function printReceipt(receipt: Receipt): void {
  const doc = generateReceiptPDF(receipt);
  const blobUrl = doc.output('bloburl');
  window.open(blobUrl as unknown as string, '_blank');
}
