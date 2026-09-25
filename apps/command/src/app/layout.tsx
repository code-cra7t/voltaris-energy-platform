import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Command | Voltaris Energy",
  description: "Evidence-led service operations for Voltaris Energy.",
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return <html lang="en"><body>{children}</body></html>;
}
