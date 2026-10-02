"use client";

import { useEffect, useRef, useState } from "react";
import Image from "next/image";

export interface LightboxPage {
  src: string;
  alt: string;
  label: string;
}

interface Props {
  page: LightboxPage | null;
  width: number;
  height: number;
  onClose: () => void;
}

/**
 * One packet page at full size, in a native <dialog> so Escape, focus and the
 * backdrop come from the browser. A whole page fit to a phone is too small to
 * read, so tapping the page (or the zoom button) doubles it and the box scrolls.
 */
export default function PageLightbox({ page, width, height, onClose }: Props) {
  const dialogRef = useRef<HTMLDialogElement>(null);
  const [zoomed, setZoomed] = useState(false);

  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return;
    if (page && !dialog.open) {
      dialog.showModal();
      document.documentElement.classList.add("overflow-hidden");
    } else if (!page && dialog.open) {
      dialog.close();
    }
  }, [page]);

  function handleClose() {
    document.documentElement.classList.remove("overflow-hidden");
    setZoomed(false);
    onClose();
  }

  return (
    <dialog
      ref={dialogRef}
      onClose={handleClose}
      onClick={(e) => {
        // A tap on the dark backdrop (the dialog itself, not its content) closes it.
        if (e.target === e.currentTarget) dialogRef.current?.close();
      }}
      aria-label={page ? page.label : "Packet page"}
      className="m-0 h-dvh max-h-none w-screen max-w-none bg-transparent p-0 backdrop:bg-dark/80 md:m-auto md:h-[92vh] md:w-[min(48rem,92vw)]"
    >
      {page && (
        <div className="flex h-full flex-col bg-cream md:rounded-xl md:overflow-hidden">
          <div className="flex shrink-0 items-center justify-between gap-3 border-b border-border bg-white px-4 py-3">
            <p className="min-w-0 truncate text-sm font-bold text-sage-dark">{page.label}</p>
            <div className="flex shrink-0 gap-2">
              <button
                type="button"
                onClick={() => setZoomed((z) => !z)}
                className="rounded-full border border-border px-4 py-2 text-sm font-bold text-sage hover:border-sage"
              >
                {zoomed ? "Zoom out" : "Zoom in"}
              </button>
              <button
                type="button"
                onClick={() => dialogRef.current?.close()}
                className="rounded-full bg-sage px-4 py-2 text-sm font-bold text-cream hover:bg-sage-dark"
                autoFocus
              >
                Close
              </button>
            </div>
          </div>
          <div className="min-h-0 flex-1 overflow-auto overscroll-contain p-2 md:p-4">
            <button
              type="button"
              onClick={() => setZoomed((z) => !z)}
              aria-label={zoomed ? "Zoom out" : "Zoom in"}
              className={`block ${zoomed ? "w-[200%] max-w-none cursor-zoom-out md:w-[160%]" : "mx-auto w-full cursor-zoom-in"}`}
            >
              <Image
                src={page.src}
                alt={page.alt}
                width={width}
                height={height}
                sizes={zoomed ? "200vw" : "(min-width: 768px) 736px, 100vw"}
                className="h-auto w-full rounded-md border border-dark/10 bg-white"
              />
            </button>
          </div>
        </div>
      )}
    </dialog>
  );
}
