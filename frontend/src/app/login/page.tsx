import { Container, Card } from "@/components/ui";
import { Logo } from "@/components/logo";
import { LoginForm } from "@/components/auth-forms";

export const metadata = { title: "Sign in" };

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const sp = await searchParams;
  const next = Array.isArray(sp.next) ? sp.next[0] : sp.next;
  return (
    <Container className="flex justify-center py-12">
      <div className="w-full max-w-md">
        <div className="mb-6 flex justify-center">
          <Logo />
        </div>
        <Card className="p-6 sm:p-8">
          <h1 className="text-xl font-bold tracking-tight text-ink-900">Welcome back</h1>
          <p className="mt-1 mb-6 text-sm text-ink-700/70">Sign in to continue to your account.</p>
          <LoginForm next={next} />
        </Card>
      </div>
    </Container>
  );
}
