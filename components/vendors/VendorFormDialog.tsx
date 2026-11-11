"use client";

import { useEffect, useState, type FormEvent } from "react";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { FormField } from "@/components/shared/form-field";
import { StarInput } from "@/components/vendors/StarRating";
import { useCreateVendor, useUpdateVendor } from "@/hooks/useVendors";
import type { Vendor } from "@/types";
import { VENDOR_CATEGORIES, vendorCreateSchema } from "@/lib/validation/vendor";
import { ApiValidationError, fieldErrors, type FieldErrors } from "@/lib/validation/form-errors";

export const vendorCategoryLabel = (c: string) => c.charAt(0) + c.slice(1).toLowerCase();

type Category = (typeof VENDOR_CATEGORIES)[number];
type FormState = {
  name: string;
  category: Category;
  phone: string;
  email: string;
  address: string;
  city: string;
  gst: string;
  notes: string;
  rating: number | null;
};

const EMPTY: FormState = {
  name: "",
  category: "CONTRACTOR",
  phone: "",
  email: "",
  address: "",
  city: "",
  gst: "",
  notes: "",
  rating: null,
};

function fromVendor(v?: Vendor | null): FormState {
  if (!v) return EMPTY;
  return {
    name: v.name ?? "",
    category: v.category as Category,
    phone: v.phone ?? "",
    email: v.email ?? "",
    address: v.address ?? "",
    city: v.city ?? "",
    gst: v.gst ?? "",
    notes: v.notes ?? "",
    rating: v.rating ?? null,
  };
}

type Props = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** Edit this vendor; omit to add a new one. */
  vendor?: Vendor | null;
};

export function VendorFormDialog({ open, onOpenChange, vendor }: Props) {
  const isEdit = !!vendor;
  const [form, setForm] = useState<FormState>(EMPTY);
  const [errors, setErrors] = useState<FieldErrors>({});
  const create = useCreateVendor();
  const update = useUpdateVendor();
  const pending = create.isPending || update.isPending;

  useEffect(() => {
    if (open) {
      setForm(fromVendor(vendor));
      setErrors({});
    }
  }, [open, vendor]);

  function set<K extends keyof FormState>(key: K, value: FormState[K]) {
    setForm((f) => ({ ...f, [key]: value }));
    if (errors[key]) setErrors((e) => ({ ...e, [key]: undefined }));
  }

  function handleSubmit(e: FormEvent) {
    e.preventDefault();
    const parsed = vendorCreateSchema.safeParse(form);
    if (!parsed.success) {
      setErrors(fieldErrors(parsed.error));
      return;
    }
    const onError = (err: unknown) => {
      if (err instanceof ApiValidationError) setErrors(err.fieldErrors);
      toast.error(err instanceof Error ? err.message : "Couldn't save the vendor");
    };
    // Send the raw form values: the API runs the same schema.
    if (isEdit && vendor) {
      update.mutate(
        { id: vendor.id, ...form },
        {
          onSuccess: () => {
            toast.success("Vendor updated");
            onOpenChange(false);
          },
          onError,
        }
      );
    } else {
      create.mutate(form, {
        onSuccess: () => {
          toast.success("Vendor added");
          onOpenChange(false);
        },
        onError,
      });
    }
  }

  const describe = (key: keyof FormState) => (errors[key] ? `vendor-${key}-msg` : undefined);

  return (
    <Dialog open={open} onOpenChange={(o) => !pending && onOpenChange(o)}>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-lg">
        <form onSubmit={handleSubmit} noValidate>
          <DialogHeader>
            <DialogTitle>{isEdit ? "Edit vendor" : "Add vendor"}</DialogTitle>
            <DialogDescription>
              {isEdit ? "Update the vendor details and rating." : "Add a vendor to your network."}
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4 sm:grid-cols-2">
            <FormField id="vendor-name" label="Name" required error={errors.name} className="sm:col-span-2">
              <Input
                id="vendor-name"
                value={form.name}
                onChange={(e) => set("name", e.target.value)}
                autoComplete="organization"
                aria-invalid={!!errors.name}
                aria-describedby={describe("name")}
              />
            </FormField>
            <FormField id="vendor-category" label="Category" required error={errors.category}>
              <Select value={form.category} onValueChange={(v) => set("category", v as Category)}>
                <SelectTrigger id="vendor-category">
                  <SelectValue placeholder="Category" />
                </SelectTrigger>
                <SelectContent>
                  {VENDOR_CATEGORIES.map((cat) => (
                    <SelectItem key={cat} value={cat}>
                      {vendorCategoryLabel(cat)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </FormField>
            <FormField id="vendor-phone" label="Phone" required error={errors.phone}>
              <Input
                id="vendor-phone"
                value={form.phone}
                onChange={(e) => set("phone", e.target.value)}
                placeholder="98765 43210"
                inputMode="tel"
                autoComplete="tel"
                aria-invalid={!!errors.phone}
                aria-describedby={describe("phone")}
              />
            </FormField>
            <FormField id="vendor-email" label="Email" error={errors.email}>
              <Input
                id="vendor-email"
                type="email"
                value={form.email}
                onChange={(e) => set("email", e.target.value)}
                autoComplete="email"
                aria-invalid={!!errors.email}
                aria-describedby={describe("email")}
              />
            </FormField>
            <FormField id="vendor-gst" label="GSTIN" error={errors.gst}>
              <Input
                id="vendor-gst"
                value={form.gst}
                onChange={(e) => set("gst", e.target.value.toUpperCase())}
                placeholder="29ABCDE1234F1Z5"
                maxLength={15}
                className="font-mono uppercase"
                aria-invalid={!!errors.gst}
                aria-describedby={describe("gst")}
              />
            </FormField>
            <FormField id="vendor-address" label="Address" error={errors.address} className="sm:col-span-2">
              <Input id="vendor-address" value={form.address} onChange={(e) => set("address", e.target.value)} />
            </FormField>
            <FormField id="vendor-city" label="City" error={errors.city}>
              <Input
                id="vendor-city"
                value={form.city}
                onChange={(e) => set("city", e.target.value)}
                placeholder="Hubballi"
              />
            </FormField>
            <div className="grid gap-2">
              <Label htmlFor="vendor-rating">Rating</Label>
              <StarInput id="vendor-rating" value={form.rating} onChange={(v) => set("rating", v)} />
              {errors.rating ? (
                <p role="alert" className="text-xs text-destructive">
                  {errors.rating}
                </p>
              ) : null}
            </div>
            <FormField id="vendor-notes" label="Notes" error={errors.notes} className="sm:col-span-2">
              <Textarea
                id="vendor-notes"
                value={form.notes}
                onChange={(e) => set("notes", e.target.value)}
                rows={3}
                maxLength={2000}
              />
            </FormField>
          </div>
          <DialogFooter className="gap-2 sm:gap-0">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)} disabled={pending}>
              Cancel
            </Button>
            <Button type="submit" disabled={pending}>
              {pending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
              {isEdit ? "Save changes" : "Add vendor"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
