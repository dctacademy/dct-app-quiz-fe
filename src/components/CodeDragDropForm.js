import React, { useState } from 'react';
import { quizAPI } from '../services/api';
import { FormattedText } from '../utils/formatText';

function CodeDragDropForm({ questions, onQuestionsChange }) {
  const [currentQuestion, setCurrentQuestion] = useState({
    question: '',
    language: 'javascript',
    rawCode: '',
    explanation: '',
    difficulty: 'Medium'
  });
  const [generating, setGenerating] = useState(false);
  const [previewQuestion, setPreviewQuestion] = useState(null);

  const extractBlanks = (code) => {
    const regex = /\*\*([^*]+)\*\*/g;
    const blanks = [];
    let match;
    
    while ((match = regex.exec(code)) !== null) {
      blanks.push(match[1]);
    }
    
    return blanks;
  };

  const handleGenerateDistractors = async (questionIndex = null) => {
    const questionToProcess = questionIndex !== null ? questions[questionIndex] : currentQuestion;
    
    if (!questionToProcess.rawCode || !questionToProcess.rawCode.includes('**')) {
      alert('Please add code with **text** markers for blanks');
      return;
    }

    setGenerating(true);
    try {
      const response = await quizAPI.generateCodeDistractors({
        codeSnippet: questionToProcess.rawCode,
        language: questionToProcess.language
      });

      const { correctAnswers, distractors, allOptions } = response.data;
      
      // Extract blanks in order and create unique placeholders
      const blanksData = [];
      let blankCounter = 0;
      
      const codeTemplate = questionToProcess.rawCode.replace(/\*\*([^*]+)\*\*/g, (match, content) => {
        const placeholder = `___BLANK_${blankCounter}___`;
        blanksData.push({
          id: blankCounter,
          correctAnswer: content,
          placeholder: placeholder,
          points: 1
        });
        blankCounter++;
        return placeholder;
      });

      const processedQuestion = {
        ...questionToProcess,
        codeTemplate,
        blanks: blanksData,
        correctAnswers: correctAnswers,
        options: allOptions || [...correctAnswers, ...distractors].sort(() => Math.random() - 0.5),
        distractors: distractors
      };

      if (questionIndex !== null) {
        const updated = [...questions];
        updated[questionIndex] = processedQuestion;
        onQuestionsChange(updated);
      } else {
        setCurrentQuestion(processedQuestion);
      }

      alert(`Generated ${distractors.length} distractors successfully!`);
    } catch (error) {
      console.error('Error generating distractors:', error);
      console.error('Full error:', error.response || error);
      alert(error.response?.data?.message || 'Failed to generate distractors. Check console for details.');
    } finally {
      setGenerating(false);
    }
  };

  const handleAddQuestion = () => {
    if (!currentQuestion.question || !currentQuestion.rawCode) {
      alert('Please fill in question text and code');
      return;
    }

    if (!currentQuestion.options || currentQuestion.options.length === 0) {
      alert('Please generate distractors first');
      return;
    }

    onQuestionsChange([...questions, currentQuestion]);
    setCurrentQuestion({
      question: '',
      language: 'javascript',
      rawCode: '',
      explanation: '',
      difficulty: 'Medium'
    });
  };

  const handleRemoveQuestion = (index) => {
    onQuestionsChange(questions.filter((_, i) => i !== index));
  };

  const handlePreview = (question) => {
    setPreviewQuestion(question);
  };

  const blanksCount = currentQuestion.rawCode ? extractBlanks(currentQuestion.rawCode).length : 0;

  return (
    <div style={{ marginTop: '20px', padding: '16px', border: '2px solid #667eea', borderRadius: '8px', backgroundColor: '#f7fafc' }}>
      <h4 style={{ color: '#667eea', marginBottom: '16px', fontSize: '16px', fontWeight: '600' }}>
        🧩 Code Drag & Drop Questions
      </h4>

      {/* Existing Questions List */}
      {questions.length > 0 && (
        <div style={{ marginBottom: '20px' }}>
          <h5 style={{ fontSize: '14px', fontWeight: '600', color: '#2d3748', marginBottom: '12px' }}>
            Added Questions ({questions.length})
          </h5>
          {questions.map((q, index) => (
            <div key={index} style={{ padding: '12px', backgroundColor: 'white', border: '1px solid #e2e8f0', borderRadius: '6px', marginBottom: '8px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'start' }}>
                <div style={{ flex: 1 }}>
                  <div style={{ fontWeight: '600', fontSize: '13px', color: '#2d3748', marginBottom: '4px' }}>
                    {index + 1}. {q.question}
                  </div>
                  <div style={{ fontSize: '11px', color: '#718096' }}>
                    Language: {q.language} | Blanks: {q.blanks?.length || 0} | Options: {q.options?.length || 0}
                  </div>
                </div>
                <div style={{ display: 'flex', gap: '8px' }}>
                  <button
                    type="button"
                    onClick={() => handlePreview(q)}
                    style={{ padding: '4px 8px', fontSize: '11px', backgroundColor: '#667eea', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer' }}
                  >
                    👁️ Preview
                  </button>
                  <button
                    type="button"
                    onClick={() => handleRemoveQuestion(index)}
                    style={{ padding: '4px 8px', fontSize: '11px', backgroundColor: '#f56565', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer' }}
                  >
                    ✕ Remove
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* New Question Form */}
      <div style={{ padding: '16px', backgroundColor: 'white', border: '1.5px solid #e2e8f0', borderRadius: '8px' }}>
        <h5 style={{ fontSize: '14px', fontWeight: '600', color: '#2d3748', marginBottom: '12px' }}>
          Add New Exercise
        </h5>

        <div style={{ marginBottom: '12px' }}>
          <label style={{ display: 'block', marginBottom: '6px', fontWeight: '500', fontSize: '13px', color: '#4a5568' }}>
            Question Text *
          </label>
          <input
            type="text"
            value={currentQuestion.question}
            onChange={(e) => setCurrentQuestion({ ...currentQuestion, question: e.target.value })}
            placeholder="e.g., Complete the function to get user's full name"
            style={{ width: '100%', padding: '8px 12px', border: '1px solid #e2e8f0', borderRadius: '6px', fontSize: '13px' }}
          />
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', marginBottom: '12px' }}>
          <div>
            <label style={{ display: 'block', marginBottom: '6px', fontWeight: '500', fontSize: '13px', color: '#4a5568' }}>
              Programming Language
            </label>
            <select
              value={currentQuestion.language}
              onChange={(e) => setCurrentQuestion({ ...currentQuestion, language: e.target.value })}
              style={{ width: '100%', padding: '8px 12px', border: '1px solid #e2e8f0', borderRadius: '6px', fontSize: '13px' }}
            >
              <option value="javascript">JavaScript</option>
              <option value="python">Python</option>
              <option value="java">Java</option>
              <option value="cpp">C++</option>
              <option value="csharp">C#</option>
              <option value="typescript">TypeScript</option>
              <option value="go">Go</option>
              <option value="rust">Rust</option>
              <option value="php">PHP</option>
              <option value="ruby">Ruby</option>
            </select>
          </div>
          <div>
            <label style={{ display: 'block', marginBottom: '6px', fontWeight: '500', fontSize: '13px', color: '#4a5568' }}>
              Difficulty
            </label>
            <select
              value={currentQuestion.difficulty}
              onChange={(e) => setCurrentQuestion({ ...currentQuestion, difficulty: e.target.value })}
              style={{ width: '100%', padding: '8px 12px', border: '1px solid #e2e8f0', borderRadius: '6px', fontSize: '13px' }}
            >
              <option value="Easy">Easy</option>
              <option value="Medium">Medium</option>
              <option value="Hard">Hard</option>
            </select>
          </div>
        </div>

        <div style={{ marginBottom: '12px' }}>
          <label style={{ display: 'block', marginBottom: '6px', fontWeight: '500', fontSize: '13px', color: '#4a5568' }}>
            Code with Blanks * <span style={{ fontSize: '11px', color: '#718096' }}>(Use **text** to mark blanks or select text and type **)</span>
          </label>
          <textarea
            value={currentQuestion.rawCode}
            onChange={(e) => setCurrentQuestion({ ...currentQuestion, rawCode: e.target.value })}
            onKeyDown={(e) => {
              // When user types '*' and there's selected text, wrap it with **
              if (e.key === '*' && e.target.selectionStart !== e.target.selectionEnd) {
                e.preventDefault();
                const start = e.target.selectionStart;
                const end = e.target.selectionEnd;
                const selectedText = e.target.value.substring(start, end);
                const beforeText = e.target.value.substring(0, start);
                const afterText = e.target.value.substring(end);
                const newText = beforeText + '**' + selectedText + '**' + afterText;
                
                setCurrentQuestion({ ...currentQuestion, rawCode: newText });
                
                // Set cursor position after the wrapped text
                setTimeout(() => {
                  e.target.setSelectionRange(start + selectedText.length + 4, start + selectedText.length + 4);
                }, 0);
              }
            }}
            placeholder={`function **getName**(user) {\n  return user.**name** + " " + user.**lastName**;\n}`}
            rows="8"
            style={{ width: '100%', padding: '10px 12px', border: '1px solid #e2e8f0', borderRadius: '6px', fontSize: '12px', fontFamily: 'monospace', backgroundColor: '#fafafa' }}
          />
          {blanksCount > 0 && (
            <small style={{ display: 'block', marginTop: '4px', color: '#155724', fontSize: '12px' }}>
              ✓ Found {blanksCount} blank{blanksCount > 1 ? 's' : ''}: {extractBlanks(currentQuestion.rawCode).join(', ')}
            </small>
          )}
          {currentQuestion.rawCode && blanksCount === 0 && (
            <small style={{ display: 'block', marginTop: '4px', color: '#f56565', fontSize: '12px' }}>
              ⚠️ No **text** markers found. Wrap answers in ** to create blanks.
            </small>
          )}
        </div>

        <div style={{ marginBottom: '12px' }}>
          <label style={{ display: 'block', marginBottom: '6px', fontWeight: '500', fontSize: '13px', color: '#4a5568' }}>
            Explanation (optional)
          </label>
          <textarea
            value={currentQuestion.explanation}
            onChange={(e) => setCurrentQuestion({ ...currentQuestion, explanation: e.target.value })}
            placeholder="Explain the correct solution..."
            rows="3"
            style={{ width: '100%', padding: '10px 12px', border: '1px solid #e2e8f0', borderRadius: '6px', fontSize: '13px' }}
          />
        </div>

        <div style={{ display: 'flex', gap: '12px' }}>
          <button
            type="button"
            onClick={() => handleGenerateDistractors()}
            disabled={generating || blanksCount === 0}
            style={{
              flex: 1,
              padding: '10px',
              backgroundColor: generating ? '#cbd5e0' : '#667eea',
              color: 'white',
              border: 'none',
              borderRadius: '6px',
              fontSize: '13px',
              fontWeight: '600',
              cursor: generating || blanksCount === 0 ? 'not-allowed' : 'pointer'
            }}
          >
            {generating ? '🔄 Generating...' : '🤖 Generate Distractors with AI'}
          </button>
          <button
            type="button"
            onClick={handleAddQuestion}
            disabled={!currentQuestion.options || currentQuestion.options.length === 0}
            style={{
              padding: '10px 20px',
              backgroundColor: (!currentQuestion.options || currentQuestion.options.length === 0) ? '#cbd5e0' : '#48bb78',
              color: 'white',
              border: 'none',
              borderRadius: '6px',
              fontSize: '13px',
              fontWeight: '600',
              cursor: (!currentQuestion.options || currentQuestion.options.length === 0) ? 'not-allowed' : 'pointer'
            }}
          >
            ➕ Add Question
          </button>
        </div>

        {currentQuestion.options && currentQuestion.options.length > 0 && (
          <div style={{ marginTop: '12px', padding: '10px', backgroundColor: '#f0fff4', border: '1px solid #48bb78', borderRadius: '6px' }}>
            <div style={{ fontSize: '12px', fontWeight: '600', color: '#2f855a', marginBottom: '4px' }}>
              ✓ Distractors Generated
            </div>
            <div style={{ fontSize: '11px', color: '#276749' }}>
              Options: {currentQuestion.options.join(', ')}
            </div>
          </div>
        )}
      </div>

      {/* Preview Modal */}
      {previewQuestion && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          backgroundColor: 'rgba(0,0,0,0.5)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 1000
        }} onClick={() => setPreviewQuestion(null)}>
          <div style={{
            backgroundColor: 'white',
            padding: '24px',
            borderRadius: '12px',
            maxWidth: '800px',
            maxHeight: '80vh',
            overflow: 'auto',
            width: '90%'
          }} onClick={(e) => e.stopPropagation()}>
            <h3 style={{ marginBottom: '16px', color: '#667eea' }}>👁️ Preview: <FormattedText text={previewQuestion.question} /></h3>
            
            <div style={{ marginBottom: '16px' }}>
              <div style={{ fontSize: '14px', fontWeight: '600', marginBottom: '8px' }}>Code:</div>
              <pre style={{
                backgroundColor: '#1a202c',
                color: '#e2e8f0',
                padding: '16px',
                borderRadius: '8px',
                overflow: 'auto',
                fontSize: '12px',
                lineHeight: '1.6',
                fontFamily: 'Monaco, Consolas, monospace'
              }}>
                {previewQuestion.codeTemplate}
              </pre>
            </div>

            <div style={{ marginBottom: '16px' }}>
              <div style={{ fontSize: '14px', fontWeight: '600', marginBottom: '8px' }}>
                Available Options (students will drag these):
              </div>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
                {previewQuestion.options?.map((option, i) => (
                  <span key={i} style={{
                    padding: '6px 12px',
                    backgroundColor: '#eef2ff',
                    border: '1px solid #667eea',
                    borderRadius: '6px',
                    fontSize: '13px',
                    fontFamily: 'monospace'
                  }}>
                    {option}
                  </span>
                ))}
              </div>
            </div>

            <div style={{ marginBottom: '16px' }}>
              <div style={{ fontSize: '14px', fontWeight: '600', marginBottom: '8px', color: '#2f855a' }}>
                Correct Answers:
              </div>
              <div style={{ fontSize: '13px', color: '#276749' }}>
                {previewQuestion.blanks?.map((blank, i) => (
                  <div key={i}>Blank {blank.id}: {blank.correctAnswer}</div>
                ))}
              </div>
            </div>

            <button
              onClick={() => setPreviewQuestion(null)}
              style={{
                width: '100%',
                padding: '10px',
                backgroundColor: '#667eea',
                color: 'white',
                border: 'none',
                borderRadius: '6px',
                fontSize: '14px',
                fontWeight: '600',
                cursor: 'pointer'
              }}
            >
              Close Preview
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

export default CodeDragDropForm;
