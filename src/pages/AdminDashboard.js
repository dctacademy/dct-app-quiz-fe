import React, { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { quizAPI } from '../services/api';
import { useToast } from '../components/Toast';
import { useAuth } from '../context/AuthContext';
import CreateQuiz from '../components/CreateQuiz';
import QuizSubmissions from '../components/QuizSubmissions';
import FlaggedQuestions from '../components/FlaggedQuestions';
import { FormattedText } from '../utils/formatText';

function AdminDashboard() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const { showToast } = useToast();
  const [searchParams, setSearchParams] = useSearchParams();
  
  // Verify user is admin
  useEffect(() => {
    if (user && user.role !== 'admin') {
      showToast('Access denied. Admin only.', 'error');
      navigate('/user');
    }
  }, [user, navigate, showToast]);

  const [quizzes, setQuizzes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [selectedQuiz, setSelectedQuiz] = useState(null);
  const [editingQuiz, setEditingQuiz] = useState(null);
  const [viewingQuestions, setViewingQuestions] = useState(null);
  const [viewingFlaggedQuestions, setViewingFlaggedQuestions] = useState(false);
  const [editingAnswer, setEditingAnswer] = useState(null);
  const [newCorrectAnswer, setNewCorrectAnswer] = useState('');
  
  // Get current page from URL or default to 1
  const currentPage = parseInt(searchParams.get('page')) || 1;
  
  const [pagination, setPagination] = useState({
    currentPage: 1,
    totalPages: 1,
    totalQuizzes: 0,
    limit: 10,
    hasNextPage: false,
    hasPrevPage: false
  });

  useEffect(() => {
    fetchQuizzes(currentPage);
  }, [currentPage]);

  const fetchQuizzes = async (page = 1) => {
    setLoading(true);
    try {
      const response = await quizAPI.getMyQuizzes(page, 10);
      setQuizzes(response.data.quizzes);
      setPagination(response.data.pagination);
    } catch (error) {
      console.error('Error fetching quizzes:', error);
      if (error.response?.status === 403) {
        showToast('Access denied. Admin only.', 'error');
        navigate('/user');
      }
    } finally {
      setLoading(false);
    }
  };

  const handleQuizCreated = () => {
    setShowCreateForm(false);
    setSearchParams({ page: '1' }); // Reset to first page
    fetchQuizzes(1);
  };

  const handleDeleteQuiz = async (quizId, quizTitle) => {
    if (!window.confirm(`Are you sure you want to delete "${quizTitle}"? This will also delete all submissions for this quiz. This action cannot be undone.`)) {
      return;
    }

    try {
      await quizAPI.deleteQuiz(quizId);
      showToast('Quiz deleted successfully', 'success');
      // Reset to list view
      setSelectedQuiz(null);
      // If current page becomes empty after delete, go to previous page
      if (quizzes.length === 1 && currentPage > 1) {
        setSearchParams({ page: (currentPage - 1).toString() });
      } else {
        fetchQuizzes(currentPage); // Refresh the list
      }
    } catch (error) {
      const errorMsg = error.response?.data?.message || 'Failed to delete quiz';
      showToast(errorMsg, 'error');
    }
  };

  const handleUpdateCorrectAnswer = async (questionId, questionIndex) => {
    if (newCorrectAnswer === '' && newCorrectAnswer !== 0) {
      showToast('Please select/enter the correct answer', 'error');
      return;
    }

    try {
      await quizAPI.updateQuestionCorrectAnswer(viewingQuestions._id, questionId, newCorrectAnswer);
      showToast('Correct answer updated successfully', 'success');
      
      // Update local state
      const updatedQuestions = [...viewingQuestions.questions];
      updatedQuestions[questionIndex].correctAnswer = newCorrectAnswer;
      setViewingQuestions({ ...viewingQuestions, questions: updatedQuestions });
      
      setEditingAnswer(null);
      setNewCorrectAnswer('');
    } catch (error) {
      showToast(error.response?.data?.message || 'Failed to update correct answer', 'error');
    }
  };

  const startEditingAnswer = (question) => {
    setEditingAnswer(question._id);
    setNewCorrectAnswer(question.correctAnswer);
  };

  const cancelEditingAnswer = () => {
    setEditingAnswer(null);
    setNewCorrectAnswer('');
  };

  const handleDeleteQuestion = async (quizId, questionIndex) => {
    if (!window.confirm('Are you sure you want to delete this question? This action cannot be undone.')) {
      return;
    }

    try {
      await quizAPI.deleteQuestion(quizId, questionIndex);
      showToast('Question deleted successfully', 'success');
      
      // Update the viewingQuestions state immediately by removing the question
      if (viewingQuestions) {
        const updatedQuestions = viewingQuestions.questions.filter((_, idx) => idx !== questionIndex);
        
        if (updatedQuestions.length > 0) {
          setViewingQuestions({ ...viewingQuestions, questions: updatedQuestions });
        } else {
          // If no questions left, close modal
          setViewingQuestions(null);
        }
      }
      
      // Refresh the quiz list in the background
      fetchQuizzes(currentPage);
    } catch (err) {
      const errorMsg = err.response?.data?.message || 'Failed to delete question';
      showToast(errorMsg, 'error');
    }
  };

  const handleEditQuiz = (quiz) => {
    setEditingQuiz(quiz);
  };

  const handleUpdateQuiz = async (quizId, updatedData) => {
    try {
      await quizAPI.updateQuiz(quizId, updatedData);
      showToast('Quiz updated successfully', 'success');
      setEditingQuiz(null);
      fetchQuizzes(currentPage);
    } catch (err) {
      const errorMsg = err.response?.data?.message || 'Failed to update quiz';
      showToast(errorMsg, 'error');
    }
  };

  const handlePageChange = (newPage) => {
    setSearchParams({ page: newPage.toString() });
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  if (loading) {
    return <div className="loading">Loading...</div>;
  }

  if (viewingFlaggedQuestions) {
    return <FlaggedQuestions onBack={() => setViewingFlaggedQuestions(false)} />;
  }

  if (selectedQuiz) {
    return (
      <QuizSubmissions 
        quiz={selectedQuiz} 
        onBack={() => {
          setSelectedQuiz(null);
          fetchQuizzes(); // Refresh quiz list when returning
        }}
        onDelete={handleDeleteQuiz}
      />
    );
  }

  return (
    <div className="container">
      <div className="card">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
          <div>
            <h2 style={{ color: '#667eea', fontSize: '22px', marginBottom: '4px' }}>Admin Dashboard</h2>
            <p style={{ color: '#718096', fontSize: '13px', margin: 0 }}>Manage your quizzes and view submissions</p>
          </div>
          <div style={{ display: 'flex', gap: '8px' }}>
            <button 
              className="btn btn-secondary"
              onClick={() => setViewingFlaggedQuestions(true)}
              style={{ fontSize: '13px' }}
            >
              🚩 Flagged Questions
            </button>
            <button 
              className="btn btn-primary" 
              onClick={() => setShowCreateForm(!showCreateForm)}
            >
              {showCreateForm ? '✕ Cancel' : '+ New Quiz'}
            </button>
          </div>
        </div>

        {showCreateForm && (
          <CreateQuiz onQuizCreated={handleQuizCreated} />
        )}

        <h3 style={{ marginTop: '32px', marginBottom: '16px', fontSize: '17px', fontWeight: '600', color: '#2d3748' }}>Your Quizzes ({quizzes.length} of {pagination.totalQuizzes})</h3>
        {quizzes.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '48px 24px', color: '#718096', fontSize: '14px' }}>
            <p style={{ marginBottom: '8px', fontSize: '15px' }}>No quizzes created yet</p>
            <p style={{ fontSize: '13px' }}>Create your first quiz to get started!</p>
          </div>
        ) : (
          <div style={{ display: 'grid', gap: '12px' }}>
            {quizzes.map((quiz) => (
              <div 
                key={quiz._id} 
                onClick={() => setSelectedQuiz(quiz)}
                style={{ 
                  border: '1.5px solid #e2e8f0', 
                  borderRadius: '12px', 
                  padding: '18px',
                  transition: 'all 0.2s ease',
                  background: '#fafafa',
                  cursor: 'pointer'
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.borderColor = '#667eea';
                  e.currentTarget.style.background = 'white';
                  e.currentTarget.style.boxShadow = '0 4px 12px rgba(102, 126, 234, 0.1)';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.borderColor = '#e2e8f0';
                  e.currentTarget.style.background = '#fafafa';
                  e.currentTarget.style.boxShadow = 'none';
                }}
              >
                <h4 
                  style={{ 
                    marginBottom: '6px', 
                    color: '#667eea', 
                    fontSize: '16px', 
                    fontWeight: '600'
                  }}
                >
                  {quiz.title}
                </h4>
                <p style={{ color: '#718096', marginBottom: '12px', fontSize: '13px', lineHeight: '1.5' }}>{quiz.description}</p>
                
                {/* Tags display */}
                {quiz.tags && quiz.tags.length > 0 && (
                  <div style={{ marginBottom: '12px', display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
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
                
                <div style={{ display: 'flex', gap: '16px', flexWrap: 'wrap', alignItems: 'center', fontSize: '13px', marginBottom: '12px' }}>
                  <span style={{ fontWeight: '600', color: '#667eea', padding: '4px 10px', background: '#eef2ff', borderRadius: '6px' }}>
                    📋 {quiz.quizCode}
                  </span>
                  {quiz.quizType && (
                    <span style={{
                      fontWeight: '600',
                      color: '#d69e2e',
                      padding: '4px 10px',
                      background: '#fef3c7',
                      borderRadius: '6px',
                      fontSize: '12px'
                    }}>
                      📝 {quiz.quizType}
                    </span>
                  )}
                  {quiz.difficulties && quiz.difficulties.length > 0 ? (
                    <div style={{ display: 'flex', gap: '6px', alignItems: 'center' }}>
                      {quiz.difficulties.map((diff, idx) => (
                        <span key={idx} style={{ 
                          padding: '4px 10px', 
                          background: diff === 'Easy' ? '#c6f6d5' : diff === 'Medium' ? '#fef3c7' : '#fecaca',
                          color: diff === 'Easy' ? '#22543d' : diff === 'Medium' ? '#78350f' : '#7f1d1d',
                          borderRadius: '6px',
                          fontWeight: '600',
                          fontSize: '12px'
                        }}>
                          {diff === 'Easy' ? '🟢' : diff === 'Medium' ? '🟡' : '🔴'} {diff}
                        </span>
                      ))}
                    </div>
                  ) : quiz.difficulty && (
                    <span style={{ 
                      padding: '4px 10px', 
                      background: quiz.difficulty === 'Easy' ? '#c6f6d5' : quiz.difficulty === 'Medium' ? '#fef3c7' : '#fecaca',
                      color: quiz.difficulty === 'Easy' ? '#22543d' : quiz.difficulty === 'Medium' ? '#78350f' : '#7f1d1d',
                      borderRadius: '6px',
                      fontWeight: '600',
                      fontSize: '12px'
                    }}>
                      {quiz.difficulty === 'Easy' ? '🟢' : quiz.difficulty === 'Medium' ? '🟡' : '🔴'} {quiz.difficulty}
                    </span>
                  )}
                  <span style={{ color: '#4a5568' }}>📝 {quiz.questions.length} questions</span>
                  <span style={{ color: '#4a5568' }}>⏱️ {quiz.duration} mins</span>
                  <span style={{ color: '#4a5568' }}>📅 {new Date(quiz.createdAt).toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric', year: 'numeric' })}</span>
                  <span style={{ 
                    padding: '4px 12px', 
                    backgroundColor: quiz.submissionCount > 0 ? '#c6f6d5' : '#fed7d7',
                    color: quiz.submissionCount > 0 ? '#2f855a' : '#c53030',
                    borderRadius: '12px',
                    fontSize: '12px',
                    fontWeight: '600'
                  }}>
                    👥 {quiz.submissionCount || 0} submission{quiz.submissionCount !== 1 ? 's' : ''}
                  </span>
                </div>
                <div style={{ display: 'flex', gap: '8px' }}>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      handleEditQuiz(quiz);
                    }}
                    style={{
                      padding: '6px 14px',
                      backgroundColor: '#f7fafc',
                      color: '#667eea',
                      border: '1.5px solid #667eea',
                      borderRadius: '6px',
                      fontSize: '12px',
                      fontWeight: '600',
                      cursor: 'pointer',
                      transition: 'all 0.2s'
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.backgroundColor = '#667eea';
                      e.currentTarget.style.color = 'white';
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.backgroundColor = '#f7fafc';
                      e.currentTarget.style.color = '#667eea';
                    }}
                  >
                    ✏️ Edit
                  </button>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      setViewingQuestions(quiz);
                    }}
                    style={{
                      padding: '6px 14px',
                      backgroundColor: '#f7fafc',
                      color: '#667eea',
                      border: '1.5px solid #667eea',
                      borderRadius: '6px',
                      fontSize: '12px',
                      fontWeight: '600',
                      cursor: 'pointer',
                      transition: 'all 0.2s'
                    }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.backgroundColor = '#667eea';
                    e.currentTarget.style.color = 'white';
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.backgroundColor = '#f7fafc';
                    e.currentTarget.style.color = '#667eea';
                  }}
                >
                  👁️ View Questions
                </button>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Pagination Controls */}
        {pagination.totalPages > 1 && (
          <div style={{ 
            marginTop: '24px', 
            display: 'flex', 
            justifyContent: 'center', 
            alignItems: 'center',
            gap: '8px',
            paddingTop: '24px',
            borderTop: '1px solid #e2e8f0'
          }}>
            <button
              className="btn btn-secondary"
              onClick={() => handlePageChange(currentPage - 1)}
              disabled={!pagination.hasPrevPage}
              style={{ 
                fontSize: '12px', 
                padding: '8px 16px',
                opacity: pagination.hasPrevPage ? 1 : 0.5,
                cursor: pagination.hasPrevPage ? 'pointer' : 'not-allowed'
              }}
            >
              ← Previous
            </button>

            <div style={{ display: 'flex', gap: '4px', alignItems: 'center' }}>
              {[...Array(pagination.totalPages)].map((_, index) => {
                const pageNum = index + 1;
                // Show first page, last page, current page, and pages around current
                if (
                  pageNum === 1 ||
                  pageNum === pagination.totalPages ||
                  (pageNum >= currentPage - 1 && pageNum <= currentPage + 1)
                ) {
                  return (
                    <button
                      key={pageNum}
                      onClick={() => handlePageChange(pageNum)}
                      style={{
                        padding: '8px 12px',
                        fontSize: '12px',
                        fontWeight: '600',
                        border: currentPage === pageNum ? '2px solid #667eea' : '1px solid #e2e8f0',
                        backgroundColor: currentPage === pageNum ? '#eef2ff' : 'white',
                        color: currentPage === pageNum ? '#667eea' : '#4a5568',
                        borderRadius: '6px',
                        cursor: 'pointer',
                        minWidth: '36px',
                        transition: 'all 0.2s'
                      }}
                      onMouseEnter={(e) => {
                        if (currentPage !== pageNum) {
                          e.currentTarget.style.borderColor = '#667eea';
                          e.currentTarget.style.backgroundColor = '#f7fafc';
                        }
                      }}
                      onMouseLeave={(e) => {
                        if (currentPage !== pageNum) {
                          e.currentTarget.style.borderColor = '#e2e8f0';
                          e.currentTarget.style.backgroundColor = 'white';
                        }
                      }}
                    >
                      {pageNum}
                    </button>
                  );
                } else if (
                  (pageNum === currentPage - 2 && currentPage > 3) ||
                  (pageNum === currentPage + 2 && currentPage < pagination.totalPages - 2)
                ) {
                  return <span key={pageNum} style={{ color: '#718096', padding: '0 4px' }}>...</span>;
                }
                return null;
              })}
            </div>

            <button
              className="btn btn-secondary"
              onClick={() => handlePageChange(currentPage + 1)}
              disabled={!pagination.hasNextPage}
              style={{ 
                fontSize: '12px', 
                padding: '8px 16px',
                opacity: pagination.hasNextPage ? 1 : 0.5,
                cursor: pagination.hasNextPage ? 'pointer' : 'not-allowed'
              }}
            >
              Next →
            </button>
          </div>
        )}

        {/* Page Info */}
        {pagination.totalQuizzes > 0 && (
          <div style={{ 
            marginTop: '16px', 
            textAlign: 'center', 
            fontSize: '12px', 
            color: '#718096' 
          }}>
            Showing {((currentPage - 1) * pagination.limit) + 1} to {Math.min(currentPage * pagination.limit, pagination.totalQuizzes)} of {pagination.totalQuizzes} quizzes
          </div>
        )}
      </div>

      {/* Questions Modal */}
      {viewingQuestions && (
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
          zIndex: 1000,
          padding: '20px'
        }}
        onClick={() => setViewingQuestions(null)}
        >
          <div style={{
            backgroundColor: 'white',
            borderRadius: '12px',
            padding: '24px',
            maxWidth: '900px',
            width: '100%',
            maxHeight: '85vh',
            overflow: 'auto',
            boxShadow: '0 10px 40px rgba(0,0,0,0.2)'
          }}
          onClick={(e) => e.stopPropagation()}
          >
            <div style={{ marginBottom: '24px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div>
                <h3 style={{ margin: '0 0 4px 0', color: '#667eea', fontSize: '20px', fontWeight: '600' }}>
                  📝 Quiz Questions
                </h3>
                <p style={{ margin: 0, color: '#718096', fontSize: '14px' }}>
                  {viewingQuestions.title} - {viewingQuestions.questions.length} questions
                </p>
              </div>
              <button
                onClick={() => setViewingQuestions(null)}
                style={{
                  padding: '8px 16px',
                  backgroundColor: '#f7fafc',
                  color: '#4a5568',
                  border: '1px solid #e2e8f0',
                  borderRadius: '6px',
                  fontSize: '13px',
                  fontWeight: '600',
                  cursor: 'pointer'
                }}
              >
                ✕ Close
              </button>
            </div>

            <div style={{ display: 'grid', gap: '16px' }}>
              {viewingQuestions.questions.map((question, index) => (
                <div key={question._id} style={{
                  backgroundColor: '#f7fafc',
                  borderRadius: '10px',
                  padding: '18px',
                  border: '1px solid #e2e8f0',
                  position: 'relative'
                }}>
                  <button
                    onClick={() => handleDeleteQuestion(viewingQuestions._id, index)}
                    style={{
                      position: 'absolute',
                      top: '12px',
                      right: '12px',
                      padding: '6px 12px',
                      backgroundColor: '#fff5f5',
                      color: '#c53030',
                      border: '1.5px solid #fc8181',
                      borderRadius: '6px',
                      fontSize: '12px',
                      fontWeight: '600',
                      cursor: 'pointer',
                      transition: 'all 0.2s'
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.backgroundColor = '#c53030';
                      e.currentTarget.style.color = 'white';
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.backgroundColor = '#fff5f5';
                      e.currentTarget.style.color = '#c53030';
                    }}
                  >
                    🗑️ Delete
                  </button>
                  <div style={{ marginBottom: '12px', paddingRight: '80px' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                      <h4 style={{ margin: 0, color: '#2d3748', fontSize: '15px', fontWeight: '600' }}>
                        Question {index + 1}
                      </h4>
                      {question.difficulty && (
                        <span style={{
                          padding: '4px 10px',
                          background: question.difficulty === 'Easy' ? '#c6f6d5' : question.difficulty === 'Medium' ? '#fef3c7' : '#fecaca',
                          color: question.difficulty === 'Easy' ? '#22543d' : question.difficulty === 'Medium' ? '#78350f' : '#7f1d1d',
                          borderRadius: '6px',
                          fontWeight: '600',
                          fontSize: '11px'
                        }}>
                          {question.difficulty === 'Easy' ? '🟢' : question.difficulty === 'Medium' ? '🟡' : '🔴'} {question.difficulty}
                        </span>
                      )}
                    </div>
                    <p style={{ margin: 0, color: '#4a5568', fontSize: '14px', lineHeight: '1.6' }}>
                      <FormattedText text={question.question} />
                    </p>
                  </div>

                  <div style={{ marginBottom: '12px' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                      <h5 style={{ fontSize: '13px', fontWeight: '600', color: '#4a5568', margin: 0 }}>Options</h5>
                      {editingAnswer === question._id ? (
                        <div>
                          <button
                            onClick={() => handleUpdateCorrectAnswer(question._id, index)}
                            style={{
                              padding: '4px 12px',
                              fontSize: '12px',
                              backgroundColor: '#48bb78',
                              color: 'white',
                              border: 'none',
                              borderRadius: '4px',
                              cursor: 'pointer',
                              marginRight: '4px'
                            }}
                          >
                            Save
                          </button>
                          <button
                            onClick={cancelEditingAnswer}
                            style={{
                              padding: '4px 12px',
                              fontSize: '12px',
                              backgroundColor: '#cbd5e0',
                              color: '#2d3748',
                              border: 'none',
                              borderRadius: '4px',
                              cursor: 'pointer'
                            }}
                          >
                            Cancel
                          </button>
                        </div>
                      ) : (
                        <button
                          onClick={() => startEditingAnswer(question)}
                          style={{
                            padding: '4px 12px',
                            fontSize: '12px',
                            backgroundColor: '#667eea',
                            color: 'white',
                            border: 'none',
                            borderRadius: '4px',
                            cursor: 'pointer'
                          }}
                        >
                          ✏️ Edit Correct Answer
                        </button>
                      )}
                    </div>
                    <div style={{ display: 'grid', gap: '8px' }}>
                      {question.options.map((option, optIndex) => (
                        <div
                          key={optIndex}
                          onClick={() => editingAnswer === question._id && setNewCorrectAnswer(optIndex)}
                          style={{
                            padding: '10px 12px',
                            borderRadius: '6px',
                            fontSize: '13px',
                            backgroundColor: editingAnswer === question._id && newCorrectAnswer === optIndex ? '#bee3f8' :
                                             optIndex === question.correctAnswer ? '#c6f6d5' : 'white',
                            border: editingAnswer === question._id && newCorrectAnswer === optIndex ? '2px solid #3182ce' :
                                    optIndex === question.correctAnswer ? '1.5px solid #48bb78' : '1px solid #e2e8f0',
                            color: optIndex === question.correctAnswer ? '#2f855a' : '#4a5568',
                            fontWeight: optIndex === question.correctAnswer ? '600' : '500',
                            cursor: editingAnswer === question._id ? 'pointer' : 'default',
                            transition: 'all 0.2s ease'
                          }}
                        >
                          <span style={{ fontWeight: '700', marginRight: '6px' }}>
                            {String.fromCharCode(65 + optIndex)}.
                          </span>
                          <FormattedText text={option} />
                          {editingAnswer === question._id && newCorrectAnswer === optIndex && <span style={{ marginLeft: '8px', color: '#3182ce' }}>← Select this</span>}
                          {editingAnswer !== question._id && optIndex === question.correctAnswer && (
                            <span style={{ marginLeft: '8px', fontSize: '14px' }}>✓ Correct Answer</span>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>

                  {question.explanation && (
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
                        {question.explanation}
                      </p>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Edit Quiz Modal */}
      {editingQuiz && (
        <EditQuizModal
          quiz={editingQuiz}
          onClose={() => setEditingQuiz(null)}
          onUpdate={handleUpdateQuiz}
        />
      )}
    </div>
  );
}

// Edit Quiz Modal Component
function EditQuizModal({ quiz, onClose, onUpdate }) {
  const [formData, setFormData] = useState({
    title: quiz.title,
    description: quiz.description || '',
    duration: quiz.duration,
    difficulty: quiz.difficulty,
    randomizeQuestions: quiz.randomizeQuestions || false,
    startDate: quiz.startDate ? new Date(quiz.startDate).toISOString().slice(0, 16) : '',
    endDate: quiz.endDate ? new Date(quiz.endDate).toISOString().slice(0, 16) : '',
  });

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    setFormData({
      ...formData,
      [name]: type === 'checkbox' ? checked : value
    });
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    onUpdate(quiz._id, formData);
  };

  return (
    <div
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        backgroundColor: 'rgba(0,0,0,0.5)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 1000,
        padding: '20px'
      }}
      onClick={onClose}
    >
      <div
        style={{
          backgroundColor: 'white',
          borderRadius: '12px',
          padding: '24px',
          maxWidth: '600px',
          width: '100%',
          maxHeight: '85vh',
          overflow: 'auto',
          boxShadow: '0 10px 40px rgba(0,0,0,0.2)'
        }}
        onClick={(e) => e.stopPropagation()}
      >
        <div style={{ marginBottom: '24px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <h3 style={{ margin: 0, color: '#667eea', fontSize: '20px', fontWeight: '600' }}>
            ✏️ Edit Quiz
          </h3>
          <button
            onClick={onClose}
            style={{
              padding: '8px 16px',
              backgroundColor: '#f7fafc',
              color: '#4a5568',
              border: '1px solid #e2e8f0',
              borderRadius: '6px',
              fontSize: '13px',
              fontWeight: '600',
              cursor: 'pointer'
            }}
          >
            ✕ Close
          </button>
        </div>

        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label>Quiz Title *</label>
            <input
              type="text"
              name="title"
              value={formData.title}
              onChange={handleChange}
              required
              placeholder="Enter quiz title"
            />
          </div>

          <div className="form-group">
            <label>Description</label>
            <textarea
              name="description"
              value={formData.description}
              onChange={handleChange}
              rows="3"
              placeholder="Enter quiz description"
            />
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '15px' }}>
            <div className="form-group">
              <label>Duration (minutes) *</label>
              <input
                type="number"
                name="duration"
                value={formData.duration}
                onChange={handleChange}
                min="5"
                max="180"
                required
              />
            </div>

            <div className="form-group">
              <label>Difficulty Level *</label>
              <select
                name="difficulty"
                value={formData.difficulty}
                onChange={handleChange}
                required
              >
                <option value="Easy">🟢 Easy</option>
                <option value="Medium">🟡 Medium</option>
                <option value="Hard">🔴 Hard</option>
              </select>
            </div>
          </div>

          <div className="form-group">
            <label style={{ display: 'flex', alignItems: 'center', cursor: 'pointer', fontSize: '14px' }}>
              <input
                type="checkbox"
                name="randomizeQuestions"
                checked={formData.randomizeQuestions}
                onChange={handleChange}
                style={{ 
                  marginRight: '10px', 
                  width: '18px', 
                  height: '18px',
                  cursor: 'pointer'
                }}
              />
              <span style={{ fontWeight: '600', color: '#2d3748' }}>
                🔀 Randomize Question Order
              </span>
            </label>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '15px' }}>
            <div className="form-group">
              <label>Start Date & Time</label>
              <input
                type="datetime-local"
                name="startDate"
                value={formData.startDate}
                onChange={handleChange}
              />
            </div>

            <div className="form-group">
              <label>End Date & Time</label>
              <input
                type="datetime-local"
                name="endDate"
                value={formData.endDate}
                onChange={handleChange}
              />
            </div>
          </div>

          <div style={{ display: 'flex', gap: '10px', marginTop: '20px' }}>
            <button 
              type="submit" 
              className="btn btn-primary"
              style={{ flex: 1 }}
            >
              💾 Save Changes
            </button>
            <button 
              type="button" 
              className="btn btn-secondary"
              onClick={onClose}
            >
              Cancel
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

export default AdminDashboard;
