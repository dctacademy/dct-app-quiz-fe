import React, { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { quizAPI } from '../services/api';
import { useToast } from '../components/Toast';
import { useAuth } from '../context/AuthContext';
import { FormattedText } from '../utils/formatText';

function AllQuestions() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const { showToast } = useToast();
  const [searchParams, setSearchParams] = useSearchParams();
  const [questions, setQuestions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterQuiz, setFilterQuiz] = useState('all');
  const [filterDifficulty, setFilterDifficulty] = useState('all');
  const [totalQuizzes, setTotalQuizzes] = useState(0);
  const [editingAnswer, setEditingAnswer] = useState(null);
  const [newCorrectAnswer, setNewCorrectAnswer] = useState('');
  const [pagination, setPagination] = useState({
    currentPage: 1,
    totalPages: 1,
    totalQuestions: 0,
    limit: 15
  });

  const currentPage = parseInt(searchParams.get('page')) || 1;
  const currentLimit = parseInt(searchParams.get('limit')) || 15;

  useEffect(() => {
    if (user && user.role !== 'admin') {
      showToast('Access denied. Admin only.', 'error');
      navigate('/user');
    }
  }, [user, navigate, showToast]);

  useEffect(() => {
    fetchAllQuestions();
  }, [currentPage, currentLimit]);

  const fetchAllQuestions = async () => {
    try {
      setLoading(true);
      const response = await quizAPI.getAllQuestions(currentPage, currentLimit);
      setQuestions(response.data.questions);
      setTotalQuizzes(response.data.totalQuizzes);
      setPagination(response.data.pagination);
    } catch (error) {
      showToast(error.response?.data?.message || 'Failed to fetch questions', 'error');
      if (error.response?.status === 403) {
        navigate('/user');
      }
    } finally {
      setLoading(false);
    }
  };

  const handlePageChange = (newPage) => {
    setSearchParams({ page: newPage.toString(), limit: currentLimit.toString() });
  };

  const handleLimitChange = (newLimit) => {
    setSearchParams({ page: '1', limit: newLimit.toString() });
  };

  const handleUpdateCorrectAnswer = async (item) => {
    if (newCorrectAnswer === '' && newCorrectAnswer !== 0) {
      showToast('Please select/enter the correct answer', 'error');
      return;
    }

    try {
      await quizAPI.updateQuestionCorrectAnswer(item.quizId, item.questionId, newCorrectAnswer);
      showToast('Correct answer updated successfully', 'success');
      setEditingAnswer(null);
      setNewCorrectAnswer('');
      fetchAllQuestions();
    } catch (error) {
      showToast(error.response?.data?.message || 'Failed to update correct answer', 'error');
    }
  };

  const startEditingAnswer = (item) => {
    setEditingAnswer(item.questionId);
    setNewCorrectAnswer(item.correctAnswer);
  };

  const cancelEditingAnswer = () => {
    setEditingAnswer(null);
    setNewCorrectAnswer('');
  };

  // Get unique quizzes for filter
  const uniqueQuizzes = [...new Map(questions.map(q => [q.quizId, { id: q.quizId, title: q.quizTitle, code: q.quizCode }])).values()];

  // Filter questions
  const filteredQuestions = questions.filter(q => {
    const matchesSearch = q.question.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         q.quizTitle.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesQuiz = filterQuiz === 'all' || q.quizId === filterQuiz;
    const matchesDifficulty = filterDifficulty === 'all' || q.stats.difficulty === filterDifficulty;
    return matchesSearch && matchesQuiz && matchesDifficulty;
  });

  if (loading) {
    return <div className="loading">Loading questions...</div>;
  }

  return (
    <div className="container">
      <div className="card">
        <div style={{ marginBottom: '24px' }}>
          <h2 style={{ color: '#667eea', fontSize: '22px', marginBottom: '4px' }}>📝 All Questions</h2>
          <p style={{ color: '#718096', fontSize: '13px', margin: 0 }}>
            {questions.length} questions across {totalQuizzes} quizzes
          </p>
        </div>

        {/* Filters */}
        <div style={{ display: 'grid', gap: '12px', marginBottom: '20px', gridTemplateColumns: '2fr 1fr 1fr' }}>
          <input
            type="text"
            placeholder="🔍 Search questions or quiz title..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            style={{
              padding: '12px 16px',
              border: '1.5px solid #e2e8f0',
              borderRadius: '8px',
              fontSize: '14px',
              outline: 'none',
              transition: 'all 0.2s'
            }}
            onFocus={(e) => e.target.style.borderColor = '#667eea'}
            onBlur={(e) => e.target.style.borderColor = '#e2e8f0'}
          />
          <select
            value={filterQuiz}
            onChange={(e) => setFilterQuiz(e.target.value)}
            style={{
              padding: '12px 16px',
              border: '1.5px solid #e2e8f0',
              borderRadius: '8px',
              fontSize: '14px',
              outline: 'none',
              cursor: 'pointer',
              backgroundColor: 'white'
            }}
          >
            <option value="all">All Quizzes</option>
            {uniqueQuizzes.map(quiz => (
              <option key={quiz.id} value={quiz.id}>
                {quiz.title} ({quiz.code})
              </option>
            ))}
          </select>
          <select
            value={filterDifficulty}
            onChange={(e) => setFilterDifficulty(e.target.value)}
            style={{
              padding: '12px 16px',
              border: '1.5px solid #e2e8f0',
              borderRadius: '8px',
              fontSize: '14px',
              outline: 'none',
              cursor: 'pointer',
              backgroundColor: 'white'
            }}
          >
            <option value="all">All Difficulties</option>
            <option value="Easy">Easy (≥80%)</option>
            <option value="Medium">Medium (60-79%)</option>
            <option value="Hard">Hard (40-59%)</option>
            <option value="Very Hard">Very Hard (&lt;40%)</option>
            <option value="Not attempted">Not Attempted</option>
          </select>
        </div>

        {/* Questions per page selector */}
        <div style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          marginBottom: '16px',
          padding: '12px 16px',
          backgroundColor: 'white',
          borderRadius: '8px',
          border: '1px solid #e2e8f0'
        }}>
          <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: '12px'
          }}>
            <label style={{
              fontSize: '14px',
              fontWeight: '600',
              color: '#4a5568'
            }}>
              Questions per page:
            </label>
            <select
              value={currentLimit}
              onChange={(e) => handleLimitChange(parseInt(e.target.value))}
              style={{
                padding: '8px 12px',
                borderRadius: '6px',
                border: '1px solid #cbd5e0',
                fontSize: '14px',
                fontWeight: '500',
                cursor: 'pointer',
                outline: 'none'
              }}
            >
              <option value="15">15</option>
              <option value="25">25</option>
              <option value="50">50</option>
              <option value="100">100</option>
            </select>
          </div>
          <span style={{
            fontSize: '13px',
            color: '#718096'
          }}>
            Total: {pagination.totalQuestions} questions
          </span>
        </div>

        {filteredQuestions.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '48px 24px', color: '#718096', fontSize: '14px' }}>
            <p style={{ marginBottom: '8px', fontSize: '15px' }}>
              {searchTerm || filterQuiz !== 'all' ? 'No questions found matching your filters' : 'No questions created yet'}
            </p>
          </div>
        ) : (
          <>
          <div style={{ display: 'grid', gap: '16px' }}>
            {filteredQuestions.map((item) => {
              // Difficulty styling
              const getDifficultyColor = (difficulty) => {
                switch(difficulty) {
                  case 'Easy': return { bg: '#c6f6d5', border: '#48bb78', text: '#2f855a' };
                  case 'Medium': return { bg: '#fefcbf', border: '#d69e2e', text: '#b7791f' };
                  case 'Hard': return { bg: '#fed7d7', border: '#f56565', text: '#c53030' };
                  case 'Very Hard': return { bg: '#fce7f3', border: '#ec4899', text: '#9f1239' };
                  default: return { bg: '#f7fafc', border: '#cbd5e0', text: '#718096' };
                }
              };
              
              const difficultyStyle = getDifficultyColor(item.stats.difficulty);
              
              return (
                <div key={item.questionId} style={{
                  backgroundColor: '#f7fafc',
                  borderRadius: '10px',
                  padding: '18px',
                  border: '1px solid #e2e8f0'
                }}>
                  {/* Quiz Info Header */}
                  <div style={{ 
                    marginBottom: '12px', 
                    paddingBottom: '8px', 
                    borderBottom: '1px solid #e2e8f0',
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    flexWrap: 'wrap',
                    gap: '8px'
                  }}>
                    <div>
                      <span style={{ 
                        fontSize: '12px', 
                        color: '#667eea', 
                        fontWeight: '600',
                        backgroundColor: '#eef2ff',
                        padding: '4px 8px',
                        borderRadius: '4px'
                      }}>
                        {item.quizTitle} - Q{item.questionNumber}
                      </span>
                      <span style={{ fontSize: '11px', color: '#718096', marginLeft: '8px' }}>
                        {item.quizCode}
                      </span>
                      {item.questionType && (
                        <span style={{
                          fontSize: '11px',
                          color: '#d69e2e',
                          backgroundColor: '#fef3c7',
                          padding: '3px 8px',
                          borderRadius: '4px',
                          marginLeft: '8px',
                          fontWeight: '600'
                        }}>
                          {item.questionType}
                        </span>
                      )}
                    </div>
                    
                    {/* Difficulty Badge */}
                    <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                      {/* Question's assigned difficulty */}
                      {item.difficulty && (
                        <span style={{
                          fontSize: '12px',
                          fontWeight: '600',
                          color: item.difficulty === 'Easy' ? '#22543d' : item.difficulty === 'Medium' ? '#78350f' : '#7f1d1d',
                          backgroundColor: item.difficulty === 'Easy' ? '#c6f6d5' : item.difficulty === 'Medium' ? '#fef3c7' : '#fecaca',
                          padding: '4px 10px',
                          borderRadius: '6px'
                        }}>
                          {item.difficulty === 'Easy' ? '🟢' : item.difficulty === 'Medium' ? '🟡' : '🔴'} {item.difficulty}
                        </span>
                      )}
                      {/* Performance-based difficulty */}
                      {item.stats.successRate !== null && (
                        <span style={{
                          fontSize: '12px',
                          fontWeight: '600',
                          color: difficultyStyle.text,
                          backgroundColor: difficultyStyle.bg,
                          border: `1.5px solid ${difficultyStyle.border}`,
                          padding: '4px 10px',
                          borderRadius: '6px'
                        }}>
                          {item.stats.difficulty} ({item.stats.successRate}%)
                        </span>
                      )}
                      {item.stats.totalAttempts > 0 && (
                        <span style={{
                          fontSize: '11px',
                          color: '#718096',
                          backgroundColor: 'white',
                          padding: '4px 8px',
                          borderRadius: '4px',
                          border: '1px solid #e2e8f0'
                        }}>
                          ✓ {item.stats.correctAttempts} / ✗ {item.stats.wrongAttempts}
                        </span>
                      )}
                      {item.stats.totalAttempts === 0 && (
                        <span style={{
                          fontSize: '11px',
                          color: '#a0aec0',
                          fontStyle: 'italic'
                        }}>
                          No attempts yet
                        </span>
                      )}
                    </div>
                  </div>

                {/* Question */}
                <div style={{ marginBottom: '12px' }}>
                  <p style={{ margin: 0, color: '#2d3748', fontSize: '14px', fontWeight: '600', lineHeight: '1.6' }}>
                    <FormattedText text={item.question} />
                  </p>
                </div>

                {/* Options */}
                <div style={{ marginBottom: '12px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                    <h5 style={{ fontSize: '13px', fontWeight: '600', color: '#4a5568', margin: 0 }}>Options</h5>
                    {editingAnswer === item.questionId ? (
                      <div>
                        <button
                          onClick={() => handleUpdateCorrectAnswer(item)}
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
                        onClick={() => startEditingAnswer(item)}
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
                    {item.options.map((option, optIndex) => (
                      <div
                        key={optIndex}
                        onClick={() => editingAnswer === item.questionId && setNewCorrectAnswer(optIndex)}
                        style={{
                          padding: '10px 12px',
                          borderRadius: '6px',
                          fontSize: '13px',
                          backgroundColor: editingAnswer === item.questionId && newCorrectAnswer === optIndex ? '#bee3f8' :
                                           optIndex === item.correctAnswer ? '#c6f6d5' : 'white',
                          border: editingAnswer === item.questionId && newCorrectAnswer === optIndex ? '2px solid #3182ce' :
                                  optIndex === item.correctAnswer ? '1.5px solid #48bb78' : '1px solid #e2e8f0',
                          color: optIndex === item.correctAnswer ? '#2f855a' : '#4a5568',
                          fontWeight: optIndex === item.correctAnswer ? '600' : '500',
                          cursor: editingAnswer === item.questionId ? 'pointer' : 'default',
                          transition: 'all 0.2s ease'
                        }}
                      >
                        <span style={{ fontWeight: '700', marginRight: '6px' }}>
                          {String.fromCharCode(65 + optIndex)}.
                        </span>
                        <FormattedText text={option} />
                        {editingAnswer === item.questionId && newCorrectAnswer === optIndex && <span style={{ marginLeft: '8px', color: '#3182ce' }}>← Select this</span>}
                        {editingAnswer !== item.questionId && optIndex === item.correctAnswer && (
                          <span style={{ marginLeft: '8px', fontSize: '14px' }}>✓ Correct</span>
                        )}
                      </div>
                    ))}
                  </div>
                </div>

                {/* Explanation */}
                {item.explanation && (
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
                      {item.explanation}
                    </p>
                  </div>
                )}
              </div>
            );
          })}
          </div>

          {/* Pagination Controls */}
          <div style={{
            display: 'flex',
            justifyContent: 'center',
            alignItems: 'center',
            marginTop: '30px',
            padding: '20px',
            backgroundColor: 'white',
            borderRadius: '8px',
            boxShadow: '0 2px 8px rgba(0, 0, 0, 0.08)'
          }}>
            <div style={{
              display: 'flex',
              alignItems: 'center',
              gap: '12px'
            }}>
              <button
                onClick={() => handlePageChange(currentPage - 1)}
                disabled={!pagination.hasPrevPage}
                style={{
                  padding: '8px 16px',
                  fontSize: '14px',
                  fontWeight: '600',
                  borderRadius: '6px',
                  border: 'none',
                  backgroundColor: pagination.hasPrevPage ? '#3182ce' : '#e2e8f0',
                  color: pagination.hasPrevPage ? 'white' : '#a0aec0',
                  cursor: pagination.hasPrevPage ? 'pointer' : 'not-allowed',
                  transition: 'all 0.2s'
                }}
              >
                ← Previous
              </button>

              <div style={{
                display: 'flex',
                gap: '6px',
                alignItems: 'center'
              }}>
                {Array.from({ length: Math.min(5, pagination.totalPages) }, (_, i) => {
                  let pageNum;
                  if (pagination.totalPages <= 5) {
                    pageNum = i + 1;
                  } else if (currentPage <= 3) {
                    pageNum = i + 1;
                  } else if (currentPage >= pagination.totalPages - 2) {
                    pageNum = pagination.totalPages - 4 + i;
                  } else {
                    pageNum = currentPage - 2 + i;
                  }

                  return (
                    <button
                      key={pageNum}
                      onClick={() => handlePageChange(pageNum)}
                      style={{
                        padding: '8px 12px',
                        fontSize: '14px',
                        fontWeight: pageNum === currentPage ? '700' : '500',
                        borderRadius: '6px',
                        border: 'none',
                        backgroundColor: pageNum === currentPage ? '#3182ce' : '#edf2f7',
                        color: pageNum === currentPage ? 'white' : '#4a5568',
                        cursor: 'pointer',
                        transition: 'all 0.2s',
                        minWidth: '36px'
                      }}
                    >
                      {pageNum}
                    </button>
                  );
                })}
              </div>

              <button
                onClick={() => handlePageChange(currentPage + 1)}
                disabled={!pagination.hasNextPage}
                style={{
                  padding: '8px 16px',
                  fontSize: '14px',
                  fontWeight: '600',
                  borderRadius: '6px',
                  border: 'none',
                  backgroundColor: pagination.hasNextPage ? '#3182ce' : '#e2e8f0',
                  color: pagination.hasNextPage ? 'white' : '#a0aec0',
                  cursor: pagination.hasNextPage ? 'pointer' : 'not-allowed',
                  transition: 'all 0.2s'
                }}
              >
                Next →
              </button>
            </div>
          </div>
          </>
        )}
      </div>
    </div>
  );
}

export default AllQuestions;
