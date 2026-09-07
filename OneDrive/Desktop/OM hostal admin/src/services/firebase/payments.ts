import {
  collection, doc, addDoc, updateDoc, deleteDoc, getDoc, getDocs, query,
  where, orderBy, limit, serverTimestamp, runTransaction, increment,
} from 'firebase/firestore';
import { db } from '@/lib/firebase';
import type { Payment, PaymentFormData, MonthlyFee, Receipt } from '@/types';
import { getMonthLabel } from '@/lib/utils';
import { clearDashboardCache } from './dashboard';

const PAYMENTS_COLLECTION = 'payments';
const MONTHLY_FEES_COLLECTION = 'monthlyFees';
const RECEIPTS_COLLECTION = 'receipts';
const COUNTERS_COLLECTION = 'counters';

// ─── Receipt Number Generation (Transaction-safe) ──────────
async function generateReceiptNumber(): Promise<string> {
  const year = new Date().getFullYear();
  const counterRef = doc(db, COUNTERS_COLLECTION, 'receipts');

  const receiptNumber = await runTransaction(db, async (transaction) => {
    const counterDoc = await transaction.get(counterRef);

    let currentCount = 0;
    let currentYear = year;

    if (counterDoc.exists()) {
      const data = counterDoc.data();
      currentYear = data.year || year;
      currentCount = data.count || 0;

      // Reset counter for new year
      if (currentYear !== year) {
        currentCount = 0;
        currentYear = year;
      }
    }

    const newCount = currentCount + 1;
    transaction.set(counterRef, { year: currentYear, count: newCount });

    return `OM-${currentYear}-${String(newCount).padStart(6, '0')}`;
  });

  return receiptNumber;
}

// ─── Record Payment ─────────────────────────────────────────
export interface RecordPaymentResult {
  paymentId: string;
  receiptNumber: string;
  receiptId: string;
}

export async function recordPayment(
  data: PaymentFormData,
  studentData: {
    name: string;
    fatherName: string;
    roomNumber: string;
    class: string;
    monthlyFee: number;
    otherFees: number;
    transportFee: number;
  },
  adminId: string
): Promise<RecordPaymentResult> {
  const receiptNumber = await generateReceiptNumber();
  const feeMonthLabel = getMonthLabel(data.feeMonth, data.feeYear);

  // 1. Find or create the monthly fee record
  const monthlyFeeQuery = query(
    collection(db, MONTHLY_FEES_COLLECTION),
    where('studentId', '==', data.studentId),
    where('month', '==', data.feeMonth),
    where('year', '==', data.feeYear)
  );
  const monthlyFeeSnap = await getDocs(monthlyFeeQuery);

  let monthlyFeeId: string;
  let currentPaid = 0;
  let totalAmount = (Number(studentData.monthlyFee) || 0) + (Number(studentData.otherFees) || 0) + (Number(studentData.transportFee) || 0);

  if (monthlyFeeSnap.empty) {
    // Create monthly fee record
    const newFeeDoc = await addDoc(collection(db, MONTHLY_FEES_COLLECTION), {
      studentId: data.studentId,
      studentName: studentData.name,
      month: data.feeMonth,
      year: data.feeYear,
      monthLabel: feeMonthLabel,
      totalAmount,
      paidAmount: 0,
      dueAmount: totalAmount,
      dueDate: `${data.feeYear}-${String(data.feeMonth).padStart(2, '0')}-10`,
      status: 'pending',
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    });
    monthlyFeeId = newFeeDoc.id;
  } else {
    const feeDoc = monthlyFeeSnap.docs[0];
    monthlyFeeId = feeDoc.id;
    const feeData = feeDoc.data();
    currentPaid = Number(feeData.paidAmount) || 0;
    totalAmount = Number(feeData.totalAmount) || 0;
  }

  const paymentAmount = Number(data.amount) || 0;

  // 2. Save payment
  const paymentDoc = await addDoc(collection(db, PAYMENTS_COLLECTION), {
    studentId: data.studentId,
    studentName: studentData.name,
    feeMonth: data.feeMonth,
    feeYear: data.feeYear,
    feeMonthLabel,
    monthlyFeeId,
    amount: paymentAmount,
    paymentMode: data.paymentMode,
    transactionId: data.transactionId || '',
    paymentDate: data.paymentDate,
    receiptNumber,
    notes: data.notes || '',
    createdAt: serverTimestamp(),
    createdBy: adminId,
  });

  // 3. Update monthly fee
  const newPaid = currentPaid + paymentAmount;
  const newDue = Math.max(0, totalAmount - newPaid);
  let newStatus: string;

  if (newDue <= 0) {
    newStatus = 'paid';
  } else if (newPaid > 0) {
    newStatus = 'partial';
  } else {
    newStatus = 'pending';
  }

  await updateDoc(doc(db, MONTHLY_FEES_COLLECTION, monthlyFeeId), {
    paidAmount: newPaid,
    dueAmount: newDue,
    status: newStatus,
    updatedAt: serverTimestamp(),
  });

  // 4. Update dashboard stats
  await updateDashboardStats(data.amount, data.paymentDate);

  // 5. Create receipt
  const receiptDoc = await addDoc(collection(db, RECEIPTS_COLLECTION), {
    receiptNumber,
    paymentId: paymentDoc.id,
    studentId: data.studentId,
    studentName: studentData.name,
    fatherName: studentData.fatherName,
    roomNumber: studentData.roomNumber,
    studentClass: studentData.class,
    feeMonth: data.feeMonth,
    feeYear: data.feeYear,
    feeMonthLabel,
    monthlyFee: studentData.monthlyFee,
    otherFees: studentData.otherFees,
    transportFee: studentData.transportFee,
    amount: data.amount,
    paymentMode: data.paymentMode,
    transactionId: data.transactionId || '',
    paymentDate: data.paymentDate,
    issuedAt: serverTimestamp(),
    issuedBy: adminId,
  });

  clearDashboardCache();

  return {
    paymentId: paymentDoc.id,
    receiptNumber,
    receiptId: receiptDoc.id,
  };
}

