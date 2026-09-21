import React,{useMemo} from "react";
import katex from "katex";
import "katex/dist/katex.min.css";

function renderInline(value){
 const text=String(value||"");
 const re=/([A-Za-z0-9]+\^[A-Za-z0-9]+|[A-Za-z0-9]+\/[A-Za-z0-9]+)/g;
 const parts=[];let last=0;let match;
 while((match=re.exec(text))){
  if(match.index>last)parts.push({type:"text",value:text.slice(last,match.index)});
  try{parts.push({type:"math",value:katex.renderToString(match[1],{throwOnError:false,displayMode:false})});}
  catch{parts.push({type:"text",value:match[1]});}
  last=match.index+match[1].length;
 }
 if(last<text.length)parts.push({type:"text",value:text.slice(last)});
 return parts.length?parts:[{type:"text",value:text}];
}

export default function MathText({children,className=""}){
 const parts=useMemo(()=>renderInline(children),[children]);
 return <span className={className}>{parts.map((p,i)=>p.type==="math"?<span key={i} dangerouslySetInnerHTML={{__html:p.value}}/>:<React.Fragment key={i}>{p.value}</React.Fragment>)}</span>;
}
