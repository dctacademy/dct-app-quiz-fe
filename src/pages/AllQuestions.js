import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { quizAPI } from '../services/api';
import { useToast } from '../components/Toast';
import { useAuth } from '../context/AuthContext';
import { FormattedText } from '../utils/formatText';

function AllQuestions() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const { showToast } = useToast();
  const [questions, setQuestions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterQuiz, setFilterQuiz] = useState('all');
  const [filterDifficulty, setFilterDifficulty] = useState('all');
  const [totalQuizzes, setTotalQuizzes] = useState(0);

  useEffect(() => {
    if (user && user.role !== 'admin') {
      showToast('Access denied. Admin only.', 'error');
      navigate('/user');
    }
  }, [user, navigate, showToast]);

  useEffect(() => {
    fetchAllQuestions();
  }, []);

  const fetchAllQuestions = async () => {
    try {
      const token = localStorage.getItem('token');
      const response = await quizAPI.getAllQuestions();
      setQuestions(response.data.questions);
      setTotalQuizzes(response.data.totalQuizzes);
    } catch (error) {
      showToast(error.response?.data?.message || 'Failed to fetch questions', 'error');
      if (error.response?.status === 403) {
        navigate('/user');
      }
    } finally {
      setLoading(false);
    }
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

        {filteredQuestions.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '48px 24px', color: '#718096', fontSize: '14px' }}>
            <p style={{ marginBottom: '8px', fontSize: '15px' }}>
              {searchTerm || filterQuiz !== 'all' ? 'No questions found matching your filters' : 'No questions created yet'}
            </p>
          </div>
        ) : (
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
                <div style={{ display: 'grid', gap: '8px' }}>
                  {item.options.map((option, optIndex) => (
                    <div
                      key={optIndex}
                      style={{
                        padding: '10px 12px',
                        borderRadius: '6px',
                        fontSize: '13px',
                        backgroundColor: optIndex === item.correctAnswer ? '#c6f6d5' : 'white',
                        border: optIndex === item.correctAnswer ? '1.5px solid #48bb78' : '1px solid #e2e8f0',
                        color: optIndex === item.correctAnswer ? '#2f855a' : '#4a5568',
                        fontWeight: optIndex === item.correctAnswer ? '600' : '500'
                      }}
                    >
                      <span style={{ fontWeight: '700', marginRight: '6px' }}>
                        {String.fromCharCode(65 + optIndex)}.
                      </span>
                      <FormattedText text={option} />
                      {optIndex === item.correctAnswer && (
                        <span style={{ marginLeft: '8px', fontSize: '14px' }}>✓ Correct</span>
                      )}
                    </div>
                  ))}
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
        )}
      </div>
    </div>
  );
}

export default AllQuestions;