// ─── Dashboard Stats Update ────────────────────────────────
async function updateDashboardStats(amount: number, _paymentDate: string): Promise<void> {
  const statsRef = doc(db, 'dashboardStats', 'current');
  const statsDoc = await getDoc(statsRef);

  if (!statsDoc.exists()) {
    const { setDoc } = await import('firebase/firestore');
    await setDoc(statsRef, {
      totalCollection: amount,
      updatedAt: serverTimestamp(),
    });
  } else {
    await updateDoc(statsRef, {
      totalCollection: increment(amount),
      updatedAt: serverTimestamp(),
    });
  }
}

// ─── Get Payments ───────────────────────────────────────────
export async function getPayments(filters?: {
  studentId?: string;
  paymentMode?: string;
  startDate?: string;
  endDate?: string;
  limit?: number;
}): Promise<Payment[]> {
  const constraints = [];

  if (filters?.studentId) {
    constraints.push(where('studentId', '==', filters.studentId));
  }
  if (filters?.paymentMode) {
    constraints.push(where('paymentMode', '==', filters.paymentMode));
  }

  constraints.push(orderBy('createdAt', 'desc'));

  if (filters?.limit) {
    constraints.push(limit(filters.limit));
  }

  const q = query(collection(db, PAYMENTS_COLLECTION), ...constraints);
  const snapshot = await getDocs(q);

  return snapshot.docs.map((d) => ({ id: d.id, ...d.data() } as Payment));
}

export async function getStudentPayments(studentId: string): Promise<Payment[]> {
  const q = query(
    collection(db, PAYMENTS_COLLECTION),
    where('studentId', '==', studentId)
  );
  const snapshot = await getDocs(q);
  const payments = snapshot.docs.map((d) => ({ id: d.id, ...d.data() } as Payment));
  return payments.sort((a, b) => {
    const timeA = a.createdAt?.toMillis() || 0;
    const timeB = b.createdAt?.toMillis() || 0;
    return timeB - timeA;
  });
}

// ─── Monthly Fees ───────────────────────────────────────────
export async function getStudentMonthlyFees(studentId: string): Promise<MonthlyFee[]> {
  const q = query(
    collection(db, MONTHLY_FEES_COLLECTION),
    where('studentId', '==', studentId)
  );
  const snapshot = await getDocs(q);
  const fees = snapshot.docs.map((d) => ({ id: d.id, ...d.data() } as MonthlyFee));
  return fees.sort((a, b) => {
    if (a.year !== b.year) return b.year - a.year;
    return b.month - a.month;
  });
}

export async function createMonthlyFee(
  studentId: string,
  studentName: string,
  month: number,
  year: number,
  totalAmount: number,
  dueDate?: number
): Promise<string> {
  const dueDateStr = `${year}-${String(month).padStart(2, '0')}-${String(dueDate || 10).padStart(2, '0')}`;

  const docRef = await addDoc(collection(db, MONTHLY_FEES_COLLECTION), {
    studentId,
    studentName,
    month,
    year,
    monthLabel: getMonthLabel(month, year),
    totalAmount,
    paidAmount: 0,
    dueAmount: totalAmount,
    dueDate: dueDateStr,
    status: 'pending',
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  });

  clearDashboardCache();
  return docRef.id;
}

