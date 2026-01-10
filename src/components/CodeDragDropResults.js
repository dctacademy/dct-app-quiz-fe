import React from 'react';
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter';
import { vscDarkPlus } from 'react-syntax-highlighter/dist/esm/styles/prism';

// Simple syntax highlighter for inline code
const highlightCodeInline = (code, language = 'javascript') => {
  // Keywords
  const keywords = {
    javascript: ['const', 'let', 'var', 'function', 'return', 'if', 'else', 'for', 'while', 'import', 'export', 'default', 'class', 'extends', 'new', 'this', 'async', 'await', 'try', 'catch', 'throw', 'typeof', 'instanceof'],
    python: ['def', 'class', 'import', 'from', 'return', 'if', 'elif', 'else', 'for', 'while', 'try', 'except', 'finally', 'with', 'as', 'pass', 'break', 'continue', 'lambda', 'yield'],
    java: ['public', 'private', 'protected', 'class', 'interface', 'extends', 'implements', 'new', 'return', 'if', 'else', 'for', 'while', 'try', 'catch', 'finally', 'throw', 'throws', 'void', 'int', 'String', 'boolean', 'static', 'final']
  };

  const langKeywords = keywords[language] || keywords.javascript;
  
  // Split by words and apply highlighting
  const parts = [];
  let remaining = code;
  let key = 0;
  
  while (remaining.length > 0) {
    let matched = false;
    
    // Check for strings
    if (remaining[0] === '"' || remaining[0] === "'" || remaining[0] === '`') {
      const quote = remaining[0];
      let end = 1;
      while (end < remaining.length && remaining[end] !== quote) {
        if (remaining[end] === '\\') end++;
        end++;
      }
      if (end < remaining.length) end++;
      parts.push(<span key={key++} style={{ color: '#ce9178' }}>{remaining.substring(0, end)}</span>);
      remaining = remaining.substring(end);
      matched = true;
    }
    
    // Check for numbers
    if (!matched && /^\d+/.test(remaining)) {
      const match = remaining.match(/^\d+(\.\d+)?/);
      if (match) {
        parts.push(<span key={key++} style={{ color: '#b5cea8' }}>{match[0]}</span>);
        remaining = remaining.substring(match[0].length);
        matched = true;
      }
    }
    
    // Check for keywords
    if (!matched) {
      for (const keyword of langKeywords) {
        if (remaining.startsWith(keyword) && (remaining.length === keyword.length || !/[a-zA-Z0-9_]/.test(remaining[keyword.length]))) {
          parts.push(<span key={key++} style={{ color: '#569cd6' }}>{keyword}</span>);
          remaining = remaining.substring(keyword.length);
          matched = true;
          break;
        }
      }
    }
    
    // Check for comments
    if (!matched && remaining.startsWith('//')) {
      const end = remaining.indexOf('\n');
      const comment = end === -1 ? remaining : remaining.substring(0, end);
      parts.push(<span key={key++} style={{ color: '#6a9955' }}>{comment}</span>);
      remaining = remaining.substring(comment.length);
      matched = true;
    }
    
    // Default: add character
    if (!matched) {
      parts.push(remaining[0]);
      remaining = remaining.substring(1);
    }
  }
  
  return parts;
};

