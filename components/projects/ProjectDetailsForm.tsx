"use client";

import { useEffect, useState, type FormEvent } from "react";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useUpdateProject } from "@/hooks/useProjects";
import {
  firstIssue,
  PROJECT_TYPES,
  projectUpdateSchema,
  toDateInputValue,
} from "@/lib/validation/project";
import type { ProjectWithRelations } from "@/types";

type FormState = {
  name: string;
  type: (typeof PROJECT_TYPES)[number];
  budget: string;
  area: string;
  location: string;
  startDate: string;
  deadline: string;
  description: string;
};

function fromProject(p: ProjectWithRelations): FormState {
  return {
    name: p.name,
    type: p.type,
    budget: p.budget != null ? String(p.budget) : "",
    area: p.area != null ? String(p.area) : "",
    location: p.location ?? "",
    startDate: toDateInputValue(p.startDate),
    deadline: toDateInputValue(p.deadline),
    description: p.description ?? "",
  };
}

const typeLabel = (t: string) => t.charAt(0) + t.slice(1).toLowerCase();

export function ProjectDetailsForm({ project }: { project: ProjectWithRelations }) {
  const update = useUpdateProject(project.id);
  const [form, setForm] = useState<FormState>(() => fromProject(project));

  // Re-sync only when the stored record actually changes (keyed on updatedAt),
  // so a background refetch doesn't wipe unsaved edits.
  const updatedAt = String(project.updatedAt);
  useEffect(() => {
    setForm(fromProject(project));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [updatedAt]);

  const dirty = JSON.stringify(form) !== JSON.stringify(fromProject(project));

  function set<K extends keyof FormState>(key: K, value: FormState[K]) {
    setForm((f) => ({ ...f, [key]: value }));
  }

  function submit(e: FormEvent) {
    e.preventDefault();
    const check = projectUpdateSchema.safeParse(form);
    if (!check.success) {
      toast.error(firstIssue(check.error));
      return;
    }
    update.mutate(form, {
      onSuccess: () => toast.success("Project saved"),
      onError: (err) => toast.error(err instanceof Error ? err.message : "Failed to save project"),
    });
  }

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-sm font-medium">Project details</CardTitle>
      </CardHeader>
      <CardContent>
        <form onSubmit={submit} className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-2 sm:col-span-2">
            <Label htmlFor="pd-name">Name</Label>
            <Input
              id="pd-name"
              value={form.name}
              onChange={(e) => set("name", e.target.value)}
              maxLength={200}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="pd-type">Type</Label>
            <Select value={form.type} onValueChange={(v) => set("type", v as FormState["type"])}>
              <SelectTrigger id="pd-type">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {PROJECT_TYPES.map((t) => (
                  <SelectItem key={t} value={t}>
                    {typeLabel(t)}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label htmlFor="pd-location">Location</Label>
            <Input
              id="pd-location"
              value={form.location}
              onChange={(e) => set("location", e.target.value)}
              placeholder="City or site"
              maxLength={200}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="pd-budget">Budget (₹)</Label>
            <Input
              id="pd-budget"
              type="number"
              inputMode="decimal"
              min={0}
              step="any"
              value={form.budget}
              onChange={(e) => set("budget", e.target.value)}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="pd-area">Area (sqft)</Label>
            <Input
              id="pd-area"
              type="number"
              inputMode="decimal"
              min={0}
              step="any"
              value={form.area}
              onChange={(e) => set("area", e.target.value)}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="pd-start">Start date</Label>
            <Input
              id="pd-start"
              type="date"
              value={form.startDate}
              onChange={(e) => set("startDate", e.target.value)}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="pd-deadline">Deadline</Label>
            <Input
              id="pd-deadline"
              type="date"
              value={form.deadline}
              min={form.startDate || undefined}
              onChange={(e) => set("deadline", e.target.value)}
            />
          </div>
          <div className="space-y-2 sm:col-span-2">
            <Label htmlFor="pd-description">Description</Label>
            <Textarea
              id="pd-description"
              value={form.description}
              onChange={(e) => set("description", e.target.value)}
              rows={3}
              maxLength={5000}
              placeholder="Brief, scope, client preferences…"
            />
          </div>
          <div className="flex gap-2 sm:col-span-2">
            <Button type="submit" size="sm" disabled={!dirty || update.isPending}>
              {update.isPending ? <Loader2 className="mr-1.5 h-4 w-4 animate-spin" /> : null}
              Save changes
            </Button>
            {dirty ? (
              <Button type="button" size="sm" variant="ghost" onClick={() => setForm(fromProject(project))}>
                Discard
              </Button>
            ) : null}
          </div>
        </form>
      </CardContent>
    </Card>
  );
}
