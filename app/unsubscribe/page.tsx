import { redirect } from "next/navigation";
import Link from "next/link";
import Wordmark from "@/components/layout/Wordmark";
import { verifyUnsubscribeToken, setMarketingOptOut } from "@/lib/unsubscribe";

function Shell({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center px-6 py-12 bg-cream">
      <Link href="/" className="mb-8">
        <Wordmark size="lg" />
      </Link>
      <div className="w-full max-w-sm bg-white rounded-2xl border border-border p-8 text-center">
        {children}
      </div>
    </div>
  );
}

function InvalidTokenView() {
  return (
    <Shell>
      <h1 className="font-display text-2xl font-bold text-dark mb-3">
        This link doesn&apos;t look right
      </h1>
      <p className="text-dark/70 text-sm leading-relaxed mb-6">
        We couldn&apos;t verify that link. If you meant to unsubscribe, reach out and we&apos;ll take care of it.
      </p>
      <a
        href="mailto:hello@packetday.com"
        className="text-sm font-semibold text-sage hover:underline"
      >
        hello@packetday.com
      </a>
    </Shell>
  );
}

function ResubscribedView() {
  return (
    <Shell>
      <h1 className="font-display text-2xl font-bold text-dark mb-3">
        You&apos;re back in
      </h1>
      <p className="text-dark/70 text-sm leading-relaxed">
        Good to have you. We&apos;ll keep sending our emails your way.
      </p>
    </Shell>
  );
}

function ConfirmedView({ action }: { action: () => Promise<void> }) {
  return (
    <Shell>
      <h1 className="font-display text-2xl font-bold text-dark mb-3">
        You&apos;re unsubscribed
      </h1>
      <p className="text-dark/70 text-sm leading-relaxed mb-6">
        You&apos;ll still get your packets by email.
      </p>
      <form action={action}>
        <button
          type="submit"
          className="text-sm font-semibold text-sage hover:underline"
        >
          Oops, keep me subscribed
        </button>
      </form>
    </Shell>
  );
}

function PromptView({ action }: { action: () => Promise<void> }) {
  return (
    <Shell>
      <h1 className="font-display text-2xl font-bold text-dark mb-3">
        Leaving our emails?
      </h1>
      <p className="text-dark/70 text-sm leading-relaxed mb-6">
        No hard feelings. One click and we&apos;ll stop sending tips and updates. You&apos;ll still hear from us the moment one of your packets is ready to print.
      </p>
      <form action={action}>
        <button
          type="submit"
          className="w-full bg-sage text-cream font-bold py-3.5 rounded-xl hover:bg-sage-dark transition-colors text-sm"
        >
          Unsubscribe me
        </button>
      </form>
    </Shell>
  );
}

export default async function UnsubscribePage({
  searchParams,
}: {
  searchParams: Promise<{ token?: string; status?: string }>;
}) {
  const { token, status } = await searchParams;
  const userId = token ? verifyUnsubscribeToken(token) : null;

  if (!userId || !token) {
    return <InvalidTokenView />;
  }

  async function unsubscribeAction() {
    "use server";
    const id = verifyUnsubscribeToken(token as string);
    if (!id) return;
    await setMarketingOptOut(id, true);
    redirect(`/unsubscribe?token=${encodeURIComponent(token as string)}&status=confirmed`);
  }

  async function resubscribeAction() {
    "use server";
    const id = verifyUnsubscribeToken(token as string);
    if (!id) return;
    await setMarketingOptOut(id, false);
    redirect(`/unsubscribe?token=${encodeURIComponent(token as string)}&status=resubscribed`);
  }

  if (status === "confirmed") {
    return <ConfirmedView action={resubscribeAction} />;
  }

  if (status === "resubscribed") {
    return <ResubscribedView />;
  }

  return <PromptView action={unsubscribeAction} />;
}
