import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "CRDT Todo",
  description: "Collaborative todo app using LWW-CRDT",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
