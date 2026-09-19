import React from "react";
import katex from "katex";
import "katex/dist/katex.min.css";

function renderMath(expression, display = false) {
  const value = String(expression || "").trim();
  if (!value) return null;
  try {
    return (
      <span
        className={display ? "ai-math ai-math-display" : "ai-math"}
        dangerouslySetInnerHTML={{
          __html: katex.renderToString(value, {
            displayMode: display,
            throwOnError: false,
            strict: "ignore"
          })
        }}
      />
    );
  } catch {
    return <span className={display ? "ai-math ai-math-display" : "ai-math"}>{value}</span>;
  }
}

function renderInline(text, keyPrefix = "i") {
  const nodes = [];
  let rest = String(text || "");
  let index = 0;
  const tokenRegex = /(\$\$([\s\S]*?)\$\$|\\\[([\s\S]*?)\\\]|\\\(([\s\S]*?)\\\)|(\$([^$\n]+)\$))/;

  while (rest) {
    const match = rest.match(tokenRegex);
    if (!match) {
      nodes.push(formatPlain(rest, `${keyPrefix}-plain-${index++}`));
      break;
    }

    if (match.index > 0) {
      nodes.push(formatPlain(rest.slice(0, match.index), `${keyPrefix}-before-${index++}`));
    }

    const expression = match[2] ?? match[3] ?? match[4] ?? match[6] ?? "";
    const display = Boolean(match[2] || match[3]);
    nodes.push(<React.Fragment key={`${keyPrefix}-math-${index++}`}>{renderMath(expression, display)}</React.Fragment>);
    rest = rest.slice(match.index + match[0].length);
  }

  return nodes;
}

function formatPlain(text, key) {
  const value = String(text || "");
  const parts = value.split(/(\*\*[^*]+\*\*)/g);
  return (
    <React.Fragment key={key}>
      {parts.map((part, index) => {
        if (/^\*\*[^*]+\*\*$/.test(part)) {
          return <strong key={`${key}-b-${index}`}>{part.slice(2, -2)}</strong>;
        }
        return part;
      })}
    </React.Fragment>
  );
}

export default function AIResponse({ text, className = "" }) {
  const value = String(text || "");
  if (!value) return null;

  // Normalize common model output variants before rendering.
  const normalized = value
    .replace(/\\textbf\{([^}]+)\}/g, "**$1**")
    .replace(/\\div/g, "\\div")
    .replace(/\\times/g, "\\times");

  const blocks = normalized.split(/\n{2,}/g);
  return (
    <div className={`ai-response ${className}`.trim()}>
      {blocks.map((block, index) => (
        <div className="ai-response-block" key={index}>
          {renderInline(block, `b-${index}`)}
        </div>
      ))}
    </div>
  );
}
