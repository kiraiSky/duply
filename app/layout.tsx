import type { Metadata } from "next";
import "./globals.css";
import { Sidebar } from "./components/Sidebar";

export const metadata: Metadata = {
  title: "Duply — for Pipedrive",
  description: "Clone Pipedrive CRM setups in seconds",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="pt">
      <body style={{ display: "flex", height: "100vh", overflow: "hidden" }}>
        <Sidebar />
        <div style={{ flex: 1, display: "flex", flexDirection: "column", overflow: "hidden" }}>
          <div style={{ flex: 1, overflowY: "auto", background: "var(--bg-app)" }}>
            {children}
          </div>
        </div>
      </body>
    </html>
  );
}
