"use client";

import React from "react";
import {
  FileText,
  AlertCircle,
  CheckCircle2,
  HelpCircle,
  ShieldAlert,
  Stethoscope,
  Activity,
  Layers,
} from "lucide-react";

interface Props {
  content: string;
}

// Inline formatting helper (handles **bold**, *italic*, and code spans)
function formatInline(text: string): React.ReactNode[] {
  // Strip raw HTML tags and convert <br> to clean bullet separators
  const sanitized = text
    .replace(/<br\s*\/?>/gi, " • ")
    .replace(/<\/?[a-z0-9]+[^>]*>/gi, "");

  // Regex to split on bold **...**, italic *...*, or inline `...`
  const tokens = sanitized.split(/(\*\*[^*]+?\*\*|\*[^*]+?\*|`[^`]+?`)/g);

  return tokens.map((tok, idx) => {
    if (tok.startsWith("**") && tok.endsWith("**") && tok.length >= 4) {
      return (
        <strong key={idx} className="font-bold text-[#0F172A] dark:text-white">
          {tok.slice(2, -2)}
        </strong>
      );
    }
    if (tok.startsWith("*") && tok.endsWith("*") && tok.length >= 2) {
      return (
        <em key={idx} className="italic text-gray-700 dark:text-gray-300">
          {tok.slice(1, -1)}
        </em>
      );
    }
    if (tok.startsWith("`") && tok.endsWith("`") && tok.length >= 2) {
      return (
        <code
          key={idx}
          className="px-1.5 py-0.5 rounded bg-gray-100 dark:bg-gray-800 text-[11px] font-mono text-purple-600 dark:text-purple-400"
        >
          {tok.slice(1, -1)}
        </code>
      );
    }
    return tok;
  });
}

export default function MedicalReportRenderer({ content }: Props) {
  if (!content || !content.trim()) return null;

  const lines = content.split("\n");
  const elements: React.ReactNode[] = [];

  let i = 0;
  while (i < lines.length) {
    const rawLine = lines[i];
    const line = rawLine.trim();

    // 1. Skip empty lines
    if (!line) {
      i++;
      continue;
    }

    // 2. Horizontal Rules
    if (line === "---" || line === "***" || line === "___") {
      elements.push(
        <div key={`hr-${i}`} className="my-4 border-t border-gray-200 dark:border-gray-800" />
      );
      i++;
      continue;
    }

    // 3. Markdown Tables (lines starting and ending with |)
    if (line.startsWith("|") && line.endsWith("|")) {
      const tableLines: string[] = [];
      while (i < lines.length && lines[i].trim().startsWith("|") && lines[i].trim().endsWith("|")) {
        tableLines.push(lines[i].trim());
        i++;
      }

      if (tableLines.length >= 2) {
        // First line is header
        const headerCells = tableLines[0]
          .slice(1, -1)
          .split("|")
          .map((c) => c.trim());

        // Skip separator line if present (e.g. |---|---|)
        let dataStartIndex = 1;
        if (tableLines[1].replace(/[\s\-|:]/g, "") === "") {
          dataStartIndex = 2;
        }

        const dataRows = tableLines.slice(dataStartIndex).map((row) =>
          row
            .slice(1, -1)
            .split("|")
            .map((c) => c.trim())
        );

        elements.push(
          <div
            key={`table-${i}`}
            className="my-3 overflow-hidden rounded-xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900/40 shadow-xs"
          >
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="bg-gray-50/80 dark:bg-gray-800/80 border-b border-gray-200 dark:border-gray-700/80 text-[11px] font-bold text-[#0F172A] dark:text-gray-200 uppercase tracking-wider">
                    {headerCells.map((h, hIdx) => (
                      <th key={hIdx} className="px-3.5 py-2.5 font-bold">
                        {formatInline(h)}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100 dark:divide-gray-800/60">
                  {dataRows.map((row, rIdx) => (
                    <tr
                      key={rIdx}
                      className={
                        rIdx % 2 === 0
                          ? "bg-transparent"
                          : "bg-gray-50/40 dark:bg-gray-800/20"
                      }
                    >
                      {row.map((cell, cIdx) => (
                        <td
                          key={cIdx}
                          className="px-3.5 py-2.5 text-gray-700 dark:text-gray-300 leading-relaxed align-top"
                        >
                          {formatInline(cell)}
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        );
        continue;
      }
    }

    // 4. Headings
    if (line.startsWith("#")) {
      const match = line.match(/^(#{1,4})\s*(.*)$/);
      if (match) {
        const level = match[1].length;
        const text = match[2];

        // Extract section number if present (e.g., "1. RADIOLOGICAL IMPRESSION")
        const numMatch = text.match(/^(\d+[\.\d]*)\s*(.*)$/);
        const secNum = numMatch ? numMatch[1].replace(/\.$/, "") : "";
        const secTitle = numMatch ? numMatch[2] : text;

        if (level <= 2) {
          elements.push(
            <div
              key={`h-${i}`}
              className="mt-5 mb-2.5 pt-3 border-t border-gray-100 dark:border-gray-800/80 flex items-center gap-2.5"
            >
              {secNum && (
                <span className="w-6 h-6 rounded-lg bg-purple-100 dark:bg-purple-950/70 text-purple-700 dark:text-purple-300 text-[11px] font-bold flex items-center justify-center shrink-0 shadow-2xs">
                  {secNum}
                </span>
              )}
              <h3 className="text-xs font-bold text-[#0F172A] dark:text-white uppercase tracking-wider flex items-center gap-2">
                {secTitle}
              </h3>
            </div>
          );
        } else {
          elements.push(
            <h4
              key={`h-${i}`}
              className="text-xs font-bold text-[#0F172A] dark:text-white mt-3 mb-1.5 flex items-center gap-1.5"
            >
              <span className="w-1.5 h-1.5 rounded-full bg-purple-500 shrink-0" />
              <span>{formatInline(text)}</span>
            </h4>
          );
        }
        i++;
        continue;
      }
    }

    // 5. Highlight Takeaway / Bottom-Line Alert Cards
    if (
      line.toLowerCase().startsWith("**bottom line:**") ||
      line.toLowerCase().startsWith("**bottom-line:**") ||
      line.toLowerCase().startsWith("**key take-home") ||
      line.toLowerCase().startsWith("**conclusion:**")
    ) {
      elements.push(
        <div
          key={`takeaway-${i}`}
          className="my-3 p-3.5 rounded-xl border border-amber-200 dark:border-amber-900/50 bg-amber-50/50 dark:bg-amber-950/20 text-xs text-amber-950 dark:text-amber-200 leading-relaxed shadow-xs"
        >
          <div className="flex items-start gap-2">
            <AlertCircle className="w-4 h-4 text-amber-600 dark:text-amber-400 shrink-0 mt-0.5" />
            <div>{formatInline(line)}</div>
          </div>
        </div>
      );
      i++;
      continue;
    }

    // 6. Header Metadata Block (e.g., **Sanjeevani AI Radiological Assistant...**)
    if (
      line.toLowerCase().includes("sanjeevani ai radiological assistant") ||
      line.toLowerCase().includes("digital radiographic series")
    ) {
      elements.push(
        <div
          key={`hdr-${i}`}
          className="p-3 mb-3 rounded-xl bg-purple-50/60 dark:bg-purple-950/20 border border-purple-200/60 dark:border-purple-900/40 text-xs text-purple-950 dark:text-purple-200 font-medium"
        >
          <div className="flex items-center gap-2 font-bold text-[#0F172A] dark:text-white pb-1">
            <Stethoscope className="w-4 h-4 text-purple-600" />
            <span>{line.replace(/\*\*/g, "")}</span>
          </div>
        </div>
      );
      i++;
      continue;
    }

    // 7. Bullet Lists (- or * or numbered 1. 2.)
    if (line.match(/^(\*|\-|\d+\.)\s+/)) {
      const listItems: string[] = [];
      while (i < lines.length && lines[i].trim().match(/^(\*|\-|\d+\.)\s+/)) {
        listItems.push(lines[i].trim().replace(/^(\*|\-|\d+\.)\s+/, ""));
        i++;
      }
      elements.push(
        <ul key={`ul-${i}`} className="space-y-1.5 my-2 pl-2 text-xs">
          {listItems.map((item, idx) => (
            <li key={idx} className="flex items-start gap-2 text-gray-700 dark:text-gray-300 leading-relaxed">
              <span className="w-1.5 h-1.5 rounded-full bg-purple-500 shrink-0 mt-1.5" />
              <div>{formatInline(item)}</div>
            </li>
          ))}
        </ul>
      );
      continue;
    }

    // 7.5 Blockquotes (> Note: ...)
    if (line.startsWith(">")) {
      const quoteText = line.replace(/^>\s*/, "");
      elements.push(
        <div
          key={`quote-${i}`}
          className="my-2.5 p-3.5 rounded-xl border border-blue-200 dark:border-blue-900/40 bg-blue-50/40 dark:bg-blue-950/20 text-xs text-blue-950 dark:text-blue-200 flex items-start gap-2.5 shadow-2xs"
        >
          <AlertCircle className="w-4 h-4 text-blue-600 dark:text-blue-400 shrink-0 mt-0.5" />
          <div className="leading-relaxed">{formatInline(quoteText)}</div>
        </div>
      );
      i++;
      continue;
    }

    // 8. General Paragraphs

    elements.push(
      <p key={`p-${i}`} className="text-xs text-gray-700 dark:text-gray-300 leading-relaxed my-1.5">
        {formatInline(line)}
      </p>
    );
    i++;
  }

  return (
    <div className="space-y-1 font-sans text-xs">
      {elements}
    </div>
  );
}
