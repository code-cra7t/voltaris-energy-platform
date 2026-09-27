"use client";

import { useEffect, useRef, useState } from "react";
import { ArrowRight, Check, Database, ShieldCheck } from "lucide-react";

export function ConnectionBridge() {
  const ref = useRef<HTMLDivElement>(null);
  const [entered, setEntered] = useState(false);
  useEffect(() => {
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) { setEntered(true); return; }
    const observer = new IntersectionObserver(([entry]) => {
      if (entry?.isIntersecting) { setEntered(true); observer.disconnect(); }
    }, { threshold: 0.35 });
    if (ref.current) observer.observe(ref.current);
    return () => observer.disconnect();
  }, []);
  return <div ref={ref} className={`connection-bridge ${entered ? "is-active" : ""}`}>
    <div className="bridge-card bridge-command"><span className="bridge-card-top">COMMAND / ACTION</span><ShieldCheck size={25}/><strong>Service visit approved</strong><small>Booking + work order + audit committed</small><div className="bridge-status"><Check size={13}/> STAFF AUTHORIZED</div></div>
    <div className="bridge-transfer" aria-hidden="true"><span className="bridge-line"/><span className="bridge-token">WORK ORDER <ArrowRight size={16}/></span></div>
    <div className="bridge-card bridge-margin"><span className="bridge-card-top">MARGIN / CONSEQUENCE</span><Database size={25}/><strong>Forecast enters backlog</strong><small>Actual margin waits for a posted cost</small><div className="bridge-status"><Check size={13}/> SOURCE LINKED</div></div>
  </div>;
}
