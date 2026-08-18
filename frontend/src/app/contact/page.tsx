import { Container, Card } from "@/components/ui";
import { getSettings } from "@/lib/settings";

export const dynamic = "force-dynamic";

export default async function ContactPage() {
  const s = await getSettings();
  return (
    <Container className="py-10">
      <div className="mx-auto max-w-3xl">
        <h1 className="text-3xl font-bold tracking-tight text-ink-900">Contact us</h1>
        <p className="mt-2 text-ink-700/80">We&apos;d love to hear from you.</p>

        <div className="mt-8 grid gap-4 sm:grid-cols-3">
          <Card className="p-6 text-center">
            <div className="text-3xl">📞</div>
            <h2 className="mt-3 font-bold text-ink-900">Phone</h2>
            <p className="mt-1 text-sm text-ink-700/80">{s.phone}</p>
          </Card>
          <Card className="p-6 text-center">
            <div className="text-3xl">✉️</div>
            <h2 className="mt-3 font-bold text-ink-900">Email</h2>
            <p className="mt-1 text-sm text-ink-700/80">{s.email}</p>
          </Card>
          <Card className="p-6 text-center">
            <div className="text-3xl">📍</div>
            <h2 className="mt-3 font-bold text-ink-900">Location</h2>
            <p className="mt-1 text-sm text-ink-700/80">{s.address}</p>
          </Card>
        </div>

        <Card className="mt-8 p-6">
          <h2 className="font-bold text-ink-900">Send us a message</h2>
          <p className="mt-1 text-sm text-ink-700/80">
            Reach out via phone or email above, or visit us in store. We typically respond within one
            business day.
          </p>
        </Card>
      </div>
    </Container>
  );
}
