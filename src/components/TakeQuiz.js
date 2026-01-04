import React, { useState, useEffect } from 'react';
import { submissionAPI } from '../services/api';
import { FormattedText } from '../utils/formatText';

function TakeQuiz({ quiz, onComplete }) {
  const storageKey = `quiz_progress_${quiz._id}`;
  
  // Initialize state from localStorage if available
  const getInitialState = () => {
    try {
      const saved = localStorage.getItem(storageKey);
      if (saved) {
        const parsed = JSON.parse(saved);
        // Verify it's for the same quiz
        if (parsed.quizId === quiz._id) {
          return parsed;
        }
      }
    } catch (error) {
      console.error('Error loading saved progress:', error);
    }
    return null;
  };

  const initialState = getInitialState();
  
  const [currentQuestion, setCurrentQuestion] = useState(initialState?.currentQuestion || 0);
  const [answers, setAnswers] = useState(initialState?.answers || {});
  const [timeLeft, setTimeLeft] = useState(initialState?.timeLeft || quiz.duration * 60);
  const [submitted, setSubmitted] = useState(false);
  const [result, setResult] = useState(null);
  const [loading, setLoading] = useState(false);
  const [shuffledOptions, setShuffledOptions] = useState(initialState?.shuffledOptions || {});

  // Shuffle options for all questions on component mount
  useEffect(() => {
    // Only shuffle if we don't have saved shuffled options
    if (Object.keys(shuffledOptions).length > 0) {
      return; // Use the restored shuffled options
    }
    
    const shuffled = {};
    quiz.questions.forEach((question) => {
      // Create array of {option, originalIndex} pairs
      const optionsWithIndex = question.options.map((option, index) => ({
        option,
        originalIndex: index
      }));
      
      // Shuffle the array
      const shuffledArray = [...optionsWithIndex].sort(() => Math.random() - 0.5);
      
      shuffled[question._id] = shuffledArray;
    });
    setShuffledOptions(shuffled);
  }, [quiz]);

  // Save progress to localStorage whenever state changes
  useEffect(() => {
    if (!submitted) {
      const progressData = {
        quizId: quiz._id,
        currentQuestion,
        answers,
        timeLeft,
        shuffledOptions
      };
      localStorage.setItem(storageKey, JSON.stringify(progressData));
    }
  }, [currentQuestion, answers, timeLeft, shuffledOptions, submitted, quiz._id, storageKey]);

  useEffect(() => {
    if (submitted) return;

    const timer = setInterval(() => {
      setTimeLeft((prev) => {
        if (prev <= 1) {
          clearInterval(timer);
          handleSubmit();
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [submitted]);

  const handleAnswerSelect = (questionId, originalIndex) => {
    setAnswers({
      ...answers,
      [questionId]: originalIndex, // Store the original index
    });
  };

  const handleSubmit = async () => {
    setLoading(true);

    const formattedAnswers = Object.keys(answers).map((questionId) => ({
      questionId,
      selectedAnswer: answers[questionId],
    }));

    try {
      const response = await submissionAPI.submitQuiz({
        quizId: quiz._id,
        answers: formattedAnswers,
      });
      setResult(response.data.result);
      setSubmitted(true);
      // Clear saved progress after successful submission
      localStorage.removeItem(storageKey);
    } catch (error) {
      alert(error.response?.data?.message || 'Failed to submit quiz');
    } finally {
      setLoading(false);
    }
  };

  const formatTime = (seconds) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  if (submitted && result) {
    const percentage = parseFloat(result.percentage);
    const passed = percentage >= 50;

    return (
      <div className="container">
        <div className="card" style={{ maxWidth: '900px', margin: '0 auto' }}>
          {result.isPractice && (
            <div style={{
              padding: '12px 16px',
              backgroundColor: '#fef3c7',
              border: '2px solid #f59e0b',
              borderRadius: '8px',
              marginBottom: '20px',
              textAlign: 'center'
            }}>
              <p style={{ margin: 0, fontSize: '14px', fontWeight: '600', color: '#92400e' }}>
                🔄 PRACTICE MODE - Attempt #{result.attemptNumber}
              </p>
              <p style={{ margin: '4px 0 0 0', fontSize: '12px', color: '#78350f' }}>
                This score is for practice only and won't affect your ranking. Your first attempt counts for the leaderboard.
              </p>
            </div>
          )}
          
          <h2 style={{ color: '#667eea', marginBottom: '16px', textAlign: 'center', fontSize: '22px' }}>🎉 Quiz Completed!</h2>
          
          <div style={{ 
            padding: '32px', 
            backgroundColor: passed ? '#c6f6d5' : '#fed7d7',
            borderRadius: '12px',
            marginBottom: '24px',
            textAlign: 'center'
          }}>
            <h1 style={{ 
              fontSize: '48px', 
              margin: '0',
              color: passed ? '#2f855a' : '#c53030'
            }}>
              {result.percentage}%
            </h1>
            <p style={{ 
              fontSize: '18px', 
              marginTop: '8px',
              color: passed ? '#2f855a' : '#c53030',
              fontWeight: '600'
            }}>
              {passed ? '🎉 Congratulations!' : '💪 Keep Learning!'}
            </p>
          </div>

          <div style={{ marginBottom: '24px', fontSize: '14px', textAlign: 'center', color: '#4a5568' }}>
            <p>
              You answered <strong style={{ color: '#667eea' }}>{result.score}</strong> out of{' '}
              <strong style={{ color: '#667eea' }}>{result.totalQuestions}</strong> questions correctly
            </p>
          </div>

          {/* Detailed Results */}
          {result.detailedResults && result.detailedResults.length > 0 && (
            <div style={{ marginBottom: '24px' }}>
              <h3 style={{ marginBottom: '16px', color: '#667eea', fontSize: '17px', fontWeight: '600' }}>🔍 Review Your Answers</h3>
              {result.detailedResults.map((item, index) => (
                <div 
                  key={item.questionId} 
                  style={{ 
                    marginBottom: '16px',
                    padding: '16px',
                    border: `2px solid ${item.isCorrect ? '#48bb78' : '#f56565'}`,
                    borderRadius: '10px',
                    backgroundColor: item.isCorrect ? '#f0fff4' : '#fff5f5'
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', marginBottom: '10px' }}>
                    <span style={{ 
                      fontSize: '18px', 
                      marginRight: '8px',
                      color: item.isCorrect ? '#48bb78' : '#f56565'
                    }}>
                      {item.isCorrect ? '✓' : '✗'}
                    </span>
                    <h4 style={{ margin: 0, flex: 1, fontSize: '14px', fontWeight: '600', color: '#2d3748' }}>
                      Question {index + 1}: <FormattedText text={item.question} />
                    </h4>
                  </div>

                  <div style={{ marginLeft: '26px' }}>
                    {item.options.map((option, optIndex) => (
                      <div 
                        key={optIndex}
                        style={{ 
                          margin: '6px 0',
                          padding: '10px 12px',
                          borderRadius: '6px',
                          fontSize: '13px',
                          backgroundColor: 
                            optIndex === item.correctAnswer ? '#c6f6d5' :
                            optIndex === item.selectedAnswer && !item.isCorrect ? '#fed7d7' :
                            '#f7fafc',
                          border: optIndex === item.correctAnswer || (optIndex === item.selectedAnswer && !item.isCorrect) ? 
                            `1.5px solid ${optIndex === item.correctAnswer ? '#48bb78' : '#f56565'}` : '1px solid #e2e8f0',
                          color: 
                            optIndex === item.correctAnswer ? '#2f855a' :
                            optIndex === item.selectedAnswer && !item.isCorrect ? '#c53030' :
                            '#4a5568',
                          fontWeight: 
                            optIndex === item.correctAnswer || optIndex === item.selectedAnswer ? 
                            '600' : '500'
                        }}
                      >
                        <span style={{ fontWeight: '700', marginRight: '6px' }}>{String.fromCharCode(65 + optIndex)}.</span>
                        <FormattedText text={option} />
                        {optIndex === item.correctAnswer && <span style={{ marginLeft: '8px', fontSize: '14px' }}>✓</span>}
                        {optIndex === item.selectedAnswer && !item.isCorrect && <span style={{ marginLeft: '8px', fontSize: '12px' }}>(your answer)</span>}
                      </div>
                    ))}

                    {!item.isCorrect && (
                      <div style={{ 
                        marginTop: '12px',
                        padding: '12px',
                        backgroundColor: '#fefcbf',
                        borderLeft: '3px solid #d69e2e',
                        borderRadius: '6px'
                      }}>
                        <p style={{ 
                          fontWeight: '600', 
                          marginBottom: '4px',
                          color: '#744210',
                          fontSize: '12px'
                        }}>
                          💡 Explanation
                        </p>
                        <p style={{ margin: 0, color: '#744210', lineHeight: '1.6', fontSize: '13px' }}>
                          <FormattedText text={item.explanation} />
                        </p>
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}

          <button 
            className="btn btn-primary" 
            onClick={onComplete}
            style={{ width: '100%', padding: '12px', fontSize: '13px' }}
          >
            {result.isPractice ? '🔄 Try Again' : '🔁 Take Another Quiz'}
          </button>
        </div>
      </div>
    );
  }

  const progress = ((currentQuestion + 1) / quiz.questions.length) * 100;
  const currentQ = quiz.questions[currentQuestion];
  const currentShuffledOptions = shuffledOptions[currentQ._id] || [];
  const isAnswered = answers[currentQ._id] !== undefined;

  return (
    <div className="container">
      <div className="card">
        <div style={{ marginBottom: '20px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
            <h2 style={{ color: '#667eea', fontSize: '20px', margin: 0 }}>{quiz.title}</h2>
            <div style={{ 
              fontSize: '18px', 
              fontWeight: '700',
              color: timeLeft < 60 ? '#f56565' : '#667eea',
              padding: '8px 16px',
              background: timeLeft < 60 ? '#fed7d7' : '#eef2ff',
              borderRadius: '8px'
            }}>
              ⏱️ {formatTime(timeLeft)}
            </div>
          </div>
          
          <div style={{ 
            height: '6px', 
            backgroundColor: '#e2e8f0', 
            borderRadius: '4px',
            overflow: 'hidden'
          }}>
            <div style={{ 
              height: '100%', 
              width: `${progress}%`,
              backgroundColor: '#667eea',
              transition: 'width 0.3s ease'
            }} />
          </div>
          <p style={{ marginTop: '8px', color: '#718096', fontSize: '13px', fontWeight: '500' }}>
            Question {currentQuestion + 1} of {quiz.questions.length}
          </p>
        </div>

        <div style={{ marginBottom: '24px' }}>
          <h3 style={{ marginBottom: '16px', fontSize: '16px', lineHeight: '1.6', color: '#2d3748', fontWeight: '600' }}>
            <FormattedText text={currentQ.question} />
          </h3>

          <div style={{ display: 'grid', gap: '10px' }}>
            {currentShuffledOptions.map((item, displayIndex) => (
              <button
                key={displayIndex}
                onClick={() => handleAnswerSelect(currentQ._id, item.originalIndex)}
                style={{
                  padding: '12px 16px',
                  border: `2px solid ${answers[currentQ._id] === item.originalIndex ? '#667eea' : '#e2e8f0'}`,
                  borderRadius: '8px',
                  backgroundColor: answers[currentQ._id] === item.originalIndex ? '#eef2ff' : 'white',
                  cursor: 'pointer',
                  textAlign: 'left',
                  fontSize: '14px',
                  transition: 'all 0.2s ease',
                  fontWeight: '500',
                  color: '#2d3748'
                }}
                onMouseEnter={(e) => {
                  if (answers[currentQ._id] !== item.originalIndex) {
                    e.currentTarget.style.borderColor = '#667eea';
                    e.currentTarget.style.backgroundColor = '#fafafa';
                  }
                }}
                onMouseLeave={(e) => {
                  if (answers[currentQ._id] !== item.originalIndex) {
                    e.currentTarget.style.borderColor = '#e2e8f0';
                    e.currentTarget.style.backgroundColor = 'white';
                  }
                }}
              >
                <span style={{ fontWeight: '700', marginRight: '8px', fontSize: '14px' }}>
                  {String.fromCharCode(65 + displayIndex)}.
                </span>
                <FormattedText text={item.option} />
              </button>
            ))}
          </div>
        </div>

        <div style={{ display: 'flex', justifyContent: 'space-between', gap: '12px' }}>
          <button
            className="btn btn-secondary"
            onClick={() => setCurrentQuestion(currentQuestion - 1)}
            disabled={currentQuestion === 0}
            style={{ flex: 1, fontSize: '12px', padding: '10px' }}
          >
            ← Previous
          </button>

          {currentQuestion === quiz.questions.length - 1 ? (
            <button
              className="btn btn-primary"
              onClick={handleSubmit}
              disabled={loading || Object.keys(answers).length !== quiz.questions.length}
              style={{ flex: 2, fontSize: '12px', padding: '10px' }}
            >
              {loading ? '⏳ Submitting...' : '✓ Submit Quiz'}
            </button>
          ) : (
            <button
              className="btn btn-primary"
              onClick={() => setCurrentQuestion(currentQuestion + 1)}
              disabled={!isAnswered}
              style={{ flex: 1, fontSize: '12px', padding: '10px' }}
            >
              Next →
            </button>
          )}
        </div>

        {Object.keys(answers).length !== quiz.questions.length && (
          <p style={{ marginTop: '12px', color: '#d69e2e', textAlign: 'center', fontSize: '13px', fontWeight: '500' }}>
            ⚠️ Please answer all questions before submitting
          </p>
        )}
      </div>
    </div>
  );
}

export default TakeQuiz;
