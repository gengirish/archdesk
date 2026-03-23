"use client";

import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";

export default function SettingsPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-medium tracking-tight">Settings</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Manage your firm profile and preferences
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base font-medium">Firm Profile</CardTitle>
          <CardDescription>Your firm details appear on invoices and client portal</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label>Firm Name</Label>
              <Input placeholder="e.g. ArchStudio" defaultValue="" />
            </div>
            <div className="space-y-2">
              <Label>GST Number</Label>
              <Input placeholder="29XXXXX1234X1Z5" defaultValue="" />
            </div>
            <div className="space-y-2">
              <Label>Phone</Label>
              <Input placeholder="10-digit mobile" defaultValue="" />
            </div>
            <div className="space-y-2">
              <Label>Email</Label>
              <Input placeholder="firm@email.com" defaultValue="" />
            </div>
            <div className="space-y-2 sm:col-span-2">
              <Label>Address</Label>
              <Input placeholder="Office address" defaultValue="" />
            </div>
            <div className="space-y-2">
              <Label>City</Label>
              <Input placeholder="Hubbali" defaultValue="Hubbali" />
            </div>
            <div className="space-y-2">
              <Label>Website</Label>
              <Input placeholder="https://yourfirm.com" defaultValue="" />
            </div>
          </div>
          <Separator />
          <div className="flex justify-end">
            <Button>Save Changes</Button>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base font-medium">Brand</CardTitle>
          <CardDescription>Customize the look of your client portal and invoices</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label>Brand Color</Label>
              <div className="flex items-center gap-3">
                <div className="h-10 w-10 rounded-md bg-primary" />
                <Input defaultValue="#E8A045" className="w-32 font-mono text-xs" />
              </div>
            </div>
            <div className="space-y-2">
              <Label>Logo</Label>
              <div className="flex h-10 items-center rounded-md border border-dashed border-border px-3 text-xs text-muted-foreground">
                Upload your firm logo (PNG, SVG)
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
