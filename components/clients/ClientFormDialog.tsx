"use client";

import { useEffect, useState, type FormEvent } from "react";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { FormField } from "@/components/shared/form-field";
import {
  useCreateClient,
  useUpdateClient,
  type ClientWithProjectCount,
} from "@/hooks/useClients";
import { CLIENT_NOTES_MAX, clientCreateSchema } from "@/lib/validation/client";
import { ApiValidationError, fieldErrors, type FieldErrors } from "@/lib/validation/form-errors";

type Props = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** Edit this client; omit to add a new one. */
  client?: ClientWithProjectCount | null;
};

type FormState = {
  name: string;
  phone: string;
  email: string;
  address: string;
  city: string;
  state: string;
  notes: string;
};

const EMPTY: FormState = { name: "", phone: "", email: "", address: "", city: "", state: "", notes: "" };

function fromClient(c?: ClientWithProjectCount | null): FormState {
  if (!c) return EMPTY;
  return {
    name: c.name ?? "",
    phone: c.phone ?? "",
    email: c.email ?? "",
    address: c.address ?? "",
    city: c.city ?? "",
    state: c.state ?? "",
    notes: c.notes ?? "",
  };
}

export function ClientFormDialog({ open, onOpenChange, client }: Props) {
  const isEdit = !!client;
  const [form, setForm] = useState<FormState>(EMPTY);
  const [errors, setErrors] = useState<FieldErrors>({});
  const create = useCreateClient();
  const update = useUpdateClient();
  const pending = create.isPending || update.isPending;

  useEffect(() => {
    if (open) {
      setForm(fromClient(client));
      setErrors({});
    }
  }, [open, client]);

  const set = (key: keyof FormState) => (value: string) => {
    setForm((f) => ({ ...f, [key]: value }));
    if (errors[key]) setErrors((e) => ({ ...e, [key]: undefined }));
  };

  function handleSubmit(e: FormEvent) {
    e.preventDefault();
    const parsed = clientCreateSchema.safeParse(form);
    if (!parsed.success) {
      setErrors(fieldErrors(parsed.error));
      return;
    }
    const onError = (err: unknown) => {
      if (err instanceof ApiValidationError) setErrors(err.fieldErrors);
      toast.error(err instanceof Error ? err.message : "Couldn't save the client");
    };
    // Send the raw form values: the API runs the same schema.
    if (isEdit && client) {
      update.mutate(
        { id: client.id, ...form },
        {
          onSuccess: () => {
            toast.success("Client updated");
            onOpenChange(false);
          },
          onError,
        }
      );
    } else {
      create.mutate(form, {
        onSuccess: () => {
          toast.success("Client added");
          onOpenChange(false);
        },
        onError,
      });
    }
  }

  const describe = (key: keyof FormState) => (errors[key] ? `client-${key}-msg` : undefined);

  return (
    <Dialog open={open} onOpenChange={(o) => !pending && onOpenChange(o)}>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-lg">
        <form onSubmit={handleSubmit} noValidate>
          <DialogHeader>
            <DialogTitle>{isEdit ? "Edit client" : "Add client"}</DialogTitle>
            <DialogDescription>
              {isEdit ? "Update this client's details." : "Enter contact details for the new client."}
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4 sm:grid-cols-2">
            <FormField id="client-name" label="Name" required error={errors.name} className="sm:col-span-2">
              <Input
                id="client-name"
                value={form.name}
                onChange={(e) => set("name")(e.target.value)}
                autoComplete="name"
                aria-invalid={!!errors.name}
                aria-describedby={describe("name")}
              />
            </FormField>
            <FormField id="client-phone" label="Phone" required error={errors.phone}>
              <Input
                id="client-phone"
                value={form.phone}
                onChange={(e) => set("phone")(e.target.value)}
                placeholder="98765 43210"
                inputMode="tel"
                autoComplete="tel"
                aria-invalid={!!errors.phone}
                aria-describedby={describe("phone")}
              />
            </FormField>
            <FormField id="client-email" label="Email" error={errors.email}>
              <Input
                id="client-email"
                type="email"
                value={form.email}
                onChange={(e) => set("email")(e.target.value)}
                autoComplete="email"
                aria-invalid={!!errors.email}
                aria-describedby={describe("email")}
              />
            </FormField>
            <FormField id="client-address" label="Address" error={errors.address} className="sm:col-span-2">
              <Input
                id="client-address"
                value={form.address}
                onChange={(e) => set("address")(e.target.value)}
                autoComplete="street-address"
              />
            </FormField>
            <FormField id="client-city" label="City" error={errors.city}>
              <Input
                id="client-city"
                value={form.city}
                onChange={(e) => set("city")(e.target.value)}
                placeholder="Hubballi"
                autoComplete="address-level2"
              />
            </FormField>
            <FormField
              id="client-state"
              label="State"
              error={errors.state}
              hint="Used for GST: a different state from your firm means IGST."
            >
              <Input
                id="client-state"
                value={form.state}
                onChange={(e) => set("state")(e.target.value)}
                placeholder="Karnataka"
                autoComplete="address-level1"
                aria-describedby="client-state-msg"
              />
            </FormField>
            <FormField
              id="client-notes"
              label="Notes"
              error={errors.notes}
              hint={`${form.notes.length}/${CLIENT_NOTES_MAX}`}
              className="sm:col-span-2"
            >
              <Textarea
                id="client-notes"
                value={form.notes}
                onChange={(e) => set("notes")(e.target.value)}
                rows={4}
                maxLength={CLIENT_NOTES_MAX}
                placeholder="Preferences, family members, budget notes…"
                aria-describedby="client-notes-msg"
              />
            </FormField>
          </div>
          <DialogFooter className="gap-2 sm:gap-0">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)} disabled={pending}>
              Cancel
            </Button>
            <Button type="submit" disabled={pending}>
              {pending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
              {isEdit ? "Save changes" : "Add client"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
