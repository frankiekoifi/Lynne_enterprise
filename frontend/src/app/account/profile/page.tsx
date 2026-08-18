import { Card } from "@/components/ui";
import { ProfileForm } from "@/components/account-forms";
import { getCurrentUser } from "@/lib/session";

export const dynamic = "force-dynamic";

export default async function ProfilePage() {
  const user = (await getCurrentUser())!;
  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold tracking-tight text-ink-900">Profile & settings</h1>
      <Card className="p-6">
        <ProfileForm user={user} />
      </Card>
    </div>
  );
}
