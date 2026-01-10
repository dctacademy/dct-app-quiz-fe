/**
 * Formats text to render code snippets properly
 * Supports both inline code (`code`) and code blocks (```language\ncode```)
 */
export const formatTextWithCode = (text) => {
  if (!text) return text;

  // Convert to string if not already
  const textStr = String(text);

  // Split by code blocks first (```lang\ncode``` or ```code```)
  const codeBlockRegex = /```(\w+)?\n?([^`]+)```/g;
  const parts = [];
  let lastIndex = 0;
  let match;

  while ((match = codeBlockRegex.exec(textStr)) !== null) {
    // Add text before code block
    if (match.index > lastIndex) {
      parts.push({
        type: 'text',
        content: textStr.substring(lastIndex, match.index)
      });
    }
    
    // Add code block with language
    parts.push({
      type: 'codeBlock',
      language: match[1] || 'plaintext',
      content: match[2] || match[1] // If no language specified, use match[1] as content
    });
    
    lastIndex = match.index + match[0].length;
  }

  // Add remaining text
  if (lastIndex < textStr.length) {
    parts.push({
      type: 'text',
      content: textStr.substring(lastIndex)
    });
  }

  // If no code blocks found, process the whole text
  if (parts.length === 0) {
    parts.push({
      type: 'text',
      content: textStr
    });
  }

  // Process inline code in text parts
  const processInlineCode = (text) => {
    const inlineCodeRegex = /`([^`]+)`/g;
    const segments = [];
    let lastIdx = 0;
    let inlineMatch;

    while ((inlineMatch = inlineCodeRegex.exec(text)) !== null) {
      // Add text before inline code
      if (inlineMatch.index > lastIdx) {
        segments.push({
          type: 'plain',
          content: text.substring(lastIdx, inlineMatch.index)
        });
      }
      
      // Add inline code
      segments.push({
        type: 'inlineCode',
        content: inlineMatch[1]
      });
      
      lastIdx = inlineMatch.index + inlineMatch[0].length;
    }

    // Add remaining text
    if (lastIdx < text.length) {
      segments.push({
        type: 'plain',
        content: text.substring(lastIdx)
      });
    }

    return segments.length > 0 ? segments : [{ type: 'plain', content: text }];
  };

  // Process each part for inline code
  const finalParts = [];
  parts.forEach(part => {
    if (part.type === 'text') {
      finalParts.push(...processInlineCode(part.content));
    } else {
      finalParts.push(part);
    }
  });

  return finalParts;
};

/**
 * React component to render formatted text with code
 */
export const FormattedText = ({ text, style = {} }) => {
  const parts = formatTextWithCode(text);

  // Language display names and colors
  const languageInfo = {
    javascript: { name: 'JavaScript', color: '#f7df1e', bg: '#2d3748' },
    python: { name: 'Python', color: '#3776ab', bg: '#1e1e1e' },
    java: { name: 'Java', color: '#007396', bg: '#2d3748' },
    cpp: { name: 'C++', color: '#00599c', bg: '#2d3748' },
    c: { name: 'C', color: '#a8b9cc', bg: '#2d3748' },
    html: { name: 'HTML', color: '#e34c26', bg: '#2d3748' },
    css: { name: 'CSS', color: '#264de4', bg: '#2d3748' },
    sql: { name: 'SQL', color: '#00758f', bg: '#2d3748' },
    plaintext: { name: 'Code', color: '#a0aec0', bg: '#2d3748' }
  };

  return (
    <span style={style}>
      {parts.map((part, index) => {
        if (part.type === 'codeBlock') {
          const lang = part.language || 'plaintext';
          const info = languageInfo[lang.toLowerCase()] || languageInfo.plaintext;
          
          return (
            <div
              key={index}
              style={{
                margin: '12px 0',
                borderRadius: '8px',
                overflow: 'hidden',
                border: '1px solid #4a5568'
              }}
            >
              {/* Language label */}
              <div
                style={{
                  backgroundColor: '#1a202c',
                  color: info.color,
                  padding: '6px 12px',
                  fontSize: '11px',
                  fontWeight: '600',
                  textTransform: 'uppercase',
                  letterSpacing: '0.5px',
                  borderBottom: '1px solid #4a5568'
                }}
              >
                {info.name}
              </div>
              {/* Code content */}
              <pre
                style={{
                  backgroundColor: info.bg,
                  color: '#f7fafc',
                  padding: '16px',
                  margin: 0,
                  overflow: 'auto',
                  fontSize: '13px',
                  fontFamily: 'Consolas, Monaco, "Courier New", monospace',
                  lineHeight: '1.6',
                  whiteSpace: 'pre-wrap',
                  wordBreak: 'break-word'
                }}
              >
                <code>{part.content.trim()}</code>
              </pre>
            </div>
          );
        } else if (part.type === 'inlineCode') {
          return (
            <code
              key={index}
              style={{
                backgroundColor: '#edf2f7',
                color: '#c7254e',
                padding: '2px 6px',
                borderRadius: '3px',
                fontSize: '0.9em',
                fontFamily: 'Consolas, Monaco, "Courier New", monospace',
                border: '1px solid #e2e8f0'
              }}
            >
              {part.content}
            </code>
          );
        } else {
          return <span key={index}>{part.content}</span>;
        }
      })}
    </span>
  );
};
