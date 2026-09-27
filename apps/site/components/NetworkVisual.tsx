"use client";

import { useState } from "react";

const sites = [
  { x: 14, y: 28, name: "Bremen Port", type: "Charging" },
  { x: 35, y: 18, name: "Hamburg North", type: "Solar" },
  { x: 46, y: 40, name: "Hannover Messe Hub", type: "Attention required", alert: true },
  { x: 67, y: 22, name: "Magdeburg East", type: "Charging" },
  { x: 83, y: 53, name: "Leipzig Logistics", type: "Storage" },
  { x: 26, y: 72, name: "Ruhr West", type: "Maintenance" },
  { x: 57, y: 73, name: "Kassel Campus", type: "Solar" },
];

export function NetworkVisual() {
  const [selected, setSelected] = useState(2);
  const selectedSite = sites[selected]!;
  return <div className="network-card" aria-label="Interactive simulated energy network">
    <div className="network-topline"><span><span className="live-pulse"/> SIMULATED NETWORK / OPERATIONS VIEW</span><span>50.82° N — 9.12° E</span></div>
    <div className="network-map">
      <div className="map-cross cross-one"/><div className="map-cross cross-two"/>
      <svg className="network-lines" viewBox="0 0 100 100" preserveAspectRatio="none" aria-hidden="true"><path d="M14 28 35 18 46 40 67 22 83 53 57 73 46 40 26 72 14 28"/><path d="M35 18 67 22M26 72 57 73"/></svg>
      {sites.map((site, i) => <button key={site.name} type="button" className={`map-node ${site.alert ? "map-node-alert" : ""} ${selected === i ? "is-selected" : ""}`} style={{left: `${site.x}%`, top: `${site.y}%`}} onClick={() => setSelected(i)} aria-label={`Select ${site.name}`}><span/></button>)}
      <div className="map-label" style={{left: `${Math.min(selectedSite.x + 3, 65)}%`, top: `${Math.min(selectedSite.y + 5, 73)}%`}}><span>{selectedSite.name}</span><small>{selectedSite.type}</small></div>
      <div className="map-coordinate map-coordinate-left">N 52° 22.183</div><div className="map-coordinate map-coordinate-right">E 09° 43.219</div>
    </div>
    <div className="network-bottomline"><span>SITE {String(selected + 1).padStart(2, "0")} / 07</span><span className="network-status">{selectedSite.alert ? "01 SERVICE EXCEPTION" : "NETWORK VIEW · SYNTHETIC"}</span><span>SELECT A SITE TO INSPECT</span></div>
  </div>;
}
