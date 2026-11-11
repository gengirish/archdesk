"use client";

import { Suspense, useState, useEffect, useMemo } from "react";
import { useSearchParams } from "next/navigation";
import { Plus, Search, Users, Phone, Mail, MapPin, Loader2, StickyNote } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { useClients, type ClientWithProjectCount } from "@/hooks/useClients";
import { ClientFormDialog } from "@/components/clients/ClientFormDialog";
import { matchesClientSearch } from "@/lib/validation/client";

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
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<ClientWithProjectCount | null>(null);
  const { data: clients, isLoading } = useClients();

  const openAdd = () => {
    setEditing(null);
    setDialogOpen(true);
  };
  const openEdit = (c: ClientWithProjectCount) => {
    setEditing(c);
    setDialogOpen(true);
  };

  const clientsList = useMemo(() => clients ?? [], [clients]);
  const filtered = useMemo(
    () => clientsList.filter((c) => matchesClientSearch(c, search)),
    [clientsList, search]
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
        <Button type="button" onClick={openAdd}>
          <Plus className="mr-2 h-4 w-4" />
          Add Client
        </Button>
      </div>

      <ClientFormDialog open={dialogOpen} onOpenChange={setDialogOpen} client={editing} />

      <div className="relative sm:max-w-xs">
        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          placeholder="Search by name, phone or email…"
          aria-label="Search clients"
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
              <Card
                key={client.id}
                role="button"
                tabIndex={0}
                aria-label={`Edit ${client.name}`}
                onClick={() => openEdit(client)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" || e.key === " ") {
                    e.preventDefault();
                    openEdit(client);
                  }
                }}
                className="cursor-pointer transition-colors hover:border-primary/30 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              >
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
                        {(client.city || client.state) && (
                          <div className="flex items-center gap-2 text-xs text-muted-foreground">
                            <MapPin className="h-3 w-3" />
                            {[client.city, client.state].filter(Boolean).join(", ")}
                          </div>
                        )}
                        {client.notes && (
                          <div className="flex items-start gap-2 text-xs text-muted-foreground">
                            <StickyNote className="mt-0.5 h-3 w-3 shrink-0" />
                            <span className="line-clamp-2">{client.notes}</span>
                          </div>
                        )}
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
