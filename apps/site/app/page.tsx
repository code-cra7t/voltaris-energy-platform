import Link from "next/link";
import { ArrowDown, ArrowRight, ArrowUpRight, Check, CircleDot, Database, MoveRight, ShieldCheck } from "lucide-react";
import { Reveal } from "@/components/Reveal";
import { StoryFlow } from "@/components/StoryFlow";
import { WalkthroughVideo } from "@/components/WalkthroughVideo";
import { ConnectionBridge } from "@/components/ConnectionBridge";

export default function Home() {
  return <>
    <section className="hero photo-hero section-dark">
      <div className="hero-image" aria-hidden="true"/><div className="hero-photo-shade" aria-hidden="true"/>
      <div className="container hero-content">
        <div className="hero-metrics" aria-label="Simulated network context"><div><strong>07</strong><span>Site nodes<br/>(simulated)</span></div><div><strong>01</strong><span>Service exception<br/>(simulated)</span></div><div><strong>02</strong><span>Connected<br/>products</span></div></div>
        <div className="hero-main"><div className="eyebrow hero-eyebrow"><span className="eyebrow-line"/> OPERATIONS INTELLIGENCE FOR ENERGY SYSTEMS</div>
          <h1>Run the response.<br/>Understand the consequence<span className="orange-period">.</span></h1>
          <p>From an incident in the field to a decision in the control room to its effect on service margin. One connected, working system.</p>
          <div className="hero-actions"><Link className="button button-light" href="/platform">Explore Voltaris <ArrowUpRight size={18}/></Link><Link className="button button-outline-light" href="/reviewer">Enter operations <ArrowRight size={17}/></Link></div>
        </div>
        <div className="hero-incident"><div><span className="signal-dot"/> HANNOVER / VC-HAN-001</div><strong>Connector fault reported</strong><span>Evidence review required</span></div>
        <div className="hero-signal"><span>VOLTARIS ENERGY · SYNTHETIC OPERATIONS</span><span>SCROLL TO EXPLORE <ArrowDown size={13}/></span></div>
      </div>
    </section>

    <section className="section-paper statement-section">
      <div className="container statement-grid">
        <Reveal><div className="section-label"><span>01</span> THE OPERATING REALITY</div></Reveal>
        <Reveal delay={80}><div><h2 className="display-statement">An incident is never<br/><em>just an incident.</em></h2><p className="statement-copy">It draws on maintenance history, service commitments, technician capacity, and eventually the economics of the response. Voltaris connects those decisions without hiding the people responsible for them.</p><div className="statement-pills"><span>FIELD OPERATIONS</span><span>HUMAN APPROVAL</span><span>FINANCIAL CLARITY</span></div></div></Reveal>
      </div>
    </section>

    <section className="section-ink journey-section" id="incident">
      <div className="container"><Reveal><div className="section-heading"><div><div className="section-label light-label"><span>02</span> FOLLOW AN ACTUAL WORKFLOW</div><h2>One fault. A chain<br/>of <em>accountable decisions.</em></h2></div><p>Explore the Hannover connector fault as it moves through the two working products. Select each stage to see the actual interface and the state change it represents.</p></div></Reveal><StoryFlow/></div>
    </section>

    <section className="bridge-section section-paper"><div className="container"><Reveal><div className="bridge-heading"><div className="section-label"><span>↗</span> THE HANDOFF</div><p>A service decision creates a financial signal. The connection is an actual persisted work order, visible across both products.</p></div></Reveal><ConnectionBridge/></div></section>

    <section className="products-section section-paper">
      <div className="container"><Reveal><div className="section-heading dark-heading"><div><div className="section-label"><span>03</span> TWO PRODUCTS / ONE RECORD</div><h2>The response system.<br/><em>The consequence system.</em></h2></div><p>Command and Margin share the same operational data inside each staff workspace. The work order is the link between a service decision and a financial outcome.</p></div></Reveal>
      <div className="product-cards">
        <Reveal className="product-card command-card"><div className="product-card-head"><span className="product-index">01 / OPERATIONS</span><span className="product-icon"><CircleDot size={23}/></span></div><div><h3>Command<span>.</span></h3><p>Evidence-aware incident response, technician proposals, approval, booking, and a complete work-order trail.</p></div><div className="product-card-image"><img src="/media/01-command-incident.jpg" alt="Command's incident queue and service workflow"/></div><Link href="/command" className="product-card-link">Explore Command <ArrowUpRight size={19}/></Link></Reveal>
        <Reveal className="product-card margin-card" delay={100}><div className="product-card-head"><span className="product-index">02 / INTELLIGENCE</span><span className="product-icon"><Database size={23}/></span></div><div><h3>Margin<span>.</span></h3><p>Posted financial performance, open service backlog, evidence-linked analysis, and a clear line between forecast and actual.</p></div><div className="product-card-image"><img src="/media/04-margin-overview.jpg" alt="Margin's financial operations dashboard"/></div><Link href="/margin" className="product-card-link">Explore Margin <ArrowUpRight size={19}/></Link></Reveal>
      </div></div>
    </section>

    <section className="film-section"><WalkthroughVideo/><div className="film-shade"/><div className="container film-content"><Reveal><div className="section-label light-label"><span>04</span> SEE IT IN MOTION</div><h2>From signal<br/>to <em>service.</em></h2><p>Watch the complete path through Command and Margin, or enter the products and make the decision yourself.</p><div className="film-actions"><a href="/media/walkthrough.mp4" target="_blank" rel="noreferrer" className="button button-light">Watch the 90-second walkthrough <ArrowUpRight size={18}/></a><Link href="/reviewer" className="text-link light">Enter the workspace <MoveRight size={18}/></Link></div></Reveal></div><div className="film-caption">CAPTIONED PRODUCT WALKTHROUGH · SYNTHETIC OPERATIONAL RECORDS</div></section>

    <section className="company-section"><div className="company-photo" aria-hidden="true"/><div className="company-shade"/><div className="container company-content"><Reveal><div className="section-label light-label"><span>05</span> THE COMPANY BEHIND THE SYSTEM</div><h2>A fictional company.<br/>A <em>working product.</em></h2><p>Voltaris is a deliberately constructed European energy-services environment. Its sites and records are synthetic; the workflows, decisions, and software you can explore are real.</p><Link href="/about" className="button button-light">About Voltaris <ArrowUpRight size={18}/></Link></Reveal></div></section>

    <section className="principles-section section-paper"><div className="container"><Reveal><div className="section-label"><span>06</span> ENGINEERED FOR THE REAL DECISIONS</div><h2 className="principles-title">Trust is a system property<span className="orange-period">.</span></h2></Reveal><div className="principles-grid">
      <Reveal><div className="principle"><div className="principle-icon"><ShieldCheck/></div><span>01 / CONTROL</span><h3>People approve actions.</h3><p>AI proposes. A signed-in staff member decides. Dispatch, booking, and audit entries commit together.</p></div></Reveal>
      <Reveal delay={80}><div className="principle"><div className="principle-icon"><Check/></div><span>02 / EVIDENCE</span><h3>Claims carry sources.</h3><p>Command validates cited records. Margin answers from computed figures and linked evidence, without model-written executable SQL.</p></div></Reveal>
      <Reveal delay={160}><div className="principle"><div className="principle-icon"><Database/></div><span>03 / ACCOUNTING</span><h3>Forecast is not actual.</h3><p>An approved job enters backlog; completed work posts actual costs. The difference remains visible throughout.</p></div></Reveal>
      </div><Reveal><Link href="/architecture" className="large-inline-link">Explore the architecture <ArrowUpRight size={22}/></Link></Reveal></div></section>

    <section className="final-cta section-dark"><div className="container final-cta-inner"><Reveal><div className="section-label light-label"><span>07</span> STEP INSIDE</div><h2>See the system.<br/><em>Make the call.</em></h2><p>Use a private reviewer workspace to investigate the incoming fault, approve a service response, and trace its cost across both products.</p><Link href="/reviewer" className="button button-primary">Launch reviewer workspace <ArrowUpRight size={19}/></Link></Reveal><div className="final-cta-mark" aria-hidden="true">V<span>/</span></div></div></section>
    <div className="disclosure-bar">Voltaris Energy is a fictional European energy-services environment built around working software and synthetic operational records. Network figures and incidents shown here are simulated context.</div>
  </>;
}
