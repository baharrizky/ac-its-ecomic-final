import React, { useEffect, useRef, useState } from "react";
import katex from "katex";
import "katex/dist/katex.min.css";

const QUICK = [
  ["x²", "x^2", "exponent2"], ["xⁿ", "x^n", "exponentN"], ["√", "\\sqrt{x}", "sqrt"], ["a/b", "\\frac{a}{b}", "fraction"],
  ["×", "\\times", "plain"], ["÷", "\\div", "plain"], ["≤", "\\leq", "plain"], ["≥", "\\geq", "plain"], ["Σ", "\\sum_{i=1}^{n}", "plain"],
];

function applyToSelection(value, start, end, kind, snippet) {
  const selected = value.slice(start, end);
  if (kind === "exponent2") {
    if (selected) return { text: `${value.slice(0,start)}^{2}${value.slice(end)}`, cursor: start + 4 };
    const before = value.slice(0,start);
    const m = before.match(/(?:\\[a-zA-Z]+|[A-Za-z0-9])$/);
    if (m) { const at = start - m[0].length; return { text:`${value.slice(0,at)}${m[0]}^2${value.slice(start)}`, cursor:start+2 }; }
    return { text:value.slice(0,start)+"^2"+value.slice(end), cursor:start+2 };
  }
  if (kind === "exponentN") {
    if (selected) return { text:`${value.slice(0,start)}^{n}${value.slice(end)}`, cursor:start+4 };
    const before=value.slice(0,start); const m=before.match(/(?:\\[a-zA-Z]+|[A-Za-z0-9])$/);
    if(m){const at=start-m[0].length;return {text:`${value.slice(0,at)}${m[0]}^n${value.slice(start)}`,cursor:start+2};}
    return {text:value.slice(0,start)+"^n"+value.slice(end),cursor:start+2};
  }
  if (kind === "fraction" && selected) return { text:`${value.slice(0,start)}\\frac{${selected}}{ }${value.slice(end)}`, cursor:start+selected.length+9 };
  return { text:value.slice(0,start)+snippet+value.slice(end), cursor:start+snippet.length };
}

export default function EquationEditor({ value = "", onChange, label = "Persamaan (LaTeX, opsional)" }) {
  const ref = useRef(null);
  const inputRef = useRef(null);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!ref.current) return;
    if (!value.trim()) { ref.current.innerHTML = '<span class="subtle">Pratinjau persamaan akan muncul di sini.</span>'; setError(""); return; }
    try {
      const lines = String(value).split(/\r?\n/).filter(line => line.trim() !== "");
      ref.current.innerHTML = lines.map(line => katex.renderToString(line,{throwOnError:true,displayMode:true})).join('<div style="height:4px"></div>');
      setError("");
    } catch (e) {
      ref.current.textContent = "Persamaan belum valid: " + (e?.message || "periksa sintaks LaTeX");
      setError("Periksa sintaks persamaan.");
    }
  }, [value]);

  function insert(snippet, kind) {
    const el=inputRef.current;
    const start=el?.selectionStart ?? String(value).length;
    const end=el?.selectionEnd ?? start;
    const result=applyToSelection(String(value),start,end,kind,snippet);
    onChange(result.text);
    requestAnimationFrame(()=>{if(inputRef.current){inputRef.current.focus();inputRef.current.setSelectionRange(result.cursor,result.cursor);}});
  }

  return <div className="equation-editor">
    <label className="label">{label}</label>
    <div className="equation-toolbar">
      {QUICK.map(([name, latex, kind]) => <button type="button" key={name} className="equation-chip" onClick={() => insert(latex,kind)}>{name}</button>)}
    </div>
    <textarea ref={inputRef} value={value} onChange={e => onChange(e.target.value)} placeholder="Satu persamaan per baris. Contoh: 2^3 = 8" rows={4} />
    <div className="equation-preview" ref={ref} />
    {error && <div className="subtle" style={{color:"#b91c1c",marginTop:5}}>{error}</div>}
    <div className="subtle" style={{marginTop:5}}>Tekan Enter untuk membuat baris persamaan baru. Tombol x²/xⁿ akan menerapkan pangkat ke teks yang dipilih atau simbol terakhir.</div>
  </div>;
}
