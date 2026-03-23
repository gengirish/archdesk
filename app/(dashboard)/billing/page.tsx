"use client";

import { IndianRupee, FileText, Clock, CheckCircle, AlertCircle } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { formatINR, formatINRShort, formatDate, calculateGST } from "@/lib/utils";

const mockMilestones = [
  { id: "1", project: "Patil Residence", name: "Retainer Fee", stage: "CONCEPT", amount: 100000, status: "PAID", paidAt: "2025-11-15" },
  { id: "2", project: "Patil Residence", name: "Schematic Design Fee", stage: "SCHEMATIC", amount: 200000, status: "PAID", paidAt: "2026-01-10" },
  { id: "3", project: "Patil Residence", name: "Design Development", stage: "DESIGN_DEV", amount: 250000, status: "DUE", paidAt: null },
  { id: "4", project: "Sharma Interiors", name: "Retainer Fee", stage: "CONCEPT", amount: 50000, status: "PAID", paidAt: "2026-02-05" },
  { id: "5", project: "Sharma Interiors", name: "Design Fee", stage: "DESIGN_DEV", amount: 150000, status: "OVERDUE", paidAt: null },
  { id: "6", project: "KLE Campus Block B", name: "Retainer", stage: "CONCEPT", amount: 500000, status: "PAID", paidAt: "2025-06-01" },
  { id: "7", project: "KLE Campus Block B", name: "Working Drawings", stage: "WORKING_DRAWINGS", amount: 800000, status: "PAID", paidAt: "2025-12-20" },
  { id: "8", project: "KLE Campus Block B", name: "Execution Supervision", stage: "EXECUTION", amount: 1000000, status: "UPCOMING", paidAt: null },
];

const statusConfig: Record<string, { color: string; icon: typeof CheckCircle }> = {
  PAID: { color: "text-green-400", icon: CheckCircle },
  DUE: { color: "text-yellow-400", icon: Clock },
  OVERDUE: { color: "text-destructive", icon: AlertCircle },
  UPCOMING: { color: "text-muted-foreground", icon: Clock },
  UNPAID: { color: "text-yellow-400", icon: Clock },
};

export default function BillingPage() {
  const totalBilled = mockMilestones.reduce((s, m) => s + m.amount, 0);
  const totalPaid = mockMilestones.filter((m) => m.status === "PAID").reduce((s, m) => s + m.amount, 0);
  const totalDue = mockMilestones.filter((m) => ["DUE", "OVERDUE"].includes(m.status)).reduce((s, m) => s + m.amount, 0);
  const collectionRate = Math.round((totalPaid / totalBilled) * 100);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-medium tracking-tight">Billing</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Milestone-based billing across all projects
        </p>
      </div>

      {/* Summary cards */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardContent className="p-5">
            <div className="flex items-center justify-between">
              <span className="text-xs text-muted-foreground">Total Billed</span>
              <IndianRupee className="h-4 w-4 text-muted-foreground" />
            </div>
            <div className="mt-2 text-2xl font-semibold">{formatINRShort(totalBilled)}</div>
            <div className="mt-1 text-xs text-muted-foreground">
              incl. GST: {formatINRShort(calculateGST(totalBilled).totalAmount)}
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-5">
            <div className="flex items-center justify-between">
              <span className="text-xs text-muted-foreground">Collected</span>
              <CheckCircle className="h-4 w-4 text-green-400" />
            </div>
            <div className="mt-2 text-2xl font-semibold text-green-400">
              {formatINRShort(totalPaid)}
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-5">
            <div className="flex items-center justify-between">
              <span className="text-xs text-muted-foreground">Outstanding</span>
              <AlertCircle className="h-4 w-4 text-yellow-400" />
            </div>
            <div className="mt-2 text-2xl font-semibold text-yellow-400">
              {formatINRShort(totalDue)}
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-5">
            <div className="flex items-center justify-between">
              <span className="text-xs text-muted-foreground">Collection Rate</span>
              <FileText className="h-4 w-4 text-primary" />
            </div>
            <div className="mt-2 text-2xl font-semibold">{collectionRate}%</div>
            <Progress value={collectionRate} className="mt-2" />
          </CardContent>
        </Card>
      </div>

      {/* Milestones table */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base font-medium">All Milestones</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="divide-y divide-border/50">
            <div className="grid grid-cols-6 gap-4 pb-3 text-xs font-medium text-muted-foreground">
              <span className="col-span-2">Milestone</span>
              <span>Project</span>
              <span>Amount</span>
              <span>With GST</span>
              <span>Status</span>
            </div>
            {mockMilestones.map((m) => {
              const gst = calculateGST(m.amount);
              const config = statusConfig[m.status];
              const Icon = config.icon;
              return (
                <div key={m.id} className="grid grid-cols-6 items-center gap-4 py-3">
                  <div className="col-span-2">
                    <div className="text-sm font-medium">{m.name}</div>
                    <div className="text-xs text-muted-foreground">{m.stage.replace(/_/g, " ")}</div>
                  </div>
                  <span className="text-xs text-muted-foreground">{m.project}</span>
                  <span className="text-xs font-medium">{formatINR(m.amount)}</span>
                  <span className="text-xs text-muted-foreground">{formatINR(gst.totalAmount)}</span>
                  <div className="flex items-center gap-1.5">
                    <Icon className={`h-3.5 w-3.5 ${config.color}`} />
                    <Badge
                      variant="outline"
                      className="text-[10px]"
                      style={{ color: config.color.replace("text-", "") }}
                    >
                      {m.status}
                    </Badge>
                    {m.paidAt && (
                      <span className="text-[10px] text-muted-foreground/70">
                        {formatDate(m.paidAt)}
                      </span>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
