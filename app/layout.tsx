import type { Metadata } from "next";
import { QueryProvider } from "@/components/providers/query-provider";
import { CaptureButton } from "@/components/layout/capture-button";
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
          <CaptureButton />
        </QueryProvider>
      </body>
    </html>
  );
}
