import React, { useState, useEffect } from 'react';
import { DndContext, DragOverlay, useSensor, useSensors, PointerSensor } from '@dnd-kit/core';
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter';
import { vscDarkPlus } from 'react-syntax-highlighter/dist/esm/styles/prism';
import { FormattedText } from '../utils/formatText';

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

function CodeDragDropQuestion({ question, onAnswerChange, currentAnswer }) {
  const [filledBlanks, setFilledBlanks] = useState(currentAnswer || {});
  const [activeId, setActiveId] = useState(null);
  
  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 5,
      },
    })
  );

  useEffect(() => {
    if (currentAnswer) {
      setFilledBlanks(currentAnswer);
    }
  }, [currentAnswer]);

  // Auto-scroll when dragging near viewport edges
  useEffect(() => {
    if (!activeId) return;

    let scrollInterval;
    const handleMouseMove = (e) => {
      const scrollThreshold = 100;
      const scrollSpeed = 10;
      const { clientY } = e;
      const viewportHeight = window.innerHeight;

      // Clear any existing interval
      if (scrollInterval) {
        clearInterval(scrollInterval);
        scrollInterval = null;
      }

      // Scroll up when near top
      if (clientY < scrollThreshold) {
        scrollInterval = setInterval(() => {
          window.scrollBy(0, -scrollSpeed);
        }, 16);
      }
      // Scroll down when near bottom
      else if (clientY > viewportHeight - scrollThreshold) {
        scrollInterval = setInterval(() => {
          window.scrollBy(0, scrollSpeed);
        }, 16);
      }
    };

    window.addEventListener('mousemove', handleMouseMove);
    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      if (scrollInterval) clearInterval(scrollInterval);
    };
  }, [activeId]);

  const handleDragStart = (event) => {
    setActiveId(event.active.id);
  };

  const handleDragEnd = (event) => {
    const { active, over } = event;
    
    if (over && over.id.startsWith('blank-')) {
      const blankId = parseInt(over.id.replace('blank-', ''));
      const newFilledBlanks = {
        ...filledBlanks,
        [blankId]: active.id
      };
      setFilledBlanks(newFilledBlanks);
      onAnswerChange(newFilledBlanks);
    }
    
    setActiveId(null);
  };

  const handleRemoveOption = (blankId) => {
    const newFilledBlanks = { ...filledBlanks };
    delete newFilledBlanks[blankId];
    setFilledBlanks(newFilledBlanks);
    onAnswerChange(newFilledBlanks);
  };

  const renderCodeWithBlanks = () => {
    let codeLines = question.codeTemplate.split('\n');
    
    return codeLines.map((line, lineIndex) => {
      let parts = [];
      let remaining = line;
      let lastIndex = 0;
      
      // Find all blank placeholders in this line
      question.blanks.forEach((blank) => {
        const index = remaining.indexOf(blank.placeholder);
        if (index !== -1) {
          // Add text before blank
          if (index > 0) {
            parts.push({
              type: 'text',
              content: remaining.substring(0, index)
            });
          }
          
          // Add blank
          parts.push({
            type: 'blank',
            blankId: blank.id
          });
          
          remaining = remaining.substring(index + blank.placeholder.length);
        }
      });
      
      // Add any remaining text
      if (remaining) {
        parts.push({
          type: 'text',
          content: remaining
        });
      }
      
      // If no parts, just add the whole line
      if (parts.length === 0) {
        parts.push({
          type: 'text',
          content: line
        });
      }
      
      return (
        <div key={lineIndex} style={{ minHeight: '24px', lineHeight: '24px', fontFamily: 'Monaco, Consolas, monospace', fontSize: '13px' }}>
          {parts.map((part, partIndex) => {
            if (part.type === 'text') {
              return <span key={partIndex}>{part.content}</span>;
            } else {
              return (
                <Droppable key={partIndex} id={`blank-${part.blankId}`}>
                  <div
                    style={{
                      display: 'inline-block',
                      minWidth: '100px',
                      padding: '2px 8px',
                      margin: '0 2px',
                      border: filledBlanks[part.blankId] ? '2px solid #48bb78' : '2px dashed #667eea',
                      borderRadius: '4px',
                      backgroundColor: filledBlanks[part.blankId] ? '#f0fff4' : '#eef2ff',
                      cursor: 'pointer',
                      position: 'relative',
                      verticalAlign: 'middle'
                    }}
                  >
                    {filledBlanks[part.blankId] ? (
                      <span style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                        <code style={{ color: '#2f855a', fontWeight: '600' }}>{filledBlanks[part.blankId]}</code>
                        <button
                          onClick={() => handleRemoveOption(part.blankId)}
                          style={{
                            marginLeft: '6px',
                            padding: '0 4px',
                            backgroundColor: 'transparent',
                            border: 'none',
                            color: '#f56565',
                            cursor: 'pointer',
                            fontSize: '12px'
                          }}
                        >
                          ✕
                        </button>
                      </span>
                    ) : (
                      <span style={{ color: '#667eea', fontSize: '11px' }}>Drop here</span>
                    )}
                  </div>
                </Droppable>
              );
            }
          })}
        </div>
      );
    });
  };

  const filledCount = Object.keys(filledBlanks).length;
  const totalBlanks = question.blanks?.length || 0;

  return (
    <div>
      <DndContext
        sensors={sensors}
        onDragStart={handleDragStart}
        onDragEnd={handleDragEnd}
      >
        {/* Question Text */}
        {question.question && (
          <div style={{ marginBottom: '16px' }}>
            <h4 style={{ 
              margin: 0, 
              fontSize: '15px', 
              fontWeight: '600', 
              color: '#2d3748',
              lineHeight: '1.6'
            }}>
              <FormattedText text={question.question} />
            </h4>
          </div>
        )}

        {/* Code Display */}
        <div style={{ marginBottom: '20px' }}>
          <div style={{
            backgroundColor: '#1a202c',
            color: '#e2e8f0',
            padding: '16px',
            borderRadius: '8px',
            overflow: 'auto',
            fontSize: '13px',
            lineHeight: '1.6',
            fontFamily: 'Monaco, Consolas, "Courier New", monospace'
          }}>
            {renderCodeWithBlanks()}
          </div>
        </div>

        {/* Options */}
        <div style={{ marginBottom: '16px' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '12px' }}>
            <h4 style={{ margin: 0, fontSize: '14px', fontWeight: '600', color: '#2d3748' }}>
              Available Options (drag to blanks):
            </h4>
            <span style={{ fontSize: '13px', color: '#718096' }}>
              {filledCount}/{totalBlanks}
            </span>
          </div>
          
          <div style={{
            display: 'flex',
            flexWrap: 'wrap',
            gap: '10px',
            padding: '16px',
            backgroundColor: '#f7fafc',
            borderRadius: '8px',
            border: '2px solid #e2e8f0'
          }}>
            {question.options?.map((option) => (
              <Draggable key={option} id={option}>
                <div
                  style={{
                    padding: '10px 14px',
                    backgroundColor: 'white',
                    border: '2px solid #667eea',
                    borderRadius: '6px',
                    cursor: 'grab',
                    fontSize: '13px',
                    fontFamily: 'Monaco, Consolas, monospace',
                    fontWeight: '600',
                    color: '#2d3748',
                    transition: 'all 0.2s',
                    userSelect: 'none'
                  }}
                >
                  {option}
                </div>
              </Draggable>
            ))}
          </div>
          
          <small style={{ display: 'block', marginTop: '8px', color: '#718096', fontSize: '12px' }}>
            💡 Tip: Options can be reused. Drag near top/bottom edges to auto-scroll.
          </small>
        </div>

        {/* Drag Overlay */}
        <DragOverlay>
          {activeId ? (
            <div style={{
              padding: '8px 14px',
              backgroundColor: 'white',
              border: '2px solid #667eea',
              borderRadius: '6px',
              fontSize: '13px',
              fontFamily: 'Monaco, Consolas, monospace',
              fontWeight: '600',
              color: '#2d3748',
              boxShadow: '0 4px 12px rgba(0,0,0,0.15)',
              opacity: 0.9
            }}>
              {activeId}
            </div>
          ) : null}
        </DragOverlay>
      </DndContext>
    </div>
  );
}

