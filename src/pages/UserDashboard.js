import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { quizAPI } from '../services/api';
import TakeQuiz from '../components/TakeQuiz';

function UserDashboard() {
  const [quizCode, setQuizCode] = useState('');
  const [quiz, setQuiz] = useState(null);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const response = await quizAPI.getQuizByCode(quizCode);
      setQuiz(response.data);
    } catch (err) {
      const errorData = err.response?.data;
      
      // Handle scheduled quiz messages
      if (errorData?.notStarted) {
        const startDate = new Date(errorData.startDate);
        setError(`⏰ This quiz hasn't started yet. It will be available from ${startDate.toLocaleString()}`);
      } else if (errorData?.ended) {
        const endDate = new Date(errorData.endDate);
        setError(`⏱️ This quiz has ended. It was available until ${endDate.toLocaleString()}`);
      } else {
        setError(errorData?.message || 'Quiz not found');
      }
    } finally {
      setLoading(false);
    }
  };

  const handleQuizComplete = () => {
    setQuiz(null);
    setQuizCode('');
  };

  if (quiz) {
    return <TakeQuiz quiz={quiz} onComplete={handleQuizComplete} />;
  }

  return (
    <div className="container">
      <div className="card" style={{ maxWidth: '540px', margin: '0 auto' }}>
        <div style={{ textAlign: 'center', marginBottom: '24px' }}>
          <h2 style={{ marginBottom: '6px', color: '#667eea', fontSize: '22px', fontWeight: '700' }}>
            Take a Quiz
          </h2>
          <p style={{ fontSize: '13px', color: '#718096' }}>
            Enter your quiz code to get started
          </p>
        </div>

        {error && <div className="error">{error}</div>}

        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label>Quiz Code</label>
            <input
              type="text"
              value={quizCode}
              onChange={(e) => setQuizCode(e.target.value.toUpperCase())}
              placeholder="ABC123"
              maxLength="6"
              style={{ textTransform: 'uppercase', fontSize: '24px', textAlign: 'center', fontWeight: '700', letterSpacing: '4px' }}
              required
            />
          </div>
          <button 
            type="submit" 
            className="btn btn-primary" 
            style={{ width: '100%', padding: '14px' }}
            disabled={loading}
          >
            {loading ? 'Loading Quiz...' : '🚀 Start Quiz'}
          </button>
        </form>

        <div style={{ marginTop: '32px', padding: '20px', backgroundColor: '#f7fafc', borderRadius: '12px', border: '1px solid #e2e8f0' }}>
          <h3 style={{ marginBottom: '12px', fontSize: '15px', fontWeight: '600', color: '#2d3748' }}>📋 Instructions</h3>
          <ul style={{ paddingLeft: '20px', lineHeight: '1.8', fontSize: '13px', color: '#4a5568' }}>
            <li>Get the quiz code from your instructor</li>
            <li>Enter the 6-character code above</li>
            <li>Answer all questions within the time limit</li>
            <li>You can only submit once</li>
            <li>Results will be shown immediately</li>
          </ul>
        </div>
      </div>
    </div>
  );
}

export default UserDashboard;
