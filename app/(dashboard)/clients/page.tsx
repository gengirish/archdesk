"use client";

import { Suspense, useState, useEffect, type FormEvent } from "react";
import { useSearchParams } from "next/navigation";
import { Plus, Search, Users, Phone, Mail, MapPin, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { useClients, useCreateClient } from "@/hooks/useClients";

function getInitials(name: string): string {
  return name
    .split(" ")
    .map((w) => w[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);
}

export default function ClientsPage() {
  return (
    <Suspense fallback={<div className="flex items-center justify-center py-20"><Loader2 className="h-8 w-8 animate-spin text-muted-foreground" /></div>}>
      <ClientsContent />
    </Suspense>
  );
}

function ClientsContent() {
  const searchParams = useSearchParams();
  const [search, setSearch] = useState("");
  useEffect(() => {
    const q = searchParams.get("q");
    if (q) setSearch(q);
  }, [searchParams]);
  const [addClientOpen, setAddClientOpen] = useState(false);
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");
  const [city, setCity] = useState("");
  const [clientState, setClientState] = useState("");
  const { data: clients, isLoading } = useClients();
  const createClient = useCreateClient();

  const resetClientForm = () => {
    setName("");
    setPhone("");
    setEmail("");
    setCity("");
    setClientState("");
  };

  const handleAddClient = (e: FormEvent) => {
    e.preventDefault();
    const trimmedName = name.trim();
    const trimmedPhone = phone.trim();
    if (!trimmedName || !trimmedPhone) return;
    createClient.mutate(
      {
        name: trimmedName,
        phone: trimmedPhone,
        email: email.trim() || undefined,
        city: city.trim() || undefined,
        state: clientState.trim() || undefined,
      },
      {
        onSuccess: () => {
          toast.success("Client added");
          setAddClientOpen(false);
          resetClientForm();
        },
        onError: (err) => {
          toast.error(err instanceof Error ? err.message : "Failed to add client");
        },
      }
    );
  };

  const clientsList = clients ?? [];

  const filtered = clientsList.filter(
    (c) =>
      !search ||
      c.name.toLowerCase().includes(search.toLowerCase()) ||
      c.phone.includes(search)
  );

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="min-w-0">
          <h1 className="text-2xl font-medium tracking-tight">Clients</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            {clientsList.length} clients in your firm
          </p>
        </div>
        <Button type="button" onClick={() => setAddClientOpen(true)}>
          <Plus className="mr-2 h-4 w-4" />
          Add Client
        </Button>
      </div>

      <Dialog open={addClientOpen} onOpenChange={setAddClientOpen}>
        <DialogContent className="sm:max-w-md">
          <form onSubmit={handleAddClient}>
            <DialogHeader>
              <DialogTitle>Add client</DialogTitle>
              <DialogDescription>Enter contact details for the new client.</DialogDescription>
            </DialogHeader>
            <div className="grid gap-4 py-4">
              <div className="grid gap-2">
                <Label htmlFor="client-name">Name</Label>
                <Input
                  id="client-name"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  required
                  autoComplete="name"
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="client-phone">Phone</Label>
                <Input
                  id="client-phone"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  placeholder="+91 10-digit mobile"
                  required
                  autoComplete="tel"
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="client-email">Email</Label>
                <Input
                  id="client-email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  autoComplete="email"
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="client-city">City</Label>
                <Input
                  id="client-city"
                  value={city}
                  onChange={(e) => setCity(e.target.value)}
                  placeholder="Hubbali"
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="client-state">State</Label>
                <Input
                  id="client-state"
                  value={clientState}
                  onChange={(e) => setClientState(e.target.value)}
                  placeholder="Karnataka"
                  autoComplete="address-level1"
                />
                <p className="text-xs text-muted-foreground">
                  Used for GST: a different state from your firm means IGST instead of CGST + SGST.
                </p>
              </div>
            </div>
            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={() => setAddClientOpen(false)}
                disabled={createClient.isPending}
              >
                Cancel
              </Button>
              <Button type="submit" disabled={createClient.isPending}>
                {createClient.isPending ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Adding…
                  </>
                ) : (
                  "Submit"
                )}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      <div className="relative sm:max-w-xs">
        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          placeholder="Search by name or phone..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="pl-9"
        />
      </div>

      {isLoading && (
        <div className="flex items-center justify-center py-20">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </div>
      )}

      {!isLoading && filtered.length === 0 && (
        <div className="flex flex-col items-center justify-center rounded-lg border border-dashed border-border/50 py-16">
          <Users className="mb-3 h-10 w-10 text-muted-foreground/50" />
          <p className="text-sm text-muted-foreground">No clients found</p>
        </div>
      )}

      {!isLoading && (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {filtered.map((client) => {
            const projectCount = client._count.projects;
            return (
              <Card key={client.id} className="cursor-pointer transition-colors hover:border-primary/30">
                <CardContent className="p-5">
                  <div className="flex items-start gap-3">
                    <Avatar className="h-10 w-10 shrink-0">
                      <AvatarFallback className="bg-primary/10 text-xs text-primary">
                        {getInitials(client.name)}
                      </AvatarFallback>
                    </Avatar>
                    <div className="min-w-0 flex-1">
                      <h3 className="truncate text-sm font-medium">{client.name}</h3>
                      <div className="mt-2 space-y-1">
                        <div className="flex items-center gap-2 text-xs text-muted-foreground">
                          <Phone className="h-3 w-3" />
                          +91 {client.phone}
                        </div>
                        {client.email && (
                          <div className="flex items-center gap-2 text-xs text-muted-foreground">
                            <Mail className="h-3 w-3" />
                            {client.email}
                          </div>
                        )}
                        <div className="flex items-center gap-2 text-xs text-muted-foreground">
                          <MapPin className="h-3 w-3" />
                          {client.city ?? ""}
                        </div>
                      </div>
                      <div className="mt-3">
                        <Badge variant="secondary" className="text-[10px]">
                          {projectCount} project{projectCount !== 1 ? "s" : ""}
                        </Badge>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
