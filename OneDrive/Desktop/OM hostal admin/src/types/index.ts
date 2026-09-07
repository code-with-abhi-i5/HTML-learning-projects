import type { Timestamp } from 'firebase/firestore';

// ─── Student ────────────────────────────────────────────────
export interface Student {
  id: string;
  studentId: string;
  name: string;
  fatherName: string;
  motherName: string;
  email: string;
  studentMobile: string;
  parentMobile: string;
  class: string;
  course: string;
  academicYear: string;
  hostelName: string;
  roomNumber: string;
  bedNumber: string;
  joiningDate: string;
  monthlyFee: number;
  otherFees: number;
  transportFee: number;
  monthlyTotal: number;
  status: 'active' | 'inactive';
  createdAt: Timestamp;
  updatedAt: Timestamp;
  createdBy: string;
}

export type StudentFormData = Omit<Student, 'id' | 'createdAt' | 'updatedAt' | 'createdBy' | 'monthlyTotal' | 'status'>;

// ─── Monthly Fee ────────────────────────────────────────────
export type FeeStatus = 'paid' | 'partial' | 'pending' | 'overdue';

export interface MonthlyFee {
  id: string;
  studentId: string;
  studentName: string;
  month: number; // 1-12
  year: number;
  monthLabel: string; // "September 2026"
  totalAmount: number;
  paidAmount: number;
  dueAmount: number;
  dueDate: string;
  status: FeeStatus;
  createdAt: Timestamp;
  updatedAt: Timestamp;
}

// ─── Payment ────────────────────────────────────────────────
export type PaymentMode = 'cash' | 'upi' | 'online' | 'bank_transfer' | 'other';

export interface Payment {
  id: string;
  paymentId: string;
  studentId: string;
  studentName: string;
  feeMonth: number;
  feeYear: number;
  feeMonthLabel: string;
  monthlyFeeId: string;
  amount: number;
  paymentMode: PaymentMode;
  transactionId: string;
  paymentDate: string;
  receiptNumber: string;
  notes: string;
  createdAt: Timestamp;
  createdBy: string;
}

export type PaymentFormData = {
  studentId: string;
  feeMonth: number;
  feeYear: number;
  amount: number;
  paymentMode: PaymentMode;
  transactionId: string;
  paymentDate: string;
  notes: string;
};

// ─── Receipt ────────────────────────────────────────────────
export interface Receipt {
  id: string;
  receiptNumber: string;
  paymentId: string;
  studentId: string;
  studentName: string;
  fatherName: string;
  roomNumber: string;
  studentClass: string;
  feeMonth: number;
  feeYear: number;
  feeMonthLabel: string;
  monthlyFee: number;
  otherFees: number;
  transportFee: number;
  amount: number;
  paymentMode: PaymentMode;
  transactionId: string;
  paymentDate: string;
  issuedAt: Timestamp;
  issuedBy: string;
}

// ─── Room ───────────────────────────────────────────────────
export interface Room {
  id: string;
  roomNumber: string;
  floor: string;
  capacity: number;
  occupied: number;
  available: number;
  hostelName: string;
  status: 'available' | 'partial' | 'full';
  createdAt: Timestamp;
  updatedAt: Timestamp;
}

export type RoomFormData = Omit<Room, 'id' | 'occupied' | 'available' | 'status' | 'createdAt' | 'updatedAt'>;

// ─── Audit Log ──────────────────────────────────────────────
export type AuditAction =
  | 'LOGIN'
  | 'LOGOUT'
  | 'CREATE_STUDENT'
  | 'UPDATE_STUDENT'
  | 'DEACTIVATE_STUDENT'
  | 'DELETE_STUDENT'
  | 'RECORD_PAYMENT'
  | 'UPDATE_PAYMENT'
  | 'DOWNLOAD_RECEIPT'
  | 'CREATE_ROOM'
  | 'UPDATE_ROOM'
  | 'EXPORT_REPORT'
  | 'UPDATE_SETTINGS'
  | 'GENERATE_MONTHLY_FEE';

export interface AuditLog {
  id: string;
  adminId: string;
  adminEmail: string;
  action: AuditAction;
  entity: string;
  entityId: string;
  description: string;
  timestamp: Timestamp;
  metadata?: Record<string, unknown>;
}

// ─── Settings ───────────────────────────────────────────────
export interface HostelSettings {
  hostelName: string;
  address: string;
  phone: string;
  email: string;
  logoUrl: string;
  receiptFooter: string;
}

export interface FeeSettings {
  defaultMonthlyFee: number;
  defaultOtherFee: number;
  defaultTransportFee: number;
  dueDate: number; // Day of month
  lateFeeEnabled: boolean;
  lateFeeAmount: number;
}

// ─── Dashboard Stats ────────────────────────────────────────
export interface DashboardStats {
  totalStudents: number;
  activeStudents: number;
  totalCollection: number;
  todayCollection: number;
  weekCollection: number;
  monthCollection: number;
  yearCollection: number;
  totalPending: number;
  totalOverdue: number;
  pendingStudents: number;
  overdueStudents: number;
  totalBeds: number;
  occupiedBeds: number;
  occupancyRate: number;
  previousPeriodCollection: number;
  collectionGrowth: number;
}

// ─── Chart Data ─────────────────────────────────────────────
export interface CollectionDataPoint {
  label: string;
  amount: number;
}

export interface PaymentModeData {
  mode: string;
  amount: number;
  count: number;
  percentage: number;
}

// ─── Global Search ──────────────────────────────────────────
export interface SearchResult {
  type: 'student' | 'receipt' | 'room';
  id: string;
  title: string;
  subtitle: string;
}
