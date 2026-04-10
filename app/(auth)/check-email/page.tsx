import Link from "next/link";

export default async function CheckEmailPage({
  searchParams,
}: {
  searchParams: Promise<{ email?: string }>;
}) {
  const { email } = await searchParams;

  return (
    <div className="text-center">
      {/* Warm illustration */}
      <div className="mx-auto w-20 h-20 bg-sage/10 rounded-full flex items-center justify-center text-4xl mb-6">
        📬
      </div>

      <h1 className="font-display text-3xl font-bold text-dark mb-3">
        Check your inbox!
      </h1>

      <p className="text-dark/70 leading-relaxed mb-2">
        Click the link we sent to
      </p>
      {email && (
        <p className="font-bold text-sage text-sm mb-4 break-all">{email}</p>
      )}
      <p className="text-dark/70 text-sm leading-relaxed mb-8">
        to activate your account. It should arrive in the next minute or two.
        Check your spam folder if you don&apos;t see it.
      </p>

      <div className="bg-cream-dark rounded-2xl p-5 text-left mb-8">
        <p className="text-sm text-dark/70 leading-relaxed">
          <strong className="text-dark">Didn&apos;t get it?</strong> Wait a
          minute and check spam. If it&apos;s still not there, you can{" "}
          <Link href="/signup" className="text-sage font-semibold hover:underline">
            try signing up again
          </Link>{" "}
          or{" "}
          <Link href="/login" className="text-sage font-semibold hover:underline">
            go to login
          </Link>
          .
        </p>
      </div>

      <Link
        href="/"
        className="text-sm text-muted hover:text-dark transition-colors"
      >
        ← Back to Packet Day
      </Link>
    </div>
  );
}
