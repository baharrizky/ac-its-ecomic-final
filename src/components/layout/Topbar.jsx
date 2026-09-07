import React from "react";
import { Bell, Search } from "lucide-react";
export default function Topbar({mode,session}){return <header className="ac-topbar"><div className="topbar-title"><strong>AC-ITS</strong><span>{mode==="teacher"?"Teacher Content & Analytics Space":"Adaptive Learning Space"}</span></div><div className="topbar-actions"><button className="icon-button"><Search size={18}/></button><button className="icon-button"><Bell size={18}/></button><div className="top-user"><div className="top-avatar">{session?.name?.[0]||"A"}</div></div></div></header>}
