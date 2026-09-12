"use client";

import Link from "next/link";
import { track } from "@vercel/analytics";
import type { ReactNode } from "react";

export function BottomCtaLink({
  href,
  theme,
  grade,
  className,
  children,
}: {
  href: string;
  theme: string;
  grade: string;
  className?: string;
  children: ReactNode;
}) {
  return (
    <Link
      href={href}
      className={className}
      onClick={() => {
        try {
          track("share_page_cta_click", { theme, grade });
        } catch {
          // Analytics must never block navigation to signup.
        }
      }}
    >
      {children}
    </Link>
  );
}
