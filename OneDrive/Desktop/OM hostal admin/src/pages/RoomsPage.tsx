import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Plus, DoorOpen } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { getRooms, addRoom } from '@/services/firebase/rooms';
import { getStudentsByRoom } from '@/services/firebase/students';
import { createAuditLog } from '@/services/firebase/auditLogs';
import { useAuth } from '@/contexts/AuthContext';
import type { Room, Student } from '@/types';
import { Progress } from '@/components/ui/progress';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';

export default function RoomsPage() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [rooms, setRooms] = useState<Room[]>([]);
  const [loading, setLoading] = useState(true);
  const [addDialogOpen, setAddDialogOpen] = useState(false);
  const [detailDialogOpen, setDetailDialogOpen] = useState(false);
  const [selectedRoom, setSelectedRoom] = useState<Room | null>(null);
  const [roomStudents, setRoomStudents] = useState<Student[]>([]);
  const [newRoom, setNewRoom] = useState({ roomNumber: '', floor: '', capacity: 4 });
  const [isAdding, setIsAdding] = useState(false);

  useEffect(() => {
    fetchRooms();
  }, []);

  async function fetchRooms() {
    setLoading(true);
    try {
      const data = await getRooms();
      setRooms(data);
    } catch (error) {
      console.error(error);
    } finally {
      setLoading(false);
    }
  }

  async function handleAddRoom() {
    if (!user || !newRoom.roomNumber) return;
    setIsAdding(true);
    try {
      const id = await addRoom({
        roomNumber: newRoom.roomNumber,
        floor: newRoom.floor,
        capacity: newRoom.capacity,
        hostelName: 'OM Hostel',
      });
      await createAuditLog({
        adminId: user.uid,
        adminEmail: user.email || '',
        action: 'CREATE_ROOM',
        entity: 'room',
        entityId: id,
        description: `Added room ${newRoom.roomNumber}`,
      });
      toast.success(`Room ${newRoom.roomNumber} added`);
      setAddDialogOpen(false);
      setNewRoom({ roomNumber: '', floor: '', capacity: 4 });
      fetchRooms();
    } catch (error) {
      console.error(error);
      toast.error('Failed to add room');
    } finally {
      setIsAdding(false);
    }
  }

  async function handleRoomClick(room: Room) {
    setSelectedRoom(room);
    setDetailDialogOpen(true);
    try {
      const students = await getStudentsByRoom(room.roomNumber);
      setRoomStudents(students);
    } catch (error) {
      console.error(error);
    }
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'available': return 'border-emerald-200 dark:border-emerald-800';
      case 'partial': return 'border-amber-200 dark:border-amber-800';
      case 'full': return 'border-rose-200 dark:border-rose-800';
      default: return '';
    }
  };

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-[var(--foreground)]">Rooms</h1>
          <p className="text-sm text-[var(--muted-foreground)]">Manage hostel rooms and occupancy</p>
        </div>
        <Button size="sm" onClick={() => setAddDialogOpen(true)} className="gap-2">
          <Plus className="h-4 w-4" /> Add Room
        </Button>
      </div>

      {/* Room Stats */}
      {!loading && rooms.length > 0 && (
        <div className="grid grid-cols-3 gap-4">
          <Card><CardContent className="pt-5 pb-4 px-5">
            <p className="text-xs text-[var(--muted-foreground)] uppercase tracking-wider">Total Rooms</p>
            <p className="text-2xl font-bold mt-1">{rooms.length}</p>
          </CardContent></Card>
          <Card><CardContent className="pt-5 pb-4 px-5">
            <p className="text-xs text-[var(--muted-foreground)] uppercase tracking-wider">Total Beds</p>
            <p className="text-2xl font-bold mt-1">{rooms.reduce((s, r) => s + r.capacity, 0)}</p>
          </CardContent></Card>
          <Card><CardContent className="pt-5 pb-4 px-5">
            <p className="text-xs text-[var(--muted-foreground)] uppercase tracking-wider">Occupied</p>
            <p className="text-2xl font-bold mt-1">{rooms.reduce((s, r) => s + r.occupied, 0)}</p>
          </CardContent></Card>
        </div>
      )}

      {/* Room Grid */}
      {loading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {Array.from({ length: 8 }).map((_, i) => <Skeleton key={i} className="h-36 rounded-xl" />)}
        </div>
      ) : rooms.length === 0 ? (
        <Card className="flex flex-col items-center justify-center py-16">
          <DoorOpen className="h-12 w-12 text-[var(--muted-foreground)] mb-3" />
          <p className="text-lg font-medium">No rooms added yet</p>
          <p className="text-sm text-[var(--muted-foreground)] mt-1">Add your first room to get started</p>
          <Button className="mt-4" onClick={() => setAddDialogOpen(true)}>
            <Plus className="h-4 w-4 mr-2" /> Add Room
          </Button>
        </Card>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {rooms.map((room) => {
            const occupancyPercent = room.capacity > 0 ? Math.round((room.occupied / room.capacity) * 100) : 0;
            return (
              <Card
                key={room.id}
                className={cn('card-hover cursor-pointer border-2', getStatusColor(room.status))}
                onClick={() => handleRoomClick(room)}
              >
                <CardContent className="pt-5 pb-4 px-5">
                  <div className="flex items-center justify-between mb-3">
                    <h3 className="text-lg font-bold text-[var(--foreground)]">Room {room.roomNumber}</h3>
                    <Badge variant={room.status === 'available' ? 'success' : room.status === 'partial' ? 'warning' : 'error'}>
                      {room.status}
                    </Badge>
                  </div>
                  <p className="text-sm text-[var(--muted-foreground)] mb-3">Floor {room.floor || '-'}</p>
                  <div className="space-y-2">
                    <div className="flex justify-between text-sm">
                      <span className="text-[var(--muted-foreground)]">Occupancy</span>
                      <span className="font-medium">{room.occupied} / {room.capacity}</span>
                    </div>
                    <Progress value={occupancyPercent} />
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      {/* Add Room Dialog */}
      <Dialog open={addDialogOpen} onOpenChange={setAddDialogOpen}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>Add Room</DialogTitle>
            <DialogDescription>Add a new room to OM Hostel</DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Room Number *</Label>
              <Input placeholder="e.g. 101" value={newRoom.roomNumber} onChange={(e) => setNewRoom({ ...newRoom, roomNumber: e.target.value })} />
            </div>
            <div className="space-y-2">
              <Label>Floor</Label>
              <Input placeholder="e.g. 1" value={newRoom.floor} onChange={(e) => setNewRoom({ ...newRoom, floor: e.target.value })} />
            </div>
            <div className="space-y-2">
              <Label>Capacity</Label>
              <Input type="number" value={newRoom.capacity} onChange={(e) => setNewRoom({ ...newRoom, capacity: parseInt(e.target.value) || 4 })} />
            </div>
            <div className="flex justify-end gap-3">
              <Button variant="outline" onClick={() => setAddDialogOpen(false)}>Cancel</Button>
              <Button onClick={handleAddRoom} disabled={isAdding || !newRoom.roomNumber}>
                {isAdding ? 'Adding...' : 'Add Room'}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Room Detail Dialog */}
      <Dialog open={detailDialogOpen} onOpenChange={setDetailDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Room {selectedRoom?.roomNumber}</DialogTitle>
            <DialogDescription>Floor {selectedRoom?.floor || '-'} · Capacity: {selectedRoom?.capacity}</DialogDescription>
          </DialogHeader>
          <div className="space-y-3">
            <p className="text-sm font-medium text-[var(--muted-foreground)]">Assigned Students ({roomStudents.length})</p>
            {roomStudents.length === 0 ? (
              <p className="text-sm text-[var(--muted-foreground)]">No students assigned</p>
            ) : (
              roomStudents.map((s) => (
                <button
                  key={s.id}
                  onClick={() => { setDetailDialogOpen(false); navigate(`/students/${s.id}`); }}
                  className="flex items-center gap-3 w-full rounded-lg px-3 py-2 hover:bg-[var(--accent)] transition-colors text-left cursor-pointer"
                >
                  <div className="h-8 w-8 rounded-full bg-[var(--primary)]/10 flex items-center justify-center text-xs font-bold text-[var(--primary)]">
                    {s.name.substring(0, 2).toUpperCase()}
                  </div>
                  <div>
                    <p className="text-sm font-medium">{s.name}</p>
                    <p className="text-xs text-[var(--muted-foreground)]">{s.studentId} · Bed {s.bedNumber || '-'}</p>
                  </div>
                </button>
              ))
            )}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
