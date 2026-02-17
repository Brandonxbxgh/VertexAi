import { SettingsPanel } from "@/components/SettingsPanel";

export default function SettingsPage() {
  return (
    <div className="min-h-screen">
      <header className="border-b border-zinc-800 bg-zinc-900/50 px-8 py-5">
        <h1 className="text-xl font-semibold">Settings</h1>
        <p className="text-sm text-zinc-500">Bot configuration and wallet</p>
      </header>
      <div className="mx-auto max-w-2xl px-8 py-8">
        <SettingsPanel />
      </div>
    </div>
  );
}
