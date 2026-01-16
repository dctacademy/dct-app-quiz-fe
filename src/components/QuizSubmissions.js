import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { quizAPI } from '../services/api';
import { useToast } from './Toast';
import { useAuth } from '../context/AuthContext';
import { FormattedText } from '../utils/formatText';

function QuizSubmissions({ quiz, onBack, onDelete }) {
  const { user } = useAuth();
  const navigate = useNavigate();
  const { showToast } = useToast();
  
  // Verify user is admin
  useEffect(() => {
    if (!user || user.role !== 'admin') {
      showToast('Access denied. Admin only.', 'error');
      navigate('/user');
    }
  }, [user, navigate, showToast]);
  
  const [submissions, setSubmissions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showQuestions, setShowQuestions] = useState(false);
  const [selectedSubmission, setSelectedSubmission] = useState(null);
  const [resultsShared, setResultsShared] = useState(quiz.resultsShared || false);
  const [activeTab, setActiveTab] = useState('submissions'); // 'submissions', 'leaderboard', or 'analysis'
  const [leaderboard, setLeaderboard] = useState([]);
  const [loadingLeaderboard, setLoadingLeaderboard] = useState(false);
  const [showDuplicateModal, setShowDuplicateModal] = useState(false);
  const [duplicateFormData, setDuplicateFormData] = useState({
    title: '',
    description: '',
    duration: quiz.duration || 30,
    startDate: '',
    endDate: ''
  });
  const [duplicating, setDuplicating] = useState(false);
  const [studentModal, setStudentModal] = useState({ show: false, students: [], type: '', questionText: '' });

  useEffect(() => {
    fetchSubmissions();
  }, []);

  const fetchSubmissions = async () => {
    try {
      const response = await quizAPI.getQuizSubmissions(quiz._id);
      setSubmissions(response.data);
    } catch (error) {
      console.error('Error fetching submissions:', error);
      if (error.response?.status === 403) {
        showToast('Access denied. Admin only.', 'error');
        navigate('/user');
      }
    } finally {
      setLoading(false);
    }
  };

  const fetchLeaderboard = async () => {
    setLoadingLeaderboard(true);
    try {
      const response = await quizAPI.getQuizLeaderboard(quiz._id);
      setLeaderboard(response.data.leaderboard);
    } catch (error) {
      console.error('Error fetching leaderboard:', error);
      if (error.response?.status === 403) {
        showToast('Access denied.', 'error');
      }
    } finally {
      setLoadingLeaderboard(false);
    }
  };

  const handleTabChange = (tab) => {
    setActiveTab(tab);
    if (tab === 'leaderboard' && leaderboard.length === 0) {
      fetchLeaderboard();
    }
  };

  const handleShareResults = async () => {
    try {
      const response = await quizAPI.shareResults(quiz._id);
      setResultsShared(response.data.resultsShared);
      showToast(response.data.message, 'success');
    } catch (error) {
      showToast(error.response?.data?.message || 'Failed to update results sharing', 'error');
      if (error.response?.status === 403) {
        navigate('/user');
      }
    }
  };

  const handleDuplicateQuiz = async (e) => {
    e.preventDefault();
    setDuplicating(true);

    try {
      const response = await quizAPI.duplicateQuiz(quiz._id, duplicateFormData);
      showToast(`Quiz duplicated successfully! New Code: ${response.data.quiz.quizCode}`, 'success');
      setShowDuplicateModal(false);
      setDuplicateFormData({
        title: '',
        description: '',
        duration: quiz.duration || 30,
        startDate: '',
        endDate: ''
      });
      // Optionally refresh the quiz list
      onBack();
    } catch (error) {
      showToast(error.response?.data?.message || 'Failed to duplicate quiz', 'error');
      if (error.response?.status === 403) {
        navigate('/user');
      }
    } finally {
      setDuplicating(false);
    }
  };

  if (loading) {
    return <div className="loading">Loading submissions...</div>;
  }

  // Show individual submission details
  if (selectedSubmission) {
    const percentage = ((selectedSubmission.score / selectedSubmission.totalQuestions) * 100).toFixed(2);
    const passed = percentage >= 50;

    return (
      <div className="container">
        <div className="card" style={{ maxWidth: '900px', margin: '0 auto' }}>
          <button 
            className="btn btn-secondary" 
            onClick={() => setSelectedSubmission(null)}
            style={{ marginBottom: '20px', fontSize: '12px' }}
          >
            ← Back to Submissions
          </button>

          <div style={{ marginBottom: '20px' }}>
            <h2 style={{ color: '#667eea', marginBottom: '6px', fontSize: '22px' }}>
              {selectedSubmission.user.name}'s Submission
            </h2>
            <p style={{ color: '#718096', fontSize: '13px' }}>
              {selectedSubmission.user.email}
            </p>
          </div>

          <div style={{ 
            padding: '24px', 
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
              {percentage}%
            </h1>
            <p style={{ 
              fontSize: '16px', 
              marginTop: '8px',
              color: passed ? '#2f855a' : '#c53030',
              fontWeight: '600'
            }}>
              Score: {selectedSubmission.score} / {selectedSubmission.totalQuestions}
            </p>
            <p style={{ fontSize: '13px', marginTop: '8px', color: '#4a5568' }}>
              Submitted: {new Date(selectedSubmission.submittedAt).toLocaleString()}
            </p>
          </div>

          {/* Detailed Answers */}
          {selectedSubmission.detailedResults && selectedSubmission.detailedResults.length > 0 && (
            <div>
              <h3 style={{ marginBottom: '16px', color: '#667eea', fontSize: '17px', fontWeight: '600' }}>
                📋 Detailed Answers
              </h3>
              {selectedSubmission.detailedResults.map((item, index) => {
                const questionType = item.questionType || 'MCQ';
                
                return (
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
                    <span style={{
                      fontSize: '11px',
                      padding: '3px 8px',
                      background: '#e2e8f0',
                      borderRadius: '4px',
                      color: '#4a5568',
                      marginLeft: '8px'
                    }}>
                      {questionType}
                    </span>
                  </div>

                  <div style={{ marginLeft: '26px' }}>
                    {/* MCQ Type */}
                    {questionType === 'MCQ' && item.options && (
                      <>
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
                            {optIndex === item.correctAnswer && <span style={{ marginLeft: '8px', fontSize: '14px' }}>✓ Correct</span>}
                            {optIndex === item.selectedAnswer && !item.isCorrect && <span style={{ marginLeft: '8px', fontSize: '12px' }}>(Student's answer)</span>}
                          </div>
                        ))}
                      </>
                    )}

                    {/* True/False Type */}
                    {questionType === 'TrueFalse' && (
                      <>
                        {['True', 'False'].map((option, optIndex) => {
                          const isCorrectOption = item.correctAnswer === optIndex;
                          const isSelectedOption = item.selectedAnswer === optIndex;
                          
                          return (
                            <div 
                              key={optIndex}
                              style={{ 
                                margin: '6px 0',
                                padding: '10px 12px',
                                borderRadius: '6px',
                                fontSize: '13px',
                                backgroundColor: 
                                  isCorrectOption ? '#c6f6d5' :
                                  isSelectedOption && !item.isCorrect ? '#fed7d7' :
                                  '#f7fafc',
                                border: isCorrectOption || (isSelectedOption && !item.isCorrect) ? 
                                  `1.5px solid ${isCorrectOption ? '#48bb78' : '#f56565'}` : '1px solid #e2e8f0',
                                color: 
                                  isCorrectOption ? '#2f855a' :
                                  isSelectedOption && !item.isCorrect ? '#c53030' :
                                  '#4a5568',
                                fontWeight: 
                                  isCorrectOption || isSelectedOption ? '600' : '500'
                              }}
                            >
                              {option}
                              {isCorrectOption && <span style={{ marginLeft: '8px', fontSize: '14px' }}>✓ Correct</span>}
                              {isSelectedOption && !item.isCorrect && <span style={{ marginLeft: '8px', fontSize: '12px' }}>(Student's answer)</span>}
                            </div>
                          );
                        })}
                      </>
                    )}

                    {/* Fill in the Blank Type */}
                    {questionType === 'FillInBlank' && (
                      <>
                        <div style={{ marginBottom: '8px' }}>
                          <div style={{ fontSize: '12px', color: '#718096', marginBottom: '4px', fontWeight: '600' }}>
                            Student's Answer:
                          </div>
                          <div style={{ 
                            padding: '10px 12px',
                            borderRadius: '6px',
                            fontSize: '13px',
                            backgroundColor: item.isCorrect ? '#c6f6d5' : '#fed7d7',
                            border: `1.5px solid ${item.isCorrect ? '#48bb78' : '#f56565'}`,
                            color: item.isCorrect ? '#2f855a' : '#c53030',
                            fontWeight: '600'
                          }}>
                            {item.selectedAnswer || 'No answer provided'}
                          </div>
                        </div>
                        <div>
                          <div style={{ fontSize: '12px', color: '#718096', marginBottom: '4px', fontWeight: '600' }}>
                            Correct Answer:
                          </div>
                          <div style={{ 
                            padding: '10px 12px',
                            borderRadius: '6px',
                            fontSize: '13px',
                            backgroundColor: '#c6f6d5',
                            border: '1.5px solid #48bb78',
                            color: '#2f855a',
                            fontWeight: '600'
                          }}>
                            {item.correctAnswer}
                          </div>
                        </div>
                      </>
                    )}

                    {/* Code Snippet Type */}
                    {questionType === 'CodeSnippet' && item.options && (
                      <>
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
                            {optIndex === item.correctAnswer && <span style={{ marginLeft: '8px', fontSize: '14px' }}>✓ Correct</span>}
                            {optIndex === item.selectedAnswer && !item.isCorrect && <span style={{ marginLeft: '8px', fontSize: '12px' }}>(Student's answer)</span>}
                          </div>
                        ))}
                      </>
                    )}

                    {/* Essay Type */}
                    {questionType === 'Essay' && (
                      <>
                        <div style={{ marginBottom: '12px' }}>
                          <div style={{ fontSize: '12px', color: '#718096', marginBottom: '4px', fontWeight: '600' }}>
                            Student's Answer:
                          </div>
                          <div style={{ 
                            padding: '12px',
                            borderRadius: '6px',
                            fontSize: '13px',
                            backgroundColor: '#f7fafc',
                            border: '1.5px solid #e2e8f0',
                            color: '#2d3748',
                            whiteSpace: 'pre-wrap',
                            lineHeight: '1.6'
                          }}>
                            {item.selectedAnswer || 'No answer provided'}
                          </div>
                        </div>
                        
                        {item.essayGrading && (
                          <div style={{
                            padding: '14px',
                            background: item.isCorrect ? '#f0fff4' : '#fff5f5',
                            borderLeft: `4px solid ${item.isCorrect ? '#48bb78' : '#f56565'}`,
                            borderRadius: '6px',
                            marginTop: '12px'
                          }}>
                            <div style={{ display: 'flex', alignItems: 'center', marginBottom: '10px' }}>
                              <span style={{ fontSize: '15px', fontWeight: '700', color: '#2d3748' }}>
                                AI Grading Score: {item.essayGrading.score}/10
                              </span>
                              {item.essayGrading.score >= 7 && <span style={{ marginLeft: '8px', fontSize: '16px' }}>🌟</span>}
                              {item.essayGrading.score >= 5 && item.essayGrading.score < 7 && <span style={{ marginLeft: '8px', fontSize: '16px' }}>👍</span>}
                              {item.essayGrading.score < 5 && <span style={{ marginLeft: '8px', fontSize: '16px' }}>📝</span>}
                            </div>
                            
                            {item.essayGrading.feedback && (
                              <div style={{ marginBottom: '10px' }}>
                                <div style={{ fontSize: '12px', fontWeight: '600', color: '#4a5568', marginBottom: '4px' }}>
                                  💬 Feedback:
                                </div>
                                <div style={{ fontSize: '13px', color: '#2d3748', lineHeight: '1.5' }}>
                                  {item.essayGrading.feedback}
                                </div>
                              </div>
                            )}
                            
                            {item.essayGrading.strengths && item.essayGrading.strengths.length > 0 && (
                              <div style={{ marginBottom: '10px' }}>
                                <div style={{ fontSize: '12px', fontWeight: '600', color: '#2f855a', marginBottom: '4px' }}>
                                  ✅ Strengths:
                                </div>
                                <ul style={{ margin: 0, paddingLeft: '20px', fontSize: '13px', color: '#2d3748' }}>
                                  {item.essayGrading.strengths.map((strength, idx) => (
                                    <li key={idx} style={{ marginBottom: '2px' }}>{strength}</li>
                                  ))}
                                </ul>
                              </div>
                            )}
                            
                            {item.essayGrading.improvements && item.essayGrading.improvements.length > 0 && (
                              <div>
                                <div style={{ fontSize: '12px', fontWeight: '600', color: '#c53030', marginBottom: '4px' }}>
                                  📈 Areas for Improvement:
                                </div>
                                <ul style={{ margin: 0, paddingLeft: '20px', fontSize: '13px', color: '#2d3748' }}>
                                  {item.essayGrading.improvements.map((improvement, idx) => (
                                    <li key={idx} style={{ marginBottom: '2px' }}>{improvement}</li>
                                  ))}
                                </ul>
                              </div>
                            )}
                          </div>
                        )}
                        
                        {item.correctAnswer && (
                          <div style={{ marginTop: '12px' }}>
                            <div style={{ fontSize: '12px', color: '#718096', marginBottom: '4px', fontWeight: '600' }}>
                              Model Answer:
                            </div>
                            <div style={{ 
                              padding: '12px',
                              borderRadius: '6px',
                              fontSize: '13px',
                              backgroundColor: '#f0fff4',
                              border: '1.5px solid #9ae6b4',
                              color: '#2f855a',
                              whiteSpace: 'pre-wrap',
                              lineHeight: '1.6'
                            }}>
                              {item.correctAnswer}
                            </div>
                          </div>
                        )}
                      </>
                    )}

                    {!item.isCorrect && item.explanation && questionType !== 'Essay' && (
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
              );
              })}
            </div>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="container">
      <div className="card">
        <div style={{ display: 'flex', gap: '8px', marginBottom: '20px', flexWrap: 'wrap' }}>
          <button className="btn btn-secondary" onClick={onBack} style={{ fontSize: '12px' }}>
            ← Back
          </button>
          <button 
            className="btn btn-primary" 
            onClick={() => setShowDuplicateModal(true)}
            style={{ fontSize: '12px' }}
          >
            📋 Duplicate Quiz
          </button>
          {onDelete && (
            <button 
              className="btn btn-danger" 
              onClick={() => onDelete(quiz._id, quiz.title)}
              style={{ fontSize: '12px' }}
            >
              🗑️ Delete Quiz
            </button>
          )}
        </div>

        {/* Duplicate Quiz Modal */}
        {showDuplicateModal && (
          <div style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            backgroundColor: 'rgba(0, 0, 0, 0.5)',
            display: 'flex',
            justifyContent: 'center',
            alignItems: 'center',
            zIndex: 1000
          }}>
            <div style={{
              backgroundColor: 'white',
              borderRadius: '12px',
              padding: '24px',
              maxWidth: '500px',
              width: '90%',
              maxHeight: '90vh',
              overflowY: 'auto'
            }}>
              <h3 style={{ color: '#667eea', marginBottom: '16px', fontSize: '18px', fontWeight: '600' }}>
                📋 Duplicate Quiz
              </h3>
              <p style={{ color: '#4a5568', fontSize: '13px', marginBottom: '20px' }}>
                Create a duplicate with the same {quiz.questions.length} questions. Enter new details below:
              </p>

              <form onSubmit={handleDuplicateQuiz}>
                <div className="form-group">
                  <label>Quiz Title *</label>
                  <input
                    type="text"
                    value={duplicateFormData.title}
                    onChange={(e) => setDuplicateFormData({ ...duplicateFormData, title: e.target.value })}
                    placeholder="Enter new quiz title"
                    required
                  />
                </div>

                <div className="form-group">
                  <label>Description</label>
                  <textarea
                    value={duplicateFormData.description}
                    onChange={(e) => setDuplicateFormData({ ...duplicateFormData, description: e.target.value })}
                    rows="3"
                    placeholder="Enter quiz description"
                  />
                </div>

                <div className="form-group">
                  <label>Duration (minutes) *</label>
                  <input
                    type="number"
                    value={duplicateFormData.duration}
                    onChange={(e) => setDuplicateFormData({ ...duplicateFormData, duration: e.target.value })}
                    min="5"
                    max="180"
                    required
                  />
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '15px' }}>
                  <div className="form-group">
                    <label>Start Date & Time (Optional)</label>
                    <input
                      type="datetime-local"
                      value={duplicateFormData.startDate}
                      onChange={(e) => setDuplicateFormData({ ...duplicateFormData, startDate: e.target.value })}
                    />
                  </div>

                  <div className="form-group">
                    <label>End Date & Time (Optional)</label>
                    <input
                      type="datetime-local"
                      value={duplicateFormData.endDate}
                      onChange={(e) => setDuplicateFormData({ ...duplicateFormData, endDate: e.target.value })}
                    />
                  </div>
                </div>

                <div style={{ display: 'flex', gap: '8px', marginTop: '20px' }}>
                  <button 
                    type="submit" 
                    className="btn btn-primary"
                    disabled={duplicating}
                    style={{ flex: 1, fontSize: '12px' }}
                  >
                    {duplicating ? 'Duplicating...' : '✓ Create Duplicate'}
                  </button>
                  <button 
                    type="button"
                    className="btn btn-secondary"
                    onClick={() => {
                      setShowDuplicateModal(false);
                      setDuplicateFormData({
                        title: '',
                        description: '',
                        duration: quiz.duration || 30,
                        startDate: '',
                        endDate: ''
                      });
                    }}
                    style={{ flex: 1, fontSize: '12px' }}
                  >
                    Cancel
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        <div style={{ marginBottom: '20px' }}>
          <h2 style={{ color: '#667eea', marginBottom: '6px', fontSize: '22px' }}>{quiz.title}</h2>
          <p style={{ color: '#718096', marginBottom: '12px', fontSize: '13px' }}>
            📋 <strong>{quiz.quizCode}</strong> • {quiz.questions.length} questions • {quiz.duration} minutes
          </p>
          
          {/* Tags display */}
          {quiz.tags && quiz.tags.length > 0 && (
            <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap', marginTop: '8px' }}>
              {quiz.tags.map((tag, idx) => (
                <span
                  key={idx}
                  style={{
                    padding: '3px 10px',
                    background: '#eef2ff',
                    color: '#667eea',
                    borderRadius: '12px',
                    fontSize: '11px',
                    fontWeight: '500',
                    border: '1px solid #c7d2fe'
                  }}
                >
                  🏷️ {tag.name || tag}
                </span>
              ))}
            </div>
          )}
        </div>

        {/* Tabs */}
        <div style={{ 
          marginBottom: '20px', 
          borderBottom: '2px solid #e2e8f0',
          display: 'flex',
          gap: '4px'
        }}>
          <button
            onClick={() => handleTabChange('submissions')}
            style={{
              padding: '10px 20px',
              fontSize: '13px',
              fontWeight: '600',
              background: 'none',
              border: 'none',
              borderBottom: activeTab === 'submissions' ? '3px solid #667eea' : '3px solid transparent',
              color: activeTab === 'submissions' ? '#667eea' : '#718096',
              cursor: 'pointer',
              transition: 'all 0.2s'
            }}
          >
            📊 Submissions ({submissions.length})
          </button>
          <button
            onClick={() => handleTabChange('leaderboard')}
            style={{
              padding: '10px 20px',
              fontSize: '13px',
              fontWeight: '600',
              background: 'none',
              border: 'none',
              borderBottom: activeTab === 'leaderboard' ? '3px solid #667eea' : '3px solid transparent',
              color: activeTab === 'leaderboard' ? '#667eea' : '#718096',
              cursor: 'pointer',
              transition: 'all 0.2s'
            }}
          >
            🏆 Leaderboard
          </button>
          <button
            onClick={() => handleTabChange('analysis')}
            style={{
              padding: '10px 20px',
              fontSize: '13px',
              fontWeight: '600',
              background: 'none',
              border: 'none',
              borderBottom: activeTab === 'analysis' ? '3px solid #667eea' : '3px solid transparent',
              color: activeTab === 'analysis' ? '#667eea' : '#718096',
              cursor: 'pointer',
              transition: 'all 0.2s'
            }}
          >
            📊 Analysis
          </button>
        </div>

        {activeTab === 'submissions' && (
          <>
            <div style={{ marginBottom: '20px', display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
              <button 
                className={showQuestions ? 'btn btn-secondary' : 'btn btn-primary'}
                onClick={() => setShowQuestions(!showQuestions)}
                style={{ fontSize: '12px' }}
              >
                {showQuestions ? '✕ Hide Questions' : '👁️ View Questions'}
              </button>
              {submissions.length > 0 && (
                <button 
                  className={resultsShared ? 'btn btn-secondary' : 'btn btn-primary'}
                  onClick={handleShareResults}
                  style={{ fontSize: '12px' }}
                >
                  {resultsShared ? '🔒 Hide Results from Students' : '📊 Share Results with Students'}
                </button>
              )}
            </div>
          </>
        )}

        {showQuestions && (
          <div style={{ 
            marginBottom: '24px', 
            padding: '20px', 
            backgroundColor: '#f7fafc', 
            borderRadius: '12px',
            border: '1.5px solid #667eea'
          }}>
            <h3 style={{ marginBottom: '16px', color: '#667eea', fontSize: '17px', fontWeight: '600' }}>📝 Quiz Questions & Analytics</h3>
            {quiz.questions.map((question, index) => {
              // Calculate statistics for this question
              const questionStats = submissions.reduce((stats, submission) => {
                if (submission.detailedResults) {
                  const result = submission.detailedResults.find(r => r.questionId === question._id);
                  if (result) {
                    if (result.isCorrect) {
                      stats.correct++;
                    } else {
                      stats.wrong++;
                    }
                  }
                }
                return stats;
              }, { correct: 0, wrong: 0 });

              const totalAttempts = questionStats.correct + questionStats.wrong;
              const correctPercentage = totalAttempts > 0 ? ((questionStats.correct / totalAttempts) * 100).toFixed(2) : 0;

              return (
                <div key={question._id} style={{ 
                  marginBottom: '16px', 
                  padding: '16px',
                  backgroundColor: 'white',
                  borderRadius: '10px',
                  border: '1px solid #e2e8f0',
                  boxShadow: '0 1px 3px rgba(0,0,0,0.05)'
                }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '12px' }}>
                    <p style={{ fontWeight: '600', color: '#2d3748', fontSize: '14px', flex: 1 }}>
                      {index + 1}. <FormattedText text={question.question} />
                    </p>
                    {totalAttempts > 0 && (
                      <div style={{ 
                        marginLeft: '16px',
                        padding: '6px 12px',
                        background: correctPercentage >= 70 ? '#c6f6d5' : correctPercentage >= 50 ? '#fefcbf' : '#fed7d7',
                        borderRadius: '8px',
                        minWidth: '120px',
                        textAlign: 'center'
                      }}>
                        <div style={{ 
                          fontSize: '16px', 
                          fontWeight: '700',
                          color: correctPercentage >= 70 ? '#2f855a' : correctPercentage >= 50 ? '#b7791f' : '#c53030'
                        }}>
                          {correctPercentage}%
                        </div>
                        <div style={{ fontSize: '11px', color: '#4a5568', marginTop: '2px' }}>
                          ✓ {questionStats.correct} | ✗ {questionStats.wrong}
                        </div>
                      </div>
                    )}
                  </div>

                <div style={{ paddingLeft: '16px' }}>
                  {question.options.map((option, optIndex) => (
                    <div 
                      key={optIndex} 
                      style={{ 
                        margin: '8px 0',
                        padding: '12px 16px',
                        borderRadius: '8px',
                        border: optIndex === question.correctAnswer ? '2px solid #28a745' : '1.5px solid #e2e8f0',
                        backgroundColor: optIndex === question.correctAnswer ? '#28a745' : 'white',
                        color: optIndex === question.correctAnswer ? 'white' : '#2d3748',
                        fontWeight: optIndex === question.correctAnswer ? '700' : '500',
                        boxShadow: optIndex === question.correctAnswer ? '0 3px 10px rgba(40, 167, 69, 0.25)' : 'none',
                        transform: optIndex === question.correctAnswer ? 'scale(1.01)' : 'scale(1)',
                        transition: 'all 0.2s ease',
                        fontSize: '13px'
                      }}
                    >
                      <span style={{ 
                        fontWeight: '700', 
                        marginRight: '8px',
                        fontSize: '14px'
                      }}>
                        {String.fromCharCode(65 + optIndex)}.
                      </span>
                      {option}
                      {optIndex === question.correctAnswer && (
                        <span style={{ 
                          marginLeft: '10px',
                          fontSize: '16px',
                          float: 'right'
                        }}>
                          ✓
                        </span>
                      )}
                    </div>
                  ))}

                  {question.explanation && (
                    <div style={{ 
                      marginTop: '12px',
                      padding: '12px 14px',
                      backgroundColor: '#eef2ff',
                      borderLeft: '3px solid #667eea',
                      borderRadius: '6px'
                    }}>
                      <p style={{ 
                        fontWeight: '600', 
                        marginBottom: '6px',
                        color: '#4c51bf',
                        fontSize: '12px'
                      }}>
                        💡 Explanation
                      </p>
                      <p style={{ margin: 0, color: '#4a5568', lineHeight: '1.6', fontSize: '13px' }}>
                        {question.explanation}
                      </p>
                    </div>
                  )}
                </div>
              </div>
              );
            })}
          </div>
        )}

        <h3 style={{ marginBottom: '16px', fontSize: '17px', fontWeight: '600', color: '#2d3748' }}>
          👥 Submissions ({submissions.length})
        </h3>

        {submissions.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '32px', color: '#718096', fontSize: '14px', background: '#f7fafc', borderRadius: '8px' }}>
            <p>No submissions yet</p>
          </div>
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13px' }}>
              <thead>
                <tr style={{ backgroundColor: '#f7fafc' }}>
                  <th style={{ padding: '10px 12px', textAlign: 'left', borderBottom: '2px solid #e2e8f0', fontWeight: '600', color: '#4a5568' }}>
                    Student Name
                  </th>
                  <th style={{ padding: '10px 12px', textAlign: 'left', borderBottom: '2px solid #e2e8f0', fontWeight: '600', color: '#4a5568' }}>
                    Email
                  </th>
                  <th style={{ padding: '10px 12px', textAlign: 'center', borderBottom: '2px solid #e2e8f0', fontWeight: '600', color: '#4a5568' }}>
                    Score
                  </th>
                  <th style={{ padding: '10px 12px', textAlign: 'center', borderBottom: '2px solid #e2e8f0', fontWeight: '600', color: '#4a5568' }}>
                    Percentage
                  </th>
                  <th style={{ padding: '10px 12px', textAlign: 'left', borderBottom: '2px solid #e2e8f0', fontWeight: '600', color: '#4a5568' }}>
                    Submitted At
                  </th>
                  <th style={{ padding: '10px 12px', textAlign: 'center', borderBottom: '2px solid #e2e8f0', fontWeight: '600', color: '#4a5568' }}>
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody>
                {submissions
                  .sort((a, b) => b.score - a.score) // Sort by score descending (highest first)
                  .map((submission) => {
                  const percentage = ((submission.score / submission.totalQuestions) * 100).toFixed(2);
                  return (
                    <tr key={submission._id} style={{ transition: 'background 0.2s' }}>
                      <td style={{ padding: '10px 12px', borderBottom: '1px solid #e2e8f0', color: '#2d3748' }}>
                        {submission.user.name}
                      </td>
                      <td style={{ padding: '10px 12px', borderBottom: '1px solid #e2e8f0', color: '#4a5568' }}>
                        {submission.user.email}
                      </td>
                      <td style={{ padding: '10px 12px', textAlign: 'center', borderBottom: '1px solid #e2e8f0', fontWeight: '600', color: '#2d3748' }}>
                        {submission.score} / {submission.totalQuestions}
                      </td>
                      <td style={{ 
                        padding: '10px 12px', 
                        textAlign: 'center', 
                        borderBottom: '1px solid #e2e8f0'
                      }}>
                        <span style={{
                          padding: '4px 10px',
                          borderRadius: '12px',
                          backgroundColor: percentage >= 70 ? '#c6f6d5' : percentage >= 50 ? '#fefcbf' : '#fed7d7',
                          color: percentage >= 70 ? '#2f855a' : percentage >= 50 ? '#b7791f' : '#c53030',
                          fontWeight: '600',
                          fontSize: '12px'
                        }}>
                          {percentage}%
                        </span>
                      </td>
                      <td style={{ padding: '10px 12px', borderBottom: '1px solid #e2e8f0', color: '#4a5568', fontSize: '12px' }}>
                        {new Date(submission.submittedAt).toLocaleString()}
                      </td>
                      <td style={{ padding: '10px 12px', borderBottom: '1px solid #e2e8f0', textAlign: 'center' }}>
                        <button
                          className="btn btn-primary"
                          onClick={() => setSelectedSubmission(submission)}
                          style={{ fontSize: '11px', padding: '6px 12px' }}
                        >
                          👁️ View
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      
        {/* Leaderboard Tab */}
        {activeTab === 'leaderboard' && (
          <>
            {loadingLeaderboard ? (
              <div className="loading">Loading leaderboard...</div>
            ) : leaderboard.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '40px', color: '#718096' }}>
                <p style={{ fontSize: '18px', marginBottom: '8px' }}>📊</p>
                <p>No submissions yet for this quiz.</p>
              </div>
            ) : (
              <div style={{ overflowX: 'auto' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                  <thead>
                    <tr style={{ backgroundColor: '#f7fafc', borderBottom: '2px solid #e2e8f0' }}>
                      <th style={{ padding: '12px', textAlign: 'left', fontSize: '13px', fontWeight: '700', color: '#2d3748' }}>
                        Rank
                      </th>
                      <th style={{ padding: '12px', textAlign: 'left', fontSize: '13px', fontWeight: '700', color: '#2d3748' }}>
                        Name
                      </th>
                      <th style={{ padding: '12px', textAlign: 'center', fontSize: '13px', fontWeight: '700', color: '#2d3748' }}>
                        Score
                      </th>
                      <th style={{ padding: '12px', textAlign: 'center', fontSize: '13px', fontWeight: '700', color: '#2d3748' }}>
                        Percentage
                      </th>
                      <th style={{ padding: '12px', textAlign: 'center', fontSize: '13px', fontWeight: '700', color: '#2d3748' }}>
                        Submitted At
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {leaderboard.map((entry) => {
                      const getMedalEmoji = (rank) => {
                        if (rank === 1) return '🥇';
                        if (rank === 2) return '🥈';
                        if (rank === 3) return '🥉';
                        return `#${rank}`;
                      };

                      const isTopThree = entry.rank <= 3;

                      return (
                        <tr
                          key={entry.userId}
                          style={{
                            backgroundColor: isTopThree ? '#f0fff4' : 'white',
                            borderBottom: '1px solid #e2e8f0',
                            transition: 'background-color 0.2s'
                          }}
                        >
                          <td style={{ 
                            padding: '16px 12px', 
                            fontSize: '16px', 
                            fontWeight: '700',
                            color: isTopThree ? '#667eea' : '#2d3748'
                          }}>
                            {getMedalEmoji(entry.rank)}
                          </td>
                          <td style={{ padding: '16px 12px' }}>
                            <div style={{ fontSize: '14px', fontWeight: '600', color: '#2d3748', marginBottom: '2px' }}>
                              {entry.userName}
                            </div>
                            <div style={{ fontSize: '12px', color: '#718096' }}>
                              {entry.userEmail}
                            </div>
                          </td>
                          <td style={{ 
                            padding: '16px 12px', 
                            textAlign: 'center',
                            fontSize: '14px',
                            fontWeight: '600',
                            color: '#667eea'
                          }}>
                            {entry.score}/{entry.totalQuestions}
                          </td>
                          <td style={{ 
                            padding: '16px 12px', 
                            textAlign: 'center',
                            fontSize: '15px',
                            fontWeight: '700',
                            color: entry.percentage >= 75 ? '#48bb78' : 
                                   entry.percentage >= 50 ? '#d69e2e' : '#f56565'
                          }}>
                            {entry.percentage}%
                          </td>
                          <td style={{ 
                            padding: '16px 12px', 
                            textAlign: 'center',
                            fontSize: '12px',
                            color: '#718096'
                          }}>
                            {new Date(entry.submittedAt).toLocaleString()}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </>
        )}

        {/* Analysis Tab */}
        {activeTab === 'analysis' && (
          <div>
            {loading ? (
              <p style={{ textAlign: 'center', color: '#4a5568', fontSize: '14px' }}>Loading analysis...</p>
            ) : submissions.length === 0 ? (
              <p style={{ textAlign: 'center', color: '#718096', fontSize: '14px' }}>No submissions yet.</p>
            ) : (
              <div style={{ 
                backgroundColor: '#f7fafc',
                borderRadius: '12px',
                padding: '20px',
                border: '1.5px solid #e2e8f0'
              }}>
                <h3 style={{ marginBottom: '20px', color: '#667eea', fontSize: '17px', fontWeight: '600' }}>📊 Question-wise Student Analysis</h3>
                {quiz.questions.map((question, index) => {
                  // Get students who got this question correct/wrong
                  const correctStudents = [];
                  const wrongStudents = [];

                  submissions.forEach(submission => {
                    if (submission.detailedResults) {
                      const result = submission.detailedResults.find(r => r.questionId === question._id);
                      if (result) {
                        const studentInfo = {
                          name: submission.user?.name || 'Unknown',
                          email: submission.user?.email || '',
                          answer: result.selectedAnswer !== undefined ? question.options[result.selectedAnswer] : 'Not answered',
                          selectedIndex: result.selectedAnswer,
                          weight: result.isCorrect ? 1 : 0,
                          submittedAt: new Date(submission.submittedAt).toLocaleString()
                        };
                        if (result.isCorrect) {
                          correctStudents.push(studentInfo);
                        } else {
                          wrongStudents.push(studentInfo);
                        }
                      }
                    }
                  });

                  const totalAttempts = correctStudents.length + wrongStudents.length;
                  const correctPercentage = totalAttempts > 0 ? ((correctStudents.length / totalAttempts) * 100).toFixed(2) : 0;

                  return (
                    <div key={question._id} style={{ 
                      marginBottom: '24px', 
                      padding: '20px',
                      backgroundColor: 'white',
                      borderRadius: '10px',
                      border: '1px solid #e2e8f0',
                      boxShadow: '0 2px 4px rgba(0,0,0,0.05)'
                    }}>
                      <div style={{ marginBottom: '16px' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '12px' }}>
                          <h4 style={{ fontWeight: '600', color: '#2d3748', fontSize: '15px', flex: 1, margin: 0 }}>
                            Question {index + 1}: <FormattedText text={question.question} />
                          </h4>
                          {totalAttempts > 0 && (
                            <div style={{ 
                              marginLeft: '16px',
                              padding: '8px 16px',
                              background: correctPercentage >= 70 ? '#c6f6d5' : correctPercentage >= 50 ? '#fefcbf' : '#fed7d7',
                              borderRadius: '8px',
                              minWidth: '140px',
                              textAlign: 'center'
                            }}>
                              <div style={{ 
                                fontSize: '18px', 
                                fontWeight: '700',
                                color: correctPercentage >= 70 ? '#2f855a' : correctPercentage >= 50 ? '#b7791f' : '#c53030'
                              }}>
                                {correctPercentage}% Correct
                              </div>
                              <div style={{ fontSize: '12px', color: '#4a5568', marginTop: '4px' }}>
                                {totalAttempts} student{totalAttempts !== 1 ? 's' : ''}
                              </div>
                            </div>
                          )}
                        </div>

                        <div style={{ paddingLeft: '16px', marginTop: '12px' }}>
                          {question.options.map((option, optIndex) => (
                            <div 
                              key={optIndex} 
                              style={{ 
                                margin: '6px 0',
                                padding: '10px 12px',
                                borderRadius: '6px',
                                fontSize: '13px',
                                backgroundColor: optIndex === question.correctAnswer ? '#c6f6d5' : '#f7fafc',
                                border: optIndex === question.correctAnswer ? '1.5px solid #48bb78' : '1px solid #e2e8f0',
                                color: optIndex === question.correctAnswer ? '#2f855a' : '#4a5568',
                                fontWeight: optIndex === question.correctAnswer ? '600' : '500'
                              }}
                            >
                              <span style={{ fontWeight: '700', marginRight: '6px' }}>{String.fromCharCode(65 + optIndex)}.</span>
                              {option}
                              {optIndex === question.correctAnswer && <span style={{ marginLeft: '8px', fontSize: '14px' }}>✓ Correct Answer</span>}
                            </div>
                          ))}
                        </div>
                      </div>

                      {/* Students who got it correct */}
                      <div style={{ marginTop: '20px', display: 'flex', gap: '12px' }}>
                        <button
                          onClick={() => setStudentModal({ 
                            show: true, 
                            students: correctStudents, 
                            type: 'correct',
                            questionText: `Question ${index + 1}: ${question.question}`
                          })}
                          disabled={correctStudents.length === 0}
                          style={{
                            flex: 1,
                            padding: '12px 16px',
                            backgroundColor: correctStudents.length > 0 ? '#c6f6d5' : '#f7fafc',
                            color: correctStudents.length > 0 ? '#2f855a' : '#a0aec0',
                            border: correctStudents.length > 0 ? '1.5px solid #48bb78' : '1.5px solid #e2e8f0',
                            borderRadius: '8px',
                            fontSize: '14px',
                            fontWeight: '600',
                            cursor: correctStudents.length > 0 ? 'pointer' : 'not-allowed',
                            transition: 'all 0.2s',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            gap: '8px'
                          }}
                        >
                          <span style={{ fontSize: '16px' }}>✓</span>
                          Correct ({correctStudents.length})
                        </button>

                        <button
                          onClick={() => setStudentModal({ 
                            show: true, 
                            students: wrongStudents, 
                            type: 'wrong',
                            questionText: `Question ${index + 1}: ${question.question}`
                          })}
                          disabled={wrongStudents.length === 0}
                          style={{
                            flex: 1,
                            padding: '12px 16px',
                            backgroundColor: wrongStudents.length > 0 ? '#fed7d7' : '#f7fafc',
                            color: wrongStudents.length > 0 ? '#c53030' : '#a0aec0',
                            border: wrongStudents.length > 0 ? '1.5px solid #f56565' : '1.5px solid #e2e8f0',
                            borderRadius: '8px',
                            fontSize: '14px',
                            fontWeight: '600',
                            cursor: wrongStudents.length > 0 ? 'pointer' : 'not-allowed',
                            transition: 'all 0.2s',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            gap: '8px'
                          }}
                        >
                          <span style={{ fontSize: '16px' }}>✗</span>
                          Incorrect ({wrongStudents.length})
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {/* Student Details Modal */}
        {studentModal.show && (
          <div style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            backgroundColor: 'rgba(0, 0, 0, 0.5)',
            display: 'flex',
            justifyContent: 'center',
            alignItems: 'center',
            zIndex: 1000
          }}
          onClick={() => setStudentModal({ show: false, students: [], type: '', questionText: '' })}
          >
            <div style={{
              backgroundColor: 'white',
              borderRadius: '12px',
              padding: '24px',
              maxWidth: '600px',
              width: '90%',
              maxHeight: '80vh',
              overflow: 'auto',
              boxShadow: '0 10px 40px rgba(0,0,0,0.2)'
            }}
            onClick={(e) => e.stopPropagation()}
            >
              <div style={{ marginBottom: '20px' }}>
                <h3 style={{ 
                  margin: '0 0 8px 0', 
                  color: studentModal.type === 'correct' ? '#2f855a' : '#c53030',
                  fontSize: '18px',
                  fontWeight: '600'
                }}>
                  {studentModal.type === 'correct' ? '✓ Students Who Got It Correct' : '✗ Students Who Got It Wrong'}
                </h3>
                <p style={{ margin: 0, color: '#718096', fontSize: '13px' }}>
                  {studentModal.questionText}
                </p>
              </div>

              {/* Wrong Options Distribution */}
              {studentModal.type === 'wrong' && studentModal.students.length > 0 && (() => {
                const optionCounts = {};
                studentModal.students.forEach(student => {
                  if (student.selectedIndex !== undefined) {
                    const optionLetter = String.fromCharCode(65 + student.selectedIndex);
                    if (!optionCounts[optionLetter]) {
                      optionCounts[optionLetter] = {
                        count: 0,
                        answer: student.answer,
                        weight: student.weight || 0
                      };
                    }
                    optionCounts[optionLetter].count++;
                  }
                });
                
                const maxCount = Math.max(...Object.values(optionCounts).map(d => d.count));
                
                return Object.keys(optionCounts).length > 0 && (
                  <div style={{
                    marginBottom: '20px',
                    padding: '16px',
                    backgroundColor: '#fff5f5',
                    borderRadius: '8px',
                    border: '1.5px solid #feb2b2'
                  }}>
                    <h4 style={{ 
                      margin: '0 0 12px 0', 
                      fontSize: '14px', 
                      fontWeight: '600',
                      color: '#2d3748'
                    }}>
                      📊 Wrong Options Distribution
                    </h4>
                    <div style={{ 
                      display: 'flex', 
                      gap: '16px',
                      alignItems: 'flex-end',
                      justifyContent: 'space-around',
                      padding: '20px 10px 10px',
                      minHeight: '200px',
                      borderBottom: '2px solid #cbd5e0'
                    }}>
                      {Object.entries(optionCounts).sort((a, b) => a[0].localeCompare(b[0])).map(([option, data]) => {
                        const heightPercentage = (data.count / maxCount) * 100;
                        return (
                          <div key={option} style={{ 
                            flex: 1,
                            display: 'flex',
                            flexDirection: 'column',
                            alignItems: 'center',
                            gap: '8px'
                          }}>
                            <div style={{ 
                              width: '100%',
                              maxWidth: '80px',
                              display: 'flex',
                              flexDirection: 'column',
                              alignItems: 'center',
                              justifyContent: 'flex-end',
                              height: '150px'
                            }}>
                              <div style={{
                                fontSize: '13px',
                                fontWeight: '600',
                                color: '#c53030',
                                marginBottom: '4px'
                              }}>
                                {data.count}
                              </div>
                              <div style={{
                                width: '100%',
                                height: `${heightPercentage}%`,
                                backgroundColor: '#fc8181',
                                borderRadius: '6px 6px 0 0',
                                transition: 'height 0.3s ease',
                                display: 'flex',
                                flexDirection: 'column',
                                alignItems: 'center',
                                justifyContent: 'flex-start',
                                paddingTop: '8px',
                                minHeight: '30px',
                                boxShadow: '0 -2px 4px rgba(0,0,0,0.1)'
                              }}>
                                <span style={{ 
                                  color: 'white', 
                                  fontSize: '11px',
                                  fontWeight: '600',
                                  textShadow: '0 1px 2px rgba(0,0,0,0.3)'
                                }}>
                                  {((data.count / studentModal.students.length) * 100).toFixed(1)}%
                                </span>
                              </div>
                            </div>
                            <div style={{
                              textAlign: 'center',
                              fontSize: '13px',
                              fontWeight: '600',
                              color: '#2d3748',
                              marginTop: '8px'
                            }}>
                              Option {option}
                            </div>
                            <div style={{
                              fontSize: '11px',
                              color: '#4a5568',
                              textAlign: 'center',
                              maxWidth: '100px',
                              overflow: 'hidden',
                              textOverflow: 'ellipsis',
                              whiteSpace: 'nowrap'
                            }} title={data.answer}>
                              {data.answer}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                );
              })()}

              <div style={{ display: 'grid', gap: '10px' }}>
                {studentModal.students.map((student, idx) => (
                  <div key={idx} style={{
                    padding: '14px 16px',
                    backgroundColor: studentModal.type === 'correct' ? '#f0fff4' : '#fff5f5',
                    borderRadius: '8px',
                    border: studentModal.type === 'correct' ? '1px solid #9ae6b4' : '1px solid #feb2b2'
                  }}>
                    <div style={{ fontWeight: '600', color: '#2d3748', fontSize: '14px' }}>
                      {idx + 1}. {student.name}
                    </div>
                    <div style={{ color: '#718096', fontSize: '13px', marginTop: '4px' }}>
                      {student.email}
                    </div>
                    {studentModal.type === 'wrong' && student.answer && (
                      <div style={{ 
                        marginTop: '6px',
                        paddingTop: '6px',
                        borderTop: '1px solid #feb2b2'
                      }}>
                        <div style={{
                          color: '#c53030', 
                          fontSize: '12px', 
                          fontStyle: 'italic'
                        }}>
                          Their answer: {student.answer}
                        </div>
                        <div style={{
                          marginTop: '4px',
                          fontSize: '11px',
                          color: '#718096'
                        }}>
                          <strong>Option:</strong> {student.selectedIndex !== undefined ? String.fromCharCode(65 + student.selectedIndex) : 'N/A'}
                        </div>
                      </div>
                    )}
                  </div>
                ))}
              </div>

              <button
                onClick={() => setStudentModal({ show: false, students: [], type: '', questionText: '' })}
                style={{
                  marginTop: '20px',
                  width: '100%',
                  padding: '10px 16px',
                  backgroundColor: '#667eea',
                  color: 'white',
                  border: 'none',
                  borderRadius: '8px',
                  fontSize: '14px',
                  fontWeight: '600',
                  cursor: 'pointer'
                }}
              >
                Close
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

export default QuizSubmissions;
