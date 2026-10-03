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

function CheckIcon() {
  return (
    <svg
      viewBox="0 0 20 20"
      fill="none"
      stroke="currentColor"
      strokeWidth="2.5"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      className="mt-1 h-5 w-5 shrink-0 text-sage"
    >
      <path d="M4.5 10.5l3.5 3.5 7.5-8" />
    </svg>
  );
}

function XIcon() {
  return (
    <svg
      viewBox="0 0 20 20"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      aria-hidden="true"
      className="mt-1 h-4 w-4 shrink-0 text-muted"
    >
      <path d="M5.5 5.5l9 9M14.5 5.5l-9 9" />
    </svg>
  );
}

function FreeValue({ text }: { text: string }) {
  return (
    <span className="flex items-start gap-2.5 text-base leading-relaxed text-dark/70">
      <XIcon />
      <span>{text}</span>
    </span>
  );
}

function PacketDayValue({ text }: { text: string }) {
  return (
    <span className="flex items-start gap-2.5 text-lg font-bold leading-snug text-dark">
      <CheckIcon />
      <span>{text}</span>
    </span>
  );
}

/**
 * Light, friendly two-column comparison: the "them" side on cream-deep with
 * a muted x, the Packet Day side on the soft sage tint (sage/10) with a sage
 * check. A real <table> from md up; below that each row is its own card with
 * one shared legend above the list instead of repeated column labels (each
 * card keeps screen-reader-only labels). Data-driven, no page copy here.
 */
export default function ComparisonTable({ freeHeading, packetDayHeading, rows }: Props) {
  return (
    <>
      <div className="hidden md:block overflow-hidden rounded-2xl border border-sage/20 bg-white shadow-sm">
        <table className="w-full text-left">
          <thead>
            <tr>
              <th scope="col" className="w-1/4 bg-white px-6 py-5">
                <span className="sr-only">What you get</span>
              </th>
              <th scope="col" className="w-[37.5%] bg-cream-deep px-6 py-5 font-display text-xl font-bold text-dark">
                {freeHeading}
              </th>
              <th scope="col" className="w-[37.5%] bg-sage px-6 py-5 font-display text-xl font-bold text-cream">
                {packetDayHeading}
              </th>
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => (
              <tr key={row.label} className="border-t border-sage/20">
                <th scope="row" className="bg-white px-6 py-5 align-top font-display text-base font-bold text-dark">
                  {row.label}
                </th>
                <td className="bg-cream-deep px-6 py-5 align-top">
                  <FreeValue text={row.free} />
                </td>
                <td className="bg-sage/10 px-6 py-5 align-top">
                  <PacketDayValue text={row.packetDay} />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="md:hidden">
        <p className="mb-4 flex flex-wrap items-center justify-center gap-x-6 gap-y-2 text-sm text-dark/70" aria-hidden="true">
          <span className="flex items-center gap-2">
            <XIcon />
            {freeHeading}
          </span>
          <span className="flex items-center gap-2 font-bold text-dark">
            <CheckIcon />
            {packetDayHeading}
          </span>
        </p>
        <ul className="space-y-4">
          {rows.map((row) => (
            <li key={row.label} className="overflow-hidden rounded-2xl border border-sage/20 bg-white shadow-sm">
              <h3 className="px-5 pt-4 pb-3 font-display text-lg font-bold text-dark">{row.label}</h3>
              <div className="bg-cream-deep px-5 py-3">
                <span className="sr-only">{freeHeading}: </span>
                <FreeValue text={row.free} />
              </div>
              <div className="bg-sage/10 px-5 py-3.5">
                <span className="sr-only">{packetDayHeading}: </span>
                <PacketDayValue text={row.packetDay} />
              </div>
            </li>
          ))}
        </ul>
      </div>
    </>
  );
}
