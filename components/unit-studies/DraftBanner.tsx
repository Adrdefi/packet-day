/** Shown at the top of a draft unit study page. Drafts only exist outside production. */
export default function DraftBanner() {
  return (
    <div className="bg-honey px-4 py-2 text-center text-sm font-bold text-dark">
      Draft preview. This page is not live, and search engines are told to skip it.
    </div>
  );
}
