function esc(value){
  return String(value ?? "")
    .replace(/&/g,"&amp;").replace(/</g,"&lt;").replace(/>/g,"&gt;")
    .replace(/"/g,"&quot;").replace(/'/g,"&apos;");
}

function worksheet(name, headers, rows){
  const headerXml=headers.map(h=>`<Cell ss:StyleID="Header"><Data ss:Type="String">${esc(h)}</Data></Cell>`).join("");
  const body=rows.map(row=>`<Row>${row.map(v=>{
    const numeric=typeof v === "number" && Number.isFinite(v);
    return `<Cell><Data ss:Type="${numeric?"Number":"String"}">${esc(numeric?v:v??"")}</Data></Cell>`;
  }).join("")}</Row>`).join("");
  return `<Worksheet ss:Name="${esc(name)}"><Table><Row>${headerXml}</Row>${body}</Table></Worksheet>`;
}

export function downloadAnalyticsExcel({studentRows=[], conceptRows=[], className="Analitik"}){
  const students=studentRows.map(r=>[
    r.name,r.school,r.grade,r.rombel,r.mastery,r.practiceAttempts,r.practiceScore,r.examScore,r.learningMinutes,r.tutorInteractions,r.panelViews,r.activeMisconceptions
  ]);
  const concepts=conceptRows.map(r=>[r.id,r.value,r.attempts,r.activeMisconceptions,r.status]);
  const xml=`<?xml version="1.0"?><?mso-application progid="Excel.Sheet"?>
  <Workbook xmlns="urn:schemas-microsoft-com:office:spreadsheet" xmlns:o="urn:schemas-microsoft-com:office:office" xmlns:x="urn:schemas-microsoft-com:office:excel" xmlns:ss="urn:schemas-microsoft-com:office:spreadsheet">
    <Styles><Style ss:ID="Header"><Font ss:Bold="1"/></Style></Styles>
    ${worksheet("Siswa",["Siswa","Sekolah","Kelas","Rombel","Mastery (%)","Attempt Latihan","Nilai Latihan (%)","Nilai Ujian","Waktu Belajar (menit)","Interaksi Tutor","Panel Dibaca","Miskonsepsi Aktif"],students)}
    ${worksheet("Konsep",["Konsep","Mastery Kelas (%)","Attempt","Miskonsepsi Aktif","Status"],concepts)}
  </Workbook>`;
  const blob=new Blob([xml],{type:"application/vnd.ms-excel;charset=utf-8"});
  const url=URL.createObjectURL(blob);
  const a=document.createElement("a");
  const safe=String(className||"Analitik").replace(/[^a-z0-9_-]+/gi,"-").replace(/^-|-$/g,"")||"Analitik";
  a.href=url;a.download=`${safe}-analitik-siswa.xls`;document.body.appendChild(a);a.click();a.remove();URL.revokeObjectURL(url);
}
