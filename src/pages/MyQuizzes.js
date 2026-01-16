import React, { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { submissionAPI } from '../services/api';
import { FormattedText } from '../utils/formatText';
import { useToast } from '../components/Toast';
import Select from 'react-select';

function MyQuizzes() {
  const [submissions, setSubmissions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [expandedQuiz, setExpandedQuiz] = useState(null);
  const [flaggedQuestions, setFlaggedQuestions] = useState({});
  const [flaggingQuestion, setFlaggingQuestion] = useState(null);
  const [flagReason, setFlagReason] = useState('');
  const [selectedTags, setSelectedTags] = useState([]);
  const [availableTags, setAvailableTags] = useState([]);
  const navigate = useNavigate();
  const { showToast } = useToast();
  const [searchParams, setSearchParams] = useSearchParams();
  
  // Get current page from URL or default to 1
  const currentPage = parseInt(searchParams.get('page')) || 1;
  
  const [pagination, setPagination] = useState({
    currentPage: 1,
    totalPages: 1,
    totalSubmissions: 0,
    limit: 10,
    hasNextPage: false,
    hasPrevPage: false
  });

  useEffect(() => {
    fetchMySubmissions(currentPage);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentPage]);

  const fetchMySubmissions = async (page = 1) => {
    try {
      const response = await submissionAPI.getMySubmissions(page, 10);
      
      // Group submissions by quiz
      const grouped = {};
      response.data.submissions.forEach(sub => {
        const quizId = sub.quiz._id;
        if (!grouped[quizId]) {
          grouped[quizId] = [];
        }
        grouped[quizId].push(sub);
      });
      // Sort each group by attempt number
      Object.keys(grouped).forEach(quizId => {
        grouped[quizId].sort((a, b) => a.attemptNumber - b.attemptNumber);
      });
      setSubmissions(grouped);
      setPagination(response.data.pagination);
      
      // Extract unique tags from all quizzes
      const tagsSet = new Set();
      response.data.submissions.forEach(sub => {
        if (sub.quiz && sub.quiz.tags) {
          sub.quiz.tags.forEach(tag => {
            if (tag && tag.name) {
              tagsSet.add(tag.name);
            }
          });
        }
      });
      const tagOptions = Array.from(tagsSet).sort().map(tag => ({ value: tag, label: tag }));
      setAvailableTags(tagOptions);
      
      // Load flags for all submissions
      loadAllFlags(response.data.submissions);
    } catch (error) {
      console.error('Error fetching submissions:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadAllFlags = async (allSubmissions) => {
    try {
      const flagsMap = {};
      await Promise.all(allSubmissions.map(async (sub) => {
        const response = await submissionAPI.getSubmissionFlags(sub._id);
        response.data.forEach(flag => {
          const key = `${sub._id}_${flag.question.toString()}`;
          flagsMap[key] = flag;
        });
      }));
      setFlaggedQuestions(flagsMap);
    } catch (error) {
      console.error('Error loading flags:', error);
    }
  };

  const handleFlagQuestion = async (submissionId, questionId) => {
    if (!flagReason.trim()) {
      showToast('Please provide a reason for flagging this question', 'error');
      return;
    }

    try {
      await submissionAPI.flagQuestion({
        submissionId: submissionId,
        questionId: questionId,
        reason: flagReason
      });
      
      const key = `${submissionId}_${questionId}`;
      setFlaggedQuestions({
        ...flaggedQuestions,
        [key]: { status: 'pending', reason: flagReason }
      });
      setFlaggingQuestion(null);
      setFlagReason('');
      showToast('Question flagged successfully. Admin will review it.', 'success');
    } catch (error) {
      showToast(error.response?.data?.message || 'Failed to flag question', 'error');
    }
  };

  const handlePageChange = (newPage) => {
    setSearchParams({ page: newPage.toString() });
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  if (loading) {
    return <div className="loading">Loading your quizzes...</div>;
  }

  return (
    <div className="container">
      <div className="card">
        <div style={{ marginBottom: '24px' }}>
          <button 
            className="btn btn-secondary" 
            onClick={() => navigate('/user')}
            style={{ fontSize: '12px', marginBottom: '16px' }}
          >
            ← Back to Dashboard
          </button>
          <h2 style={{ color: '#667eea', fontSize: '22px', fontWeight: '700', marginBottom: '6px' }}>
            My Quizzes
          </h2>
          <p style={{ color: '#718096', fontSize: '13px' }}>
            View all the quizzes you have completed
          </p>
        </div>

        {/* Tag Filter */}
        {availableTags.length > 0 && (
          <div style={{ marginBottom: '20px' }}>
            <label style={{ display: 'block', marginBottom: '8px', fontWeight: '600', fontSize: '13px', color: '#4a5568' }}>
              🏷️ Filter by Tags
            </label>
            <Select
              isMulti
              value={selectedTags}
              onChange={setSelectedTags}
              options={availableTags}
              placeholder="Select tags to filter..."
              isClearable
              styles={{
                control: (base) => ({
                  ...base,
                  borderColor: '#e2e8f0',
                  '&:hover': { borderColor: '#cbd5e0' },
                  boxShadow: 'none',
                  fontSize: '13px'
                }),
                multiValue: (base) => ({
                  ...base,
                  backgroundColor: '#eef2ff',
                }),
                multiValueLabel: (base) => ({
                  ...base,
                  color: '#667eea',
                  fontWeight: '500',
                  fontSize: '12px'
                }),
                multiValueRemove: (base) => ({
                  ...base,
                  color: '#667eea',
                  '&:hover': {
                    backgroundColor: '#667eea',
                    color: 'white',
                  },
                }),
              }}
            />
          </div>
        )}

        {Object.keys(submissions).length === 0 ? (
          <div style={{ textAlign: 'center', padding: '48px 24px', background: '#f7fafc', borderRadius: '12px' }}>
            <p style={{ color: '#718096', fontSize: '15px', marginBottom: '8px' }}>
              No quizzes completed yet
            </p>
            <p style={{ color: '#718096', fontSize: '13px', marginBottom: '16px' }}>
              Take your first quiz to see it here!
            </p>
            <button 
              className="btn btn-primary" 
              onClick={() => navigate('/user')}
              style={{ fontSize: '12px' }}
            >
              🚀 Take a Quiz
            </button>
          </div>
        ) : (
          <div style={{ display: 'grid', gap: '12px' }}>
            {Object.entries(submissions)
              .filter(([quizId, quizSubmissions]) => {
                // If no tags selected, show all
                if (selectedTags.length === 0) return true;
                
                // Check if quiz has any of the selected tags
                const mainSubmission = quizSubmissions[0];
                if (!mainSubmission.quiz || !mainSubmission.quiz.tags) return false;
                
                const quizTagNames = mainSubmission.quiz.tags.map(tag => tag.name || tag);
                return selectedTags.some(selectedTag => quizTagNames.includes(selectedTag.value));
              })
              .map(([quizId, quizSubmissions]) => {
              const mainSubmission = quizSubmissions[0]; // First attempt is the main one
              const practiceAttempts = quizSubmissions.slice(1); // Rest are practice
              const percentage = ((mainSubmission.score / mainSubmission.totalQuestions) * 100).toFixed(2);
              const passed = percentage >= 50;

              return (
                <div 
                  key={quizId}
                  style={{
                    border: '1.5px solid #e2e8f0',
                    borderRadius: '12px',
                    padding: '18px',
                    background: '#fafafa',
                    transition: 'all 0.2s ease'
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.background = 'white';
                    e.currentTarget.style.boxShadow = '0 4px 12px rgba(102, 126, 234, 0.1)';
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.background = '#fafafa';
                    e.currentTarget.style.boxShadow = 'none';
                  }}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '12px' }}>
                    <div style={{ flex: 1 }}>
                      <h3 style={{ 
                        color: '#2d3748', 
                        fontSize: '16px', 
                        fontWeight: '600',
                        marginBottom: '4px'
                      }}>
                        {mainSubmission.quiz.title}
                      </h3>
                      {mainSubmission.quiz.description && (
                        <p style={{ color: '#718096', fontSize: '13px', marginBottom: '8px' }}>
                          {mainSubmission.quiz.description}
                        </p>
                      )}
                      
                      {/* Tags display */}
                      {mainSubmission.quiz.tags && mainSubmission.quiz.tags.length > 0 && (
                        <div style={{ marginBottom: '8px', display: 'flex', gap: '4px', flexWrap: 'wrap' }}>
                          {mainSubmission.quiz.tags.map((tag, idx) => (
                            <span
                              key={idx}
                              style={{
                                padding: '2px 8px',
                                background: '#eef2ff',
                                color: '#667eea',
                                borderRadius: '10px',
                                fontSize: '10px',
                                fontWeight: '500',
                                border: '1px solid #c7d2fe'
                              }}
                            >
                              🏷️ {tag.name || tag}
                            </span>
                          ))}
                        </div>
                      )}
                      
                      <p style={{ color: '#4a5568', fontSize: '12px' }}>
                        📋 Code: <strong>{mainSubmission.quiz.quizCode}</strong>
                        {mainSubmission.quiz.quizType && (
                          <span style={{ 
                            marginLeft: '12px',
                            padding: '2px 8px',
                            borderRadius: '4px',
                            backgroundColor: '#fef3c7',
                            color: '#d69e2e',
                            fontSize: '11px',
                            fontWeight: '600'
                          }}>
                            📝 {mainSubmission.quiz.quizType}
                          </span>
                        )}
                        {practiceAttempts.length > 0 && (
                          <span style={{ marginLeft: '12px', color: '#d69e2e', fontSize: '11px', fontWeight: '600' }}>
                            🔄 {practiceAttempts.length} practice attempt{practiceAttempts.length > 1 ? 's' : ''}
                          </span>
                        )}
                      </p>
                    </div>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', alignItems: 'flex-end' }}>
                      <div style={{
                        padding: '8px 16px',
                        borderRadius: '8px',
                        backgroundColor: passed ? '#c6f6d5' : '#fed7d7',
                        textAlign: 'center',
                        minWidth: '80px'
                      }}>
                        <div style={{
                          fontSize: '20px',
                          fontWeight: '700',
                          color: passed ? '#2f855a' : '#c53030'
                        }}>
                          {percentage}%
                        </div>
                        <div style={{ fontSize: '11px', color: '#4a5568', marginTop: '2px' }}>
                          {passed ? '✓ Passed' : '✗ Failed'}
                        </div>
                      </div>
                      {mainSubmission.quiz.resultsShared && mainSubmission.percentile !== undefined && (
                        <div style={{
                          padding: '6px 12px',
                          borderRadius: '8px',
                          backgroundColor: '#eef2ff',
                          textAlign: 'center',
                          minWidth: '80px',
                          border: '1.5px solid #667eea'
                        }}>
                          <div style={{
                            fontSize: '16px',
                            fontWeight: '700',
                            color: '#667eea'
                          }}>
                            {mainSubmission.percentile}th
                          </div>
                          <div style={{ fontSize: '10px', color: '#4a5568', marginTop: '2px' }}>
                            Percentile
                          </div>
                        </div>
                      )}
                    </div>
                  </div>

                  <div style={{ 
                    display: 'flex', 
                    gap: '16px', 
                    flexWrap: 'wrap',
                    paddingTop: '12px',
                    borderTop: '1px solid #e2e8f0',
                    fontSize: '13px',
                    color: '#4a5568'
                  }}>
                    <span>
                      📊 Score: <strong style={{ color: '#2d3748' }}>{mainSubmission.score}/{mainSubmission.totalQuestions}</strong>
                    </span>
                    {mainSubmission.quiz.resultsShared && mainSubmission.totalParticipants && (
                      <span>
                        👥 Participants: <strong style={{ color: '#2d3748' }}>{mainSubmission.totalParticipants}</strong>
                      </span>
                    )}
                    <span>
                      📅 Submitted: <strong style={{ color: '#2d3748' }}>
                        {new Date(mainSubmission.submittedAt).toLocaleDateString()}
                      </strong>
                    </span>
                    <span>
                      🕐 {new Date(mainSubmission.submittedAt).toLocaleTimeString()}
                    </span>
                  </div>

                  {/* View Details Button */}
                  <div style={{ marginTop: '12px', display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                    <button
                      className="btn btn-primary"
                      onClick={() => setExpandedQuiz(expandedQuiz === quizId ? null : quizId)}
                      style={{ fontSize: '12px', padding: '8px 16px' }}
                    >
                      {expandedQuiz === quizId ? '▼ Hide Details' : '▶ View All Attempts'}
                    </button>
                  </div>

                  {/* Detailed Results for All Attempts */}
                  {expandedQuiz === quizId && (
                    <div style={{ 
                      marginTop: '16px',
                      paddingTop: '16px',
                      borderTop: '2px solid #e2e8f0'
                    }}>
                      {quizSubmissions.map((submission, attemptIdx) => (
                        <div key={submission._id} style={{ marginBottom: attemptIdx < quizSubmissions.length - 1 ? '24px' : '0' }}>
                          <div style={{
                            padding: '10px 12px',
                            backgroundColor: submission.isPractice ? '#fef3c7' : '#eef2ff',
                            borderRadius: '8px',
                            marginBottom: '12px',
                            border: `1.5px solid ${submission.isPractice ? '#f59e0b' : '#667eea'}`
                          }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                              <h4 style={{ 
                                color: submission.isPractice ? '#92400e' : '#4c51bf', 
                                fontSize: '14px', 
                                fontWeight: '600',
                                margin: 0
                              }}>
                                {submission.isPractice ? `🔄 Practice Attempt #${submission.attemptNumber}` : '⭐ Official Attempt #1'}
                              </h4>
                              <div style={{ fontSize: '16px', fontWeight: '700', color: submission.isPractice ? '#92400e' : '#4c51bf' }}>
                                {((submission.score / submission.totalQuestions) * 100).toFixed(2)}%
                              </div>
                            </div>
                            <p style={{ fontSize: '11px', color: '#4a5568', margin: '4px 0 0 0' }}>
                              {new Date(submission.submittedAt).toLocaleString()}
                            </p>
                          </div>

                          {submission.detailedResults && (
                            <div>
                              {submission.detailedResults.map((item, index) => {
                                const questionType = item.questionType || 'MCQ';
                                
                                return (
                                  <div 
                                    key={item.questionId} 
                                    style={{ 
                                      marginBottom: '12px',
                                      padding: '12px',
                                      border: `2px solid ${item.isCorrect ? '#48bb78' : '#f56565'}`,
                                      borderRadius: '8px',
                                      backgroundColor: item.isCorrect ? '#f0fff4' : '#fff5f5'
                                    }}
                                  >
                                    <div style={{ display: 'flex', alignItems: 'center', marginBottom: '8px' }}>
                                      <span style={{ 
                                        fontSize: '16px', 
                                        marginRight: '6px',
                                        color: item.isCorrect ? '#48bb78' : '#f56565'
                                      }}>
                                        {item.isCorrect ? '✓' : '✗'}
                                      </span>
                                      <h5 style={{ margin: 0, flex: 1, fontSize: '13px', fontWeight: '600', color: '#2d3748' }}>
                                        Q{index + 1}: <FormattedText text={item.question} />
                                      </h5>
                                      <span style={{
                                        fontSize: '11px',
                                        padding: '3px 8px',
                                        background: item.isCorrect ? '#c6f6d5' : '#fed7d7',
                                        borderRadius: '4px',
                                        color: item.isCorrect ? '#2f855a' : '#c53030',
                                        marginLeft: '6px',
                                        fontWeight: '600'
                                      }}>
                                        {item.essayGrading ? `${item.essayGrading.score}/10` : item.isCorrect ? '1/1' : '0/1'}
                                      </span>
                                      <span style={{
                                        fontSize: '10px',
                                        padding: '2px 6px',
                                        background: '#e2e8f0',
                                        borderRadius: '4px',
                                        color: '#4a5568',
                                        marginLeft: '6px'
                                      }}>
                                        {questionType}
                                      </span>
                                    </div>

                                    <div style={{ marginLeft: '22px' }}>
                            {/* MCQ Type */}
                            {questionType === 'MCQ' && item.options && (
                              <>
                                {item.options.map((option, optIndex) => (
                                  <div 
                                    key={optIndex}
                                    style={{ 
                                      margin: '4px 0',
                                      padding: '8px 10px',
                                      borderRadius: '6px',
                                      fontSize: '12px',
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
                                    <span style={{ fontWeight: '700', marginRight: '6px' }}>
                                      {String.fromCharCode(65 + optIndex)}.
                                    </span>
                                    <FormattedText text={option} />
                                    {optIndex === item.correctAnswer && <span style={{ marginLeft: '6px', fontSize: '12px' }}>✓ Correct</span>}
                                    {optIndex === item.selectedAnswer && !item.isCorrect && <span style={{ marginLeft: '6px', fontSize: '11px' }}>(Your answer)</span>}
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
                                        margin: '4px 0',
                                        padding: '8px 10px',
                                        borderRadius: '6px',
                                        fontSize: '12px',
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
                                      {isCorrectOption && <span style={{ marginLeft: '6px', fontSize: '12px' }}>✓ Correct</span>}
                                      {isSelectedOption && !item.isCorrect && <span style={{ marginLeft: '6px', fontSize: '11px' }}>(Your answer)</span>}
                                    </div>
                                  );
                                })}
                              </>
                            )}

                            {/* Fill in the Blank Type */}
                            {questionType === 'FillInBlank' && (
                              <>
                                <div style={{ marginBottom: '6px' }}>
                                  <div style={{ fontSize: '11px', color: '#718096', marginBottom: '3px', fontWeight: '600' }}>
                                    Your Answer:
                                  </div>
                                  <div style={{ 
                                    padding: '8px 10px',
                                    borderRadius: '6px',
                                    fontSize: '12px',
                                    backgroundColor: item.isCorrect ? '#c6f6d5' : '#fed7d7',
                                    border: `1.5px solid ${item.isCorrect ? '#48bb78' : '#f56565'}`,
                                    color: item.isCorrect ? '#2f855a' : '#c53030',
                                    fontWeight: '600'
                                  }}>
                                    {item.selectedAnswer || 'No answer provided'}
                                  </div>
                                </div>
                                <div>
                                  <div style={{ fontSize: '11px', color: '#718096', marginBottom: '3px', fontWeight: '600' }}>
                                    Correct Answer:
                                  </div>
                                  <div style={{ 
                                    padding: '8px 10px',
                                    borderRadius: '6px',
                                    fontSize: '12px',
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
                                      margin: '4px 0',
                                      padding: '8px 10px',
                                      borderRadius: '6px',
                                      fontSize: '12px',
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
                                    <span style={{ fontWeight: '700', marginRight: '6px' }}>
                                      {String.fromCharCode(65 + optIndex)}.
                                    </span>
                                    <FormattedText text={option} />
                                    {optIndex === item.correctAnswer && <span style={{ marginLeft: '6px', fontSize: '12px' }}>✓ Correct</span>}
                                    {optIndex === item.selectedAnswer && !item.isCorrect && <span style={{ marginLeft: '6px', fontSize: '11px' }}>(Your answer)</span>}
                                  </div>
                                ))}
                              </>
                            )}

                            {/* Essay Type */}
                            {questionType === 'Essay' && (
                              <>
                                <div style={{ marginBottom: '10px' }}>
                                  <div style={{ fontSize: '11px', color: '#718096', marginBottom: '3px', fontWeight: '600' }}>
                                    Your Answer:
                                  </div>
                                  <div style={{ 
                                    padding: '10px',
                                    borderRadius: '6px',
                                    fontSize: '12px',
                                    backgroundColor: '#f7fafc',
                                    border: '1.5px solid #e2e8f0',
                                    color: '#2d3748',
                                    whiteSpace: 'pre-wrap',
                                    lineHeight: '1.5'
                                  }}>
                                    {item.selectedAnswer || 'No answer provided'}
                                  </div>
                                </div>
                                
                                {item.essayGrading && (
                                  <div style={{
                                    padding: '12px',
                                    background: item.isCorrect ? '#f0fff4' : '#fff5f5',
                                    borderLeft: `4px solid ${item.isCorrect ? '#48bb78' : '#f56565'}`,
                                    borderRadius: '6px',
                                    marginTop: '10px'
                                  }}>
                                    <div style={{ display: 'flex', alignItems: 'center', marginBottom: '8px' }}>
                                      <span style={{ fontSize: '14px', fontWeight: '700', color: '#2d3748' }}>
                                        AI Score: {item.essayGrading.score}/10
                                      </span>
                                      {item.essayGrading.score >= 7 && <span style={{ marginLeft: '6px', fontSize: '14px' }}>🌟</span>}
                                      {item.essayGrading.score >= 5 && item.essayGrading.score < 7 && <span style={{ marginLeft: '6px', fontSize: '14px' }}>👍</span>}
                                      {item.essayGrading.score < 5 && <span style={{ marginLeft: '6px', fontSize: '14px' }}>📝</span>}
                                    </div>
                                    
                                    {item.essayGrading.feedback && (
                                      <div style={{ marginBottom: '8px' }}>
                                        <div style={{ fontSize: '11px', fontWeight: '600', color: '#4a5568', marginBottom: '3px' }}>
                                          💬 Feedback:
                                        </div>
                                        <div style={{ fontSize: '12px', color: '#2d3748', lineHeight: '1.4' }}>
                                          {item.essayGrading.feedback}
                                        </div>
                                      </div>
                                    )}
                                    
                                    {item.essayGrading.strengths && item.essayGrading.strengths.length > 0 && (
                                      <div style={{ marginBottom: '8px' }}>
                                        <div style={{ fontSize: '11px', fontWeight: '600', color: '#2f855a', marginBottom: '3px' }}>
                                          ✅ Strengths:
                                        </div>
                                        <ul style={{ margin: 0, paddingLeft: '18px', fontSize: '12px', color: '#2d3748' }}>
                                          {item.essayGrading.strengths.map((strength, idx) => (
                                            <li key={idx} style={{ marginBottom: '2px' }}>{strength}</li>
                                          ))}
                                        </ul>
                                      </div>
                                    )}
                                    
                                    {item.essayGrading.improvements && item.essayGrading.improvements.length > 0 && (
                                      <div>
                                        <div style={{ fontSize: '11px', fontWeight: '600', color: '#c53030', marginBottom: '3px' }}>
                                          📈 Areas for Improvement:
                                        </div>
                                        <ul style={{ margin: 0, paddingLeft: '18px', fontSize: '12px', color: '#2d3748' }}>
                                          {item.essayGrading.improvements.map((improvement, idx) => (
                                            <li key={idx} style={{ marginBottom: '2px' }}>{improvement}</li>
                                          ))}
                                        </ul>
                                      </div>
                                    )}
                                  </div>
                                )}
                              </>
                            )}

                            {/* Flag Question Section */}
                            <div style={{ 
                              marginTop: '10px',
                              paddingTop: '10px',
                              borderTop: '1px solid #e2e8f0'
                            }}>
                              {(() => {
                                const flagKey = `${submission._id}_${item.questionId}`;
                                return flaggedQuestions[flagKey] ? (
                                  <div style={{ 
                                    display: 'flex', 
                                    alignItems: 'center',
                                    fontSize: '11px',
                                    color: '#718096'
                                  }}>
                                    <span style={{ marginRight: '6px' }}>🚩</span>
                                    <span>
                                      Flagged as incorrect ({flaggedQuestions[flagKey].status || 'pending'})
                                    </span>
                                  </div>
                                ) : flaggingQuestion === `${submission._id}_${item.questionId}` ? (
                                  <div>
                                    <div style={{ marginBottom: '6px' }}>
                                      <label style={{ 
                                        display: 'block', 
                                        fontSize: '11px', 
                                        fontWeight: '600', 
                                        color: '#2d3748',
                                        marginBottom: '4px'
                                      }}>
                                        Why do you think this answer is wrong?
                                      </label>
                                      <textarea
                                        value={flagReason}
                                        onChange={(e) => setFlagReason(e.target.value)}
                                        placeholder="Explain why you believe the correct answer is wrong..."
                                        style={{
                                          width: '100%',
                                          minHeight: '50px',
                                          padding: '6px',
                                          fontSize: '12px',
                                          borderRadius: '6px',
                                          border: '1px solid #cbd5e0',
                                          resize: 'vertical'
                                        }}
                                      />
                                    </div>
                                    <div style={{ display: 'flex', gap: '6px' }}>
                                      <button
                                        onClick={() => handleFlagQuestion(submission._id, item.questionId)}
                                        style={{
                                          padding: '5px 10px',
                                          fontSize: '11px',
                                          fontWeight: '600',
                                          color: '#fff',
                                          backgroundColor: '#f56565',
                                          border: 'none',
                                          borderRadius: '5px',
                                          cursor: 'pointer'
                                        }}
                                      >
                                        Submit Flag
                                      </button>
                                      <button
                                        onClick={() => {
                                          setFlaggingQuestion(null);
                                          setFlagReason('');
                                        }}
                                        style={{
                                          padding: '5px 10px',
                                          fontSize: '11px',
                                          fontWeight: '600',
                                          color: '#4a5568',
                                          backgroundColor: '#e2e8f0',
                                          border: 'none',
                                          borderRadius: '5px',
                                          cursor: 'pointer'
                                        }}
                                      >
                                        Cancel
                                      </button>
                                    </div>
                                  </div>
                                ) : (
                                  <button
                                    onClick={() => setFlaggingQuestion(`${submission._id}_${item.questionId}`)}
                                    style={{
                                      display: 'flex',
                                      alignItems: 'center',
                                      gap: '5px',
                                      padding: '5px 10px',
                                      fontSize: '11px',
                                      fontWeight: '600',
                                      color: '#c53030',
                                      backgroundColor: 'transparent',
                                      border: '1px solid #fc8181',
                                      borderRadius: '5px',
                                      cursor: 'pointer',
                                      transition: 'all 0.2s'
                                    }}
                                    onMouseOver={(e) => {
                                      e.currentTarget.style.backgroundColor = '#fff5f5';
                                    }}
                                    onMouseOut={(e) => {
                                      e.currentTarget.style.backgroundColor = 'transparent';
                                    }}
                                  >
                                    <span>🚩</span>
                                    <span>Flag as Wrong Answer</span>
                                  </button>
                                );
                              })()}
                            </div>
                                    </div>
                                  </div>
                                );
                              })}
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}

        {/* Pagination */}
        {pagination.totalPages > 1 && (
          <div style={{
            display: 'flex',
            justifyContent: 'center',
            alignItems: 'center',
            gap: '8px',
            marginTop: '32px',
            paddingTop: '24px',
            borderTop: '1px solid #e2e8f0'
          }}>
            <button
              onClick={() => handlePageChange(currentPage - 1)}
              disabled={!pagination.hasPrevPage}
              style={{
                padding: '8px 16px',
                backgroundColor: pagination.hasPrevPage ? 'white' : '#f7fafc',
                color: pagination.hasPrevPage ? '#667eea' : '#cbd5e0',
                border: '1.5px solid',
                borderColor: pagination.hasPrevPage ? '#667eea' : '#e2e8f0',
                borderRadius: '8px',
                fontSize: '14px',
                fontWeight: '600',
                cursor: pagination.hasPrevPage ? 'pointer' : 'not-allowed',
                transition: 'all 0.2s'
              }}
            >
              ← Previous
            </button>

            <div style={{ display: 'flex', gap: '4px' }}>
              {Array.from({ length: pagination.totalPages }, (_, i) => i + 1).map(pageNum => (
                <button
                  key={pageNum}
                  onClick={() => handlePageChange(pageNum)}
                  style={{
                    padding: '8px 12px',
                    backgroundColor: pageNum === currentPage ? '#667eea' : 'white',
                    color: pageNum === currentPage ? 'white' : '#4a5568',
                    border: '1.5px solid',
                    borderColor: pageNum === currentPage ? '#667eea' : '#e2e8f0',
                    borderRadius: '8px',
                    fontSize: '14px',
                    fontWeight: '600',
                    cursor: 'pointer',
                    transition: 'all 0.2s',
                    minWidth: '40px'
                  }}
                >
                  {pageNum}
                </button>
              ))}
            </div>

            <button
              onClick={() => handlePageChange(currentPage + 1)}
              disabled={!pagination.hasNextPage}
              style={{
                padding: '8px 16px',
                backgroundColor: pagination.hasNextPage ? 'white' : '#f7fafc',
                color: pagination.hasNextPage ? '#667eea' : '#cbd5e0',
                border: '1.5px solid',
                borderColor: pagination.hasNextPage ? '#667eea' : '#e2e8f0',
                borderRadius: '8px',
                fontSize: '14px',
                fontWeight: '600',
                cursor: pagination.hasNextPage ? 'pointer' : 'not-allowed',
                transition: 'all 0.2s'
              }}
            >
              Next →
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

export default MyQuizzes;

