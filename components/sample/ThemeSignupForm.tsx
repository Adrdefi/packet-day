"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { cleanThemeParam } from "@/lib/themeParam";
import { sampleSignupHref } from "@/lib/sample/links";

/** Longest theme shown inside the button before it is shortened. */
const BUTTON_THEME_MAX = 28;

interface Props {
  /** The ?from= value for signup tracking, e.g. "sample-hero". */
  from: string;
  inputId: string;
  /** "Free is 1 packet a month. No card needed." Left out where a full pricing line follows. */
  freeLine?: string;
  align?: "left" | "center";
}

/** "What is your kid obsessed with?" box plus a signup button that carries the theme. */
export default function ThemeSignupForm({ from, inputId, freeLine, align = "left" }: Props) {
  const router = useRouter();
  const [theme, setTheme] = useState("");
  const cleaned = cleanThemeParam(theme);
  const shown =
    cleaned && cleaned.length > BUTTON_THEME_MAX ? `${cleaned.slice(0, BUTTON_THEME_MAX).trim()}…` : cleaned;

  return (
    <form
      // Without JavaScript this still lands on signup with the tracking value.
      action="/signup"
      method="get"
      onSubmit={(e) => {
        e.preventDefault();
        router.push(sampleSignupHref(from, theme));
      }}
      className={align === "center" ? "mx-auto max-w-md text-center" : "max-w-md"}
    >
      <input type="hidden" name="from" value={from} />
      <label htmlFor={inputId} className="block font-display text-xl font-bold text-dark mb-2">
        What is your kid obsessed with?
      </label>
      <input
        id={inputId}
        type="text"
        value={theme}
        onChange={(e) => setTheme(e.target.value)}
        maxLength={120}
        autoComplete="off"
        placeholder="dinosaurs, volcanoes, garbage trucks..."
        className="w-full rounded-xl border border-border bg-white px-4 py-3.5 text-base text-dark placeholder:text-muted focus:outline-none focus:ring-2 focus:ring-sage focus:border-sage"
      />
      <button
        type="submit"
        className="mt-3 w-full rounded-full bg-sage px-8 py-4 text-base font-bold text-cream shadow-sm transition-colors hover:bg-sage-dark break-words"
      >
        {shown ? `Make a free ${shown} packet` : "Make one for your kid, free"}
      </button>
      {freeLine && <p className="mt-3 text-sm font-semibold text-sage-dark">{freeLine}</p>}
    </form>
  );
}
