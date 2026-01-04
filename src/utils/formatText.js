/**
 * Formats text to render code snippets properly
 * Supports both inline code (`code`) and code blocks (```code```)
 */
export const formatTextWithCode = (text) => {
  if (!text) return text;

  // Convert to string if not already
  const textStr = String(text);

  // Split by code blocks first (```code```)
  const codeBlockRegex = /```([^`]+)```/g;
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
    
    // Add code block
    parts.push({
      type: 'codeBlock',
      content: match[1]
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

  return (
    <span style={style}>
      {parts.map((part, index) => {
        if (part.type === 'codeBlock') {
          return (
            <pre
              key={index}
              style={{
                backgroundColor: '#2d3748',
                color: '#f7fafc',
                padding: '12px',
                borderRadius: '6px',
                overflow: 'auto',
                fontSize: '13px',
                fontFamily: 'Consolas, Monaco, "Courier New", monospace',
                margin: '8px 0',
                lineHeight: '1.5',
                whiteSpace: 'pre-wrap',
                wordBreak: 'break-word'
              }}
            >
              <code>{part.content}</code>
            </pre>
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
