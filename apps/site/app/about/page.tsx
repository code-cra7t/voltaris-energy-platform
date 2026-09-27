import type { Metadata } from "next";
import Link from "next/link";
import { ArrowRight, ArrowUpRight, Database, ShieldCheck, Workflow } from "lucide-react";
import { Kicker, NextStep, PageHero } from "@/components/PageParts";
import { Reveal } from "@/components/Reveal";

export const metadata: Metadata = {
  title: "About Voltaris",
  description: "Voltaris Energy is a fictional European energy-services environment built around working AI operations and financial intelligence products.",
};

export default function AboutPage() {
  return <>
    <PageHero number="06" eyebrow="ABOUT VOLTARIS" title="A fictional company." accent="Real working software" description="Voltaris is an energy-services setting built to make a complex operational workflow tangible. The business records are synthetic. The products and their safeguards can be explored live." image="/media/operations-room.webp" visual={<div className="hero-about-card"><span>WHAT VOLTARIS IS</span><strong>A credible operating environment for working AI products.</strong><div><span>01</span><p>Fictional sites, people, contracts, and records</p></div><div><span>02</span><p>Real application workflows and database writes</p></div><div><span>03</span><p>Private, resettable reviewer workspaces</p></div></div>}><Link href="/reviewer" className="button button-light">Enter the workspace <ArrowUpRight size={18}/></Link></PageHero>

    <section className="about-image-section"><div className="about-image" role="img" aria-label="Illustrative electric charging site in a European mountain valley at dusk"/><div className="about-image-caption">ILLUSTRATIVE ENERGY-SERVICE SETTING · GENERATED IMAGE · NOT A VOLTARIS FACILITY</div></section>

    <section className="section-paper about-story"><div className="container"><Reveal><Kicker number="01">WHY VOLTARIS EXISTS</Kicker><div className="split-heading"><h2>Show the full decision.<br/><em>Not just the model.</em></h2><p>Service teams must interpret evidence, respect contracts, work within technician capacity, and understand cost. Voltaris connects those steps into a single scenario that a reviewer can actually operate.</p></div></Reveal><div className="about-principles"><Reveal><div><Workflow size={25}/><span>01 / PRACTICAL WORKFLOWS</span><h3>From report to resolution.</h3><p>The incident, evidence, proposal, approval, work order, and financial consequence are linked by persisted records.</p></div></Reveal><Reveal delay={80}><div><ShieldCheck size={25}/><span>02 / HUMAN CONTROL</span><h3>Authority stays explicit.</h3><p>AI analysis supports the service team. A staff member authorizes dispatch, and the action enters an audit trail.</p></div></Reveal><Reveal delay={160}><div><Database size={25}/><span>03 / HONEST SCOPE</span><h3>Working, with boundaries.</h3><p>Real database writes and calculations run on fictional sites, people, chargers, contracts, and finances.</p></div></Reveal></div></div></section>

    <section className="about-scope section-ink"><div className="container"><Reveal><Kicker number="02" light>WHAT YOU ARE SEEING</Kicker><h2>Open enough to inspect.<br/><em>Clear about its limits.</em></h2><div className="about-scope-grid"><p>Command and Margin are working Next.js products sharing a PostgreSQL-backed domain layer. An invited reviewer can investigate the Hannover fault, authorize a response, inspect the audit record, and see the forecast and actual financial effects.</p><p>Voltaris is not an operating utility. It does not connect to live chargers or real customers. A customer deployment would require enterprise identity, external integrations, data-protection review, monitoring, and operational safety sign-off.</p></div><Link href="/case-study" className="large-inline-link">Read the case study <ArrowRight size={20}/></Link></Reveal></div></section>
    <NextStep eyebrow="TAKE A SHIFT" title="Run the response yourself." description="Follow a private, resettable incident through Command and Margin. Every action creates a record you can inspect." href="/reviewer" label="Launch reviewer workspace"/>
  </>;
}
