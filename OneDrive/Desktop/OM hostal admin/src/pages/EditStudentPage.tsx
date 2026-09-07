import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { ArrowLeft, Loader2, Save } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import { Skeleton } from '@/components/ui/skeleton';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { getStudent, updateStudent } from '@/services/firebase/students';
import { getRooms } from '@/services/firebase/rooms';
import { createAuditLog } from '@/services/firebase/auditLogs';
import type { Room } from '@/types';
import { useAuth } from '@/contexts/AuthContext';
import { formatCurrency } from '@/lib/utils';
import { toast } from 'sonner';

const editSchema = z.object({
  studentId: z.string().min(1),
  name: z.string().min(2),
  fatherName: z.string().optional().default(''),
  motherName: z.string().optional().default(''),
  email: z.string().email().or(z.literal('')).default(''),
  studentMobile: z.string().min(10),
  parentMobile: z.string().optional().default(''),
  class: z.string().min(1),
  course: z.string().optional().default(''),
  academicYear: z.string().min(1),
  hostelName: z.string().default('OM Hostel'),
  roomNumber: z.string().min(1),
  bedNumber: z.string().optional().default(''),
  joiningDate: z.string().min(1),
  monthlyFee: z.coerce.number().min(0),
  otherFees: z.coerce.number().min(0).default(0),
  transportFee: z.coerce.number().min(0).default(0),
});

type EditFormValues = z.infer<typeof editSchema>;

export default function EditStudentPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [rooms, setRooms] = useState<Room[]>([]);
  const [loadingRooms, setLoadingRooms] = useState(true);

  const form = useForm<EditFormValues>({
    resolver: zodResolver(editSchema) as any,
  });

  useEffect(() => {
    if (id) loadStudent();
    fetchRooms();
  }, [id]);

  async function fetchRooms() {
    try {
      const data = await getRooms();
      setRooms(data);
    } catch (error) {
      console.error('Failed to load rooms:', error);
    } finally {
      setLoadingRooms(false);
    }
  }

  async function loadStudent() {
    if (!id) return;
    try {
      const student = await getStudent(id);
      if (!student) {
        toast.error('Student not found');
        navigate('/students');
        return;
      }
      form.reset({
        studentId: student.studentId,
        name: student.name,
        fatherName: student.fatherName || '',
        motherName: student.motherName || '',
        email: student.email || '',
        studentMobile: student.studentMobile,
        parentMobile: student.parentMobile || '',
        class: student.class,
        course: student.course || '',
        academicYear: student.academicYear || '',
        hostelName: student.hostelName || 'OM Hostel',
        roomNumber: student.roomNumber,
        bedNumber: student.bedNumber || '',
        joiningDate: student.joiningDate || '',
        monthlyFee: student.monthlyFee,
        otherFees: student.otherFees || 0,
        transportFee: student.transportFee || 0,
      });
    } catch (error) {
      console.error(error);
      toast.error('Failed to load student');
    } finally {
      setLoading(false);
    }
  }

  const monthlyFee = Number(form.watch('monthlyFee')) || 0;
  const otherFees = Number(form.watch('otherFees')) || 0;
  const transportFee = Number(form.watch('transportFee')) || 0;
  const monthlyTotal = monthlyFee + otherFees + transportFee;

  const onSubmit = async (data: EditFormValues) => {
    if (!user || !id) return;
    setIsSubmitting(true);
    try {
      const sanitizedData = {
        ...data,
        monthlyFee: Number(data.monthlyFee) || 0,
        otherFees: Number(data.otherFees) || 0,
        transportFee: Number(data.transportFee) || 0,
      };
      await updateStudent(id, sanitizedData);
      await createAuditLog({
        adminId: user.uid,
        adminEmail: user.email || '',
        action: 'UPDATE_STUDENT',
        entity: 'student',
        entityId: id,
        description: `Updated student ${data.name} (${data.studentId})`,
      });
      toast.success('Student updated successfully');
      navigate(`/students/${id}`);
    } catch (error) {
      console.error(error);
      toast.error('Failed to update student');
    } finally {
      setIsSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="max-w-4xl mx-auto space-y-6">
        <Skeleton className="h-12 w-48" />
        <Skeleton className="h-64 w-full rounded-xl" />
        <Skeleton className="h-64 w-full rounded-xl" />
      </div>
    );
  }

  const renderField = (name: keyof EditFormValues, label: string, opts?: { type?: string; required?: boolean; placeholder?: string }) => (
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
        <Button variant="ghost" size="icon" onClick={() => navigate(`/students/${id}`)}>
          <ArrowLeft className="h-5 w-5" />
        </Button>
        <div>
          <h1 className="text-2xl font-bold text-[var(--foreground)]">Edit Student</h1>
          <p className="text-sm text-[var(--muted-foreground)]">Update student information</p>
        </div>
      </div>

      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
        <Card>
          <CardHeader><CardTitle className="text-base">Personal Information</CardTitle></CardHeader>
          <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {renderField('studentId', 'Student ID')}
            {renderField('name', 'Student Name')}
            {renderField('fatherName', "Father's Name", { required: false })}
            {renderField('motherName', "Mother's Name", { required: false })}
            {renderField('email', 'Email', { type: 'email', required: false })}
            {renderField('studentMobile', 'Student Mobile', { type: 'tel' })}
            {renderField('parentMobile', 'Parent Mobile', { type: 'tel', required: false })}
          </CardContent>
        </Card>

        <Card>
          <CardHeader><CardTitle className="text-base">Academic Information</CardTitle></CardHeader>
          <CardContent className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {renderField('class', 'Class')}
            {renderField('course', 'Course / Section', { required: false })}
            {renderField('academicYear', 'Academic Year')}
          </CardContent>
        </Card>

        <Card>
          <CardHeader><CardTitle className="text-base">Hostel Information</CardTitle></CardHeader>
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

        <Card>
          <CardHeader><CardTitle className="text-base">Fee Information</CardTitle></CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {renderField('monthlyFee', 'Monthly Fee (₹)', { type: 'number' })}
              {renderField('otherFees', 'Other Fees (₹)', { type: 'number', required: false })}
              {renderField('transportFee', 'Transport Fee (₹)', { type: 'number', required: false })}
            </div>
            <Separator />
            <div className="bg-[var(--muted)] rounded-lg p-4">
              <div className="flex justify-between text-base font-bold">
                <span>Monthly Total</span>
                <span className="text-[var(--primary)]">{formatCurrency(monthlyTotal)}</span>
              </div>
            </div>
          </CardContent>
        </Card>

        <div className="flex justify-end gap-3">
          <Button type="button" variant="outline" onClick={() => navigate(`/students/${id}`)}>Cancel</Button>
          <Button type="submit" disabled={isSubmitting} className="gap-2">
            {isSubmitting ? <><Loader2 className="h-4 w-4 animate-spin" /> Saving...</> : <><Save className="h-4 w-4" /> Save Changes</>}
          </Button>
        </div>
      </form>
    </div>
  );
}
