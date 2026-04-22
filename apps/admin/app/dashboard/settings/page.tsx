import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export default function SettingsPage() {
  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-bold text-slate-900">Settings</h1>
        <p className="text-slate-500 mt-1">Manage your account and preferences</p>
      </div>

      <Card className="border-0 shadow-lg">
        <CardHeader className="border-b border-slate-100">
          <CardTitle className="text-xl text-slate-900">Account Settings</CardTitle>
        </CardHeader>
        <CardContent className="pt-6">
          <div className="space-y-6">
            <div className="space-y-2">
              <label className="text-sm font-semibold text-slate-700">Email</label>
              <Input
                type="email"
                defaultValue="admin@parisbridals.com"
                className="bg-slate-50 border-slate-200 focus:border-primary"
              />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-semibold text-slate-700">Phone</label>
              <Input
                type="tel"
                defaultValue="+91 9876543210"
                className="bg-slate-50 border-slate-200 focus:border-primary"
              />
            </div>
            <Button className="shadow-lg shadow-primary/25">Save Changes</Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
