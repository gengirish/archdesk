"use client";

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
import { LEAD_PROJECT_TYPES, LEAD_SOURCES, leadSourceLabel } from "@/lib/validation/lead";
import { projectTypeLabel } from "@/components/leads/lead-helpers";

export type LeadFormState = {
  name: string;
  phone: string;
  email: string;
  address: string;
  projectType: (typeof LEAD_PROJECT_TYPES)[number] | "";
  budget: string;
  area: string;
  source: (typeof LEAD_SOURCES)[number];
  notes: string;
  followUpAt: string;
};

export const EMPTY_LEAD_FORM: LeadFormState = {
  name: "",
  phone: "",
  email: "",
  address: "",
  projectType: "",
  budget: "",
  area: "",
  source: "REFERRAL",
  notes: "",
  followUpAt: "",
};

type Props = {
  idPrefix: string;
  value: LeadFormState;
  onChange: (next: LeadFormState) => void;
};

/** Shared by the create dialog and the lead detail sheet. */
export function LeadFormFields({ idPrefix, value, onChange }: Props) {
  function set<K extends keyof LeadFormState>(key: K, v: LeadFormState[K]) {
    onChange({ ...value, [key]: v });
  }
  const id = (k: string) => `${idPrefix}-${k}`;

  return (
    <div className="grid gap-4 sm:grid-cols-2">
      <div className="grid gap-2 sm:col-span-2">
        <Label htmlFor={id("name")}>Name</Label>
        <Input
          id={id("name")}
          value={value.name}
          onChange={(e) => set("name", e.target.value)}
          placeholder="Client name"
          maxLength={200}
          required
        />
      </div>
      <div className="grid gap-2">
        <Label htmlFor={id("phone")}>Mobile</Label>
        <Input
          id={id("phone")}
          type="tel"
          inputMode="tel"
          value={value.phone}
          onChange={(e) => set("phone", e.target.value)}
          placeholder="98765 43210"
          required
        />
      </div>
      <div className="grid gap-2">
        <Label htmlFor={id("email")}>Email</Label>
        <Input
          id={id("email")}
          type="email"
          value={value.email}
          onChange={(e) => set("email", e.target.value)}
          placeholder="Optional"
        />
      </div>
      <div className="grid gap-2">
        <Label htmlFor={id("source")}>Source</Label>
        <Select value={value.source} onValueChange={(v) => set("source", v as LeadFormState["source"])}>
          <SelectTrigger id={id("source")}>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {LEAD_SOURCES.map((s) => (
              <SelectItem key={s} value={s}>
                {leadSourceLabel(s)}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
      <div className="grid gap-2">
        <Label htmlFor={id("type")}>Project type</Label>
        <Select
          value={value.projectType || "__none__"}
          onValueChange={(v) =>
            set("projectType", v === "__none__" ? "" : (v as LeadFormState["projectType"]))
          }
        >
          <SelectTrigger id={id("type")}>
            <SelectValue placeholder="Optional" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="__none__">Not decided</SelectItem>
            {LEAD_PROJECT_TYPES.map((t) => (
              <SelectItem key={t} value={t}>
                {projectTypeLabel(t)}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
      <div className="grid gap-2">
        <Label htmlFor={id("budget")}>Budget (₹)</Label>
        <Input
          id={id("budget")}
          inputMode="decimal"
          value={value.budget}
          onChange={(e) => set("budget", e.target.value)}
          placeholder="Optional"
        />
      </div>
      <div className="grid gap-2">
        <Label htmlFor={id("area")}>Area (sqft)</Label>
        <Input
          id={id("area")}
          inputMode="decimal"
          value={value.area}
          onChange={(e) => set("area", e.target.value)}
          placeholder="Optional"
        />
      </div>
      <div className="grid gap-2">
        <Label htmlFor={id("follow")}>Follow-up date</Label>
        <Input
          id={id("follow")}
          type="date"
          value={value.followUpAt}
          onChange={(e) => set("followUpAt", e.target.value)}
        />
      </div>
      <div className="grid gap-2 sm:col-span-2">
        <Label htmlFor={id("address")}>Site address</Label>
        <Input
          id={id("address")}
          value={value.address}
          onChange={(e) => set("address", e.target.value)}
          placeholder="Optional"
          maxLength={500}
        />
      </div>
      <div className="grid gap-2 sm:col-span-2">
        <Label htmlFor={id("notes")}>Notes</Label>
        <Textarea
          id={id("notes")}
          value={value.notes}
          onChange={(e) => set("notes", e.target.value)}
          rows={3}
          maxLength={5000}
          placeholder="Requirements, plot details, preferences…"
        />
      </div>
    </div>
  );
}
