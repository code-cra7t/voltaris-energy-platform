import type { Metadata, Viewport } from "next";
import { SiteFooter, SiteHeader } from "@/components/SiteShell";
import "./globals.css";

export const metadata: Metadata = {
  metadataBase: new URL(process.env.NEXT_PUBLIC_SITE_URL ?? "https://voltaris-energy-platform-site.vercel.app"),
  title: { default: "Voltaris Energy — Run the response. Understand the consequence.", template: "%s | Voltaris Energy" },
  description: "Two connected energy-service products. Command turns operational evidence into an approved response; Margin makes its financial consequence visible. Fictional company, working software.",
  icons: { icon: [{url: "/favicon.svg", type: "image/svg+xml"}, {url: "/brand/icon-32.png", sizes: "32x32", type: "image/png"}], apple: "/brand/apple-touch-icon.png" },
  manifest: "/site.webmanifest",
  openGraph: { type: "website", siteName: "Voltaris Energy", title: "Run the response. Understand the consequence.", description: "A connected operational platform for a fictional European energy-services company.", images: [{url: "/media/01-command-incident.jpg", width: 1280, height: 720, alt: "Voltaris Command incident workflow"}] },
};

export const viewport: Viewport = { themeColor: "#14232c", width: "device-width", initialScale: 1 };

export default function RootLayout({children}: Readonly<{children: React.ReactNode}>) {
  return <html lang="en"><body id="top"><SiteHeader/><main>{children}</main><SiteFooter/></body></html>;
}
