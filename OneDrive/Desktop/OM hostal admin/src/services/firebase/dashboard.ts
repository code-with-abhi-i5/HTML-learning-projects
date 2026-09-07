import {
  collection, getDocs, query, where, orderBy, limit,
} from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { format, subDays, startOfMonth, startOfYear } from 'date-fns';
import type { DashboardStats, CollectionDataPoint, PaymentModeData } from '@/types';

import type { QuerySnapshot, DocumentData } from 'firebase/firestore';

const queryCache: Record<string, { promise: Promise<QuerySnapshot<DocumentData, DocumentData>>; time: number }> = {};
const CACHE_TTL = 24 * 60 * 60 * 1000; // 24 hours

export function clearDashboardCache() {
  for (const key in queryCache) {
    delete queryCache[key];
  }
}

function getCachedQuery(key: string, queryObj: any): Promise<QuerySnapshot<DocumentData, DocumentData>> {
  const now = Date.now();
  if (queryCache[key] && now - queryCache[key].time < CACHE_TTL) {
    return queryCache[key].promise;
  }
  const promise = getDocs(queryObj) as Promise<QuerySnapshot<DocumentData, DocumentData>>;
  queryCache[key] = { promise, time: now };
  return promise;
}

export async function getDashboardStats(): Promise<DashboardStats> {
  const today = format(new Date(), 'yyyy-MM-dd');
  const sevenDaysAgo = format(subDays(new Date(), 7), 'yyyy-MM-dd');
  const monthStart = format(startOfMonth(new Date()), 'yyyy-MM-dd');
  const yearStart = format(startOfYear(new Date()), 'yyyy-MM-dd');

  // Get student counts
  const activeStudentsQuery = query(collection(db, 'students'), where('status', '==', 'active'));
  const allStudentsQuery = query(collection(db, 'students'));
  const [activeSnap, allSnap] = await Promise.all([
    getCachedQuery('students_active', activeStudentsQuery),
    getCachedQuery('students_all', allStudentsQuery),
  ]);

  // Get payments for different periods
  const allPaymentsQuery = query(collection(db, 'payments'), orderBy('paymentDate', 'desc'));
  const paymentsSnap = await getCachedQuery('payments_all_desc', allPaymentsQuery);

  let totalCollection = 0;
  let todayCollection = 0;
  let weekCollection = 0;
  let monthCollection = 0;
  let yearCollection = 0;

  paymentsSnap.docs.forEach((doc) => {
    const data = doc.data();
    const amount = data.amount || 0;
    const paymentDate = data.paymentDate || '';

    totalCollection += amount;
    if (paymentDate >= today) todayCollection += amount;
    if (paymentDate >= sevenDaysAgo) weekCollection += amount;
    if (paymentDate >= monthStart) monthCollection += amount;
    if (paymentDate >= yearStart) yearCollection += amount;
  });

  // Get all monthly fees for active students
  const allMonthlyFeesQuery = query(collection(db, 'monthlyFees'));
  const allMonthlyFeesSnap = await getCachedQuery('monthlyFees_all', allMonthlyFeesQuery);

  const existingFees = new Map<string, any>();
  allMonthlyFeesSnap.docs.forEach(doc => {
    const data = doc.data();
    existingFees.set(`${data.studentId}-${data.year}-${data.month}`, data);
  });

  let totalPending = 0;
  let totalOverdue = 0;
  const pendingStudentIds = new Set<string>();
  const overdueStudentIds = new Set<string>();

  const currentYearInt = new Date().getFullYear();
  const currentMonthInt = new Date().getMonth() + 1;

  activeSnap.docs.forEach((doc) => {
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
          const feeData = existingFees.get(feeKey);
          const dueAmount = feeData.dueAmount || 0;
          if (dueAmount > 0) {
            if (isOverdue) {
              totalOverdue += dueAmount;
              overdueStudentIds.add(studentId);
            } else {
              totalPending += dueAmount;
            }
            pendingStudentIds.add(studentId);
          }
        } else {
          // Missing fee record => implies fully due
          if (isOverdue) {
            totalOverdue += monthlyTotal;
            overdueStudentIds.add(studentId);
          } else {
            totalPending += monthlyTotal;
          }
          pendingStudentIds.add(studentId);
        }

        curr.setMonth(curr.getMonth() + 1);
      }
    }
  });

  // Get room stats
  const roomsQuery = query(collection(db, 'rooms'));
  const roomsSnap = await getCachedQuery('rooms_all', roomsQuery);
  let totalBeds = 0;
  let occupiedBeds = 0;

  roomsSnap.docs.forEach((doc) => {
    const data = doc.data();
    totalBeds += data.capacity || 0;
    occupiedBeds += data.occupied || 0;
  });

  const occupancyRate = totalBeds > 0 ? Math.round((occupiedBeds / totalBeds) * 100) : 0;

  return {
    totalStudents: allSnap.size,
    activeStudents: activeSnap.size,
    totalCollection,
    todayCollection,
    weekCollection,
    monthCollection,
    yearCollection,
    totalPending,
    totalOverdue,
    pendingStudents: pendingStudentIds.size,
    overdueStudents: overdueStudentIds.size,
    totalBeds,
    occupiedBeds,
    occupancyRate,
    previousPeriodCollection: 0,
    collectionGrowth: 0,
  };
}

