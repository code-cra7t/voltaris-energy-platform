import Link from "next/link";
import { ArrowRight, ArrowUpRight } from "lucide-react";
import { Reveal } from "./Reveal";

export function PageHero({number, eyebrow, title, accent, description, children, visual, image}: {number: string; eyebrow: string; title: string; accent: string; description: string; children?: React.ReactNode; visual?: React.ReactNode; image?: string}) {
  return <section className={`page-hero section-dark${visual ? " has-visual" : ""}${image ? " has-photo" : ""}`}>
    {image ? <><div className="page-hero-photo" style={{backgroundImage: `url('${image}')`}} aria-hidden="true"/><div className="page-hero-photo-shade" aria-hidden="true"/></> : <div className="page-hero-grid" aria-hidden="true"/>}
    <div className="container page-hero-inner"><div className="page-hero-copy"><div className="section-label light-label"><span>{number}</span> {eyebrow}</div><h1>{title}<br/><em>{accent}</em><span className="orange-period">.</span></h1><div className="page-hero-foot"><p>{description}</p>{children}</div></div>{visual && <div className="page-hero-visual">{visual}</div>}</div>
    {image && <div className="page-hero-image-caption">ILLUSTRATIVE ENERGY-SERVICE SETTING · GENERATED IMAGE</div>}
  </section>;
}

export function Kicker({number, children, light = false}: {number: string; children: React.ReactNode; light?: boolean}) { return <div className={`section-label ${light ? "light-label" : ""}`}><span>{number}</span> {children}</div>; }

export function ImageFeature({eyebrow, title, body, image, alt, reverse = false, children}: {eyebrow: string; title: string; body: string; image: string; alt: string; reverse?: boolean; children?: React.ReactNode}) {
  return <div className={`image-feature ${reverse ? "reverse" : ""}`}><Reveal className="image-feature-text"><span className="micro-label">{eyebrow}</span><h3>{title}</h3><p>{body}</p>{children}</Reveal><Reveal className="image-feature-image" delay={100}><img src={image} alt={alt}/></Reveal></div>;
}

export function NextStep({eyebrow, title, description, href, label}: {eyebrow: string; title: string; description: string; href: string; label: string}) {
  return <section className="next-step section-dark"><div className="container next-step-inner"><Reveal><span className="micro-label">{eyebrow}</span><h2>{title}</h2><p>{description}</p><Link href={href} className="button button-primary">{label} <ArrowUpRight size={18}/></Link></Reveal><ArrowRight className="next-step-arrow" strokeWidth={0.6}/></div></section>;
}