export async function getAllMonthlyFees(month?: number, year?: number): Promise<MonthlyFee[]> {
  const constraints = [];

  if (month) constraints.push(where('month', '==', month));
  if (year) constraints.push(where('year', '==', year));
  const q = query(collection(db, MONTHLY_FEES_COLLECTION), ...constraints);
  const snapshot = await getDocs(q);
  const data = snapshot.docs.map((d) => ({ id: d.id, ...d.data() } as MonthlyFee));
  
  return data.sort((a, b) => (a.studentName || '').localeCompare(b.studentName || ''));
}

export async function getOverdueMonthlyFees(): Promise<MonthlyFee[]> {
  const activeStudentsSnap = await getDocs(query(collection(db, 'students'), where('status', '==', 'active')));
  const feesSnap = await getDocs(query(collection(db, MONTHLY_FEES_COLLECTION)));
  
  const existingFees = new Map<string, any>();
  feesSnap.docs.forEach(doc => {
    const data = doc.data();
    existingFees.set(`${data.studentId}-${data.year}-${data.month}`, { id: doc.id, ...data });
  });

  const today = new Date().toISOString().split('T')[0];
  const currentYearInt = new Date().getFullYear();
  const currentMonthInt = new Date().getMonth() + 1;
  const allDues: MonthlyFee[] = [];

  activeStudentsSnap.docs.forEach(doc => {
    const student = doc.data();
    const studentId = doc.id;
    const monthlyTotal = (Number(student.monthlyFee) || 0) + (Number(student.otherFees) || 0) + (Number(student.transportFee) || 0);

    if (student.joiningDate) {
      const joinDate = new Date(student.joiningDate);
      let curr = new Date(joinDate.getFullYear(), joinDate.getMonth(), 1);
      const end = new Date(currentYearInt, currentMonthInt - 1, 1);

      while (curr <= end) {
        const y = curr.getFullYear();
        const m = curr.getMonth() + 1;
        const feeKey = `${studentId}-${y}-${m}`;
        const dueDate = `${y}-${String(m).padStart(2, '0')}-10`;
        const isOverdue = dueDate < today;

        if (existingFees.has(feeKey)) {
          const feeData = existingFees.get(feeKey) as MonthlyFee;
          if (feeData.dueAmount > 0) {
            allDues.push({
              ...feeData,
              status: isOverdue && feeData.status !== 'paid' ? 'overdue' : feeData.status,
            });
          }
        } else {
          allDues.push({
            id: `synthetic-${studentId}-${y}-${m}`,
            studentId,
            studentName: student.name,
            month: m,
            year: y,
            monthLabel: getMonthLabel(m, y),
            totalAmount: monthlyTotal,
            paidAmount: 0,
            dueAmount: monthlyTotal,
            status: isOverdue ? 'overdue' : 'pending',
            dueDate,
            createdAt: null as any,
            updatedAt: null as any,
          });
        }
        curr.setMonth(curr.getMonth() + 1);
      }
    }
  });

  return allDues.sort((a, b) => b.dueAmount - a.dueAmount);
}

// ─── Receipts ───────────────────────────────────────────────
export async function getReceipts(filters?: {
  studentId?: string;
  month?: number;
  year?: number;
  paymentMode?: string;
  receiptNumber?: string;
}): Promise<Receipt[]> {
  const constraints = [];

  if (filters?.studentId) constraints.push(where('studentId', '==', filters.studentId));
  if (filters?.month) constraints.push(where('feeMonth', '==', filters.month));
  if (filters?.year) constraints.push(where('feeYear', '==', filters.year));
  if (filters?.paymentMode) constraints.push(where('paymentMode', '==', filters.paymentMode));

  const q = query(collection(db, RECEIPTS_COLLECTION), ...constraints);
  const snapshot = await getDocs(q);
  const receipts = snapshot.docs.map((d) => ({ id: d.id, ...d.data() } as Receipt));
  return receipts.sort((a, b) => {
    const timeA = a.issuedAt?.toMillis() || 0;
    const timeB = b.issuedAt?.toMillis() || 0;
    return timeB - timeA;
  });
}

export async function getReceipt(id: string): Promise<Receipt | null> {
  const docSnap = await getDoc(doc(db, RECEIPTS_COLLECTION, id));
  if (!docSnap.exists()) return null;
  return { id: docSnap.id, ...docSnap.data() } as Receipt;
}

