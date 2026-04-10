import AuthLeftPanel from "@/components/auth/AuthLeftPanel";

export default function AuthLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-screen flex">
      <AuthLeftPanel />
      <div className="flex-1 flex flex-col items-center justify-center px-6 py-12 bg-cream">
        <div className="w-full max-w-sm">{children}</div>
      </div>
    </div>
  );
}
