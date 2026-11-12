"use client";

import { useState } from "react";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
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
import { cn } from "@/lib/utils";
import { useCreateSiteIssue } from "@/hooks/useSiteTracker";
import {
  ISSUE_SEVERITIES,
  ISSUE_SEVERITY_LABELS,
  ISSUE_SEVERITY_STYLES,
  siteIssueCreateSchema,
  type IssueSeverityValue,
} from "@/lib/validation/site-issue";

type Props = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  projects: { id: string; name: string }[];
};

export function ReportIssueDialog({ open, onOpenChange, projects }: Props) {
  const [projectId, setProjectId] = useState("");
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [severity, setSeverity] = useState<IssueSeverityValue>("MEDIUM");
  const [assignedTo, setAssignedTo] = useState("");
  const [errors, setErrors] = useState<{ project?: string; title?: string; form?: string }>({});
  const createIssue = useCreateSiteIssue();

  function reset() {
    setProjectId("");
    setTitle("");
    setDescription("");
    setSeverity("MEDIUM");
    setAssignedTo("");
    setErrors({});
  }

  function submit() {
    const next: typeof errors = {};
    if (!projectId) next.project = "Select a project";
    const parsed = siteIssueCreateSchema.safeParse({ title, description, severity, assignedTo });
    if (!parsed.success) {
      const issue = parsed.error.issues[0];
      if (issue?.path[0] === "title") next.title = issue.message;
      else next.form = issue?.message ?? "Check the form";
    }
    setErrors(next);
    if (Object.keys(next).length || !parsed.success) return;

    createIssue.mutate(
      { projectId, ...parsed.data },
      {
        onSuccess: () => {
          toast.success("Issue reported");
          reset();
          onOpenChange(false);
        },
        onError: (err) => toast.error(err instanceof Error ? err.message : "Failed to report issue"),
      }
    );
  }

  return (
    <Dialog open={open} onOpenChange={(o) => !createIssue.isPending && onOpenChange(o)}>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Report site issue</DialogTitle>
          <DialogDescription>Track it from Open through In Progress to Resolved.</DialogDescription>
        </DialogHeader>
        <div className="grid gap-4 py-2">
          <div className="grid gap-2">
            <Label htmlFor="issue-project">Project</Label>
            <Select value={projectId || undefined} onValueChange={setProjectId}>
              <SelectTrigger id="issue-project" aria-invalid={!!errors.project}>
                <SelectValue placeholder="Select project" />
              </SelectTrigger>
              <SelectContent>
                {projects.length === 0 ? (
                  <SelectItem value="__none__" disabled>
                    No projects
                  </SelectItem>
                ) : (
                  projects.map((p) => (
                    <SelectItem key={p.id} value={p.id}>
                      {p.name}
                    </SelectItem>
                  ))
                )}
              </SelectContent>
            </Select>
            {errors.project && <p className="text-xs text-destructive">{errors.project}</p>}
          </div>
          <div className="grid gap-2">
            <Label htmlFor="issue-title">Title</Label>
            <Input
              id="issue-title"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="e.g. Seepage in basement wall"
              maxLength={200}
              aria-invalid={!!errors.title}
            />
            {errors.title && <p className="text-xs text-destructive">{errors.title}</p>}
          </div>
          <div className="grid gap-2">
            <Label htmlFor="issue-description">Description</Label>
            <Textarea
              id="issue-description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Optional details, location, who noticed it"
              rows={3}
              maxLength={5000}
            />
          </div>
          <fieldset className="grid gap-2">
            <legend className="mb-2 text-sm font-medium">Severity</legend>
            <div className="grid grid-cols-2 gap-2 sm:grid-cols-4" role="radiogroup">
              {ISSUE_SEVERITIES.map((s) => (
                <button
                  key={s}
                  type="button"
                  role="radio"
                  aria-checked={severity === s}
                  onClick={() => setSeverity(s)}
                  className={cn(
                    "rounded-md px-2 py-1.5 text-xs font-medium ring-1 transition",
                    ISSUE_SEVERITY_STYLES[s],
                    severity === s ? "ring-2 ring-offset-1 ring-offset-background" : "opacity-60 hover:opacity-100"
                  )}
                >
                  {ISSUE_SEVERITY_LABELS[s]}
                </button>
              ))}
            </div>
          </fieldset>
          <div className="grid gap-2">
            <Label htmlFor="issue-assignee">Assigned to</Label>
            <Input
              id="issue-assignee"
              value={assignedTo}
              onChange={(e) => setAssignedTo(e.target.value)}
              placeholder="Optional, e.g. site engineer or contractor"
              maxLength={120}
            />
          </div>
          {errors.form && (
            <p role="alert" className="text-sm text-destructive">
              {errors.form}
            </p>
          )}
        </div>
        <DialogFooter className="gap-2 sm:gap-0">
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={createIssue.isPending}>
            Cancel
          </Button>
          <Button onClick={submit} disabled={createIssue.isPending}>
            {createIssue.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Report issue
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
