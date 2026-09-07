import { useEffect, useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { Dialog, DialogContent, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Search, User, FileText, DoorOpen } from 'lucide-react';
import { collection, query, where, getDocs, limit, orderBy } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import type { SearchResult } from '@/types';
import { cn } from '@/lib/utils';

interface GlobalSearchProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export default function GlobalSearch({ open, onOpenChange }: GlobalSearchProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [results, setResults] = useState<SearchResult[]>([]);
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const search = useCallback(async (q: string) => {
    if (!q.trim() || q.length < 2) {
      setResults([]);
      return;
    }

    setLoading(true);
    try {
      const searchResults: SearchResult[] = [];
      const qUpper = q.toUpperCase();
      const qLower = q.toLowerCase();

      // Search students by studentId
      const studentIdQuery = query(
        collection(db, 'students'),
        where('studentId', '>=', qUpper),
        where('studentId', '<=', qUpper + '\uf8ff'),
        limit(5)
      );
      const studentIdSnap = await getDocs(studentIdQuery);
      studentIdSnap.forEach((doc) => {
        const data = doc.data();
        searchResults.push({
          type: 'student',
          id: doc.id,
          title: data.name,
          subtitle: `${data.studentId} · Room ${data.roomNumber}`,
        });
      });

      // Search students by name (lowercase search field)
      const nameQuery = query(
        collection(db, 'students'),
        where('nameLower', '>=', qLower),
        where('nameLower', '<=', qLower + '\uf8ff'),
        limit(5)
      );
      const nameSnap = await getDocs(nameQuery);
      nameSnap.forEach((doc) => {
        const data = doc.data();
        if (!searchResults.find((r) => r.id === doc.id)) {
          searchResults.push({
            type: 'student',
            id: doc.id,
            title: data.name,
            subtitle: `${data.studentId} · Room ${data.roomNumber}`,
          });
        }
      });

      // Search receipts
      const receiptQuery = query(
        collection(db, 'receipts'),
        where('receiptNumber', '>=', qUpper),
        where('receiptNumber', '<=', qUpper + '\uf8ff'),
        limit(5)
      );
      const receiptSnap = await getDocs(receiptQuery);
      receiptSnap.forEach((doc) => {
        const data = doc.data();
        searchResults.push({
          type: 'receipt',
          id: doc.id,
          title: data.receiptNumber,
          subtitle: `${data.studentName} · ₹${data.amount}`,
        });
      });

      // Search rooms
      const roomQuery = query(
        collection(db, 'rooms'),
        where('roomNumber', '>=', q),
        where('roomNumber', '<=', q + '\uf8ff'),
        orderBy('roomNumber'),
        limit(5)
      );
      const roomSnap = await getDocs(roomQuery);
      roomSnap.forEach((doc) => {
        const data = doc.data();
        searchResults.push({
          type: 'room',
          id: doc.id,
          title: `Room ${data.roomNumber}`,
          subtitle: `Floor ${data.floor} · ${data.occupied}/${data.capacity} occupied`,
        });
      });

      setResults(searchResults);
    } catch (error) {
      console.error('Search error:', error);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    const timer = setTimeout(() => {
      search(searchQuery);
    }, 300);
    return () => clearTimeout(timer);
  }, [searchQuery, search]);

  useEffect(() => {
    if (!open) {
      setSearchQuery('');
      setResults([]);
    }
  }, [open]);

  // Keyboard shortcut
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault();
        onOpenChange(!open);
      }
    };
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [open, onOpenChange]);

  const handleSelect = (result: SearchResult) => {
    onOpenChange(false);
    switch (result.type) {
      case 'student':
        navigate(`/students/${result.id}`);
        break;
      case 'receipt':
        navigate(`/receipts`);
        break;
      case 'room':
        navigate(`/rooms`);
        break;
    }
  };

  const getIcon = (type: string) => {
    switch (type) {
      case 'student': return User;
      case 'receipt': return FileText;
      case 'room': return DoorOpen;
      default: return Search;
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg p-0 gap-0 overflow-hidden">
        <DialogTitle className="sr-only">Global Search</DialogTitle>
        <div className="flex items-center border-b border-[var(--border)] px-4">
          <Search className="h-4 w-4 text-[var(--muted-foreground)] mr-3 flex-shrink-0" />
          <Input
            placeholder="Search students, receipts, rooms... (Ctrl+K)"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="border-0 focus-visible:ring-0 focus-visible:ring-offset-0 h-12 text-base"
            autoFocus
          />
        </div>

        {(results.length > 0 || loading) && (
          <div className="max-h-80 overflow-y-auto p-2">
            {loading ? (
              <div className="flex items-center justify-center py-8">
                <div className="h-5 w-5 border-2 border-[var(--primary)] border-t-transparent rounded-full animate-spin" />
              </div>
            ) : (
              results.map((result, idx) => {
                const Icon = getIcon(result.type);
                return (
                  <button
                    key={`${result.type}-${result.id}-${idx}`}
                    onClick={() => handleSelect(result)}
                    className={cn(
                      'flex items-center gap-3 w-full rounded-lg px-3 py-2.5 text-left hover:bg-[var(--accent)] transition-colors cursor-pointer'
                    )}
                  >
                    <div className="h-9 w-9 rounded-lg bg-[var(--muted)] flex items-center justify-center flex-shrink-0">
                      <Icon className="h-4 w-4 text-[var(--muted-foreground)]" />
                    </div>
                    <div className="min-w-0">
                      <p className="text-sm font-medium text-[var(--foreground)] truncate">{result.title}</p>
                      <p className="text-xs text-[var(--muted-foreground)] truncate">{result.subtitle}</p>
                    </div>
                  </button>
                );
              })
            )}
          </div>
        )}

        {searchQuery.length >= 2 && !loading && results.length === 0 && (
          <div className="py-8 text-center">
            <p className="text-sm text-[var(--muted-foreground)]">No results found for &quot;{searchQuery}&quot;</p>
          </div>
        )}

        <div className="border-t border-[var(--border)] px-4 py-2 flex items-center justify-between text-xs text-[var(--muted-foreground)]">
          <span>Search by name, ID, room, or receipt number</span>
          <kbd className="px-1.5 py-0.5 rounded border border-[var(--border)] bg-[var(--muted)] text-[10px] font-mono">ESC</kbd>
        </div>
      </DialogContent>
    </Dialog>
  );
}
