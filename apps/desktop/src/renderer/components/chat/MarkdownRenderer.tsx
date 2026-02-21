// Simple markdown-to-React renderer for chat messages
// Handles: code blocks, inline code, bold, italic, links, lists, paragraphs

interface MarkdownRendererProps {
  content: string;
}

interface ParsedBlock {
  type: "code" | "paragraph" | "list";
  content: string;
  language?: string;
  items?: string[];
}

function parseBlocks(text: string): ParsedBlock[] {
  const blocks: ParsedBlock[] = [];
  const lines = text.split("\n");
  let i = 0;

  while (i < lines.length) {
    const line = lines[i];
    if (line === undefined) {
      i++;
      continue;
    }

    // Code block (triple backtick)
    if (line.startsWith("```")) {
      const language = line.slice(3).trim();
      const codeLines: string[] = [];
      i++;
      while (i < lines.length) {
        const codeLine = lines[i];
        if (codeLine === undefined) {
          i++;
          continue;
        }
        if (codeLine.startsWith("```")) {
          i++;
          break;
        }
        codeLines.push(codeLine);
        i++;
      }
      blocks.push({ type: "code", content: codeLines.join("\n"), language: language || undefined });
      continue;
    }

    // List items (-, *, or numbered)
    if (/^[\s]*[-*]\s/.test(line) || /^[\s]*\d+\.\s/.test(line)) {
      const items: string[] = [];
      while (i < lines.length) {
        const listLine = lines[i];
        if (listLine === undefined) break;
        if (/^[\s]*[-*]\s/.test(listLine)) {
          items.push(listLine.replace(/^[\s]*[-*]\s/, ""));
          i++;
        } else if (/^[\s]*\d+\.\s/.test(listLine)) {
          items.push(listLine.replace(/^[\s]*\d+\.\s/, ""));
          i++;
        } else {
          break;
        }
      }
      blocks.push({ type: "list", content: "", items });
      continue;
    }

    // Empty line — skip
    if (line.trim() === "") {
      i++;
      continue;
    }

    // Paragraph — collect until empty line or special block
    const paragraphLines: string[] = [];
    while (i < lines.length) {
      const pLine = lines[i];
      if (pLine === undefined) break;
      if (pLine.trim() === "" || pLine.startsWith("```") || /^[\s]*[-*]\s/.test(pLine) || /^[\s]*\d+\.\s/.test(pLine)) {
        break;
      }
      paragraphLines.push(pLine);
      i++;
    }
    blocks.push({ type: "paragraph", content: paragraphLines.join("\n") });
  }

  return blocks;
}

function renderInlineMarkdown(text: string): React.ReactNode[] {
  const nodes: React.ReactNode[] = [];
  // Pattern matches: inline code, bold, italic, links, citation markers
  const pattern = /(`[^`]+`|\*\*[^*]+\*\*|\*[^*]+\*|\[[^\]]+\]\([^)]+\)|\[\d+\])/g;
  let lastIndex = 0;
  let match: RegExpExecArray | null;

  while ((match = pattern.exec(text)) !== null) {
    // Add text before match
    if (match.index > lastIndex) {
      nodes.push(text.slice(lastIndex, match.index));
    }

    const token = match[0];

    if (token.startsWith("`") && token.endsWith("`")) {
      // Inline code
      nodes.push(
        <code
          key={match.index}
          style={{
            backgroundColor: "var(--mixa-bg-elevated)",
            padding: "1px 5px",
            borderRadius: "3px",
            fontFamily: "var(--mixa-font-mono)",
            fontSize: "0.9em",
          }}
        >
          {token.slice(1, -1)}
        </code>,
      );
    } else if (token.startsWith("**") && token.endsWith("**")) {
      // Bold
      nodes.push(<strong key={match.index}>{token.slice(2, -2)}</strong>);
    } else if (token.startsWith("*") && token.endsWith("*")) {
      // Italic
      nodes.push(<em key={match.index}>{token.slice(1, -1)}</em>);
    } else if (token.startsWith("[") && token.includes("](")) {
      // Link [text](url)
      const linkMatch = /\[([^\]]+)\]\(([^)]+)\)/.exec(token);
      if (linkMatch) {
        nodes.push(
          <a
            key={match.index}
            href={linkMatch[2]}
            target="_blank"
            rel="noopener noreferrer"
            style={{ color: "var(--mixa-accent-blue)", textDecoration: "underline" }}
          >
            {linkMatch[1]}
          </a>,
        );
      }
    } else if (/^\[\d+\]$/.test(token)) {
      // Citation marker [1], [2], etc.
      nodes.push(
        <span
          key={match.index}
          style={{
            display: "inline-block",
            backgroundColor: "var(--mixa-accent-primary)",
            color: "#fff",
            fontSize: "11px",
            fontWeight: 600,
            padding: "0 4px",
            borderRadius: "3px",
            verticalAlign: "super",
            lineHeight: 1,
            marginLeft: "1px",
            marginRight: "1px",
          }}
        >
          {token}
        </span>,
      );
    } else {
      nodes.push(token);
    }

    lastIndex = match.index + token.length;
  }

  // Add remaining text
  if (lastIndex < text.length) {
    nodes.push(text.slice(lastIndex));
  }

  return nodes;
}

const codeBlockStyle: React.CSSProperties = {
  backgroundColor: "var(--mixa-bg-elevated)",
  border: "1px solid var(--mixa-border-default)",
  borderRadius: "6px",
  padding: "12px 16px",
  fontFamily: "var(--mixa-font-mono)",
  fontSize: "13px",
  lineHeight: 1.5,
  overflowX: "auto",
  whiteSpace: "pre",
  margin: "8px 0",
};

const codeLabelStyle: React.CSSProperties = {
  fontSize: "11px",
  color: "var(--mixa-text-muted)",
  marginBottom: "4px",
  fontFamily: "var(--mixa-font-mono)",
};

export function MarkdownRenderer({ content }: MarkdownRendererProps): React.ReactElement {
  const blocks = parseBlocks(content);

  return (
    <div style={{ lineHeight: 1.6 }}>
      {blocks.map((block, i) => {
        if (block.type === "code") {
          return (
            <div key={i}>
              {block.language && (
                <div style={codeLabelStyle}>{block.language}</div>
              )}
              <pre style={codeBlockStyle}>
                <code>{block.content}</code>
              </pre>
            </div>
          );
        }

        if (block.type === "list" && block.items) {
          return (
            <ul key={i} style={{ margin: "8px 0", paddingLeft: "24px" }}>
              {block.items.map((item, j) => (
                <li key={j} style={{ marginBottom: "4px" }}>
                  {renderInlineMarkdown(item)}
                </li>
              ))}
            </ul>
          );
        }

        // Paragraph
        return (
          <p key={i} style={{ margin: "8px 0" }}>
            {renderInlineMarkdown(block.content)}
          </p>
        );
      })}
    </div>
  );
}
