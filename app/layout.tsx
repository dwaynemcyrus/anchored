import type { Metadata } from "next";
import { QueryProvider } from "@/components/providers/query-provider";
import { QuickMenu } from "@/components/layout/quick-menu";
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
          <QuickMenu />
        </QueryProvider>
      </body>
    </html>
  );
}