function CodeDragDropResults({ question, userAnswer, codeDragDropGrading }) {
  if (!codeDragDropGrading || !question.codeTemplate) {
    return (
      <div style={{ padding: '16px', backgroundColor: '#fff5f5', borderRadius: '8px', border: '1px solid #fc8181' }}>
        <p style={{ color: '#c53030', margin: 0 }}>No grading information available.</p>
      </div>
    );
  }

  const { totalBlanks, correctBlanks, percentageCorrect, blanks } = codeDragDropGrading;

  // Render code with filled blanks showing correct/incorrect
  const renderCodeWithResults = () => {
    const parts = [];
    let remainingCode = question.codeTemplate;
    
    // Sort blanks by their first occurrence position in the code template
    const blanksWithPositions = question.blanks
      .map(blank => ({
        blank,
        position: question.codeTemplate.indexOf(blank.placeholder),
        placeholder: blank.placeholder
      }))
      .filter(item => item.position !== -1)
      .sort((a, b) => a.position - b.position);
    
    // Process each blank in order of appearance
    blanksWithPositions.forEach(({ blank, placeholder }) => {
      const index = remainingCode.indexOf(placeholder);
      if (index !== -1) {
        // Add text before the blank
        if (index > 0) {
          parts.push({ type: 'text', content: remainingCode.substring(0, index) });
        }
        
        // Find the grading result for this blank
        const blankResult = blanks.find(b => b.blankId === blank.id);
        
        // Add the blank with result
        parts.push({ 
          type: 'blank', 
          blank: blank,
          result: blankResult
        });
        
        // Update remaining text (remove the placeholder we just processed)
        remainingCode = remainingCode.substring(index + placeholder.length);
      }
    });
    
    // Add any remaining text
    if (remainingCode) {
      parts.push({ type: 'text', content: remainingCode });
    }
    
    return parts;
  };

  return (
    <div>
      {/* Score Summary */}
      <div style={{
        padding: '16px',
        marginBottom: '20px',
        backgroundColor: percentageCorrect >= 60 ? '#f0fff4' : '#fff5f5',
        borderRadius: '8px',
        border: `2px solid ${percentageCorrect >= 60 ? '#48bb78' : '#f56565'}`
      }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div>
            <h4 style={{ margin: 0, marginBottom: '8px', color: '#2d3748', fontSize: '16px' }}>
              {percentageCorrect >= 60 ? '✅ Passed' : '❌ Did Not Pass'}
            </h4>
            <p style={{ margin: 0, fontSize: '14px', color: '#718096' }}>
              Score: <strong>{correctBlanks}/{totalBlanks}</strong> blanks correct ({percentageCorrect}%)
            </p>
          </div>
          <div style={{
            fontSize: '32px',
            fontWeight: '700',
            color: percentageCorrect >= 60 ? '#22543d' : '#742a2a'
          }}>
            {percentageCorrect}%
          </div>
        </div>
      </div>

      {/* Code with Color-Coded Blanks */}
      <div style={{ marginBottom: '20px' }}>
        <h4 style={{ marginBottom: '12px', fontSize: '14px', fontWeight: '600', color: '#2d3748' }}>
          Your Submission:
        </h4>
        <div
          style={{
            backgroundColor: '#1a202c',
            color: '#e2e8f0',
            padding: '16px',
            borderRadius: '8px',
            overflow: 'auto'
          }}
        >
          <pre style={{
            margin: 0,
            fontFamily: 'Monaco, Consolas, monospace',
            fontSize: '13px',
            lineHeight: '1.8',
            whiteSpace: 'pre-wrap'
          }}>
            {renderCodeWithResults().map((part, index) => {
              if (part.type === 'text') {
                return <span key={`text-${index}`}>{highlightCodeInline(part.content, question.language)}</span>;
              } else {
                const result = part.result;
                const isCorrect = result?.isCorrect;
                const userAns = result?.userAnswer || '[Not answered]';
                
                return (
                  <span
                    key={`blank-${part.blank.id}-${index}`}
                    style={{
                      display: 'inline-block',
                      minWidth: '100px',
                      padding: '4px 10px',
                      margin: '0 4px',
                      border: isCorrect ? '2px solid #48bb78' : '2px solid #f56565',
                      borderRadius: '4px',
                      backgroundColor: isCorrect ? '#c6f6d5' : '#fed7d7',
                      verticalAlign: 'middle'
                    }}
                  >
                    <code style={{ 
                      color: isCorrect ? '#22543d' : '#742a2a', 
                      fontWeight: '600' 
                    }}>
                      {userAns}
                    </code>
                    {isCorrect ? (
                      <span style={{ marginLeft: '6px', color: '#22543d' }}>✓</span>
                    ) : (
                      <span style={{ marginLeft: '6px', fontSize: '11px', color: '#742a2a' }}>
                        (expected: {part.blank.correctAnswer})
                      </span>
                    )}
                  </span>
                );
              }
            })}
          </pre>
        </div>
      </div>

      {/* Detailed Results Table */}
      <div style={{ marginBottom: '20px' }}>
        <h4 style={{ marginBottom: '12px', fontSize: '14px', fontWeight: '600', color: '#2d3748' }}>
          Detailed Results:
        </h4>
        <div style={{ overflowX: 'auto' }}>
          <table style={{
            width: '100%',
            borderCollapse: 'collapse',
            backgroundColor: 'white',
            borderRadius: '8px',
            overflow: 'hidden',
            border: '1px solid #e2e8f0'
          }}>
            <thead>
              <tr style={{ backgroundColor: '#f7fafc' }}>
                <th style={{ padding: '12px', textAlign: 'left', borderBottom: '2px solid #e2e8f0', fontSize: '13px', fontWeight: '600', color: '#4a5568' }}>
                  Blank
                </th>
                <th style={{ padding: '12px', textAlign: 'left', borderBottom: '2px solid #e2e8f0', fontSize: '13px', fontWeight: '600', color: '#4a5568' }}>
                  Your Answer
                </th>
                <th style={{ padding: '12px', textAlign: 'left', borderBottom: '2px solid #e2e8f0', fontSize: '13px', fontWeight: '600', color: '#4a5568' }}>
                  Correct Answer
                </th>
                <th style={{ padding: '12px', textAlign: 'center', borderBottom: '2px solid #e2e8f0', fontSize: '13px', fontWeight: '600', color: '#4a5568' }}>
                  Result
                </th>
              </tr>
            </thead>
            <tbody>
              {blanks.map((blankResult, index) => (
                <tr key={index} style={{ borderBottom: '1px solid #e2e8f0' }}>
                  <td style={{ padding: '12px', fontSize: '13px', fontFamily: 'Monaco, Consolas, monospace', color: '#4a5568' }}>
                    Blank {index + 1}
                  </td>
                  <td style={{
                    padding: '12px',
                    fontSize: '13px',
                    fontFamily: 'Monaco, Consolas, monospace',
                    fontWeight: '600',
                    color: blankResult.isCorrect ? '#22543d' : '#742a2a'
                  }}>
                    {blankResult.userAnswer}
                  </td>
                  <td style={{
                    padding: '12px',
                    fontSize: '13px',
                    fontFamily: 'Monaco, Consolas, monospace',
                    fontWeight: '600',
                    color: '#2f855a'
                  }}>
                    {blankResult.correctAnswer}
                  </td>
                  <td style={{ padding: '12px', textAlign: 'center' }}>
                    {blankResult.isCorrect ? (
                      <span style={{ color: '#48bb78', fontSize: '18px' }}>✓</span>
                    ) : (
                      <span style={{ color: '#f56565', fontSize: '18px' }}>✗</span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Explanation */}
      {question.explanation && (
        <div style={{
          padding: '16px',
          backgroundColor: '#f0f4ff',
          borderRadius: '8px',
          border: '1px solid #c3dafe'
        }}>
          <h4 style={{ margin: 0, marginBottom: '8px', fontSize: '14px', fontWeight: '600', color: '#2d3748' }}>
            💡 Explanation:
          </h4>
          <p style={{ margin: 0, fontSize: '13px', color: '#4a5568', lineHeight: '1.6' }}>
            {question.explanation}
          </p>
        </div>
      )}
    </div>
  );
}

export default CodeDragDropResults;
