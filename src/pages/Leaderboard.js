import React, { useState, useEffect } from 'react';
import { quizAPI } from '../services/api';
import { useAuth } from '../context/AuthContext';
import { useNavigate } from 'react-router-dom';

function Leaderboard() {
  const [leaderboard, setLeaderboard] = useState([]);
  const [loading, setLoading] = useState(true);
  const [totalUsers, setTotalUsers] = useState(0);
  const { user } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (user && user.role !== 'admin') {
      navigate('/user');
      return;
    }
    fetchLeaderboard();
  }, [user, navigate]);

  const fetchLeaderboard = async () => {
    try {
      const response = await quizAPI.getOverallLeaderboard();
      setLeaderboard(response.data.leaderboard);
      setTotalUsers(response.data.totalUsers);
    } catch (error) {
      console.error('Error fetching leaderboard:', error);
    } finally {
      setLoading(false);
    }
  };

  const getMedalEmoji = (rank) => {
    if (rank === 1) return '🥇';
    if (rank === 2) return '🥈';
    if (rank === 3) return '🥉';
    return `#${rank}`;
  };

  if (loading) {
    return <div className="loading">Loading leaderboard...</div>;
  }

  return (
    <div className="container">
      <div className="card" style={{ maxWidth: '1000px', margin: '0 auto' }}>
        <div style={{ textAlign: 'center', marginBottom: '32px' }}>
          <h2 style={{ color: '#667eea', fontSize: '26px', fontWeight: '700', marginBottom: '8px' }}>
            🏆 Overall Leaderboard
          </h2>
          <p style={{ fontSize: '14px', color: '#718096' }}>
            Top performers across all quizzes ({totalUsers} participants)
          </p>
        </div>

        {leaderboard.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '40px', color: '#718096' }}>
            <p style={{ fontSize: '18px', marginBottom: '8px' }}>📊</p>
            <p>No submissions yet. Be the first to take a quiz!</p>
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
                    Quizzes Taken
                  </th>
                  <th style={{ padding: '12px', textAlign: 'center', fontSize: '13px', fontWeight: '700', color: '#2d3748' }}>
                    Avg Score
                  </th>
                  <th style={{ padding: '12px', textAlign: 'center', fontSize: '13px', fontWeight: '700', color: '#2d3748' }}>
                    Avg %
                  </th>
                  <th style={{ padding: '12px', textAlign: 'center', fontSize: '13px', fontWeight: '700', color: '#2d3748' }}>
                    Total Score
                  </th>
                </tr>
              </thead>
              <tbody>
                {leaderboard.map((entry) => {
                  const isCurrentUser = user && entry.userId.toString() === user._id;
                  const isTopThree = entry.rank <= 3;

                  return (
                    <tr
                      key={entry.userId}
                      style={{
                        backgroundColor: isCurrentUser ? '#eef2ff' : isTopThree ? '#f0fff4' : 'white',
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
                          {isCurrentUser && (
                            <span style={{ 
                              marginLeft: '8px', 
                              fontSize: '11px', 
                              padding: '2px 8px',
                              backgroundColor: '#667eea',
                              color: 'white',
                              borderRadius: '12px',
                              fontWeight: '600'
                            }}>
                              YOU
                            </span>
                          )}
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
                        color: '#2d3748'
                      }}>
                        {entry.totalQuizzes}
                      </td>
                      <td style={{ 
                        padding: '16px 12px', 
                        textAlign: 'center',
                        fontSize: '14px',
                        fontWeight: '600',
                        color: '#2d3748'
                      }}>
                        {entry.averageScore}
                      </td>
                      <td style={{ 
                        padding: '16px 12px', 
                        textAlign: 'center',
                        fontSize: '15px',
                        fontWeight: '700',
                        color: parseFloat(entry.averagePercentage) >= 75 ? '#48bb78' : 
                               parseFloat(entry.averagePercentage) >= 50 ? '#d69e2e' : '#f56565'
                      }}>
                        {entry.averagePercentage}%
                      </td>
                      <td style={{ 
                        padding: '16px 12px', 
                        textAlign: 'center',
                        fontSize: '14px',
                        fontWeight: '600',
                        color: '#667eea'
                      }}>
                        {entry.totalScore}/{entry.totalQuestions}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}

        {leaderboard.length > 0 && (
          <div style={{ 
            marginTop: '24px', 
            padding: '16px', 
            backgroundColor: '#f7fafc', 
            borderRadius: '8px',
            fontSize: '12px',
            color: '#718096',
            textAlign: 'center'
          }}>
            💡 Scores are calculated based on average performance across all quizzes taken
          </div>
        )}
      </div>
    </div>
  );
}

export default Leaderboard;
