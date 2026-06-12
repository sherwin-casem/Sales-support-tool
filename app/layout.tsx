import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Sales Intelligence",
  description: "Discover and analyze companies using public web information",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
