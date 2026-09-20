import React, { useEffect, useRef, useState } from "react";
import katex from "katex";
import "katex/dist/katex.min.css";

const QUICK = [
  ["x²", "x^2"], ["xⁿ", "x^n"], ["√", "\\sqrt{x}"], ["a/b", "\\frac{a}{b}"],
  ["×", "\\times"], ["÷", "\\div"], ["≤", "\\leq"], ["≥", "\\geq"], ["Σ", "\\sum_{i=1}^{n}"],
];

export default function EquationEditor({ value = "", onChange, label = "Persamaan (LaTeX, opsional)" }) {
  const ref = useRef(null);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!ref.current) return;
    if (!value.trim()) { ref.current.innerHTML = '<span class="subtle">Pratinjau persamaan akan muncul di sini.</span>'; setError(""); return; }
    try {
      const lines = String(value).split(/\r?\n/).map(line=>line.trim()).filter(Boolean);
      ref.current.innerHTML = lines.length > 1
        ? lines.map(line=>`<div class="equation-line">${katex.renderToString(line,{throwOnError:true,displayMode:true})}</div>`).join("")
        : katex.renderToString(value, { throwOnError: true, displayMode: true });
      setError("");
    } catch (e) {
      ref.current.textContent = "Persamaan belum valid: " + (e?.message || "periksa sintaks LaTeX");
      setError("Periksa sintaks persamaan.");
    }
  }, [value]);

  function insert(snippet) {
    const current = String(value || "");
    if (snippet === "x^2" || snippet === "x^n") {
      const exponent = snippet === "x^2" ? "2" : "n";
      const match = current.match(/(\\?[A-Za-z0-9]+|\\\{[^}]+\\\})$/);
      if (match) {
        const token = match[0];
        const base = token.replace(/^\\\{|\\\}$/g, "");
        onChange(current.slice(0, -token.length) + `${base}^${exponent}`);
        return;
      }
    }
    const separator = current && !current.endsWith("\n") ? " " : "";
    onChange(current ? `${current}${separator}${snippet}` : snippet);
  }

  return <div className="equation-editor">
    <label className="label">{label}</label>
    <div className="equation-toolbar">
      {QUICK.map(([name, latex]) => <button type="button" key={name} className="equation-chip" onClick={() => insert(latex)}>{name}</button>)}
    </div>
    <textarea value={value} onChange={e => onChange(e.target.value)} placeholder="Contoh: 2^3 = 8 atau \\frac{a}{b} = c" rows={2} />
    <div className="equation-preview" ref={ref} />
    {error && <div className="subtle" style={{color:"#b91c1c",marginTop:5}}>{error}</div>}
    <div className="subtle" style={{marginTop:5}}>Gunakan sintaks LaTeX. Contoh: <code>2^3</code>, <code>\\frac{'{'}x+1{'}'}{'{'}2{'}'}</code>, <code>\\sqrt{'{'}x{'}'}</code>.</div>
  </div>;
}
