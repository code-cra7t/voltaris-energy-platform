"use client";

import { useEffect, useRef } from "react";

export function WalkthroughVideo() {
  const ref = useRef<HTMLVideoElement>(null);
  useEffect(() => {
    const media = window.matchMedia("(prefers-reduced-motion: reduce)");
    const sync = () => { if (media.matches) ref.current?.pause(); else ref.current?.play().catch(() => {}); };
    sync(); media.addEventListener("change", sync);
    return () => media.removeEventListener("change", sync);
  }, []);
  return <video ref={ref} className="walkthrough-background" autoPlay muted loop playsInline preload="metadata" poster="/media/02-command-evidence.jpg" aria-hidden="true"><source src="/media/walkthrough.mp4" type="video/mp4"/></video>;
}