// ─── Quick Toggle Monthly Fee Status (Tick/Untick) ───────────
export async function toggleMonthlyFeeStatus(
  student: {
    id: string;
    studentId: string;
    name: string;
    fatherName?: string;
    roomNumber: string;
    class: string;
    monthlyFee: number;
    otherFees: number;
    transportFee: number;
    monthlyTotal: number;
  },
  month: number,
  year: number,
  markPaid: boolean,
  adminId: string
): Promise<void> {
  const feeMonthLabel = getMonthLabel(month, year);
  const totalAmount = student.monthlyTotal || (Number(student.monthlyFee) || 0) + (Number(student.otherFees) || 0) + (Number(student.transportFee) || 0);
  const today = new Date().toISOString().split('T')[0];
  const dueDateStr = `${year}-${String(month).padStart(2, '0')}-10`;

  const monthlyFeeQuery = query(
    collection(db, MONTHLY_FEES_COLLECTION),
    where('studentId', '==', student.id),
    where('month', '==', month),
    where('year', '==', year)
  );
  const monthlyFeeSnap = await getDocs(monthlyFeeQuery);

  if (markPaid) {
    let feeId: string;
    if (monthlyFeeSnap.empty) {
      const newFeeDoc = await addDoc(collection(db, MONTHLY_FEES_COLLECTION), {
        studentId: student.id,
        studentName: student.name,
        month,
        year,
        monthLabel: feeMonthLabel,
        totalAmount,
        paidAmount: totalAmount,
        dueAmount: 0,
        dueDate: dueDateStr,
        status: 'paid',
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      });
      feeId = newFeeDoc.id;
    } else {
      feeId = monthlyFeeSnap.docs[0].id;
      await updateDoc(doc(db, MONTHLY_FEES_COLLECTION, feeId), {
        paidAmount: totalAmount,
        dueAmount: 0,
        status: 'paid',
        updatedAt: serverTimestamp(),
      });
    }

    // Check if a payment record exists
    const pQuery = query(
      collection(db, PAYMENTS_COLLECTION),
      where('studentId', '==', student.id),
      where('feeMonth', '==', month),
      where('feeYear', '==', year)
    );
    const pSnap = await getDocs(pQuery);
    if (pSnap.empty) {
      const receiptNumber = await generateReceiptNumber();
      const pDoc = await addDoc(collection(db, PAYMENTS_COLLECTION), {
        studentId: student.id,
        studentName: student.name,
        feeMonth: month,
        feeYear: year,
        feeMonthLabel,
        monthlyFeeId: feeId,
        amount: totalAmount,
        paymentMode: 'cash',
        transactionId: '',
        paymentDate: today,
        receiptNumber,
        notes: 'Marked paid via fee register',
        createdAt: serverTimestamp(),
        createdBy: adminId,
      });

      await addDoc(collection(db, RECEIPTS_COLLECTION), {
        receiptNumber,
        paymentId: pDoc.id,
        studentId: student.studentId,
        studentName: student.name,
        fatherName: student.fatherName || '',
        roomNumber: student.roomNumber,
        studentClass: student.class,
        feeMonth: month,
        feeYear: year,
        feeMonthLabel,
        monthlyFee: student.monthlyFee,
        otherFees: student.otherFees,
        transportFee: student.transportFee,
        amount: totalAmount,
        paymentMode: 'cash',
        transactionId: '',
        paymentDate: today,
        issuedAt: serverTimestamp(),
        issuedBy: adminId,
      });
    }
  } else {
    // Un-ticking: mark as pending / overdue
    const isOverdue = dueDateStr < today;
    if (!monthlyFeeSnap.empty) {
      const feeId = monthlyFeeSnap.docs[0].id;
      await updateDoc(doc(db, MONTHLY_FEES_COLLECTION, feeId), {
        paidAmount: 0,
        dueAmount: totalAmount,
        status: isOverdue ? 'overdue' : 'pending',
        updatedAt: serverTimestamp(),
      });
    }

    // Remove payments recorded for this month
    const pQuery = query(
      collection(db, PAYMENTS_COLLECTION),
      where('studentId', '==', student.id),
      where('feeMonth', '==', month),
      where('feeYear', '==', year)
    );
    const pSnap = await getDocs(pQuery);
    for (const pDoc of pSnap.docs) {
      await deleteDoc(doc(db, PAYMENTS_COLLECTION, pDoc.id));
    }

    // Remove receipts recorded for this month
    const rQuery = query(
      collection(db, RECEIPTS_COLLECTION),
      where('studentId', '==', student.studentId),
      where('feeMonth', '==', month),
      where('feeYear', '==', year)
    );
    const rSnap = await getDocs(rQuery);
    for (const rDoc of rSnap.docs) {
      await deleteDoc(doc(db, RECEIPTS_COLLECTION, rDoc.id));
    }
  }

  clearDashboardCache();
}

