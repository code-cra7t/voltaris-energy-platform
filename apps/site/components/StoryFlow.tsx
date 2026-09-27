"use client";

import Link from "next/link";
import { ArrowRight, BookOpen, CalendarCheck2, ChartNoAxesCombined, ShieldCheck } from "lucide-react";
import { useState } from "react";

const steps = [
  { id: "01", title: "A fault enters the queue", detail: "Repeated connector lock and communication faults are reported at Hannover Messe Hub. The incident carries a charger ID, location, service target, and prior maintenance.", image: "/media/01-command-incident.jpg", icon: BookOpen, tag: "INCOMING / COMMAND" },
  { id: "02", title: "Evidence becomes a decision", detail: "Command retrieves field guidance, maintenance history, and contract context. Its AI analysis cites exact source records; the proposed technician and slot remain subject to staff approval.", image: "/media/06-command-analysis.jpg", icon: ShieldCheck, tag: "EVIDENCE / COMMAND" },
  { id: "03", title: "A person authorizes the response", detail: "Only after approval does the system book the slot, create the work order, write the audit entry, and post a forecast service cost in one transaction.", image: "/media/08-command-work-order.jpg", icon: CalendarCheck2, tag: "APPROVAL / COMMAND" },
  { id: "04", title: "The consequence becomes visible", detail: "Margin sees the open work order as forecast backlog. Actual profitability changes only when the job is completed and a posted cost event exists.", image: "/media/05-margin-backlog.jpg", icon: ChartNoAxesCombined, tag: "FORECAST / MARGIN" },
];

export function StoryFlow() {
  const [active, setActive] = useState(0);
  const selected = steps[active]!;
  return <div className="story-flow">
    <div className="story-controls" role="tablist" aria-label="Incident journey">
      {steps.map((step, i) => <button key={step.id} type="button" role="tab" aria-selected={active === i} aria-controls="story-panel" onClick={() => setActive(i)} className={`story-step ${active === i ? "is-active" : ""}`}>
        <span className="story-number">{step.id}</span><span className="story-step-title">{step.title}</span><ArrowRight size={17}/>
      </button>)}
    </div>
    <div id="story-panel" className="story-panel" role="tabpanel">
      <div className="story-panel-top"><span><selected.icon size={16}/> {selected.tag}</span><span>{selected.id} / 04</span></div>
      <div className="story-image-wrap"><img src={selected.image} alt={`${selected.title} in the working Voltaris product`} key={selected.image}/></div>
      <div className="story-panel-bottom"><div><h3>{selected.title}</h3><p>{selected.detail}</p></div><Link href={active < 3 ? "/command" : "/margin"} aria-label={`Explore ${active < 3 ? "Command" : "Margin"}`}><ArrowRight size={21}/></Link></div>
    </div>
  </div>;
}
