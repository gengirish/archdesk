"use client";

import { useState, type FormEvent } from "react";
import { Loader2, UserMinus, UserPlus } from "lucide-react";
import { toast } from "sonner";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useAddTeamMember, useFirmMembers, useRemoveTeamMember } from "@/hooks/useProjects";
import type { ProjectWithRelations } from "@/types";

function initials(name: string) {
  return name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((p) => p[0]?.toUpperCase())
    .join("");
}

export function ProjectTeamCard({ project }: { project: ProjectWithRelations }) {
  const { data: members = [] } = useFirmMembers();
  const addMember = useAddTeamMember(project.id);
  const removeMember = useRemoveTeamMember(project.id);
  const [userId, setUserId] = useState("");
  const [role, setRole] = useState("Architect");

  const onTeam = new Set(project.team.map((t) => t.user.id));
  const available = members.filter((m) => !onTeam.has(m.id));

  function submit(e: FormEvent) {
    e.preventDefault();
    if (!userId) {
      toast.error("Choose a team member");
      return;
    }
    if (!role.trim()) {
      toast.error("Role is required");
      return;
    }
    addMember.mutate(
      { userId, role: role.trim() },
      {
        onSuccess: () => {
          toast.success("Team member added");
          setUserId("");
          setRole("Architect");
        },
        onError: (err) => toast.error(err instanceof Error ? err.message : "Failed to add member"),
      }
    );
  }

  function remove(memberId: string, name: string) {
    removeMember.mutate(memberId, {
      onSuccess: () => toast.success(`${name} removed from the project`),
      onError: (err) => toast.error(err instanceof Error ? err.message : "Failed to remove member"),
    });
  }

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-sm font-medium">Team ({project.team.length})</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <ul className="space-y-2">
          {project.team.map(({ user, role: memberRole }) => (
            <li key={user.id} className="flex items-center gap-3">
              <Avatar className="h-8 w-8">
                {user.avatar ? <AvatarImage src={user.avatar} alt="" /> : null}
                <AvatarFallback className="text-[11px]">{initials(user.name)}</AvatarFallback>
              </Avatar>
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm">{user.name}</p>
                <p className="truncate text-xs text-muted-foreground">{memberRole}</p>
              </div>
              <Button
                size="icon"
                variant="ghost"
                className="h-8 w-8"
                onClick={() => remove(user.id, user.name)}
                disabled={removeMember.isPending || project.team.length <= 1}
                aria-label={`Remove ${user.name}`}
                title={project.team.length <= 1 ? "A project needs at least one member" : "Remove"}
              >
                <UserMinus className="h-4 w-4" />
              </Button>
            </li>
          ))}
        </ul>

        {available.length > 0 ? (
          <form onSubmit={submit} className="space-y-2 border-t border-border/40 pt-3">
            <Select value={userId || undefined} onValueChange={setUserId}>
              <SelectTrigger aria-label="Team member to add">
                <SelectValue placeholder="Add a team member" />
              </SelectTrigger>
              <SelectContent>
                {available.map((m) => (
                  <SelectItem key={m.id} value={m.id}>
                    {m.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <div className="flex gap-2">
              <Input
                value={role}
                onChange={(e) => setRole(e.target.value)}
                placeholder="Role, e.g. Draftsman"
                aria-label="Role on this project"
                maxLength={60}
              />
              <Button type="submit" size="sm" disabled={addMember.isPending}>
                {addMember.isPending ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <UserPlus className="h-4 w-4" />
                )}
                <span className="sr-only sm:not-sr-only sm:ml-1.5">Add</span>
              </Button>
            </div>
          </form>
        ) : (
          <p className="border-t border-border/40 pt-3 text-xs text-muted-foreground">
            Everyone in your firm is on this project.
          </p>
        )}
      </CardContent>
    </Card>
  );
}
