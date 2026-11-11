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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { calculateGST, formatINR, STAGE_LABELS } from "@/lib/utils";
import { milestoneCreateSchema } from "@/lib/validation/milestone";
import { PROJECT_STAGES, toDateInputValue } from "@/lib/validation/project";
import {
  useCreateMilestone,
  useUpdateMilestone,
  type MilestoneListItem,
} from "@/hooks/useBilling";

type Props = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  projects: { id: string; name: string; stage?: string }[];
  /** Fix the project (project page); otherwise a picker is shown. */
  fixedProjectId?: string;
  /** Edit this milestone instead of creating one. */
  milestone?: MilestoneListItem | null;
};

type FormState = {
  projectId: string;
  name: string;
  stage: string;
  amount: string;
  gstPercent: string;
  dueDate: string;
  description: string;
};

function initialState(props: Props): FormState {
  const m = props.milestone;
  const projectId = m?.projectId ?? props.fixedProjectId ?? "";
  const projectStage = props.projects.find((p) => p.id === projectId)?.stage;
  return {
    projectId,
    name: m?.name ?? "",
    stage: m?.stage ?? projectStage ?? "CONCEPT",
    amount: m ? String(m.amount) : "",
    gstPercent: m ? String(m.gstPercent) : "18",
    dueDate: toDateInputValue(m?.dueDate),
    description: m?.description ?? "",
  };
}

export function MilestoneFormDialog(props: Props) {
  const { open, onOpenChange, projects, fixedProjectId, milestone } = props;
  const createMilestone = useCreateMilestone();
  const updateMilestone = useUpdateMilestone();
  const [form, setForm] = useState<FormState>(() => initialState(props));
  const editing = !!milestone;

  useEffect(() => {
    if (open) setForm(initialState(props));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, milestone?.id]);

  const set = <K extends keyof FormState>(k: K, v: FormState[K]) => setForm((f) => ({ ...f, [k]: v }));

  const amountNum = Number(form.amount);
  const gstNum = Number(form.gstPercent);
  const preview =
    Number.isFinite(amountNum) && amountNum > 0 && Number.isFinite(gstNum)
      ? calculateGST(amountNum, gstNum)
      : null;

  const pending = createMilestone.isPending || updateMilestone.isPending;

  function submit(e: FormEvent) {
    e.preventDefault();
    if (!form.projectId) {
      toast.error("Choose a project");
      return;
    }
    const payload = {
      name: form.name,
      stage: form.stage,
      amount: form.amount,
      gstPercent: form.gstPercent === "" ? 18 : form.gstPercent,
      dueDate: form.dueDate,
      description: form.description,
    };
    const check = milestoneCreateSchema.safeParse(payload);
    if (!check.success) {
      toast.error(check.error.issues[0]?.message ?? "Check the milestone details");
      return;
    }
    const typed = payload as Parameters<typeof createMilestone.mutate>[0];
    const handlers = {
      onSuccess: () => {
        toast.success(editing ? "Milestone updated" : "Milestone added");
        onOpenChange(false);
      },
      onError: (err: unknown) =>
        toast.error(err instanceof Error ? err.message : "Failed to save milestone"),
    };
    if (editing && milestone) {
      updateMilestone.mutate(
        { ...typed, projectId: milestone.projectId, milestoneId: milestone.id },
        handlers
      );
    } else {
      createMilestone.mutate({ ...typed, projectId: form.projectId }, handlers);
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{editing ? "Edit milestone" : "Add milestone"}</DialogTitle>
          <DialogDescription>Fee milestones are billed with GST on the base amount.</DialogDescription>
        </DialogHeader>
        <form onSubmit={submit} className="space-y-4">
          {!fixedProjectId && !editing ? (
            <div className="space-y-2">
              <Label htmlFor="ms-project">Project</Label>
              <Select value={form.projectId || undefined} onValueChange={(v) => set("projectId", v)}>
                <SelectTrigger id="ms-project">
                  <SelectValue placeholder={projects.length ? "Select project" : "No projects yet"} />
                </SelectTrigger>
                <SelectContent>
                  {projects.map((p) => (
                    <SelectItem key={p.id} value={p.id}>
                      {p.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          ) : null}
          <div className="space-y-2">
            <Label htmlFor="ms-name">Name</Label>
            <Input
              id="ms-name"
              value={form.name}
              onChange={(e) => set("name", e.target.value)}
              placeholder="Retainer on signing"
              maxLength={200}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="ms-stage">Stage</Label>
            <Select value={form.stage} onValueChange={(v) => set("stage", v)}>
              <SelectTrigger id="ms-stage">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {PROJECT_STAGES.map((s) => (
                  <SelectItem key={s} value={s}>
                    {STAGE_LABELS[s]}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-2">
              <Label htmlFor="ms-amount">Base amount (₹)</Label>
              <Input
                id="ms-amount"
                type="number"
                inputMode="decimal"
                min={1}
                step="any"
                value={form.amount}
                onChange={(e) => set("amount", e.target.value)}
                placeholder="50000"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="ms-gst">GST %</Label>
              <Input
                id="ms-gst"
                type="number"
                inputMode="decimal"
                min={0}
                max={28}
                step="any"
                value={form.gstPercent}
                onChange={(e) => set("gstPercent", e.target.value)}
              />
            </div>
          </div>
          {preview ? (
            <p className="rounded-md bg-secondary/40 px-3 py-2 text-xs text-muted-foreground" aria-live="polite">
              GST {formatINR(preview.gstAmount)} · Total{" "}
              <span className="font-medium text-foreground">{formatINR(preview.totalAmount)}</span>
            </p>
          ) : null}
          <div className="space-y-2">
            <Label htmlFor="ms-due">Due date</Label>
            <Input id="ms-due" type="date" value={form.dueDate} onChange={(e) => set("dueDate", e.target.value)} />
          </div>
          <div className="space-y-2">
            <Label htmlFor="ms-desc">Description (shown on the invoice)</Label>
            <Input
              id="ms-desc"
              value={form.description}
              onChange={(e) => set("description", e.target.value)}
              maxLength={300}
              placeholder="Optional"
            />
          </div>
          <DialogFooter className="gap-2 sm:gap-0">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={pending}>
              {pending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
              {editing ? "Save" : "Add milestone"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
