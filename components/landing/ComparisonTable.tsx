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
 * Two-column comparison (a plain "them" column and a sage "us" column).
 * A real <table> from md up; below that each row becomes its own card, so
 * nothing ever scrolls sideways on a phone. Data-driven, no page copy here.
 */
export default function ComparisonTable({ freeHeading, packetDayHeading, rows }: Props) {
  return (
    <>
      <div className="hidden md:block overflow-hidden rounded-2xl border border-border bg-white shadow-sm">
        <table className="w-full text-left">
          <thead>
            <tr>
              <th scope="col" className="w-1/4 px-6 py-5">
                <span className="sr-only">What you get</span>
              </th>
              <th scope="col" className="w-[37.5%] bg-paper px-6 py-5 font-display text-lg font-bold text-dark">
                {freeHeading}
              </th>
              <th scope="col" className="w-[37.5%] bg-sage px-6 py-5 font-display text-lg font-bold text-cream">
                {packetDayHeading}
              </th>
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => (
              <tr key={row.label} className="border-t border-border">
                <th scope="row" className="px-6 py-4 align-top text-sm font-bold text-dark">
                  {row.label}
                </th>
                <td className="bg-paper px-6 py-4 align-top text-base leading-relaxed text-dark/70">{row.free}</td>
                <td className="bg-sage/10 px-6 py-4 align-top text-base font-semibold leading-relaxed text-dark">
                  {row.packetDay}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <ul className="space-y-4 md:hidden">
        {rows.map((row) => (
          <li key={row.label} className="overflow-hidden rounded-2xl border border-border bg-white shadow-sm">
            <h3 className="px-5 pt-5 pb-3 font-display text-lg font-bold text-dark">{row.label}</h3>
            <div className="bg-paper px-5 py-3">
              <p className="text-xs font-bold uppercase tracking-wide text-dark/50">{freeHeading}</p>
              <p className="text-base leading-relaxed text-dark/70">{row.free}</p>
            </div>
            <div className="bg-sage/10 px-5 py-3">
              <p className="text-xs font-bold uppercase tracking-wide text-sage-dark">{packetDayHeading}</p>
              <p className="text-base font-semibold leading-relaxed text-dark">{row.packetDay}</p>
            </div>
          </li>
        ))}
      </ul>
    </>
  );
}
