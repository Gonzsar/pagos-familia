export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <main className="flex min-h-screen items-center justify-center bg-slate-50 dark:bg-slate-900 p-4">
      {children}
    </main>
  );
}
