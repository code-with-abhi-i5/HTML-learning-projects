import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Plus, Search, Download, Filter } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { getStudents, exportStudents } from '@/services/firebase/students';
import type { Student } from '@/types';
import { formatDate, formatCurrency } from '@/lib/utils';
import * as XLSX from 'xlsx';

export default function StudentsPage() {
  const navigate = useNavigate();
  const [students, setStudents] = useState<Student[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('active');

  useEffect(() => {
    fetchStudents();
  }, [statusFilter]);

  async function fetchStudents() {
    setLoading(true);
    try {
      const result = await getStudents({
        status: statusFilter === 'all' ? undefined : statusFilter as 'active' | 'inactive',
      });
      setStudents(result.students);
    } catch (error) {
      console.error('Error fetching students:', error);
    } finally {
      setLoading(false);
    }
  }

  const filteredStudents = students.filter((s) => {
    if (!searchQuery) return true;
    const q = searchQuery.toLowerCase();
    return (
      s.name.toLowerCase().includes(q) ||
      s.studentId.toLowerCase().includes(q) ||
      s.studentMobile.includes(q) ||
      s.roomNumber.includes(q) ||
      s.email.toLowerCase().includes(q)
    );
  });

  async function handleExport() {
    try {
      const data = await exportStudents(statusFilter === 'all' ? undefined : statusFilter as 'active' | 'inactive');
      const wsData = data.map((s) => ({
        'Student ID': s.studentId,
        'Name': s.name,
        'Father': s.fatherName,
        'Mother': s.motherName,
        'Email': s.email,
        'Student Mobile': s.studentMobile,
        'Parent Mobile': s.parentMobile,
        'Class': s.class,
        'Room': s.roomNumber,
        'Bed': s.bedNumber,
        'Monthly Fee': s.monthlyFee,
        'Other Fees': s.otherFees,
        'Transport Fee': s.transportFee,
        'Total': s.monthlyTotal,
        'Status': s.status,
        'Joining Date': s.joiningDate,
      }));
      const ws = XLSX.utils.json_to_sheet(wsData);
      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, 'Students');
      XLSX.writeFile(wb, `OM_Hostel_Students_${new Date().toISOString().split('T')[0]}.xlsx`);
    } catch (error) {
      console.error('Export error:', error);
    }
  }

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-[var(--foreground)]">Students</h1>
          <p className="text-sm text-[var(--muted-foreground)]">Manage all hostel students</p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={handleExport} className="gap-2">
            <Download className="h-4 w-4" /> Export
          </Button>
          <Button size="sm" onClick={() => navigate('/students/add')} className="gap-2">
            <Plus className="h-4 w-4" /> Add Student
          </Button>
        </div>
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-[var(--muted-foreground)]" />
          <Input
            placeholder="Search by name, ID, mobile, room..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10"
          />
        </div>
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-[150px]">
            <Filter className="h-4 w-4 mr-2" />
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All</SelectItem>
            <SelectItem value="active">Active</SelectItem>
            <SelectItem value="inactive">Inactive</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Table */}
      {loading ? (
        <div className="space-y-3">
          {Array.from({ length: 8 }).map((_, i) => (
            <Skeleton key={i} className="h-16 w-full rounded-lg" />
          ))}
        </div>
      ) : filteredStudents.length === 0 ? (
        <Card className="flex flex-col items-center justify-center py-16">
          <p className="text-lg font-medium text-[var(--foreground)]">No students found</p>
          <p className="text-sm text-[var(--muted-foreground)] mt-1">
            {searchQuery ? 'Try a different search query' : 'Add your first student to get started'}
          </p>
          {!searchQuery && (
            <Button className="mt-4" onClick={() => navigate('/students/add')}>
              <Plus className="h-4 w-4 mr-2" /> Add Student
            </Button>
          )}
        </Card>
      ) : (
        <Card className="overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full data-table">
              <thead>
                <tr className="border-b border-[var(--border)]">
                  <th className="text-left px-4 py-3">Student</th>
                  <th className="text-left px-4 py-3 hidden sm:table-cell">Class</th>
                  <th className="text-left px-4 py-3 hidden md:table-cell">Room</th>
                  <th className="text-left px-4 py-3 hidden lg:table-cell">Mobile</th>
                  <th className="text-right px-4 py-3 hidden lg:table-cell">Monthly Fee</th>
                  <th className="text-center px-4 py-3">Status</th>
                  <th className="text-left px-4 py-3 hidden xl:table-cell">Joined</th>
                </tr>
              </thead>
              <tbody>
                {filteredStudents.map((student) => (
                  <tr
                    key={student.id}
                    onClick={() => navigate(`/students/${student.id}`)}
                    className="border-b border-[var(--border)] last:border-0 hover:bg-[var(--accent)] transition-colors cursor-pointer"
                  >
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-3">
                        <div className="h-9 w-9 rounded-full bg-[var(--primary)]/10 flex items-center justify-center text-xs font-bold text-[var(--primary)] flex-shrink-0">
                          {student.name.substring(0, 2).toUpperCase()}
                        </div>
                        <div>
                          <p className="text-sm font-medium text-[var(--foreground)]">{student.name}</p>
                          <p className="text-xs text-[var(--muted-foreground)]">{student.studentId}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-3 text-sm text-[var(--muted-foreground)] hidden sm:table-cell">{student.class}</td>
                    <td className="px-4 py-3 text-sm text-[var(--muted-foreground)] hidden md:table-cell">{student.roomNumber}</td>
                    <td className="px-4 py-3 text-sm text-[var(--muted-foreground)] hidden lg:table-cell">{student.studentMobile}</td>
                    <td className="px-4 py-3 text-sm font-medium text-right hidden lg:table-cell">{formatCurrency(student.monthlyTotal)}</td>
                    <td className="px-4 py-3 text-center">
                      <Badge variant={student.status === 'active' ? 'success' : 'secondary'}>
                        {student.status}
                      </Badge>
                    </td>
                    <td className="px-4 py-3 text-sm text-[var(--muted-foreground)] hidden xl:table-cell">
                      {student.joiningDate ? formatDate(student.joiningDate) : '-'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      )}
    </div>
  );
}
