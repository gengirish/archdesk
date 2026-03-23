"use client";

import { useState } from "react";
import { Plus, Search, Users, Phone, Mail, MapPin } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";

const mockClients = [
  { id: "1", name: "Rajesh Patil", phone: "9876543210", email: "rajesh@email.com", city: "Hubbali", projects: 2 },
  { id: "2", name: "Priya Sharma", phone: "9876543211", email: "priya@email.com", city: "Hubbali", projects: 1 },
  { id: "3", name: "KLE Society", phone: "9876543212", email: "admin@kle.org", city: "Hubbali", projects: 3 },
  { id: "4", name: "Suresh Deshpande", phone: "9876543213", email: "suresh.d@email.com", city: "Dharwad", projects: 1 },
  { id: "5", name: "Hubli Builders", phone: "9876543214", email: "info@hublibuilders.com", city: "Hubbali", projects: 4 },
  { id: "6", name: "Anand Kulkarni", phone: "9876543215", email: null, city: "Hubbali", projects: 1 },
];

function getInitials(name: string): string {
  return name
    .split(" ")
    .map((w) => w[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);
}

export default function ClientsPage() {
  const [search, setSearch] = useState("");

  const filtered = mockClients.filter(
    (c) =>
      !search ||
      c.name.toLowerCase().includes(search.toLowerCase()) ||
      c.phone.includes(search)
  );

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-medium tracking-tight">Clients</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            {mockClients.length} clients in your firm
          </p>
        </div>
        <Button>
          <Plus className="mr-2 h-4 w-4" />
          Add Client
        </Button>
      </div>

      <div className="relative sm:max-w-xs">
        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          placeholder="Search by name or phone..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="pl-9"
        />
      </div>

      {filtered.length === 0 && (
        <div className="flex flex-col items-center justify-center rounded-lg border border-dashed border-border/50 py-16">
          <Users className="mb-3 h-10 w-10 text-muted-foreground/50" />
          <p className="text-sm text-muted-foreground">No clients found</p>
        </div>
      )}

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {filtered.map((client) => (
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
                      {client.city}
                    </div>
                  </div>
                  <div className="mt-3">
                    <Badge variant="secondary" className="text-[10px]">
                      {client.projects} project{client.projects !== 1 ? "s" : ""}
                    </Badge>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