// Draggable Component
function Draggable({ id, children, onDragStateChange }) {
  const [isDraggingLocal, setIsDraggingLocal] = useState(false);
  
  return (
    <div
      draggable
      onDragStart={(e) => {
        e.dataTransfer.effectAllowed = 'move';
        e.dataTransfer.setData('text/plain', id);
        setIsDraggingLocal(true);
        if (onDragStateChange) onDragStateChange(true);
      }}
      onDragEnd={() => {
        setIsDraggingLocal(false);
        if (onDragStateChange) onDragStateChange(false);
      }}
      style={{ opacity: isDraggingLocal ? 0.5 : 1 }}
    >
      {children}
    </div>
  );
}

// Droppable Component
function Droppable({ id, children }) {
  const [isOver, setIsOver] = useState(false);
  
  return (
    <span
      onDragOver={(e) => {
        e.preventDefault();
        e.stopPropagation();
        setIsOver(true);
      }}
      onDragLeave={(e) => {
        e.stopPropagation();
        setIsOver(false);
      }}
      onDrop={(e) => {
        e.preventDefault();
        e.stopPropagation();
        const optionId = e.dataTransfer.getData('text/plain');
        const blankId = parseInt(id.replace('blank-', ''), 10);
        // Trigger the parent's drop handler with numeric ID
        const event = new CustomEvent('codedrop', {
          detail: { optionId, blankId }
        });
        window.dispatchEvent(event);
        setIsOver(false);
      }}
      style={{
        outline: isOver ? '2px solid #667eea' : 'none',
        borderRadius: '4px'
      }}
    >
      {children}
    </span>
  );
}

