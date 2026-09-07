import { useState, useEffect } from 'react';
import { Save, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Separator } from '@/components/ui/separator';
import { getHostelSettings, updateHostelSettings, getFeeSettings, updateFeeSettings } from '@/services/firebase/settings';
import { createAuditLog } from '@/services/firebase/auditLogs';
import { useAuth } from '@/contexts/AuthContext';
import type { HostelSettings, FeeSettings } from '@/types';
import { toast } from 'sonner';

export default function SettingsPage() {
  const { user } = useAuth();
  const [hostelSettings, setHostelSettings] = useState<HostelSettings>({
    hostelName: 'OM Hostel', address: '', phone: '', email: '', logoUrl: '', receiptFooter: '',
  });
  const [feeSettings, setFeeSettings] = useState<FeeSettings>({
    defaultMonthlyFee: 5000, defaultOtherFee: 500, defaultTransportFee: 0,
    dueDate: 10, lateFeeEnabled: false, lateFeeAmount: 0,
  });
  const [savingHostel, setSavingHostel] = useState(false);
  const [savingFee, setSavingFee] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      try {
        const [h, f] = await Promise.all([getHostelSettings(), getFeeSettings()]);
        setHostelSettings(h);
        setFeeSettings(f);
      } catch (error) {
        console.error(error);
      } finally {
        setLoading(false);
      }
    }
    load();
  }, []);

  async function saveHostelSettings() {
    if (!user) return;
    setSavingHostel(true);
    try {
      await updateHostelSettings(hostelSettings);
      await createAuditLog({
        adminId: user.uid, adminEmail: user.email || '',
        action: 'UPDATE_SETTINGS', entity: 'settings', entityId: 'hostel',
        description: 'Updated hostel settings',
      });
      toast.success('Hostel settings saved');
    } catch (error) {
      console.error(error);
      toast.error('Failed to save settings');
    } finally {
      setSavingHostel(false);
    }
  }

  async function saveFeeSettingsHandler() {
    if (!user) return;
    setSavingFee(true);
    try {
      await updateFeeSettings(feeSettings);
      await createAuditLog({
        adminId: user.uid, adminEmail: user.email || '',
        action: 'UPDATE_SETTINGS', entity: 'settings', entityId: 'fees',
        description: 'Updated fee settings',
      });
      toast.success('Fee settings saved');
    } catch (error) {
      console.error(error);
      toast.error('Failed to save settings');
    } finally {
      setSavingFee(false);
    }
  }



  if (loading) return <div className="flex items-center justify-center py-20"><Loader2 className="h-8 w-8 animate-spin text-[var(--primary)]" /></div>;

  return (
    <div className="max-w-3xl mx-auto space-y-6 animate-fade-in">
      <div>
        <h1 className="text-2xl font-bold text-[var(--foreground)]">Settings</h1>
        <p className="text-sm text-[var(--muted-foreground)]">Manage hostel, fee, and admin settings</p>
      </div>

      <Tabs defaultValue="hostel">
        <TabsList>
          <TabsTrigger value="hostel">Hostel</TabsTrigger>
          <TabsTrigger value="fees">Fees</TabsTrigger>
          <TabsTrigger value="admin">Admin</TabsTrigger>
        </TabsList>

        <TabsContent value="hostel">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Hostel Settings</CardTitle>
              <CardDescription>General hostel information and receipt configuration</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Hostel Name</Label>
                  <Input value={hostelSettings.hostelName} onChange={(e) => setHostelSettings({ ...hostelSettings, hostelName: e.target.value })} />
                </div>
                <div className="space-y-2">
                  <Label>Phone</Label>
                  <Input value={hostelSettings.phone} onChange={(e) => setHostelSettings({ ...hostelSettings, phone: e.target.value })} />
                </div>
                <div className="space-y-2">
                  <Label>Email</Label>
                  <Input type="email" value={hostelSettings.email} onChange={(e) => setHostelSettings({ ...hostelSettings, email: e.target.value })} />
                </div>
              </div>
              <div className="space-y-2">
                <Label>Address</Label>
                <Textarea value={hostelSettings.address} onChange={(e) => setHostelSettings({ ...hostelSettings, address: e.target.value })} rows={2} />
              </div>
              <div className="space-y-2">
                <Label>Receipt Footer</Label>
                <Textarea value={hostelSettings.receiptFooter} onChange={(e) => setHostelSettings({ ...hostelSettings, receiptFooter: e.target.value })} rows={2} />
              </div>
              <div className="flex justify-end">
                <Button onClick={saveHostelSettings} disabled={savingHostel} className="gap-2">
                  {savingHostel ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
                  Save Changes
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="fees">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Fee Settings</CardTitle>
              <CardDescription>Default fee amounts and due date configuration</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="space-y-2">
                  <Label>Default Monthly Fee (₹)</Label>
                  <Input type="number" value={feeSettings.defaultMonthlyFee} onChange={(e) => setFeeSettings({ ...feeSettings, defaultMonthlyFee: parseInt(e.target.value) || 0 })} />
                </div>
                <div className="space-y-2">
                  <Label>Default Other Fee (₹)</Label>
                  <Input type="number" value={feeSettings.defaultOtherFee} onChange={(e) => setFeeSettings({ ...feeSettings, defaultOtherFee: parseInt(e.target.value) || 0 })} />
                </div>
                <div className="space-y-2">
                  <Label>Default Transport Fee (₹)</Label>
                  <Input type="number" value={feeSettings.defaultTransportFee} onChange={(e) => setFeeSettings({ ...feeSettings, defaultTransportFee: parseInt(e.target.value) || 0 })} />
                </div>
              </div>
              <Separator />
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Due Date (Day of month)</Label>
                  <Input type="number" min={1} max={28} value={feeSettings.dueDate} onChange={(e) => setFeeSettings({ ...feeSettings, dueDate: parseInt(e.target.value) || 10 })} />
                </div>
              </div>
              <p className="text-xs text-[var(--muted-foreground)]">
                Late fee auto-calculation is not enabled. You can add late fees manually as &quot;Other Fees&quot;.
              </p>
              <div className="flex justify-end">
                <Button onClick={saveFeeSettingsHandler} disabled={savingFee} className="gap-2">
                  {savingFee ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
                  Save Changes
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="admin">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Admin Profile</CardTitle>
              <CardDescription>Your account information</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label>Email</Label>
                <Input value={user?.email || ''} disabled />
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
