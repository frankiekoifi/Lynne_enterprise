import { SettingsForm } from "@/components/admin/settings-form";
import { getSettings } from "@/lib/settings";

export const dynamic = "force-dynamic";

export default async function AdminSettingsPage() {
  const settings = await getSettings();
  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold tracking-tight text-ink-900">Settings</h1>
      <p className="text-sm text-ink-700/80">
        Everything is configurable — nothing is hardcoded into the storefront.
      </p>
      <SettingsForm settings={settings} />
    </div>
  );
}
