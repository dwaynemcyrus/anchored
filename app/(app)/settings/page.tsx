export default function SettingsPage() {
  return (
    <div className="flex flex-col h-full overflow-hidden">
      <div className="px-4 pt-4 md:px-6 md:pt-6">
        <h1 className="text-2xl font-semibold">Settings</h1>
        <p className="text-muted-foreground">
          Configure your Anchored experience.
        </p>
      </div>

      <div className="flex-1 overflow-y-auto px-4 pb-6 md:px-6">
        <div className="space-y-6 pt-6">
          <div>
            <a href="/tasks" className="text-sm underline">
              Tasks
            </a>
          </div>
          <div className="rounded-lg border border-dashed p-8 text-center text-muted-foreground">
            Settings coming soon
          </div>
        </div>
      </div>
    </div>
  );
}
