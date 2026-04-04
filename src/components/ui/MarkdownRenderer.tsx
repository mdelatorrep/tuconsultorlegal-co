import React from "react";

interface MarkdownRendererProps {
  content: string;
  className?: string;
}

function renderInline(text: string): React.ReactNode[] {
  // Handle **bold** and [link](url)
  const parts = text.split(/(\*\*.*?\*\*|\[.*?\]\(.*?\))/g);
  return parts.map((part, i) => {
    if (part.startsWith('**') && part.endsWith('**')) {
      return <strong key={i} className="font-semibold text-foreground">{part.slice(2, -2)}</strong>;
    }
    const linkMatch = part.match(/^\[(.*?)\]\((.*?)\)$/);
    if (linkMatch) {
      return <a key={i} href={linkMatch[2]} target="_blank" rel="noopener noreferrer" className="text-primary underline break-all">{linkMatch[1]}</a>;
    }
    // Detect raw URLs
    const urlParts = part.split(/(https?:\/\/[^\s]+)/g);
    if (urlParts.length > 1) {
      return urlParts.map((up, j) =>
        up.startsWith('http') ? (
          <a key={`${i}-${j}`} href={up} target="_blank" rel="noopener noreferrer" className="text-primary underline break-all">{up}</a>
        ) : <span key={`${i}-${j}`}>{up}</span>
      );
    }
    return <span key={i}>{part}</span>;
  });
}

function isTableRow(line: string): boolean {
  return line.trim().startsWith('|') && line.trim().endsWith('|');
}

function isSeparatorRow(line: string): boolean {
  return /^\|[\s\-:|]+\|$/.test(line.trim());
}

function parseTableCells(line: string): string[] {
  return line.trim().replace(/^\|/, '').replace(/\|$/, '').split('|').map(c => c.trim());
}

function renderTable(tableLines: string[], startKey: number): React.ReactNode {
  const headerCells = parseTableCells(tableLines[0]);
  const dataRows = tableLines.slice(2); // skip header + separator

  return (
    <div key={startKey} className="my-3 overflow-x-auto rounded-lg border border-border">
      <table className="w-full text-sm">
        <thead>
          <tr className="bg-muted/60">
            {headerCells.map((cell, ci) => (
              <th key={ci} className="px-3 py-2 text-left font-semibold text-foreground border-b border-border whitespace-nowrap">
                {renderInline(cell)}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {dataRows.map((row, ri) => {
            const cells = parseTableCells(row);
            return (
              <tr key={ri} className={ri % 2 === 0 ? 'bg-background' : 'bg-muted/30'}>
                {headerCells.map((_, ci) => (
                  <td key={ci} className="px-3 py-2 text-foreground border-b border-border/50">
                    {renderInline(cells[ci] || '')}
                  </td>
                ))}
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

export function MarkdownRenderer({ content, className = "" }: MarkdownRendererProps) {
  const lines = content.split('\n');

  const elements: React.ReactNode[] = [];
  let i = 0;

  while (i < lines.length) {
    const line = lines[i];

    // Table detection
    if (isTableRow(line) && i + 1 < lines.length && isSeparatorRow(lines[i + 1])) {
      const tableLines: string[] = [line, lines[i + 1]];
      let j = i + 2;
      while (j < lines.length && isTableRow(lines[j])) {
        tableLines.push(lines[j]);
        j++;
      }
      elements.push(renderTable(tableLines, i));
      i = j;
      continue;
    }

    // H1
    if (line.startsWith('# ')) {
      elements.push(
        <h1 key={i} className="text-lg font-bold text-foreground mt-4 mb-2 border-b border-border pb-1">
          {renderInline(line.slice(2))}
        </h1>
      );
    }
    // H2
    else if (line.startsWith('## ')) {
      elements.push(
        <h2 key={i} className="text-base font-bold text-foreground mt-4 mb-2 border-b border-border/60 pb-1">
          {renderInline(line.slice(3))}
        </h2>
      );
    }
    // H3 / H4
    else if (line.startsWith('### ') || line.startsWith('#### ')) {
      const text = line.replace(/^#{3,4} /, '');
      elements.push(
        <h3 key={i} className="text-sm font-semibold text-foreground mt-3 mb-1">
          {renderInline(text)}
        </h3>
      );
    }
    // Bullet list
    else if (line.match(/^[-*] /)) {
      elements.push(
        <div key={i} className="flex gap-2 ml-2 my-0.5">
          <span className="text-primary mt-1 flex-shrink-0 text-xs">•</span>
          <span className="text-sm text-foreground leading-relaxed">{renderInline(line.replace(/^[-*] /, ''))}</span>
        </div>
      );
    }
    // Numbered list
    else if (/^\d+\. /.test(line)) {
      const num = line.match(/^(\d+)\./)?.[1];
      const text = line.replace(/^\d+\. /, '');
      elements.push(
        <div key={i} className="flex gap-2 ml-2 my-0.5">
          <span className="text-primary font-semibold flex-shrink-0 text-sm w-5">{num}.</span>
          <span className="text-sm text-foreground leading-relaxed">{renderInline(text)}</span>
        </div>
      );
    }
    // Empty line → spacer
    else if (line.trim() === '') {
      elements.push(<div key={i} className="h-2" />);
    }
    // Normal paragraph
    else {
      elements.push(
        <p key={i} className="text-sm text-foreground leading-relaxed">
          {renderInline(line)}
        </p>
      );
    }

    i++;
  }

  return (
    <div className={`space-y-0.5 ${className}`}>
      {elements}
    </div>
  );
}
