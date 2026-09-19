import React, { useEffect, useMemo, useState } from 'react';
import { listConcepts } from '../../services/conceptService';

export default function ConceptPicker({ value=[], onChange, multiple=true, label='Konsep terkait', required=false }) {
  const [concepts, setConcepts] = useState([]);
  useEffect(() => { let alive=true; listConcepts().then(items => alive && setConcepts(items)).catch(()=>{}); return ()=>{alive=false}; }, []);
  const selected = Array.isArray(value) ? value : (value ? [value] : []);
  const names = useMemo(() => new Map(concepts.map(c=>[c.id,c.name])), [concepts]);
  function toggle(id) {
    if (multiple) onChange(selected.includes(id) ? selected.filter(x=>x!==id) : [...selected,id]);
    else onChange(id);
  }
  return <div className="field">
    <label className="label">{label}{required ? ' *' : ''}</label>
    {concepts.length ? <div className="concept-picker">
      {concepts.map(c => <button type="button" key={c.id} className={`concept-chip ${selected.includes(c.id)?'selected':''}`} onClick={()=>toggle(c.id)}>{c.id} · {c.name}</button>)}
    </div> : <div className="subtle" style={{padding:'10px 12px',border:'1px dashed #d8d2e5',borderRadius:10}}>
      Belum ada konsep. Tambahkan konsep terlebih dahulu di <strong>Knowledge Base</strong>.
    </div>}
    {selected.length>0 && <div className="subtle" style={{marginTop:6}}>Terpilih: {selected.map(id=>names.get(id)||id).join(', ')}</div>}
    {required && !selected.length && <div className="subtle" style={{marginTop:5}}>Pilih minimal satu konsep agar konten dapat dipetakan ke pembelajaran adaptif.</div>}
  </div>;
}
