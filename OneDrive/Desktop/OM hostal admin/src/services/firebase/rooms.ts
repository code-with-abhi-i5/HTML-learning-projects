import {
  collection, doc, addDoc, updateDoc, getDoc, getDocs,
  query, where, orderBy, serverTimestamp,
} from 'firebase/firestore';
import { db } from '@/lib/firebase';
import type { Room, RoomFormData } from '@/types';
import { clearDashboardCache } from './dashboard';

const COLLECTION = 'rooms';

export async function addRoom(data: RoomFormData): Promise<string> {
  const docRef = await addDoc(collection(db, COLLECTION), {
    ...data,
    occupied: 0,
    available: data.capacity,
    status: 'available',
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  });
  clearDashboardCache();
  return docRef.id;
}

export async function updateRoom(id: string, data: Partial<RoomFormData>): Promise<void> {
  await updateDoc(doc(db, COLLECTION, id), {
    ...data,
    updatedAt: serverTimestamp(),
  });
  clearDashboardCache();
}

export async function updateRoomOccupancy(roomNumber: string, change: number): Promise<void> {
  const q = query(collection(db, COLLECTION), where('roomNumber', '==', roomNumber));
  const snapshot = await getDocs(q);

  if (!snapshot.empty) {
    const roomDoc = snapshot.docs[0];
    const roomData = roomDoc.data();
    const newOccupied = Math.max(0, (roomData.occupied || 0) + change);
    const newAvailable = Math.max(0, roomData.capacity - newOccupied);

    let status: 'available' | 'partial' | 'full' = 'available';
    if (newOccupied >= roomData.capacity) status = 'full';
    else if (newOccupied > 0) status = 'partial';

    await updateDoc(roomDoc.ref, {
      occupied: newOccupied,
      available: newAvailable,
      status,
      updatedAt: serverTimestamp(),
    });
    clearDashboardCache();
  }
}

export async function getRoom(id: string): Promise<Room | null> {
  const docSnap = await getDoc(doc(db, COLLECTION, id));
  if (!docSnap.exists()) return null;
  return { id: docSnap.id, ...docSnap.data() } as Room;
}

export async function getRooms(floor?: string): Promise<Room[]> {
  const constraints = [];
  if (floor) constraints.push(where('floor', '==', floor));
  constraints.push(orderBy('roomNumber'));

  const q = query(collection(db, COLLECTION), ...constraints);
  const snapshot = await getDocs(q);
  return snapshot.docs.map((d) => ({ id: d.id, ...d.data() } as Room));
}

export async function getRoomStats(): Promise<{
  totalBeds: number;
  occupiedBeds: number;
  availableBeds: number;
  totalRooms: number;
}> {
  const rooms = await getRooms();
  return {
    totalRooms: rooms.length,
    totalBeds: rooms.reduce((sum, r) => sum + r.capacity, 0),
    occupiedBeds: rooms.reduce((sum, r) => sum + r.occupied, 0),
    availableBeds: rooms.reduce((sum, r) => sum + r.available, 0),
  };
}
