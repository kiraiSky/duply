import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "PipeMirror",
  description: "Clone Pipedrive CRM setups in seconds",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="pt">
      <body className="min-h-screen bg-gray-50 text-gray-900">
        <header className="border-b bg-white px-6 py-4 flex items-center gap-4">
          <span className="text-xl font-bold text-blue-600">PipeMirror</span>
          <nav className="flex items-center gap-4 text-sm text-gray-500 ml-2">
            <a href="/export" className="hover:text-gray-900 transition">Exportar</a>
            <a href="/templates" className="hover:text-gray-900 transition">Templates</a>
            <a href="/clone" className="hover:text-gray-900 transition">Clonar</a>
          </nav>
        </header>
        <main className="max-w-3xl mx-auto px-4 py-10">{children}</main>
      </body>
    </html>
  );
}