// Simplified version using native drag and drop (fallback)
function CodeDragDropQuestionSimple({ question, onAnswerChange, currentAnswer }) {
  const [filledBlanks, setFilledBlanks] = useState(currentAnswer || {});
  const [isDragging, setIsDragging] = useState(false);

  useEffect(() => {
    if (currentAnswer) {
      setFilledBlanks(currentAnswer);
    }
  }, [currentAnswer]);

  useEffect(() => {
    // Listen for custom drop events
    const handleCustomDrop = (e) => {
      const { optionId, blankId } = e.detail;
      const numericBlankId = parseInt(blankId, 10);
      
      setFilledBlanks(prev => {
        const newFilledBlanks = {
          ...prev,
          [numericBlankId]: optionId
        };
        onAnswerChange(newFilledBlanks);
        return newFilledBlanks;
      });
    };

    window.addEventListener('codedrop', handleCustomDrop);
    return () => window.removeEventListener('codedrop', handleCustomDrop);
  }, [onAnswerChange]);

  // Auto-scroll when dragging near viewport edges
  useEffect(() => {
    if (!isDragging) return;

    let scrollInterval;
    const handleDragOver = (e) => {
      const scrollThreshold = 100;
      const scrollSpeed = 10;
      const { clientY } = e;
      const viewportHeight = window.innerHeight;

      // Clear any existing interval
      if (scrollInterval) {
        clearInterval(scrollInterval);
        scrollInterval = null;
      }

      // Scroll up when near top
      if (clientY < scrollThreshold) {
        scrollInterval = setInterval(() => {
          window.scrollBy(0, -scrollSpeed);
        }, 16);
      }
      // Scroll down when near bottom
      else if (clientY > viewportHeight - scrollThreshold) {
        scrollInterval = setInterval(() => {
          window.scrollBy(0, scrollSpeed);
        }, 16);
      }
    };

    window.addEventListener('dragover', handleDragOver);
    return () => {
      window.removeEventListener('dragover', handleDragOver);
      if (scrollInterval) clearInterval(scrollInterval);
    };
  }, [isDragging]);

  const handleRemoveOption = (blankId) => {
    const newFilledBlanks = { ...filledBlanks };
    delete newFilledBlanks[blankId];
    setFilledBlanks(newFilledBlanks);
    onAnswerChange(newFilledBlanks);
  };

  const renderCodeWithBlanks = () => {
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
        
        // Add the blank
        parts.push({ type: 'blank', blank: blank });
        
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
      {/* Question Text */}
      {question.question && (
        <div style={{ marginBottom: '16px' }}>
          <h4 style={{ 
            margin: 0, 
            fontSize: '15px', 
            fontWeight: '600', 
            color: '#2d3748',
            lineHeight: '1.6'
          }}>
            <FormattedText text={question.question} />
          </h4>
        </div>
      )}

      {/* Code Display */}
      <div style={{ marginBottom: '20px' }}>
        <div style={{
          backgroundColor: '#1a202c',
          color: '#e2e8f0',
          padding: '16px',
          borderRadius: '8px',
          overflow: 'auto'
        }}>
          <pre style={{
            margin: 0,
            fontFamily: 'Monaco, Consolas, monospace',
            fontSize: '13px',
            lineHeight: '1.8',
            whiteSpace: 'pre-wrap'
          }}>
            {renderCodeWithBlanks().map((part, index) => {
              if (part.type === 'text') {
                return <span key={`text-${index}`}>{highlightCodeInline(part.content, question.language)}</span>;
              } else {
                const blank = part.blank;
                const blankId = blank.id;
                return (
                  <Droppable key={`blank-${blankId}-${index}`} id={`blank-${blankId}`}>
                    <span
                      style={{
                        display: 'inline-block',
                        minWidth: '100px',
                        padding: '4px 10px',
                        margin: '0 4px',
                        border: filledBlanks[blankId] !== undefined ? '2px solid #48bb78' : '2px dashed #667eea',
                        borderRadius: '4px',
                        backgroundColor: filledBlanks[blankId] !== undefined ? '#f0fff4' : '#eef2ff',
                        verticalAlign: 'middle'
                      }}
                    >
                      {filledBlanks[blankId] !== undefined ? (
                        <span style={{ display: 'inline-flex', alignItems: 'center' }}>
                          <code style={{ color: '#2f855a', fontWeight: '600' }}>{filledBlanks[blankId]}</code>
                          <button
                            onClick={() => handleRemoveOption(blankId)}
                            style={{
                              marginLeft: '6px',
                              padding: '0 4px',
                              backgroundColor: 'transparent',
                              border: 'none',
                              color: '#f56565',
                              cursor: 'pointer',
                              fontSize: '12px'
                            }}
                          >
                            ✕
                          </button>
                        </span>
                      ) : (
                        <span style={{ color: '#667eea', fontSize: '11px' }}>Drop here</span>
                      )}
                    </span>
                  </Droppable>
                );
              }
            })}
          </pre>
        </div>
      </div>

      {/* Options */}
      <div style={{ marginBottom: '16px' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '12px' }}>
          <h4 style={{ margin: 0, fontSize: '14px', fontWeight: '600', color: '#2d3748' }}>
            Available Options (drag to blanks):
          </h4>
          <span style={{ fontSize: '13px', color: '#718096' }}>
            Filled: {Object.keys(filledBlanks).length}/{question.blanks?.length || 0}
          </span>
        </div>
        
        <div style={{
          display: 'flex',
          flexWrap: 'wrap',
          gap: '10px',
          padding: '16px',
          backgroundColor: '#f7fafc',
          borderRadius: '8px',
          border: '2px solid #e2e8f0'
        }}>
          {question.options?.map((option) => (
            <Draggable key={option} id={option} onDragStateChange={setIsDragging}>
              <div style={{
                padding: '10px 14px',
                backgroundColor: 'white',
                border: '2px solid #667eea',
                borderRadius: '6px',
                cursor: 'grab',
                fontSize: '13px',
                fontFamily: 'Monaco, Consolas, monospace',
                fontWeight: '600',
                color: '#2d3748',
                transition: 'all 0.2s',
                userSelect: 'none'
              }}>
                {option}
              </div>
            </Draggable>
          ))}
        </div>
        
        <small style={{ display: 'block', marginTop: '8px', color: '#718096', fontSize: '12px' }}>
          💡 Tip: Options can be reused. Drag near top/bottom edges to auto-scroll.
        </small>
      </div>
    </div>
  );
}

export default CodeDragDropQuestionSimple;
