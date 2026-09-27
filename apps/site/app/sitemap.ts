import type { MetadataRoute } from "next";

export default function sitemap(): MetadataRoute.Sitemap {
  const site = process.env.NEXT_PUBLIC_SITE_URL ?? "https://voltaris-energy-platform-site.vercel.app";
  return ["", "/platform", "/command", "/margin", "/architecture", "/case-study", "/about", "/reviewer"].map(path => ({url: `${site}${path}`, changeFrequency: "monthly", priority: path ? 0.7 : 1}));
}
