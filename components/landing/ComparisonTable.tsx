interface Row {
  label: string;
  free: string;
  packetDay: string;
}

interface Props {
  freeHeading: string;
  packetDayHeading: string;
  rows: Row[];
}

/**
 * Two-column comparison: a plain "them" column on cream-deep and a solid
 * sage "us" column, the same solid sage the site uses for highlighted
 * cards (the Unlimited pricing card, the featured testimonial). A real
 * <table> from md up; below that each row becomes its own card, so nothing
 * ever scrolls sideways on a phone. Text on sage is full strength cream
 * (cream/90 and below miss WCAG AA there). Data-driven, no page copy here.
 */
export default function ComparisonTable({ freeHeading, packetDayHeading, rows }: Props) {
  return (
    <>
      <div className="hidden md:block overflow-hidden rounded-2xl border-2 border-sage bg-white shadow-sm">
        <table className="w-full text-left">
          <thead>
            <tr>
              <th scope="col" className="w-1/4 border-b-2 border-sage bg-white px-6 py-5">
                <span className="sr-only">What you get</span>
              </th>
              <th
                scope="col"
                className="w-[37.5%] border-b-2 border-sage bg-cream-deep px-6 py-5 font-display text-xl font-bold text-dark"
              >
                {freeHeading}
              </th>
              <th
                scope="col"
                className="w-[37.5%] border-b-2 border-sage bg-sage-dark px-6 py-5 font-display text-xl font-bold text-cream"
              >
                {packetDayHeading}
              </th>
            </tr>
          </thead>
          <tbody>
            {rows.map((row, i) => (
              <tr key={row.label} className={i > 0 ? "border-t border-border" : undefined}>
                <th scope="row" className="bg-white px-6 py-4 align-top text-sm font-bold text-dark">
                  {row.label}
                </th>
                <td className="bg-cream-deep px-6 py-4 align-top text-base leading-relaxed text-dark/70">
                  {row.free}
                </td>
                <td
                  className={`bg-sage px-6 py-4 align-top text-base font-semibold leading-relaxed text-cream ${
                    i > 0 ? "border-t border-sage-dark/40" : ""
                  }`}
                >
                  {row.packetDay}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <ul className="space-y-4 md:hidden">
        {rows.map((row) => (
          <li key={row.label} className="overflow-hidden rounded-2xl border-2 border-sage bg-white shadow-sm">
            <h3 className="border-b border-border px-5 pt-4 pb-3 font-display text-lg font-bold text-dark">
              {row.label}
            </h3>
            <div className="bg-cream-deep px-5 py-3">
              <p className="text-xs font-bold uppercase tracking-wide text-dark/70">{freeHeading}</p>
              <p className="text-base leading-relaxed text-dark/70">{row.free}</p>
            </div>
            <div className="bg-sage px-5 py-3">
              <p className="text-xs font-bold uppercase tracking-wide text-cream">{packetDayHeading}</p>
              <p className="text-base font-semibold leading-relaxed text-cream">{row.packetDay}</p>
            </div>
          </li>
        ))}
      </ul>
    </>
  );
}
