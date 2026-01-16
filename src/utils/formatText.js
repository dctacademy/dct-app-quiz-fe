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
 * Simple syntax highlighter for code blocks
 */
const highlightCode = (code, language) => {
  if (!code) return code;
  
  const lang = (language || 'plaintext').toLowerCase();
  
  // Define syntax patterns for different languages
  const patterns = {
    javascript: [
      { regex: /(\/\/.*$|\/\*[\s\S]*?\*\/)/gm, style: { color: '#6a9955' } }, // Comments
      { regex: /\b(const|let|var|function|return|if|else|for|while|class|import|export|from|async|await|try|catch|new|this|super|extends|static|get|set|break|continue|switch|case|default|throw|typeof|instanceof|delete|void|yield|debugger|with|in|of)\b/g, style: { color: '#569cd6' } }, // Keywords
      { regex: /\b(true|false|null|undefined|NaN|Infinity)\b/g, style: { color: '#569cd6' } }, // Constants
      { regex: /(['"`])(?:(?=(\\?))\2.)*?\1/g, style: { color: '#ce9178' } }, // Strings
      { regex: /\b\d+\.?\d*\b/g, style: { color: '#b5cea8' } }, // Numbers
      { regex: /\b([A-Z][a-zA-Z0-9]*)\b/g, style: { color: '#4ec9b0' } }, // Classes/Types
      { regex: /([a-zA-Z_$][a-zA-Z0-9_$]*)\s*\(/g, style: { color: '#dcdcaa' }, group: 1 } // Functions
    ],
    python: [
      { regex: /(#.*$)/gm, style: { color: '#6a9955' } }, // Comments
      { regex: /\b(def|class|import|from|as|if|elif|else|for|while|return|try|except|finally|with|lambda|yield|async|await|pass|break|continue|raise|assert|del|global|nonlocal|in|is|and|or|not)\b/g, style: { color: '#569cd6' } }, // Keywords
      { regex: /\b(True|False|None)\b/g, style: { color: '#569cd6' } }, // Constants
      { regex: /('''[\s\S]*?'''|"""[\s\S]*?"""|'(?:[^'\\]|\\.)*'|"(?:[^"\\]|\\.)*")/g, style: { color: '#ce9178' } }, // Strings
      { regex: /\b\d+\.?\d*\b/g, style: { color: '#b5cea8' } }, // Numbers
      { regex: /\b([A-Z][a-zA-Z0-9]*)\b/g, style: { color: '#4ec9b0' } }, // Classes
      { regex: /([a-zA-Z_][a-zA-Z0-9_]*)\s*\(/g, style: { color: '#dcdcaa' }, group: 1 } // Functions
    ],
    java: [
      { regex: /(\/\/.*$|\/\*[\s\S]*?\*\/)/gm, style: { color: '#6a9955' } }, // Comments
      { regex: /\b(public|private|protected|static|final|abstract|class|interface|extends|implements|import|package|new|return|if|else|for|while|do|switch|case|default|break|continue|try|catch|finally|throw|throws|synchronized|volatile|transient|native|strictfp|super|this|void|boolean|byte|char|short|int|long|float|double)\b/g, style: { color: '#569cd6' } }, // Keywords
      { regex: /\b(true|false|null)\b/g, style: { color: '#569cd6' } }, // Constants
      { regex: /"(?:[^"\\]|\\.)*"/g, style: { color: '#ce9178' } }, // Strings
      { regex: /\b\d+\.?\d*[fFdDlL]?\b/g, style: { color: '#b5cea8' } }, // Numbers
      { regex: /\b([A-Z][a-zA-Z0-9]*)\b/g, style: { color: '#4ec9b0' } }, // Classes/Types
      { regex: /([a-zA-Z_][a-zA-Z0-9_]*)\s*\(/g, style: { color: '#dcdcaa' }, group: 1 } // Functions
    ],
    cpp: [
      { regex: /(\/\/.*$|\/\*[\s\S]*?\*\/)/gm, style: { color: '#6a9955' } }, // Comments
      { regex: /\b(auto|break|case|char|const|continue|default|do|double|else|enum|extern|float|for|goto|if|inline|int|long|register|restrict|return|short|signed|sizeof|static|struct|switch|typedef|union|unsigned|void|volatile|while|bool|class|private|protected|public|namespace|using|virtual|override|final|nullptr|constexpr|template|typename)\b/g, style: { color: '#569cd6' } }, // Keywords
      { regex: /\b(true|false|nullptr|NULL)\b/g, style: { color: '#569cd6' } }, // Constants
      { regex: /"(?:[^"\\]|\\.)*"/g, style: { color: '#ce9178' } }, // Strings
      { regex: /\b\d+\.?\d*[fFlLuU]?\b/g, style: { color: '#b5cea8' } }, // Numbers
      { regex: /\b([A-Z][a-zA-Z0-9]*)\b/g, style: { color: '#4ec9b0' } }, // Classes/Types
      { regex: /([a-zA-Z_][a-zA-Z0-9_]*)\s*\(/g, style: { color: '#dcdcaa' }, group: 1 } // Functions
    ],
    c: [
      { regex: /(\/\/.*$|\/\*[\s\S]*?\*\/)/gm, style: { color: '#6a9955' } }, // Comments
      { regex: /\b(auto|break|case|char|const|continue|default|do|double|else|enum|extern|float|for|goto|if|inline|int|long|register|restrict|return|short|signed|sizeof|static|struct|switch|typedef|union|unsigned|void|volatile|while)\b/g, style: { color: '#569cd6' } }, // Keywords
      { regex: /\b(true|false|NULL)\b/g, style: { color: '#569cd6' } }, // Constants
      { regex: /"(?:[^"\\]|\\.)*"/g, style: { color: '#ce9178' } }, // Strings
      { regex: /\b\d+\.?\d*[fFlLuU]?\b/g, style: { color: '#b5cea8' } }, // Numbers
      { regex: /([a-zA-Z_][a-zA-Z0-9_]*)\s*\(/g, style: { color: '#dcdcaa' }, group: 1 } // Functions
    ],
    html: [
      { regex: /(&lt;!--[\s\S]*?--&gt;|<!--[\s\S]*?-->)/g, style: { color: '#6a9955' } }, // Comments
      { regex: /(&lt;\/?[\w-]+)/g, style: { color: '#569cd6' } }, // Tags
      { regex: /(<\/?[\w-]+)/g, style: { color: '#569cd6' } }, // Tags
      { regex: /\s([\w-]+)=/g, style: { color: '#9cdcfe' }, group: 1 }, // Attributes
      { regex: /="([^"]*)"/g, style: { color: '#ce9178' } }, // Attribute values
      { regex: /='([^']*)'/g, style: { color: '#ce9178' } } // Attribute values
    ],
    css: [
      { regex: /(\/\*[\s\S]*?\*\/)/g, style: { color: '#6a9955' } }, // Comments
      { regex: /([.#]?[\w-]+)\s*\{/g, style: { color: '#d7ba7d' }, group: 1 }, // Selectors
      { regex: /([\w-]+):/g, style: { color: '#9cdcfe' }, group: 1 }, // Properties
      { regex: /:\s*([^;}\n]+)/g, style: { color: '#ce9178' }, group: 1 } // Values
    ],
    sql: [
      { regex: /(--.*$)/gm, style: { color: '#6a9955' } }, // Comments
      { regex: /\b(SELECT|FROM|WHERE|INSERT|UPDATE|DELETE|CREATE|ALTER|DROP|TABLE|DATABASE|INDEX|JOIN|LEFT|RIGHT|INNER|OUTER|ON|AND|OR|NOT|NULL|PRIMARY|KEY|FOREIGN|REFERENCES|AS|ORDER|BY|GROUP|HAVING|LIMIT|OFFSET|UNION|DISTINCT|COUNT|SUM|AVG|MAX|MIN|LIKE|IN|BETWEEN|EXISTS|CASE|WHEN|THEN|ELSE|END)\b/gi, style: { color: '#569cd6' } }, // Keywords
      { regex: /\b(INT|VARCHAR|TEXT|DATE|DATETIME|BOOLEAN|FLOAT|DOUBLE|DECIMAL|CHAR|BLOB)\b/gi, style: { color: '#4ec9b0' } }, // Types
      { regex: /'(?:[^'\\]|\\.)*'/g, style: { color: '#ce9178' } }, // Strings
      { regex: /\b\d+\.?\d*\b/g, style: { color: '#b5cea8' } } // Numbers
    ]
  };

  const langPatterns = patterns[lang] || [];
  if (langPatterns.length === 0) {
    return [{ text: code, style: {} }];
  }

  // Track which characters have been matched to avoid overlapping
  const segments = [{ text: code, style: {}, start: 0, end: code.length }];
  
  langPatterns.forEach(pattern => {
    const newSegments = [];
    
    segments.forEach(segment => {
      if (Object.keys(segment.style).length > 0) {
        // Already styled, keep as is
        newSegments.push(segment);
        return;
      }

      let lastIndex = 0;
      const matches = [];
      let match;
      
      while ((match = pattern.regex.exec(segment.text)) !== null) {
        const matchText = pattern.group ? match[pattern.group] : match[0];
        const matchIndex = pattern.group ? segment.text.indexOf(matchText, match.index) : match.index;
        
        matches.push({
          index: matchIndex,
          text: matchText,
          style: pattern.style
        });
      }

      if (matches.length === 0) {
        newSegments.push(segment);
        return;
      }

      matches.forEach((m, i) => {
        // Add unstyled text before match
        if (m.index > lastIndex) {
          newSegments.push({
            text: segment.text.substring(lastIndex, m.index),
            style: {}
          });
        }
        
        // Add styled match
        newSegments.push({
          text: m.text,
          style: m.style
        });
        
        lastIndex = m.index + m.text.length;
      });

      // Add remaining unstyled text
      if (lastIndex < segment.text.length) {
        newSegments.push({
          text: segment.text.substring(lastIndex),
          style: {}
        });
      }
    });

    segments.length = 0;
    segments.push(...newSegments);
  });

  return segments;
};

/**
 * React component to render formatted text with code
 */
export const FormattedText = ({ text, style = {} }) => {
  const parts = formatTextWithCode(text);

  // Language display names and colors
  const languageInfo = {
    javascript: { name: 'JavaScript', color: '#f7df1e', bg: '#1e1e1e' },
    python: { name: 'Python', color: '#3776ab', bg: '#1e1e1e' },
    java: { name: 'Java', color: '#007396', bg: '#1e1e1e' },
    cpp: { name: 'C++', color: '#00599c', bg: '#1e1e1e' },
    c: { name: 'C', color: '#a8b9cc', bg: '#1e1e1e' },
    html: { name: 'HTML', color: '#e34c26', bg: '#1e1e1e' },
    css: { name: 'CSS', color: '#264de4', bg: '#1e1e1e' },
    sql: { name: 'SQL', color: '#00758f', bg: '#1e1e1e' },
    plaintext: { name: 'Code', color: '#a0aec0', bg: '#1e1e1e' }
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
                  color: '#d4d4d4',
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
                <code>
                  {highlightCode(part.content.trim(), part.language).map((segment, segIdx) => (
                    <span key={segIdx} style={segment.style}>
                      {segment.text}
                    </span>
                  ))}
                </code>
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
