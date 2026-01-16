import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { authAPI } from '../services/api';
import { useToast } from '../components/Toast';
import { useAuth } from '../context/AuthContext';

function Students() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const { showToast } = useToast();
  const [students, setStudents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedStudent, setSelectedStudent] = useState(null);
  const [performanceData, setPerformanceData] = useState(null);
  const [loadingPerformance, setLoadingPerformance] = useState(false);

  useEffect(() => {
    if (user && user.role !== 'admin') {
      showToast('Access denied. Admin only.', 'error');
      navigate('/user');
    }
  }, [user, navigate, showToast]);

  useEffect(() => {
    fetchStudents();
  }, []);

  const fetchStudents = async () => {
    try {
      const response = await authAPI.getAllStudents();
      setStudents(response.data.students);
    } catch (error) {
      showToast(error.response?.data?.message || 'Failed to fetch students', 'error');
      if (error.response?.status === 403) {
        navigate('/user');
      }
    } finally {
      setLoading(false);
    }
  };

  const filteredStudents = students.filter(student =>
    student.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    student.email.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const fetchStudentPerformance = async (studentId, studentName) => {
    setLoadingPerformance(true);
    setSelectedStudent({ id: studentId, name: studentName });
    try {
      const response = await authAPI.getStudentPerformance(studentId);
      setPerformanceData(response.data);
    } catch (error) {
      showToast(error.response?.data?.message || 'Failed to fetch performance data', 'error');
    } finally {
      setLoadingPerformance(false);
    }
  };

  const closePerformanceModal = () => {
    setSelectedStudent(null);
    setPerformanceData(null);
  };

  if (loading) {
    return <div className="loading">Loading students...</div>;
  }

  return (
    <div className="container">
      <div className="card">
        <div style={{ marginBottom: '24px' }}>
          <h2 style={{ color: '#667eea', fontSize: '22px', marginBottom: '4px' }}>Students</h2>
          <p style={{ color: '#718096', fontSize: '13px', margin: 0 }}>
            All registered students ({students.length})
          </p>
        </div>

        <div style={{ marginBottom: '20px' }}>
          <input
            type="text"
            placeholder="🔍 Search by name or email..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            style={{
              width: '100%',
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
        </div>

        {filteredStudents.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '48px 24px', color: '#718096', fontSize: '14px' }}>
            <p style={{ marginBottom: '8px', fontSize: '15px' }}>
              {searchTerm ? 'No students found matching your search' : 'No students registered yet'}
            </p>
          </div>
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr style={{ backgroundColor: '#f7fafc', borderBottom: '2px solid #e2e8f0' }}>
                  <th style={{ padding: '12px', textAlign: 'left', fontSize: '13px', fontWeight: '700', color: '#2d3748' }}>
                    #
                  </th>
                  <th style={{ padding: '12px', textAlign: 'left', fontSize: '13px', fontWeight: '700', color: '#2d3748' }}>
                    Name
                  </th>
                  <th style={{ padding: '12px', textAlign: 'left', fontSize: '13px', fontWeight: '700', color: '#2d3748' }}>
                    Email
                  </th>
                  <th style={{ padding: '12px', textAlign: 'center', fontSize: '13px', fontWeight: '700', color: '#2d3748' }}>
                    Registered On
                  </th>
                  <th style={{ padding: '12px', textAlign: 'center', fontSize: '13px', fontWeight: '700', color: '#2d3748' }}>
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody>
                {filteredStudents.map((student, index) => (
                  <tr 
                    key={student._id}
                    style={{ 
                      borderBottom: '1px solid #e2e8f0',
                      transition: 'background-color 0.2s'
                    }}
                    onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#f7fafc'}
                    onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'transparent'}
                  >
                    <td style={{ padding: '16px 12px', fontSize: '13px', color: '#718096', fontWeight: '600' }}>
                      {index + 1}
                    </td>
                    <td style={{ padding: '16px 12px', fontSize: '14px', color: '#2d3748', fontWeight: '600', textTransform: 'capitalize' }}>
                      {student.name}
                    </td>
                    <td style={{ padding: '16px 12px', fontSize: '13px', color: '#4a5568' }}>
                      {student.email}
                    </td>
                    <td style={{ padding: '16px 12px', textAlign: 'center', fontSize: '12px', color: '#718096' }}>
                      {new Date(student.createdAt).toLocaleDateString('en-US', { 
                        weekday: 'short', 
                        month: 'short', 
                        day: 'numeric', 
                        year: 'numeric' 
                      })}
                    </td>
                    <td style={{ padding: '16px 12px', textAlign: 'center' }}>
                      <button
                        onClick={() => fetchStudentPerformance(student._id, student.name)}
                        style={{
                          padding: '6px 14px',
                          backgroundColor: '#667eea',
                          color: 'white',
                          border: 'none',
                          borderRadius: '6px',
                          fontSize: '12px',
                          fontWeight: '600',
                          cursor: 'pointer',
                          transition: 'all 0.2s'
                        }}
                        onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#5568d3'}
                        onMouseLeave={(e) => e.currentTarget.style.backgroundColor = '#667eea'}
                      >
                        📊 View Performance
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* Performance Modal */}
        {selectedStudent && (
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
          onClick={closePerformanceModal}
          >
            <div style={{
              backgroundColor: 'white',
              borderRadius: '12px',
              padding: '24px',
              maxWidth: '900px',
              width: '90%',
              maxHeight: '85vh',
              overflow: 'auto',
              boxShadow: '0 10px 40px rgba(0,0,0,0.2)'
            }}
            onClick={(e) => e.stopPropagation()}
            >
              <div style={{ marginBottom: '24px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div>
                  <h3 style={{ margin: '0 0 4px 0', color: '#667eea', fontSize: '20px', fontWeight: '600' }}>
                    📊 Performance Trends
                  </h3>
                  <p style={{ margin: 0, color: '#718096', fontSize: '14px', textTransform: 'capitalize' }}>
                    {selectedStudent.name}
                  </p>
                </div>
                <button
                  onClick={closePerformanceModal}
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

              {loadingPerformance ? (
                <div style={{ textAlign: 'center', padding: '40px', color: '#718096' }}>
                  Loading performance data...
                </div>
              ) : performanceData && performanceData.performance.length === 0 ? (
                <div style={{ textAlign: 'center', padding: '40px', color: '#718096' }}>
                  No quiz submissions yet
                </div>
              ) : performanceData && (
                <>
                  {/* Stats Summary */}
                  <div style={{ 
                    display: 'grid', 
                    gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', 
                    gap: '16px',
                    marginBottom: '24px'
                  }}>
                    <div style={{
                      padding: '16px',
                      backgroundColor: '#eef2ff',
                      borderRadius: '10px',
                      border: '1.5px solid #667eea'
                    }}>
                      <div style={{ fontSize: '12px', color: '#667eea', fontWeight: '600', marginBottom: '4px' }}>
                        Total Quizzes
                      </div>
                      <div style={{ fontSize: '24px', fontWeight: '700', color: '#2d3748' }}>
                        {performanceData.stats.totalQuizzes}
                      </div>
                    </div>
                    <div style={{
                      padding: '16px',
                      backgroundColor: '#f0fff4',
                      borderRadius: '10px',
                      border: '1.5px solid #48bb78'
                    }}>
                      <div style={{ fontSize: '12px', color: '#2f855a', fontWeight: '600', marginBottom: '4px' }}>
                        Average Score
                      </div>
                      <div style={{ fontSize: '24px', fontWeight: '700', color: '#2d3748' }}>
                        {performanceData.stats.averagePercentage}%
                      </div>
                    </div>
                    <div style={{
                      padding: '16px',
                      backgroundColor: '#fffbeb',
                      borderRadius: '10px',
                      border: '1.5px solid #f59e0b'
                    }}>
                      <div style={{ fontSize: '12px', color: '#b45309', fontWeight: '600', marginBottom: '4px' }}>
                        Best Score
                      </div>
                      <div style={{ fontSize: '24px', fontWeight: '700', color: '#2d3748' }}>
                        {performanceData.stats.bestPerformance}%
                      </div>
                    </div>
                    <div style={{
                      padding: '16px',
                      backgroundColor: '#fef2f2',
                      borderRadius: '10px',
                      border: '1.5px solid #ef4444'
                    }}>
                      <div style={{ fontSize: '12px', color: '#b91c1c', fontWeight: '600', marginBottom: '4px' }}>
                        Lowest Score
                      </div>
                      <div style={{ fontSize: '24px', fontWeight: '700', color: '#2d3748' }}>
                        {performanceData.stats.worstPerformance}%
                      </div>
                    </div>
                  </div>

                  {/* Performance Timeline */}
                  <div style={{
                    backgroundColor: '#f7fafc',
                    borderRadius: '10px',
                    padding: '20px',
                    border: '1px solid #e2e8f0'
                  }}>
                    <h4 style={{ margin: '0 0 16px 0', fontSize: '16px', fontWeight: '600', color: '#2d3748' }}>
                      Quiz History
                    </h4>
                    <div style={{ display: 'grid', gap: '12px' }}>
                      {performanceData.performance.map((perf, index) => {
                        const percentage = parseFloat(perf.percentage);
                        const barColor = percentage >= 75 ? '#48bb78' : percentage >= 50 ? '#f59e0b' : '#ef4444';
                        
                        return (
                          <div key={`${perf.quizId}-${index}`} style={{
                            backgroundColor: 'white',
                            borderRadius: '8px',
                            padding: '16px',
                            border: perf.isPractice ? '1px dashed #cbd5e0' : '1px solid #e2e8f0',
                            opacity: perf.isPractice ? 0.7 : 1
                          }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '12px' }}>
                              <div style={{ flex: 1 }}>
                                <div style={{ fontWeight: '600', color: '#2d3748', fontSize: '14px', marginBottom: '4px' }}>
                                  {index + 1}. {perf.quizTitle}
                                  {perf.isPractice && (
                                    <span style={{ 
                                      marginLeft: '8px', 
                                      padding: '2px 8px', 
                                      backgroundColor: '#fef3c7', 
                                      color: '#92400e',
                                      borderRadius: '4px', 
                                      fontSize: '11px',
                                      fontWeight: '600'
                                    }}>
                                      PRACTICE
                                    </span>
                                  )}
                                </div>
                                <div style={{ fontSize: '12px', color: '#718096' }}>
                                  {new Date(perf.submittedAt).toLocaleDateString('en-US', { 
                                    weekday: 'short',
                                    month: 'short', 
                                    day: 'numeric', 
                                    year: 'numeric',
                                    hour: '2-digit',
                                    minute: '2-digit'
                                  })}
                                </div>
                              </div>
                              <div style={{ textAlign: 'right' }}>
                                <div style={{ 
                                  fontSize: '18px', 
                                  fontWeight: '700',
                                  color: barColor
                                }}>
                                  {percentage}%
                                </div>
                                <div style={{ fontSize: '12px', color: '#718096' }}>
                                  {perf.score}/{perf.totalQuestions}
                                </div>
                              </div>
                            </div>
                            
                            {/* Progress Bar */}
                            <div style={{
                              width: '100%',
                              height: '8px',
                              backgroundColor: '#e2e8f0',
                              borderRadius: '4px',
                              overflow: 'hidden'
                            }}>
                              <div style={{
                                width: `${percentage}%`,
                                height: '100%',
                                backgroundColor: barColor,
                                transition: 'width 0.3s ease'
                              }} />
                            </div>

                            {/* Additional Stats */}
                            {(perf.rank || perf.percentile !== undefined) && (
                              <div style={{ 
                                marginTop: '10px', 
                                display: 'flex', 
                                gap: '12px',
                                fontSize: '12px'
                              }}>
                                {perf.rank && (
                                  <span style={{ color: '#667eea', fontWeight: '600' }}>
                                    🏆 Rank: #{perf.rank}
                                  </span>
                                )}
                                {perf.percentile !== undefined && perf.percentile !== null && (
                                  <span style={{ color: '#48bb78', fontWeight: '600' }}>
                                    📊 {perf.percentile}th percentile
                                  </span>
                                )}
                              </div>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  </div>
                </>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

export default Students;
