"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { ArrowUpRight, Menu, X } from "lucide-react";
import { useEffect, useState } from "react";

const links = [
  { href: "/platform", label: "Platform" },
  { href: "/command", label: "Command" },
  { href: "/margin", label: "Margin" },
  { href: "/architecture", label: "Architecture" },
  { href: "/case-study", label: "Case study" },
  { href: "/about", label: "About" },
];

export function SiteHeader() {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  useEffect(() => setOpen(false), [pathname]);
  useEffect(() => {
    document.body.style.overflow = open ? "hidden" : "";
    return () => { document.body.style.overflow = ""; };
  }, [open]);

  return <header className="site-header">
    <Link href="/" className="brand" aria-label="Voltaris Energy home">
      <img src="/brand/mark.svg" width="34" height="34" alt="" />
      <span>VOLTARIS</span>
    </Link>
    <nav className="desktop-nav" aria-label="Main navigation">
      {links.map(link => <Link href={link.href} key={link.href} className={pathname === link.href ? "active" : ""}>{link.label}</Link>)}
    </nav>
    <Link href="/reviewer" className="header-cta">Get access <ArrowUpRight size={15} /></Link>
    <button className="menu-toggle" type="button" onClick={() => setOpen(!open)} aria-label={open ? "Close menu" : "Open menu"} aria-expanded={open}>{open ? <X /> : <Menu />}</button>
    {open && <nav className="mobile-nav" aria-label="Mobile navigation">
      {links.map(link => <Link href={link.href} key={link.href}>{link.label}<ArrowUpRight size={18}/></Link>)}
      <Link href="/reviewer" className="mobile-nav-cta">Launch reviewer workspace <ArrowUpRight size={18}/></Link>
    </nav>}
  </header>;
}

export function SiteFooter() {
  return <footer className="site-footer">
    <div className="footer-top">
      <div><Link href="/" className="footer-brand"><img src="/brand/mark.svg" width="34" height="34" alt=""/> VOLTARIS</Link><p>Run the response.<br/>Understand the consequence.</p></div>
      <div className="footer-links"><span>EXPLORE</span><Link href="/platform">Platform</Link><Link href="/command">Command</Link><Link href="/margin">Margin</Link></div>
      <div className="footer-links"><span>BEHIND THE SYSTEM</span><Link href="/architecture">Architecture</Link><Link href="/case-study">Case study</Link><Link href="/about">About Voltaris</Link><Link href="/reviewer">Reviewer workspace</Link></div>
      <div className="footer-links"><span>LIVE PRODUCTS</span><a href="https://voltaris-energy-platform-command.vercel.app/" target="_blank" rel="noreferrer">Open Command ↗</a><a href="https://voltaris-energy-platform-margin.vercel.app/" target="_blank" rel="noreferrer">Open Margin ↗</a><a href="https://github.com/code-cra7t/voltaris-energy-platform" target="_blank" rel="noreferrer">Source repository ↗</a></div>
    </div>
    <div className="footer-bottom"><span>© {new Date().getFullYear()} VOLTARIS ENERGY</span><span>Fictional company. Working software. Synthetic records.</span><a href="#top">Back to top ↑</a></div>
  </footer>;
}
