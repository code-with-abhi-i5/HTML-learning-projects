import { doc, getDoc, setDoc, serverTimestamp } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import type { HostelSettings, FeeSettings } from '@/types';

export async function getHostelSettings(): Promise<HostelSettings> {
  const docSnap = await getDoc(doc(db, 'settings', 'hostel'));
  if (!docSnap.exists()) {
    return {
      hostelName: 'OM Hostel',
      address: '',
      phone: '',
      email: '',
      logoUrl: '',
      receiptFooter: 'Thank you for your payment. This is a computer-generated receipt.',
    };
  }
  return docSnap.data() as HostelSettings;
}

export async function updateHostelSettings(data: Partial<HostelSettings>): Promise<void> {
  await setDoc(doc(db, 'settings', 'hostel'), {
    ...data,
    updatedAt: serverTimestamp(),
  }, { merge: true });
}

export async function getFeeSettings(): Promise<FeeSettings> {
  const docSnap = await getDoc(doc(db, 'settings', 'fees'));
  if (!docSnap.exists()) {
    return {
      defaultMonthlyFee: 5000,
      defaultOtherFee: 500,
      defaultTransportFee: 0,
      dueDate: 10,
      lateFeeEnabled: false,
      lateFeeAmount: 0,
    };
  }
  return docSnap.data() as FeeSettings;
}

export async function updateFeeSettings(data: Partial<FeeSettings>): Promise<void> {
  await setDoc(doc(db, 'settings', 'fees'), {
    ...data,
    updatedAt: serverTimestamp(),
  }, { merge: true });
}