export async function getCollectionChartData(year: number): Promise<CollectionDataPoint[]> {
  const months = [
    'Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun',
    'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec',
  ];

  const paymentsQuery = query(
    collection(db, 'payments'),
    where('feeYear', '==', year)
  );
  const snapshot = await getCachedQuery(`payments_year_${year}`, paymentsQuery);

  const monthlyData = new Array(12).fill(0);

  snapshot.docs.forEach((doc) => {
    const data = doc.data();
    const monthIdx = (data.feeMonth || 1) - 1;
    monthlyData[monthIdx] += data.amount || 0;
  });

  return months.map((label, idx) => ({
    label,
    amount: monthlyData[idx],
  }));
}

export async function getPaymentModeStats(): Promise<PaymentModeData[]> {
  const paymentsQuery = query(collection(db, 'payments'));
  const snapshot = await getCachedQuery('payments_all', paymentsQuery);

  const modeMap: Record<string, { amount: number; count: number }> = {
    cash: { amount: 0, count: 0 },
    upi: { amount: 0, count: 0 },
    online: { amount: 0, count: 0 },
    bank_transfer: { amount: 0, count: 0 },
    other: { amount: 0, count: 0 },
  };

  let totalAmount = 0;

  snapshot.docs.forEach((doc) => {
    const data = doc.data();
    const mode = data.paymentMode || 'other';
    const amount = data.amount || 0;
    if (modeMap[mode]) {
      modeMap[mode].amount += amount;
      modeMap[mode].count += 1;
    }
    totalAmount += amount;
  });

  const modeLabels: Record<string, string> = {
    cash: 'Cash',
    upi: 'UPI',
    online: 'Online',
    bank_transfer: 'Bank Transfer',
    other: 'Other',
  };

  return Object.entries(modeMap)
    .filter(([, v]) => v.count > 0)
    .map(([mode, v]) => ({
      mode: modeLabels[mode] || mode,
      amount: v.amount,
      count: v.count,
      percentage: totalAmount > 0 ? Math.round((v.amount / totalAmount) * 100) : 0,
    }));
}

export async function getTopDefaulters(count: number = 5): Promise<{
  studentId: string;
  studentName: string;
  totalDue: number;
}[]> {
  // Get all active students
  const activeStudentsQuery = query(collection(db, 'students'), where('status', '==', 'active'));
  const activeStudentsSnap = await getCachedQuery('students_active', activeStudentsQuery);
  
  // Get all monthly fees
  const feesQuery = query(collection(db, 'monthlyFees'));
  const feesSnap = await getCachedQuery('monthlyFees_all', feesQuery);
  const existingFees = new Map<string, any>();
  feesSnap.docs.forEach(doc => {
    const data = doc.data();
    existingFees.set(`${data.studentId}-${data.year}-${data.month}`, data);
  });

  const studentDues: Record<string, { name: string; total: number }> = {};
  const currentYearInt = new Date().getFullYear();
  const currentMonthInt = new Date().getMonth() + 1;

  activeStudentsSnap.docs.forEach(doc => {
    const student = doc.data();
    const studentId = doc.id;
    const monthlyTotal = (Number(student.monthlyFee) || 0) + (Number(student.otherFees) || 0) + (Number(student.transportFee) || 0);

    if (student.joiningDate) {
      const joinDate = new Date(student.joiningDate);
      let curr = new Date(joinDate.getFullYear(), joinDate.getMonth(), 1);
      const end = new Date(currentYearInt, currentMonthInt - 1, 1);
      
      let totalDue = 0;

      while (curr <= end) {
        const y = curr.getFullYear();
        const m = curr.getMonth() + 1;
        const feeKey = `${studentId}-${y}-${m}`;

        if (existingFees.has(feeKey)) {
          const feeData = existingFees.get(feeKey);
          if (feeData.dueAmount > 0) {
            totalDue += feeData.dueAmount;
          }
        } else {
          // If missing, they owe the full amount
          totalDue += monthlyTotal;
        }

        curr.setMonth(curr.getMonth() + 1);
      }

      if (totalDue > 0) {
        studentDues[studentId] = { name: student.name, total: totalDue };
      }
    }
  });

  return Object.entries(studentDues)
    .map(([id, v]) => ({ studentId: id, studentName: v.name, totalDue: v.total }))
    .sort((a, b) => b.totalDue - a.totalDue)
    .slice(0, count);
}

export async function getRecentPayments(count: number = 5) {
  const q = query(
    collection(db, 'payments'),
    orderBy('createdAt', 'desc'),
    limit(count)
  );
  const snapshot = await getCachedQuery(`payments_recent_${count}`, q);
  return snapshot.docs.map((d) => ({ id: d.id, ...d.data() }));
}
