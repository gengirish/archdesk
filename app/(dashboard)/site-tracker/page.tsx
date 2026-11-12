"use client";

import { useState } from "react";
import { AlertTriangle, Camera, Cloud, HardHat, Loader2, Plus } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { formatDate, STAGE_LABELS } from "@/lib/utils";
import { FeatureGate } from "@/components/feature-gate";
import { usePlan } from "@/hooks/usePlan";
import { useAllSiteIssues, useAllSiteUpdates } from "@/hooks/useSiteTracker";
import { useProjects } from "@/hooks/useProjects";
import { isActiveIssue } from "@/lib/validation/site-issue";
import { LogUpdateDialog } from "@/components/site-tracker/LogUpdateDialog";
import { ReportIssueDialog } from "@/components/site-tracker/ReportIssueDialog";
import { IssueList } from "@/components/site-tracker/IssueList";
import { PhotoGrid } from "@/components/site-tracker/PhotoGrid";

function initials(name: string | undefined) {
  if (!name) return "?";
  return (
    name
      .split(" ")
      .filter(Boolean)
      .slice(0, 2)
      .map((w) => w[0]?.toUpperCase())
      .join("") || "?"
  );
}

export default function SiteTrackerPage() {
  const { plan } = usePlan();
  const [logUpdateOpen, setLogUpdateOpen] = useState(false);
  const [reportIssueOpen, setReportIssueOpen] = useState(false);
  const { data: projects } = useProjects();
  const { updates, isLoading } = useAllSiteUpdates();
  const { issues, isLoading: issuesLoading } = useAllSiteIssues();
  const projectOptions = (projects ?? []).map((p) => ({ id: p.id, name: p.name }));
  const openCount = issues.filter((i) => isActiveIssue(i.status)).length;

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <FeatureGate feature="site_tracker" plan={plan}>
      <div className="space-y-6">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="min-w-0">
            <h1 className="text-2xl font-medium tracking-tight">Site Tracker</h1>
            <p className="mt-1 text-sm text-muted-foreground">Daily progress logs and issue tracking</p>
          </div>
          <div className="flex flex-wrap gap-2">
            <Button variant="outline" onClick={() => setReportIssueOpen(true)}>
              <AlertTriangle className="mr-2 h-4 w-4" />
              Report issue
            </Button>
            <Button onClick={() => setLogUpdateOpen(true)}>
              <Plus className="mr-2 h-4 w-4" />
              Log Update
            </Button>
          </div>
        </div>

        <LogUpdateDialog open={logUpdateOpen} onOpenChange={setLogUpdateOpen} projects={projectOptions} />
        <ReportIssueDialog open={reportIssueOpen} onOpenChange={setReportIssueOpen} projects={projectOptions} />

        <div className="grid gap-6 lg:grid-cols-3">
          {/* Updates timeline */}
          <section className="min-w-0 space-y-4 lg:col-span-2" aria-labelledby="updates-heading">
            <h2 id="updates-heading" className="text-sm font-medium text-muted-foreground">
              Recent Updates
            </h2>
            {updates.length === 0 ? (
              <Card>
                <CardContent className="flex flex-col items-center gap-2 p-10 text-center">
                  <Camera className="h-10 w-10 text-muted-foreground/60" aria-hidden />
                  <p className="text-sm font-medium">No site updates yet</p>
                  <p className="max-w-sm text-xs text-muted-foreground">
                    Log daily progress with notes and photos. Updates show here and on the client portal.
                  </p>
                  <Button size="sm" className="mt-2" onClick={() => setLogUpdateOpen(true)} disabled={projectOptions.length === 0}>
                    <Plus className="mr-1.5 h-4 w-4" />
                    Log first update
                  </Button>
                  {projectOptions.length === 0 && (
                    <p className="text-xs text-muted-foreground">Create a project first.</p>
                  )}
                </CardContent>
              </Card>
            ) : (
              updates.map((update) => {
                const userName = update.user?.name || "Unknown";
                const stageLabel = update.milestone ? STAGE_LABELS[update.milestone] ?? update.milestone : null;
                return (
                  <Card key={update.id}>
                    <CardContent className="p-4 sm:p-5">
                      <div className="flex items-start gap-3">
                        <Avatar className="h-8 w-8 shrink-0">
                          <AvatarFallback className="bg-primary/10 text-[10px] text-primary">
                            {initials(update.user?.name)}
                          </AvatarFallback>
                        </Avatar>
                        <div className="min-w-0 flex-1">
                          <div className="flex flex-wrap items-center gap-x-2">
                            <span className="text-sm font-medium">{userName}</span>
                            <span className="text-xs text-muted-foreground">&middot;</span>
                            <time dateTime={update.createdAt} className="text-xs text-muted-foreground">
                              {formatDate(update.createdAt)}
                            </time>
                          </div>
                          <Badge variant="outline" className="mt-1 max-w-full truncate text-[10px]">
                            {update.projectName}
                          </Badge>
                          {update.note && (
                            <p className="mt-2 whitespace-pre-line break-words text-sm leading-relaxed text-muted-foreground">
                              {update.note}
                            </p>
                          )}
                          <PhotoGrid photos={update.photos} />
                          <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-muted-foreground">
                            <span className="flex items-center gap-1">
                              <Camera className="h-3 w-3" aria-hidden />
                              {update.photos.length} {update.photos.length === 1 ? "photo" : "photos"}
                            </span>
                            {update.weather && (
                              <span className="flex items-center gap-1">
                                <Cloud className="h-3 w-3" aria-hidden />
                                {update.weather}
                              </span>
                            )}
                            {stageLabel && (
                              <span className="flex items-center gap-1">
                                <HardHat className="h-3 w-3" aria-hidden />
                                {stageLabel}
                              </span>
                            )}
                          </div>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                );
              })
            )}
          </section>

          {/* Issues */}
          <section className="min-w-0 space-y-4" aria-labelledby="issues-heading">
            <div className="flex items-center justify-between">
              <h2 id="issues-heading" className="text-sm font-medium text-muted-foreground">
                Open Issues
              </h2>
              <Badge variant={openCount > 0 ? "destructive" : "secondary"} className="text-[10px]">
                {openCount}
              </Badge>
            </div>
            {issuesLoading ? (
              <div className="flex justify-center py-6">
                <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
              </div>
            ) : (
              <IssueList issues={issues} onReport={() => setReportIssueOpen(true)} />
            )}
          </section>
        </div>
      </div>
    </FeatureGate>
  );
}
