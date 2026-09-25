import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Margin | Voltaris Energy",
  description: "Service revenue and operations intelligence for Voltaris Energy.",
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return <html lang="en"><body>{children}</body></html>;
}
