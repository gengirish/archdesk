"use client";

/* eslint-disable @next/next/no-img-element -- Blob-hosted user photos; next/image remotePatterns don't cover them. */
import { useState } from "react";
import { ChevronLeft, ChevronRight, ExternalLink } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";

type Props = { photos: string[]; label?: string };

/** Thumbnail strip; clicking a thumbnail opens a larger view with prev/next. */
export function PhotoGrid({ photos, label = "Site photo" }: Props) {
  const [index, setIndex] = useState<number | null>(null);
  if (photos.length === 0) return null;
  const current = index === null ? null : photos[index];
  const step = (d: number) =>
    setIndex((i) => (i === null ? i : (i + d + photos.length) % photos.length));

  return (
    <>
      <ul className="mt-3 grid grid-cols-3 gap-2 sm:grid-cols-4 md:grid-cols-6">
        {photos.map((url, i) => (
          <li key={url}>
            <button
              type="button"
              onClick={() => setIndex(i)}
              className="relative block aspect-square w-full overflow-hidden rounded-md bg-muted ring-1 ring-border focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              aria-label={`Open ${label.toLowerCase()} ${i + 1} of ${photos.length}`}
            >
              <img
                src={url}
                alt={`${label} ${i + 1}`}
                loading="lazy"
                className="h-full w-full object-cover transition-transform hover:scale-105"
              />
            </button>
          </li>
        ))}
      </ul>

      <Dialog open={index !== null} onOpenChange={(o) => !o && setIndex(null)}>
        <DialogContent
          className="max-w-4xl p-2 sm:p-4"
          onKeyDown={(e) => {
            if (e.key === "ArrowRight") step(1);
            if (e.key === "ArrowLeft") step(-1);
          }}
        >
          <DialogTitle className="sr-only">
            {label} {index !== null ? index + 1 : ""} of {photos.length}
          </DialogTitle>
          {current && (
            <div className="space-y-2">
              <img
                src={current}
                alt={`${label} ${(index ?? 0) + 1}`}
                className="mx-auto max-h-[75vh] w-auto rounded-md object-contain"
              />
              <div className="flex items-center justify-between gap-2">
                <div className="flex gap-1">
                  {photos.length > 1 && (
                    <>
                      <Button size="icon" variant="outline" onClick={() => step(-1)} aria-label="Previous photo">
                        <ChevronLeft className="h-4 w-4" />
                      </Button>
                      <Button size="icon" variant="outline" onClick={() => step(1)} aria-label="Next photo">
                        <ChevronRight className="h-4 w-4" />
                      </Button>
                    </>
                  )}
                </div>
                <span className="text-xs text-muted-foreground">
                  {(index ?? 0) + 1} / {photos.length}
                </span>
                <Button size="sm" variant="ghost" asChild>
                  <a href={current} target="_blank" rel="noopener noreferrer">
                    <ExternalLink className="mr-1.5 h-4 w-4" />
                    Full size
                  </a>
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </>
  );
}
