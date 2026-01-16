import React, { useState, useEffect } from 'react';
import { submissionAPI, quizAPI } from '../services/api';
import { useToast } from './Toast';
import { FormattedText } from '../utils/formatText';

function FlaggedQuestions({ onBack }) {
  const { showToast } = useToast();
  const [flags, setFlags] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filterStatus, setFilterStatus] = useState('');
  const [expandedFlag, setExpandedFlag] = useState(null);
  const [adminNotes, setAdminNotes] = useState('');
  const [updatingFlag, setUpdatingFlag] = useState(null);
  const [editingAnswer, setEditingAnswer] = useState(null);
  const [newCorrectAnswer, setNewCorrectAnswer] = useState('');

  const fetchFlaggedQuestions = async () => {
    setLoading(true);
    try {
      const params = filterStatus ? `status=${filterStatus}` : '';
      const response = await submissionAPI.getFlaggedQuestions(params);
      setFlags(response.data);
    } catch (error) {
      showToast(error.response?.data?.message || 'Failed to load flagged questions', 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchFlaggedQuestions();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filterStatus]);

  const handleUpdateFlag = async (flagId, status) => {
    setUpdatingFlag(flagId);
    try {
      await submissionAPI.updateFlagStatus(flagId, {
        status,
        adminNotes: adminNotes
      });
      showToast('Flag status updated successfully', 'success');
      setExpandedFlag(null);
      setAdminNotes('');
      fetchFlaggedQuestions();
    } catch (error) {
      showToast(error.response?.data?.message || 'Failed to update flag', 'error');
    } finally {
      setUpdatingFlag(null);
    }
  };

  const handleUpdateCorrectAnswer = async (flag) => {
    if (!newCorrectAnswer && newCorrectAnswer !== 0) {
      showToast('Please select/enter the correct answer', 'error');
      return;
    }

    try {
      const quizId = flag.quiz._id || flag.quiz;
      const questionId = flag.question;
      
      await quizAPI.updateQuestionCorrectAnswer(quizId, questionId, newCorrectAnswer);
      showToast('Correct answer updated successfully', 'success');
      setEditingAnswer(null);
      setNewCorrectAnswer('');
      fetchFlaggedQuestions();
    } catch (error) {
      showToast(error.response?.data?.message || 'Failed to update correct answer', 'error');
    }
  };

  const startEditingAnswer = (flag) => {
    setEditingAnswer(flag._id);
    setNewCorrectAnswer(flag.questionDetails.correctAnswer);
  };

  const cancelEditingAnswer = () => {
    setEditingAnswer(null);
    setNewCorrectAnswer('');
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'pending': return '#f59e0b';
      case 'reviewed': return '#3b82f6';
      case 'resolved': return '#10b981';
      case 'rejected': return '#ef4444';
      default: return '#718096';
    }
  };

  const getStatusBadge = (status) => {
    const color = getStatusColor(status);
    return (
      <span style={{
        padding: '4px 12px',
        fontSize: '11px',
        fontWeight: '600',
        color: '#fff',
        backgroundColor: color,
        borderRadius: '12px',
        textTransform: 'uppercase'
      }}>
        {status}
      </span>
    );
  };

  if (loading) {
    return <div className="loading">Loading flagged questions...</div>;
  }

  return (
    <div className="container">
      <div className="card" style={{ maxWidth: '1200px', margin: '0 auto' }}>
        <div style={{ marginBottom: '24px' }}>
          <button 
            className="btn btn-secondary" 
            onClick={onBack}
            style={{ marginBottom: '16px', fontSize: '12px' }}
          >
            ← Back to Dashboard
          </button>

          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div>
              <h2 style={{ color: '#667eea', fontSize: '22px', marginBottom: '4px' }}>
                🚩 Flagged Questions
              </h2>
              <p style={{ color: '#718096', fontSize: '13px', margin: 0 }}>
                Review questions flagged by students as having wrong answers
              </p>
            </div>
          </div>
        </div>

        {/* Filter */}
        <div style={{ marginBottom: '20px', display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
          <button
            onClick={() => setFilterStatus('')}
            style={{
              padding: '8px 16px',
              fontSize: '13px',
              fontWeight: '600',
              color: filterStatus === '' ? '#fff' : '#4a5568',
              backgroundColor: filterStatus === '' ? '#667eea' : '#e2e8f0',
              border: 'none',
              borderRadius: '6px',
              cursor: 'pointer'
            }}
          >
            All ({flags.length})
          </button>
          {['pending', 'reviewed', 'resolved', 'rejected'].map(status => (
            <button
              key={status}
              onClick={() => setFilterStatus(status)}
              style={{
                padding: '8px 16px',
                fontSize: '13px',
                fontWeight: '600',
                color: filterStatus === status ? '#fff' : '#4a5568',
                backgroundColor: filterStatus === status ? getStatusColor(status) : '#e2e8f0',
                border: 'none',
                borderRadius: '6px',
                cursor: 'pointer'
              }}
            >
              {status.charAt(0).toUpperCase() + status.slice(1)}
            </button>
          ))}
        </div>

        {/* Flagged Questions List */}
        {flags.length === 0 ? (
          <div style={{ 
            textAlign: 'center', 
            padding: '48px 24px', 
            color: '#718096',
            backgroundColor: '#f7fafc',
            borderRadius: '12px',
            border: '2px dashed #cbd5e0'
          }}>
            <p style={{ fontSize: '16px', marginBottom: '8px' }}>🎉 No flagged questions</p>
            <p style={{ fontSize: '13px' }}>
              {filterStatus ? 'No questions with this status' : 'Students haven\'t flagged any questions yet'}
            </p>
          </div>
        ) : (
          <div style={{ display: 'grid', gap: '16px' }}>
            {flags.map((flag) => (
              <div
                key={flag._id}
                style={{
                  border: '2px solid #e2e8f0',
                  borderRadius: '12px',
                  overflow: 'hidden',
                  backgroundColor: '#fff'
                }}
              >
                {/* Flag Header */}
                <div
                  style={{
                    padding: '16px 20px',
                    backgroundColor: '#f7fafc',
                    borderBottom: '1px solid #e2e8f0',
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    cursor: 'pointer'
                  }}
                  onClick={() => setExpandedFlag(expandedFlag === flag._id ? null : flag._id)}
                >
                  <div style={{ flex: 1 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '8px' }}>
                      {getStatusBadge(flag.status)}
                      <span style={{ fontSize: '13px', color: '#4a5568' }}>
                        Flagged by <strong>{flag.user.name}</strong> ({flag.user.email})
                      </span>
                    </div>
                    <div style={{ fontSize: '12px', color: '#718096' }}>
                      Quiz: <strong>{flag.quiz.title}</strong> ({flag.quiz.quizCode}) • 
                      {' '}{new Date(flag.createdAt).toLocaleString()}
                    </div>
                  </div>
                  <div style={{ fontSize: '18px', color: '#667eea' }}>
                    {expandedFlag === flag._id ? '▼' : '▶'}
                  </div>
                </div>

                {/* Flag Details (Expanded) */}
                {expandedFlag === flag._id && (
                  <div style={{ padding: '20px' }}>
                    {/* Question Details */}
                    {flag.questionDetails && (
                      <div style={{ marginBottom: '20px' }}>
                        <h4 style={{ 
                          fontSize: '15px', 
                          fontWeight: '600', 
                          color: '#2d3748',
                          marginBottom: '12px',
                          paddingBottom: '8px',
                          borderBottom: '2px solid #e2e8f0'
                        }}>
                          📋 Question
                        </h4>
                        <div style={{ 
                          padding: '12px',
                          backgroundColor: '#f7fafc',
                          borderRadius: '8px',
                          marginBottom: '12px'
                        }}>
                          <p style={{ fontSize: '14px', color: '#2d3748', marginBottom: '8px', lineHeight: '1.6' }}>
                            <FormattedText text={flag.questionDetails.question} />
                          </p>
                          <p style={{ fontSize: '12px', color: '#718096' }}>
                            Type: <strong>{flag.questionDetails.questionType}</strong>
                          </p>
                        </div>

                        {/* Options (for MCQ/TrueFalse) */}
                        {flag.questionDetails.options && flag.questionDetails.options.length > 0 && (
                          <div style={{ marginBottom: '12px' }}>
                            <div style={{ 
                              display: 'flex', 
                              justifyContent: 'space-between', 
                              alignItems: 'center',
                              marginBottom: '8px'
                            }}>
                              <h5 style={{ fontSize: '13px', fontWeight: '600', color: '#4a5568', margin: 0 }}>
                                Options
                              </h5>
                              {editingAnswer === flag._id ? (
                                <div>
                                  <button
                                    onClick={() => handleUpdateCorrectAnswer(flag)}
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
                                  onClick={() => startEditingAnswer(flag)}
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
                            {flag.questionDetails.options.map((option, idx) => (
                              <div
                                key={idx}
                                onClick={() => editingAnswer === flag._id && setNewCorrectAnswer(idx)}
                                style={{
                                  padding: '8px 12px',
                                  margin: '4px 0',
                                  borderRadius: '6px',
                                  fontSize: '13px',
                                  backgroundColor: editingAnswer === flag._id && newCorrectAnswer === idx ? '#bee3f8' :
                                                   idx === flag.questionDetails.correctAnswer ? '#c6f6d5' : 
                                                   idx === flag.userAnswer ? '#fed7d7' : '#f7fafc',
                                  border: `2px solid ${editingAnswer === flag._id && newCorrectAnswer === idx ? '#3182ce' :
                                                       idx === flag.questionDetails.correctAnswer ? '#48bb78' : 
                                                       idx === flag.userAnswer ? '#f56565' : '#e2e8f0'}`,
                                  color: idx === flag.questionDetails.correctAnswer ? '#2f855a' : 
                                         idx === flag.userAnswer ? '#c53030' : '#4a5568',
                                  cursor: editingAnswer === flag._id ? 'pointer' : 'default',
                                  transition: 'all 0.2s ease'
                                }}
                              >
                                <strong>{String.fromCharCode(65 + idx)}.</strong> <FormattedText text={option} />
                                {editingAnswer === flag._id && newCorrectAnswer === idx && <span style={{ marginLeft: '8px', color: '#3182ce' }}>← Select this</span>}
                                {editingAnswer !== flag._id && idx === flag.questionDetails.correctAnswer && <span style={{ marginLeft: '8px' }}>✓ Correct</span>}
                                {idx === flag.userAnswer && <span style={{ marginLeft: '8px' }}>(Student's answer)</span>}
                              </div>
                            ))}
                          </div>
                        )}

                        {/* Correct Answer (for FillInBlank) */}
                        {flag.questionDetails.questionType === 'FillInBlank' && (
                          <div style={{ marginBottom: '12px' }}>
                            <div style={{ 
                              display: 'flex', 
                              justifyContent: 'space-between', 
                              alignItems: 'center',
                              marginBottom: '8px'
                            }}>
                              <h5 style={{ fontSize: '13px', fontWeight: '600', color: '#4a5568', margin: 0 }}>
                                Answers
                              </h5>
                              {editingAnswer === flag._id ? (
                                <div>
                                  <button
                                    onClick={() => handleUpdateCorrectAnswer(flag)}
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
                                  onClick={() => startEditingAnswer(flag)}
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
                            <div style={{ 
                              padding: '8px 12px',
                              borderRadius: '6px',
                              backgroundColor: '#fed7d7',
                              border: '1px solid #f56565',
                              marginBottom: '4px'
                            }}>
                              <span style={{ fontSize: '12px', color: '#718096' }}>Student's Answer: </span>
                              <strong style={{ color: '#c53030' }}>{flag.userAnswer}</strong>
                            </div>
                            {editingAnswer === flag._id ? (
                              <div style={{ marginBottom: '4px' }}>
                                <label style={{ fontSize: '12px', color: '#718096', display: 'block', marginBottom: '4px' }}>
                                  New Correct Answer:
                                </label>
                                <input
                                  type="text"
                                  value={newCorrectAnswer}
                                  onChange={(e) => setNewCorrectAnswer(e.target.value)}
                                  style={{
                                    width: '100%',
                                    padding: '8px 12px',
                                    borderRadius: '6px',
                                    border: '2px solid #3182ce',
                                    fontSize: '13px',
                                    outline: 'none'
                                  }}
                                  placeholder="Enter the correct answer"
                                />
                              </div>
                            ) : (
                              <div style={{ 
                                padding: '8px 12px',
                                borderRadius: '6px',
                                backgroundColor: '#c6f6d5',
                                border: '1px solid #48bb78'
                              }}>
                                <span style={{ fontSize: '12px', color: '#718096' }}>Correct Answer: </span>
                                <strong style={{ color: '#2f855a' }}>{flag.questionDetails.correctAnswer}</strong>
                              </div>
                            )}
                          </div>
                        )}

                        {/* Explanation */}
                        {flag.questionDetails.explanation && (
                          <div style={{ 
                            padding: '12px',
                            backgroundColor: '#edf2f7',
                            borderLeft: '3px solid #4299e1',
                            borderRadius: '6px',
                            marginBottom: '12px'
                          }}>
                            <p style={{ fontSize: '12px', fontWeight: '600', color: '#2c5282', marginBottom: '4px' }}>
                              💡 Explanation
                            </p>
                            <p style={{ fontSize: '13px', color: '#2d3748', lineHeight: '1.6', margin: 0 }}>
                              <FormattedText text={flag.questionDetails.explanation} />
                            </p>
                          </div>
                        )}
                      </div>
                    )}

                    {/* Student's Reason for Flagging */}
                    <div style={{ 
                      padding: '14px',
                      backgroundColor: '#fff5f5',
                      border: '2px solid #fc8181',
                      borderRadius: '8px',
                      marginBottom: '20px'
                    }}>
                      <p style={{ fontSize: '12px', fontWeight: '600', color: '#c53030', marginBottom: '6px' }}>
                        🚩 Student's Concern
                      </p>
                      <p style={{ fontSize: '13px', color: '#2d3748', lineHeight: '1.6', margin: 0 }}>
                        {flag.reason}
                      </p>
                    </div>

                    {/* Submission Info */}
                    <div style={{ 
                      padding: '12px',
                      backgroundColor: '#f7fafc',
                      borderRadius: '8px',
                      marginBottom: '20px',
                      fontSize: '12px',
                      color: '#4a5568'
                    }}>
                      <p style={{ margin: '4px 0' }}>
                        <strong>Submission Score:</strong> {flag.submission.score}/{flag.submission.totalQuestions} • 
                        <strong> Submitted:</strong> {new Date(flag.submission.submittedAt).toLocaleString()}
                      </p>
                      <p style={{ margin: '4px 0' }}>
                        <strong>Question was marked:</strong> {flag.wasCorrect ? '✓ Correct' : '✗ Incorrect'}
                      </p>
                    </div>

                    {/* Admin Review Section */}
                    {flag.reviewedBy && (
                      <div style={{ 
                        padding: '12px',
                        backgroundColor: '#e6fffa',
                        borderLeft: '3px solid #38b2ac',
                        borderRadius: '6px',
                        marginBottom: '16px'
                      }}>
                        <p style={{ fontSize: '12px', color: '#234e52', margin: '4px 0' }}>
                          <strong>Reviewed by:</strong> {flag.reviewedBy.name} • {new Date(flag.reviewedAt).toLocaleString()}
                        </p>
                        {flag.adminNotes && (
                          <p style={{ fontSize: '13px', color: '#2d3748', margin: '8px 0 0 0', lineHeight: '1.6' }}>
                            <strong>Notes:</strong> {flag.adminNotes}
                          </p>
                        )}
                      </div>
                    )}

                    {/* Admin Actions */}
                    <div>
                      <label style={{ 
                        display: 'block',
                        fontSize: '12px',
                        fontWeight: '600',
                        color: '#2d3748',
                        marginBottom: '6px'
                      }}>
                        Admin Notes (optional)
                      </label>
                      <textarea
                        value={adminNotes}
                        onChange={(e) => setAdminNotes(e.target.value)}
                        placeholder="Add notes about this flag..."
                        style={{
                          width: '100%',
                          minHeight: '60px',
                          padding: '10px',
                          fontSize: '13px',
                          borderRadius: '6px',
                          border: '1px solid #cbd5e0',
                          marginBottom: '12px',
                          resize: 'vertical'
                        }}
                      />

                      <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                        <button
                          onClick={() => handleUpdateFlag(flag._id, 'reviewed')}
                          disabled={updatingFlag === flag._id}
                          style={{
                            padding: '8px 16px',
                            fontSize: '13px',
                            fontWeight: '600',
                            color: '#fff',
                            backgroundColor: '#3b82f6',
                            border: 'none',
                            borderRadius: '6px',
                            cursor: updatingFlag === flag._id ? 'not-allowed' : 'pointer',
                            opacity: updatingFlag === flag._id ? 0.6 : 1
                          }}
                        >
                          Mark as Reviewed
                        </button>
                        <button
                          onClick={() => handleUpdateFlag(flag._id, 'resolved')}
                          disabled={updatingFlag === flag._id}
                          style={{
                            padding: '8px 16px',
                            fontSize: '13px',
                            fontWeight: '600',
                            color: '#fff',
                            backgroundColor: '#10b981',
                            border: 'none',
                            borderRadius: '6px',
                            cursor: updatingFlag === flag._id ? 'not-allowed' : 'pointer',
                            opacity: updatingFlag === flag._id ? 0.6 : 1
                          }}
                        >
                          Resolve (Answer Fixed)
                        </button>
                        <button
                          onClick={() => handleUpdateFlag(flag._id, 'rejected')}
                          disabled={updatingFlag === flag._id}
                          style={{
                            padding: '8px 16px',
                            fontSize: '13px',
                            fontWeight: '600',
                            color: '#fff',
                            backgroundColor: '#ef4444',
                            border: 'none',
                            borderRadius: '6px',
                            cursor: updatingFlag === flag._id ? 'not-allowed' : 'pointer',
                            opacity: updatingFlag === flag._id ? 0.6 : 1
                          }}
                        >
                          Reject (Answer is Correct)
                        </button>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

export default FlaggedQuestions;
