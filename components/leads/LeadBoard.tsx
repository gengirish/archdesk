"use client";

import { useState } from "react";
import {
  DndContext,
  DragOverlay,
  KeyboardSensor,
  PointerSensor,
  TouchSensor,
  closestCorners,
  useDraggable,
  useDroppable,
  useSensor,
  useSensors,
  type DragEndEvent,
  type DragStartEvent,
} from "@dnd-kit/core";
import { CSS } from "@dnd-kit/utilities";
import { CalendarClock, GripVertical, Phone, Trophy, XCircle } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { cn, formatINRShort } from "@/lib/utils";
import {
  LEAD_STAGES,
  PIPELINE_STAGES,
  leadSourceLabel,
  leadStageLabel,
  type LeadStageValue,
} from "@/lib/validation/lead";
import type { LeadWithActivityLog } from "@/hooks/useLeads";
import {
  formatDay,
  formatPhone,
  isFollowUpOverdue,
  LEAD_STAGE_COLORS,
  projectTypeLabel,
} from "@/components/leads/lead-helpers";

type Props = {
  leads: LeadWithActivityLog[];
  onOpen: (lead: LeadWithActivityLog) => void;
  onMoveStage: (lead: LeadWithActivityLog, stage: LeadStageValue) => void;
};

export function LeadBoard({ leads, onOpen, onMoveStage }: Props) {
  const [activeId, setActiveId] = useState<string | null>(null);
  const sensors = useSensors(
    // Small distance so a click on the card still opens the drawer.
    useSensor(PointerSensor, { activationConstraint: { distance: 6 } }),
    // Long-press on touch so the board can still be scrolled sideways.
    useSensor(TouchSensor, { activationConstraint: { delay: 200, tolerance: 6 } }),
    useSensor(KeyboardSensor)
  );

  const activeLead = activeId ? leads.find((l) => l.id === activeId) ?? null : null;

  function handleDragStart(event: DragStartEvent) {
    setActiveId(String(event.active.id));
  }

  function handleDragEnd(event: DragEndEvent) {
    setActiveId(null);
    const target = event.over?.id as LeadStageValue | undefined;
    if (!target) return;
    const lead = leads.find((l) => l.id === event.active.id);
    if (lead && lead.stage !== target) onMoveStage(lead, target);
  }

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={closestCorners}
      onDragStart={handleDragStart}
      onDragEnd={handleDragEnd}
      onDragCancel={() => setActiveId(null)}
      accessibility={{
        announcements: {
          onDragStart: ({ active }) => `Picked up ${leadName(leads, active.id)}.`,
          onDragOver: ({ active, over }) =>
            over
              ? `${leadName(leads, active.id)} is over ${leadStageLabel(String(over.id))}.`
              : `${leadName(leads, active.id)} is no longer over a column.`,
          onDragEnd: ({ active, over }) =>
            over
              ? `${leadName(leads, active.id)} moved to ${leadStageLabel(String(over.id))}.`
              : `${leadName(leads, active.id)} was dropped outside the board.`,
          onDragCancel: ({ active }) => `Moving ${leadName(leads, active.id)} was cancelled.`,
        },
      }}
    >
      {/* Columns scroll inside this container so the page never scrolls sideways. */}
      <div className="-mx-1 overflow-x-auto px-1 pb-4">
        <div className="flex min-w-max gap-4">
          {PIPELINE_STAGES.map((stage) => {
            const stageLeads = leads.filter((l) => l.stage === stage);
            const value = stageLeads.reduce((s, l) => s + (l.budget ?? 0), 0);
            return (
              <StageColumn key={stage} stage={stage} count={stageLeads.length} value={value}>
                {stageLeads.map((lead) => (
                  <DraggableLeadCard
                    key={lead.id}
                    lead={lead}
                    onOpen={onOpen}
                    onMoveStage={onMoveStage}
                    hidden={lead.id === activeId}
                  />
                ))}
              </StageColumn>
            );
          })}
        </div>
      </div>

      <DragOverlay>
        {activeLead ? <LeadCardBody lead={activeLead} dragging /> : null}
      </DragOverlay>
    </DndContext>
  );
}

function leadName(leads: LeadWithActivityLog[], id: string | number) {
  return leads.find((l) => l.id === id)?.name ?? "lead";
}

function StageColumn({
  stage,
  count,
  value,
  children,
}: {
  stage: LeadStageValue;
  count: number;
  value: number;
  children: React.ReactNode;
}) {
  const { setNodeRef, isOver } = useDroppable({ id: stage });
  return (
    <section
      ref={setNodeRef}
      aria-label={`${leadStageLabel(stage)} column`}
      className={cn(
        "w-[260px] shrink-0 rounded-lg border border-transparent p-1.5 transition-colors",
        isOver && "border-primary/40 bg-primary/5"
      )}
    >
      <div className="mb-3 flex items-center justify-between gap-2 px-1">
        <div className="flex min-w-0 items-center gap-2">
          <span className="h-2 w-2 shrink-0 rounded-full" style={{ backgroundColor: LEAD_STAGE_COLORS[stage] }} />
          <span className="truncate text-xs font-medium">{leadStageLabel(stage)}</span>
        </div>
        <div className="flex items-center gap-1.5">
          {value > 0 ? (
            <span className="text-[10px] text-muted-foreground">{formatINRShort(value)}</span>
          ) : null}
          <Badge variant="secondary" className="text-[10px]">
            {count}
          </Badge>
        </div>
      </div>
      <div className="min-h-[96px] space-y-2">
        {children}
        {count === 0 ? (
          <div className="rounded-lg border border-dashed border-border/40 py-8 text-center">
            <p className="text-xs text-muted-foreground/60">Drop leads here</p>
          </div>
        ) : null}
      </div>
    </section>
  );
}

