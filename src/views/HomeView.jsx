import React from 'react';

export function HomeView() {
  return (
    <div className="p-8 max-w-4xl mx-auto flex flex-col gap-8">
      <header className="mb-4">
        <h2 className="text-3xl font-bold tracking-tight">Welcome to TaskCatch</h2>
        <p className="text-muted-foreground mt-2 text-lg">
          Your frictionless, system-wide AI task extractor.
        </p>
      </header>

      <section className="bg-card border border-border rounded-xl p-6 shadow-sm">
        <h3 className="text-xl font-semibold mb-4">How it works</h3>
        <ol className="list-decimal list-inside space-y-3 text-muted-foreground">
          <li>Highlight any text in any application on your computer.</li>
          <li>Press the global hotkey (<kbd className="bg-muted text-muted-foreground px-2 py-1 rounded-md text-sm font-mono border border-border">Ctrl + Shift + T</kbd>).</li>
          <li>TaskCatch grabs the text, sends it to the AI, and formats it as an action item.</li>
          <li>Check the <strong>Captured Tasks</strong> tab to see your extracted notes.</li>
        </ol>
      </section>

      <section className="bg-card border border-border rounded-xl p-6 shadow-sm">
        <h3 className="text-xl font-semibold mb-4">Getting Started</h3>
        <p className="text-muted-foreground mb-4">
          Before you begin, you need to configure your AI provider (e.g. Groq) API Key.
        </p>
        <p className="text-sm">
          Head over to the Settings tab to securely input your API key.
        </p>
      </section>
    </div>
  );
}
