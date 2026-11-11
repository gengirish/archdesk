"use client";

import { useEffect, useState, type FormEvent } from "react";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { milestoneTotal } from "@/lib/billing-metrics";
import { formatINR } from "@/lib/utils";
import { toDateInputValue } from "@/lib/validation/project";
import { useUpdateMilestone, type MilestoneListItem } from "@/hooks/useBilling";

type Props = { milestone: MilestoneListItem | null; onOpenChange: (open: boolean) => void };

/** Captures the amount received (incl. GST) and payment date when marking Paid. */
export function MarkPaidDialog({ milestone, onOpenChange }: Props) {
  const update = useUpdateMilestone();
  const [amount, setAmount] = useState("");
  const [date, setDate] = useState("");

  useEffect(() => {
    if (milestone) {
      setAmount(String(milestone.paidAmount ?? milestoneTotal(milestone)));
      setDate(toDateInputValue(milestone.paidAt ?? new Date()));
    }
  }, [milestone]);

  function submit(e: FormEvent) {
    e.preventDefault();
    if (!milestone) return;
    const n = Number(amount);
    if (!Number.isFinite(n) || n <= 0) {
      toast.error("Enter the amount received");
      return;
    }
    if (!date) {
      toast.error("Enter the payment date");
      return;
    }
    update.mutate(
      {
        projectId: milestone.projectId,
        milestoneId: milestone.id,
        status: "PAID",
        paidAmount: n,
        paidAt: date,
      },
      {
        onSuccess: () => {
          toast.success(`${milestone.name} marked paid`);
          onOpenChange(false);
        },
        onError: (err) => toast.error(err instanceof Error ? err.message : "Failed to mark paid"),
      }
    );
  }

  const total = milestone ? milestoneTotal(milestone) : 0;

  return (
    <Dialog open={!!milestone} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-sm">
        <DialogHeader>
          <DialogTitle>Record payment</DialogTitle>
          <DialogDescription>
            {milestone ? `${milestone.name} · total ${formatINR(total)} incl. GST` : null}
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={submit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="paid-amount">Amount received incl. GST (₹)</Label>
            <Input
              id="paid-amount"
              type="number"
              inputMode="decimal"
              min={1}
              step="any"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="paid-date">Payment date</Label>
            <Input
              id="paid-date"
              type="date"
              value={date}
              max={toDateInputValue(new Date())}
              onChange={(e) => setDate(e.target.value)}
            />
          </div>
          <DialogFooter className="gap-2 sm:gap-0">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={update.isPending}>
              {update.isPending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
              Mark paid
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
