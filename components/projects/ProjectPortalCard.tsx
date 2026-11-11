"use client";

import { useEffect, useState } from "react";
import { Copy, ExternalLink, Loader2, Lock, RefreshCw } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { useRegeneratePortalToken } from "@/hooks/useProjects";

type Props = {
  projectId: string;
  clientToken: string;
  canUsePortal: boolean;
};

/** The client's no-login portal link, with copy / open / regenerate. */
export function ProjectPortalCard({ projectId, clientToken, canUsePortal }: Props) {
  const [origin, setOrigin] = useState("");
  const [confirmOpen, setConfirmOpen] = useState(false);
  const regenerate = useRegeneratePortalToken(projectId);
  useEffect(() => setOrigin(window.location.origin), []);
  const url = origin ? `${origin}/portal/${clientToken}` : "";

  async function copy(link = url) {
    try {
      await navigator.clipboard.writeText(link);
      toast.success("Portal link copied");
    } catch {
      toast.error("Couldn't copy. Select the link and copy it manually.");
    }
  }

  function rotate() {
    regenerate.mutate(undefined, {
      onSuccess: () => {
        setConfirmOpen(false);
        toast.success("New portal link created. The old link no longer works.");
      },
      onError: (err) => toast.error(err instanceof Error ? err.message : "Failed to regenerate link"),
    });
  }

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-sm font-medium">Client portal</CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        {canUsePortal ? (
          <>
            <p className="text-xs text-muted-foreground">
              Share this link with the client. They can follow progress, see approved drawings and
              respond to decisions without creating an account.
            </p>
            <Input
              readOnly
              value={url}
              aria-label="Client portal link"
              onFocus={(e) => e.currentTarget.select()}
              className="font-mono text-xs"
            />
            <div className="flex flex-wrap gap-2">
              <Button size="sm" variant="outline" onClick={() => copy()} disabled={!url}>
                <Copy className="mr-1.5 h-4 w-4" />
                Copy
              </Button>
              <Button size="sm" variant="outline" asChild>
                <a href={url || "#"} target="_blank" rel="noopener noreferrer">
                  <ExternalLink className="mr-1.5 h-4 w-4" />
                  Open
                </a>
              </Button>
              <Button size="sm" variant="ghost" onClick={() => setConfirmOpen(true)}>
                <RefreshCw className="mr-1.5 h-4 w-4" />
                Regenerate link
              </Button>
            </div>
          </>
        ) : (
          <p className="flex items-start gap-2 text-xs text-muted-foreground">
            <Lock className="mt-0.5 h-3.5 w-3.5 shrink-0" />
            The client portal is part of the Enterprise plan.
          </p>
        )}
      </CardContent>

      <Dialog open={confirmOpen} onOpenChange={setConfirmOpen}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle>Regenerate portal link?</DialogTitle>
            <DialogDescription>
              The current link stops working right away. Anyone who has it, including your client,
              will need the new link.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="gap-2 sm:gap-0">
            <Button variant="outline" onClick={() => setConfirmOpen(false)}>
              Cancel
            </Button>
            <Button variant="destructive" onClick={rotate} disabled={regenerate.isPending}>
              {regenerate.isPending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
              Regenerate
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Card>
  );
}
