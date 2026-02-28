"use client";

import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Slider } from "@/components/ui/slider";

export default function SettingsPage() {
  const [confidenceThreshold, setConfidenceThreshold] = useState(90);
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Settings</h1>
        <p className="text-[var(--muted)] text-sm">Admin controls</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Automation Settings</CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          <div>
            <label className="text-sm font-medium">Auto Approval Confidence Threshold (%)</label>
            <div className="mt-2 flex items-center gap-4">
              <Slider min={0} max={100} value={confidenceThreshold} onValueChange={setConfidenceThreshold} className="max-w-xs" />
              <span className="text-sm text-[var(--muted)]">{confidenceThreshold}</span>
            </div>
          </div>
          <div>
            <label className="text-sm font-medium">Risk Threshold</label>
            <Input type="number" defaultValue={40} className="max-w-[120px]" />
          </div>
          <div>
            <label className="text-sm font-medium">Competency Bands</label>
            <p className="text-[var(--muted)] text-sm mt-1">Configure on Competency Model page.</p>
          </div>
          <Button>Save</Button>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Access Control</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <label className="text-sm font-medium">Role Management</label>
            <p className="text-[var(--muted)] text-sm mt-1">Admin, Reviewer, Viewer. Configure roles and permissions.</p>
          </div>
          <div>
            <label className="text-sm font-medium">Permission Matrix</label>
            <div className="mt-2 overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-[var(--border)]">
                    <th className="text-left py-2">Role</th>
                    <th className="text-left py-2">Applications</th>
                    <th className="text-left py-2">Review</th>
                    <th className="text-left py-2">Rules</th>
                    <th className="text-left py-2">Settings</th>
                  </tr>
                </thead>
                <tbody>
                  <tr className="border-b border-[var(--border)]">
                    <td className="py-2">Admin</td>
                    <td className="py-2">Full</td>
                    <td className="py-2">Full</td>
                    <td className="py-2">Full</td>
                    <td className="py-2">Full</td>
                  </tr>
                  <tr className="border-b border-[var(--border)]">
                    <td className="py-2">Reviewer</td>
                    <td className="py-2">View, Edit</td>
                    <td className="py-2">Full</td>
                    <td className="py-2">View</td>
                    <td className="py-2">—</td>
                  </tr>
                  <tr className="border-b border-[var(--border)]">
                    <td className="py-2">Viewer</td>
                    <td className="py-2">View</td>
                    <td className="py-2">—</td>
                    <td className="py-2">View</td>
                    <td className="py-2">—</td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>System</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <label className="text-sm font-medium">SLA Configuration</label>
            <Input type="text" placeholder="e.g. 4 hours for review" className="max-w-xs mt-2" />
          </div>
          <div>
            <label className="text-sm font-medium">Notification Settings</label>
            <p className="text-[var(--muted)] text-sm mt-1">Email, in-app. Configure notification preferences.</p>
          </div>
          <div>
            <label className="text-sm font-medium">Integration Keys</label>
            <Input type="password" placeholder="API key" className="max-w-xs mt-2" />
          </div>
          <Button>Save</Button>
        </CardContent>
      </Card>
    </div>
  );
}
