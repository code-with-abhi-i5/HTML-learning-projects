import {
  collection, doc, addDoc, updateDoc, deleteDoc, getDoc, getDocs, query,
  where, orderBy, serverTimestamp,
  type DocumentData, type QueryDocumentSnapshot, Timestamp,
} from 'firebase/firestore';
import { db } from '@/lib/firebase';
import type { Student, StudentFormData } from '@/types';
import { clearDashboardCache } from './dashboard';

const COLLECTION = 'students';

export async function addStudent(data: StudentFormData, adminId: string): Promise<string> {
  const monthlyFee = Number(data.monthlyFee) || 0;
  const otherFees = Number(data.otherFees) || 0;
  const transportFee = Number(data.transportFee) || 0;

  const studentDoc = {
    ...data,
    monthlyFee,
    otherFees,
    transportFee,
    nameLower: data.name.toLowerCase(),
    monthlyTotal: monthlyFee + otherFees + transportFee,
    status: 'active' as const,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
    createdBy: adminId,
  };

  const docRef = await addDoc(collection(db, COLLECTION), studentDoc);
  clearDashboardCache();
  return docRef.id;
}

export async function updateStudent(id: string, data: Partial<StudentFormData>): Promise<void> {
  const updateData: Record<string, unknown> = {
    ...data,
    updatedAt: serverTimestamp(),
  };

  if (data.monthlyFee !== undefined) updateData.monthlyFee = Number(data.monthlyFee) || 0;
  if (data.otherFees !== undefined) updateData.otherFees = Number(data.otherFees) || 0;
  if (data.transportFee !== undefined) updateData.transportFee = Number(data.transportFee) || 0;

  if (data.name) {
    updateData.nameLower = data.name.toLowerCase();
  }

  if (data.monthlyFee !== undefined || data.otherFees !== undefined || data.transportFee !== undefined) {
    const studentDoc = await getDoc(doc(db, COLLECTION, id));
    const current = studentDoc.data();
    const monthlyFee = Number(data.monthlyFee ?? current?.monthlyFee ?? 0) || 0;
    const otherFees = Number(data.otherFees ?? current?.otherFees ?? 0) || 0;
    const transportFee = Number(data.transportFee ?? current?.transportFee ?? 0) || 0;
    updateData.monthlyTotal = monthlyFee + otherFees + transportFee;
  }

  await updateDoc(doc(db, COLLECTION, id), updateData);
  clearDashboardCache();
}

export async function deactivateStudent(id: string): Promise<void> {
  await updateDoc(doc(db, COLLECTION, id), {
    status: 'inactive',
    updatedAt: serverTimestamp(),
  });
  clearDashboardCache();
}

export async function activateStudent(id: string): Promise<void> {
  await updateDoc(doc(db, COLLECTION, id), {
    status: 'active',
    updatedAt: serverTimestamp(),
  });
  clearDashboardCache();
}

export async function deleteStudent(id: string): Promise<void> {
  await deleteDoc(doc(db, COLLECTION, id));
  clearDashboardCache();
}

export async function getStudent(id: string): Promise<Student | null> {
  const docSnap = await getDoc(doc(db, COLLECTION, id));
  if (!docSnap.exists()) return null;
  return { id: docSnap.id, ...docSnap.data() } as Student;
}

export interface GetStudentsParams {
  status?: 'active' | 'inactive';
  roomNumber?: string;
  class?: string;
  searchQuery?: string;
  pageSize?: number;
  lastDoc?: QueryDocumentSnapshot<DocumentData>;
}

export interface GetStudentsResult {
  students: Student[];
  lastDoc: QueryDocumentSnapshot<DocumentData> | null;
  hasMore: boolean;
}

export async function getStudents(params: GetStudentsParams = {}): Promise<GetStudentsResult> {
  const { status, roomNumber, class: studentClass, pageSize = 20, lastDoc: lastDocSnap } = params;

  // Since it's a hostel with limited students, we can fetch all and filter/sort in memory 
  // to avoid complex Firestore composite index requirements for every filter combination.
  const q = query(collection(db, COLLECTION));
  const snapshot = await getDocs(q);

  let allStudents = snapshot.docs.map((d) => ({ id: d.id, ...d.data(), _doc: d } as Student & { _doc: QueryDocumentSnapshot<DocumentData> }));

  // Apply filters
  if (status) allStudents = allStudents.filter(s => s.status === status);
  if (roomNumber) allStudents = allStudents.filter(s => s.roomNumber === roomNumber);
  if (studentClass) allStudents = allStudents.filter(s => s.class === studentClass);

  // Sort by createdAt desc
  allStudents.sort((a, b) => {
    const timeA = a.createdAt?.toMillis() || 0;
    const timeB = b.createdAt?.toMillis() || 0;
    return timeB - timeA;
  });

  // Apply pagination
  let startIndex = 0;
  if (lastDocSnap) {
    const lastIndex = allStudents.findIndex(s => s.id === lastDocSnap.id);
    if (lastIndex !== -1) startIndex = lastIndex + 1;
  }

  const paginatedStudents = allStudents.slice(startIndex, startIndex + pageSize);
  const hasMore = startIndex + pageSize < allStudents.length;
  
  const docs = paginatedStudents.map(s => s._doc);
  
  // Clean up _doc from result
  const students = paginatedStudents.map(s => {
    const { _doc, ...studentData } = s;
    return studentData as Student;
  });

  return {
    students,
    lastDoc: docs.length > 0 ? docs[docs.length - 1] : null,
    hasMore,
  };
}

export async function getAllActiveStudents(): Promise<Student[]> {
  const q = query(
    collection(db, COLLECTION),
    where('status', '==', 'active')
  );
  const snapshot = await getDocs(q);
  const students = snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() } as Student));
  return students.sort((a, b) => a.name.localeCompare(b.name));
}

export async function getStudentCount(): Promise<{ active: number; total: number }> {
  const allQuery = query(collection(db, COLLECTION));
  const activeQuery = query(collection(db, COLLECTION), where('status', '==', 'active'));

  const [allSnap, activeSnap] = await Promise.all([getDocs(allQuery), getDocs(activeQuery)]);

  return { total: allSnap.size, active: activeSnap.size };
}

export async function getStudentsByRoom(roomNumber: string): Promise<Student[]> {
  const q = query(
    collection(db, COLLECTION),
    where('roomNumber', '==', roomNumber),
    where('status', '==', 'active')
  );
  const snapshot = await getDocs(q);
  return snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() } as Student));
}

// Export students data for Excel/CSV
export async function exportStudents(status?: 'active' | 'inactive'): Promise<Student[]> {
  const constraints = [];
  if (status) {
    constraints.push(where('status', '==', status));
  }
  constraints.push(orderBy('name'));

  const q = query(collection(db, COLLECTION), ...constraints);
  const snapshot = await getDocs(q);
  return snapshot.docs.map((d) => {
    const data = d.data();
    return {
      id: d.id,
      ...data,
      createdAt: data.createdAt as Timestamp,
      updatedAt: data.updatedAt as Timestamp,
    } as Student;
  });
}
