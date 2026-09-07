import React from "react";

export function BarChartCard({title, subtitle, data, valueKey="value", max, suffix="%"}){
  const ceiling = max ?? Math.max(...data.map(d=>d[valueKey]), 100);
  return <div className="chart-card">
    <div className="chart-head"><div><h3>{title}</h3><p>{subtitle}</p></div></div>
    <div className="bar-chart" aria-label={title}>
      {data.map((d,i)=><div className="bar-col" key={d.label}>
        <span className="bar-value">{d[valueKey]}{suffix}</span>
        <div className="bar-track"><div className="bar-fill" style={{height:`${Math.max(5,(d[valueKey]/ceiling)*100)}%`}}/></div>
        <span className="bar-label">{d.label}</span>
      </div>)}
    </div>
  </div>
}

export function LineChartCard({title, subtitle, data, valueKey="value", suffix="%"}){
  const w=720,h=250,pad=34;
  const max=Math.max(...data.map(d=>d[valueKey]),100), min=Math.min(...data.map(d=>d[valueKey]),0);
  const pts=data.map((d,i)=>{
    const x=pad+(i/(Math.max(1,data.length-1)))*(w-pad*2);
    const y=h-pad-((d[valueKey]-min)/(max-min||1))*(h-pad*2);
    return {x,y,...d};
  });
  const path=pts.map((p,i)=>(i?"L":"M")+`${p.x},${p.y}`).join(" ");
  return <div className="chart-card">
    <div className="chart-head"><div><h3>{title}</h3><p>{subtitle}</p></div><span className="chart-pill">Tren</span></div>
    <div className="line-chart-wrap">
      <svg viewBox={`0 0 ${w} ${h}`} className="line-chart" preserveAspectRatio="none">
        {[0,25,50,75,100].map(v=>{const y=h-pad-(v/100)*(h-pad*2);return <line key={v} x1={pad} x2={w-pad} y1={y} y2={y} className="grid-line"/>})}
        <path d={path} className="line-path"/>
        {pts.map((p,i)=><g key={i}><circle cx={p.x} cy={p.y} r="4" className="line-dot"/><title>{p.label}: {p[valueKey]}{suffix}</title></g>)}
      </svg>
      <div className="line-labels">{data.map(d=><span key={d.label}>{d.label}</span>)}</div>
    </div>
  </div>
}