function DraggableLeadCard({
  lead,
  onOpen,
  onMoveStage,
  hidden,
}: {
  lead: LeadWithActivityLog;
  onOpen: (lead: LeadWithActivityLog) => void;
  onMoveStage: (lead: LeadWithActivityLog, stage: LeadStageValue) => void;
  hidden: boolean;
}) {
  const { attributes, listeners, setNodeRef, transform } = useDraggable({ id: lead.id });
  return (
    <div
      ref={setNodeRef}
      style={{ transform: CSS.Translate.toString(transform) }}
      className={cn(hidden && "opacity-30")}
    >
      <LeadCardBody
        lead={lead}
        onOpen={onOpen}
        onMoveStage={onMoveStage}
        handleProps={{ ...attributes, ...listeners }}
      />
    </div>
  );
}

function LeadCardBody({
  lead,
  onOpen,
  onMoveStage,
  handleProps,
  dragging,
}: {
  lead: LeadWithActivityLog;
  onOpen?: (lead: LeadWithActivityLog) => void;
  onMoveStage?: (lead: LeadWithActivityLog, stage: LeadStageValue) => void;
  handleProps?: React.HTMLAttributes<HTMLButtonElement>;
  dragging?: boolean;
}) {
  const followUpOverdue = isFollowUpOverdue(lead.followUpAt);
  return (
    <Card
      className={cn(
        "transition-colors hover:border-primary/30",
        dragging && "rotate-1 border-primary/40 shadow-lg"
      )}
    >
      <CardContent className="p-3">
        <div className="flex items-start gap-1.5">
          <button
            type="button"
            className="-ml-1 mt-0.5 cursor-grab touch-none rounded p-0.5 text-muted-foreground hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring active:cursor-grabbing"
            aria-label={`Drag ${lead.name} to another stage`}
            {...handleProps}
          >
            <GripVertical className="h-4 w-4" />
          </button>
          <button
            type="button"
            className="min-w-0 flex-1 text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            onClick={() => onOpen?.(lead)}
          >
            <span className="block truncate text-sm font-medium">{lead.name}</span>
            <span className="mt-1 flex items-center gap-1 text-xs text-muted-foreground">
              <Phone className="h-3 w-3" />
              {formatPhone(lead.phone)}
            </span>
          </button>
        </div>

        <div className="mt-2 flex items-center justify-between gap-2">
          {lead.projectType ? (
            <Badge variant="outline" className="text-[10px]">
              {projectTypeLabel(lead.projectType)}
            </Badge>
          ) : (
            <span />
          )}
          {lead.budget ? (
            <span className="text-xs font-medium text-muted-foreground">{formatINRShort(lead.budget)}</span>
          ) : null}
        </div>

        <div className="mt-1.5 flex flex-wrap items-center gap-x-2 text-[10px] text-muted-foreground/80">
          <span>via {leadSourceLabel(lead.source)}</span>
          {lead.followUpAt ? (
            <span className={cn("flex items-center gap-0.5", followUpOverdue && "font-medium text-destructive")}>
              <CalendarClock className="h-3 w-3" />
              {formatDay(lead.followUpAt)}
            </span>
          ) : null}
        </div>

        {onMoveStage ? (
          <div className="mt-2 flex items-center gap-1 border-t border-border/40 pt-2">
            <label className="sr-only" htmlFor={`stage-${lead.id}`}>
              Stage for {lead.name}
            </label>
            {/* Native select: keyboard/mobile fallback to drag-and-drop. */}
            <select
              id={`stage-${lead.id}`}
              value={lead.stage}
              onChange={(e) => onMoveStage(lead, e.target.value as LeadStageValue)}
              className="h-7 min-w-0 flex-1 rounded-md border border-input bg-background px-1.5 text-[11px] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            >
              {LEAD_STAGES.map((s) => (
                <option key={s} value={s}>
                  {leadStageLabel(s)}
                </option>
              ))}
            </select>
            <button
              type="button"
              onClick={() => onMoveStage(lead, "WON")}
              className="rounded p-1 text-muted-foreground hover:bg-secondary hover:text-[#3DD68C] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              aria-label={`Mark ${lead.name} as won`}
              title="Mark won"
            >
              <Trophy className="h-3.5 w-3.5" />
            </button>
            <button
              type="button"
              onClick={() => onMoveStage(lead, "LOST")}
              className="rounded p-1 text-muted-foreground hover:bg-secondary hover:text-destructive focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              aria-label={`Mark ${lead.name} as lost`}
              title="Mark lost"
            >
              <XCircle className="h-3.5 w-3.5" />
            </button>
          </div>
        ) : null}
      </CardContent>
    </Card>
  );
}
