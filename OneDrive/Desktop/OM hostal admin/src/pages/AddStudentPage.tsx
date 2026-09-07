import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { ArrowLeft, Loader2, Save } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { addStudent } from '@/services/firebase/students';
import { getRooms, updateRoomOccupancy } from '@/services/firebase/rooms';
import { createAuditLog } from '@/services/firebase/auditLogs';
import { useAuth } from '@/contexts/AuthContext';
import { formatCurrency } from '@/lib/utils';
import { toast } from 'sonner';
import type { Room } from '@/types';

const studentSchema = z.object({
  studentId: z.string().min(1, 'Student ID is required'),
  name: z.string().min(2, 'Name must be at least 2 characters'),
  fatherName: z.string().optional().default(''),
  motherName: z.string().optional().default(''),
  email: z.string().email('Invalid email').or(z.literal('')).default(''),
  studentMobile: z.string().min(10, 'Valid mobile number required'),
  parentMobile: z.string().optional().default(''),
  class: z.string().min(1, 'Class is required'),
  course: z.string().optional().default(''),
  academicYear: z.string().min(1, 'Academic year is required'),
  hostelName: z.string().default('OM Hostel'),
  roomNumber: z.string().min(1, 'Room number is required'),
  bedNumber: z.string().optional().default(''),
  joiningDate: z.string().min(1, 'Joining date is required'),
  monthlyFee: z.coerce.number().min(0, 'Must be 0 or more'),
  otherFees: z.coerce.number().min(0).default(0),
  transportFee: z.coerce.number().min(0).default(0),
});

type StudentFormValues = z.infer<typeof studentSchema>;

