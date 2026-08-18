import { Container, Card } from "@/components/ui";
import { Logo } from "@/components/logo";
import { RegisterForm } from "@/components/auth-forms";

export const metadata = { title: "Create account" };

export default async function RegisterPage({
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
          <h1 className="text-xl font-bold tracking-tight text-ink-900">Create your account</h1>
          <p className="mt-1 mb-6 text-sm text-ink-700/70">
            Track orders, manage Lipa Polepole plans and more.
          </p>
          <RegisterForm next={next} />
        </Card>
      </div>
    </Container>
  );
}
