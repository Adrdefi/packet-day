import type { Testimonial } from "@/lib/testimonials";

/**
 * One testimonial from lib/testimonials.ts. The plain card sits in a grid;
 * `featured` is the full width sage block. Used by the homepage and /sample.
 */
export default function TestimonialCard({ testimonial: t, featured = false }: { testimonial: Testimonial; featured?: boolean }) {
  if (featured) {
    return (
      <div className="bg-sage rounded-2xl p-8 md:p-10">
        <blockquote className="font-display text-xl md:text-2xl text-cream font-bold leading-snug mb-6">
          &ldquo;{t.quote}&rdquo;
        </blockquote>
        <div className="flex items-center gap-3">
          <div className="w-11 h-11 rounded-full bg-cream/20 flex items-center justify-center text-cream font-bold shrink-0">
            {t.name.charAt(0)}
          </div>
          <div>
            <div className="font-bold text-cream">{t.name}</div>
            <div className="text-cream/70 text-sm">{t.credential}</div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-2xl p-7 border border-border flex flex-col sm:[&:last-child:nth-child(odd)]:col-span-2">
      <p className="text-dark/80 text-sm leading-relaxed mb-6 flex-1">&ldquo;{t.quote}&rdquo;</p>
      <div className="flex items-center gap-3 mt-auto">
        <div className="w-10 h-10 rounded-full bg-sage flex items-center justify-center text-cream font-bold text-sm shrink-0">
          {t.name.charAt(0)}
        </div>
        <div>
          <div className="font-bold text-dark text-sm">{t.name}</div>
          <div className="text-muted text-xs">{t.credential}</div>
        </div>
      </div>
    </div>
  );
}
