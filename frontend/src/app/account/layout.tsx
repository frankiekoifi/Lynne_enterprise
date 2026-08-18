import { redirect } from "next/navigation";
import type { ReactNode } from "react";
import { Container } from "@/components/ui";
import { AccountNav } from "@/components/account-nav";
import { getCurrentUser } from "@/lib/session";
import { unreadCount } from "@/lib/data";

export const dynamic = "force-dynamic";

export default async function AccountLayout({ children }: { children: ReactNode }) {
  const user = await getCurrentUser();
  if (!user) redirect("/login?next=/account");
  const unread = await unreadCount(user.id);

  return (
    <Container className="py-8">
      <div className="grid gap-6 lg:grid-cols-[220px_1fr]">
        <AccountNav role={user.role} unread={unread} />
        <div className="min-w-0">{children}</div>
      </div>
    </Container>
  );
}
