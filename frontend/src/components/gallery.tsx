"use client";

import { useState } from "react";
import { cn } from "@/lib/utils";

export function Gallery({ images, name }: { images: string[]; name: string }) {
  const [index, setIndex] = useState(0);
  const imgs = images.length ? images : [""];
  return (
    <div>
      <div className="aspect-[4/3] overflow-hidden rounded-2xl border border-ink-100 bg-ink-100">
        {imgs[index] ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={imgs[index]} alt={name} className="size-full object-cover" />
        ) : (
          <div className="grid size-full place-items-center text-6xl">🛍️</div>
        )}
      </div>
      {imgs.length > 1 && (
        <div className="mt-3 flex gap-2 overflow-x-auto pb-1">
          {imgs.map((src, i) => (
            <button
              key={i}
              onClick={() => setIndex(i)}
              className={cn(
                "size-16 shrink-0 overflow-hidden rounded-lg border-2 transition",
                i === index ? "border-brand-600" : "border-transparent opacity-70 hover:opacity-100",
              )}
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={src} alt="" className="size-full object-cover" />
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
