import type { Metadata } from "next";
import { QueryProvider } from "@/components/providers/query-provider";
import { ModeButton } from "@/components/layout/mode-button";
import "./globals.css";

export const metadata: Metadata = {
  title: "Anchored",
  description: "Personal productivity OS",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className="antialiased">
        <QueryProvider>
          {children}
          <ModeButton />
        </QueryProvider>
      </body>
    </html>
  );
}