export default function AddStudentPage() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [rooms, setRooms] = useState<Room[]>([]);
  const [loadingRooms, setLoadingRooms] = useState(true);

  useEffect(() => {
    async function fetchRooms() {
      try {
        const data = await getRooms();
        setRooms(data.filter(r => r.available > 0 || r.status === 'available' || r.status === 'partial'));
      } catch (error) {
        console.error('Failed to load rooms:', error);
      } finally {
        setLoadingRooms(false);
      }
    }
    fetchRooms();
  }, []);

  const form = useForm<StudentFormValues>({
    resolver: zodResolver(studentSchema) as any,
    defaultValues: {
      studentId: '',
      name: '',
      fatherName: '',
      motherName: '',
      email: '',
      studentMobile: '',
      parentMobile: '',
      class: '',
      course: '',
      academicYear: `${new Date().getFullYear()}-${new Date().getFullYear() + 1}`,
      hostelName: 'OM Hostel',
      roomNumber: '',
      bedNumber: '',
      joiningDate: new Date().toISOString().split('T')[0],
      monthlyFee: 5000,
      otherFees: 0,
      transportFee: 0,
    },
  });

  const monthlyFee = Number(form.watch('monthlyFee')) || 0;
  const otherFees = Number(form.watch('otherFees')) || 0;
  const transportFee = Number(form.watch('transportFee')) || 0;
  const monthlyTotal = monthlyFee + otherFees + transportFee;

  const onSubmit = async (data: StudentFormValues) => {
    if (!user) return;
    setIsSubmitting(true);

    try {
      const sanitizedData = {
        ...data,
        monthlyFee: Number(data.monthlyFee) || 0,
        otherFees: Number(data.otherFees) || 0,
        transportFee: Number(data.transportFee) || 0,
      };
      const docId = await addStudent(sanitizedData, user.uid);

      // Update room occupancy
      await updateRoomOccupancy(data.roomNumber, 1);

      // Create audit log
      await createAuditLog({
        adminId: user.uid,
        adminEmail: user.email || '',
        action: 'CREATE_STUDENT',
        entity: 'student',
        entityId: docId,
        description: `Added student ${data.name} (${data.studentId})`,
      });

      toast.success('Student added successfully!', {
        description: `${data.name} has been registered`,
      });
      navigate(`/students/${docId}`);
    } catch (error) {
      console.error('Error adding student:', error);
      toast.error('Failed to add student', {
        description: 'Please try again',
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const renderField = (name: keyof StudentFormValues, label: string, opts?: { type?: string; required?: boolean; placeholder?: string }) => (
    <div className="space-y-2">
      <Label htmlFor={name}>
        {label} {opts?.required !== false && <span className="text-[var(--destructive)]">*</span>}
      </Label>
      <Input
        id={name}
        type={opts?.type || 'text'}
        placeholder={opts?.placeholder || label}
        {...form.register(name, opts?.type === 'number' ? { valueAsNumber: true } : undefined)}
      />
      {form.formState.errors[name] && (
        <p className="text-xs text-[var(--destructive)]">{form.formState.errors[name]?.message}</p>
      )}
    </div>
  );

  return (
    <div className="max-w-4xl mx-auto space-y-6 animate-fade-in">
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" onClick={() => navigate('/students')}>
          <ArrowLeft className="h-5 w-5" />
        </Button>
        <div>
          <h1 className="text-2xl font-bold text-[var(--foreground)]">Add New Student</h1>
          <p className="text-sm text-[var(--muted-foreground)]">Register a new student to OM Hostel</p>
        </div>
      </div>

      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
        {/* Personal Information */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Personal Information</CardTitle>
          </CardHeader>
          <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {renderField('studentId', 'Student ID', { placeholder: 'e.g. OM1001' })}
            {renderField('name', 'Student Name')}
            {renderField('fatherName', "Father's Name", { required: false })}
            {renderField('motherName', "Mother's Name", { required: false })}
            {renderField('email', 'Email', { type: 'email', required: false })}
            {renderField('studentMobile', 'Student Mobile', { type: 'tel' })}
            {renderField('parentMobile', 'Parent Mobile', { type: 'tel', required: false })}
          </CardContent>
        </Card>

        {/* Academic Information */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Academic Information</CardTitle>
          </CardHeader>
          <CardContent className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {renderField('class', 'Class')}
            {renderField('course', 'Course / Section', { required: false })}
            {renderField('academicYear', 'Academic Year')}
          </CardContent>
        </Card>

        {/* Hostel Information */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Hostel Information</CardTitle>
          </CardHeader>
          <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {renderField('hostelName', 'Hostel Name')}
            
            <div className="space-y-2">
              <Label htmlFor="roomNumber">
                Room Number <span className="text-[var(--destructive)]">*</span>
              </Label>
              <Select 
                disabled={loadingRooms} 
                onValueChange={(value) => form.setValue('roomNumber', value, { shouldValidate: true })}
                value={form.watch('roomNumber') || undefined}
              >
                <SelectTrigger id="roomNumber">
                  <SelectValue placeholder={loadingRooms ? "Loading rooms..." : "Select a room"} />
                </SelectTrigger>
                <SelectContent>
                  {rooms.length === 0 && !loadingRooms ? (
                    <div className="py-2 px-2 text-sm text-center text-muted-foreground">
                      No available rooms found
                    </div>
                  ) : (
                    rooms.map(room => (
                      <SelectItem key={room.id} value={room.roomNumber}>
                        {room.roomNumber} ({room.available} beds available)
                      </SelectItem>
                    ))
                  )}
                </SelectContent>
              </Select>
              {form.formState.errors.roomNumber && (
                <p className="text-xs text-[var(--destructive)]">{form.formState.errors.roomNumber.message}</p>
              )}
            </div>

            {renderField('bedNumber', 'Bed Number', { required: false })}
            {renderField('joiningDate', 'Joining Date', { type: 'date' })}
          </CardContent>
        </Card>

        {/* Fee Information */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Fee Information</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {renderField('monthlyFee', 'Monthly Fee (₹)', { type: 'number' })}
              {renderField('otherFees', 'Other Fees (₹)', { type: 'number', required: false })}
              {renderField('transportFee', 'Transport Fee (₹)', { type: 'number', required: false })}
            </div>

            <Separator />

            <div className="bg-[var(--muted)] rounded-lg p-4 space-y-2">
              <div className="flex justify-between text-sm">
                <span className="text-[var(--muted-foreground)]">Monthly Fee</span>
                <span>{formatCurrency(monthlyFee)}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-[var(--muted-foreground)]">Other Fees</span>
                <span>{formatCurrency(otherFees)}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-[var(--muted-foreground)]">Transport Fee</span>
                <span>{formatCurrency(transportFee)}</span>
              </div>
              <Separator />
              <div className="flex justify-between text-base font-bold">
                <span>Monthly Total</span>
                <span className="text-[var(--primary)]">{formatCurrency(monthlyTotal)}</span>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Submit */}
        <div className="flex justify-end gap-3">
          <Button type="button" variant="outline" onClick={() => navigate('/students')}>
            Cancel
          </Button>
          <Button type="submit" disabled={isSubmitting} className="gap-2">
            {isSubmitting ? (
              <><Loader2 className="h-4 w-4 animate-spin" /> Adding...</>
            ) : (
              <><Save className="h-4 w-4" /> Add Student</>
            )}
          </Button>
        </div>
      </form>
    </div>
  );
}
