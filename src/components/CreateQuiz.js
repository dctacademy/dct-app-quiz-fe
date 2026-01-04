import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { quizAPI } from '../services/api';
import { useToast } from './Toast';
import { useAuth } from '../context/AuthContext';

function CreateQuiz({ onQuizCreated }) {
  const { user } = useAuth();
  const navigate = useNavigate();
  const { showToast } = useToast();
  
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    duration: 30,
    numQuestions: 10,
    difficulty: 'Medium',
    randomizeQuestions: false,
    contentUrl: '',
    startDate: '',
    endDate: '',
  });
  const [pdfFile, setPdfFile] = useState(null);
  const [availableQuizzes, setAvailableQuizzes] = useState([]);
  const [selectedQuizIds, setSelectedQuizIds] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [loading, setLoading] = useState(false);
  
  // Multi-difficulty state
  const [selectedDifficulties, setSelectedDifficulties] = useState({
    Easy: false,
    Medium: false,
    Hard: false
  });
  const [difficultyQuestions, setDifficultyQuestions] = useState({
    Easy: 0,
    Medium: 0,
    Hard: 0
  });
  
  // Fetch available quizzes on mount
  useEffect(() => {
    const fetchQuizzes = async () => {
      try {
        const response = await quizAPI.getQuizList();
        setAvailableQuizzes(response.data);
      } catch (err) {
        console.error('Error fetching quiz list:', err);
      }
    };
    
    if (user && user.role === 'admin') {
      fetchQuizzes();
    }
  }, [user]);
  
  // Verify user is admin (after all hooks)
  if (!user || user.role !== 'admin') {
    return null;
  }

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    setFormData({ 
      ...formData, 
      [name]: type === 'checkbox' ? checked : value 
    });
  };

  const handleFileChange = (e) => {
    const file = e.target.files[0];
    if (file && file.type === 'application/pdf') {
      setPdfFile(file);
      setError('');
    } else {
      setPdfFile(null);
      setError('Please select a PDF file');
    }
  };

  const handleQuizSelection = (quizId) => {
    setSelectedQuizIds(prev => {
      if (prev.includes(quizId)) {
        return prev.filter(id => id !== quizId);
      } else {
        return [...prev, quizId];
      }
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setSuccess('');

    if (!pdfFile && !formData.contentUrl && selectedQuizIds.length === 0) {
      setError('Please provide a PDF file, URL, or select existing quizzes');
      return;
    }
    
    // Validate multi-difficulty selection
    const hasSelectedDifficulty = Object.values(selectedDifficulties).some(v => v);
    const totalQuestions = Object.entries(selectedDifficulties)
      .filter(([_, isSelected]) => isSelected)
      .reduce((sum, [difficulty, _]) => sum + (difficultyQuestions[difficulty] || 0), 0);
    
    if ((pdfFile || formData.contentUrl) && hasSelectedDifficulty && totalQuestions === 0) {
      setError('Please specify number of questions for selected difficulty levels');
      return;
    }

    setLoading(true);

    try {
      const data = new FormData();
      data.append('title', formData.title);
      data.append('description', formData.description);
      data.append('duration', formData.duration);
      data.append('randomizeQuestions', formData.randomizeQuestions);
      if (formData.contentUrl) data.append('contentUrl', formData.contentUrl);
      if (formData.startDate) data.append('startDate', formData.startDate);
      if (formData.endDate) data.append('endDate', formData.endDate);
      if (selectedQuizIds.length > 0) {
        data.append('selectedQuizIds', JSON.stringify(selectedQuizIds));
      }
      
      // Handle multi-difficulty or single difficulty
      if (hasSelectedDifficulty && totalQuestions > 0) {
        // Multi-difficulty mode
        const breakdown = {};
        Object.entries(selectedDifficulties).forEach(([difficulty, isSelected]) => {
          if (isSelected && difficultyQuestions[difficulty] > 0) {
            breakdown[difficulty] = parseInt(difficultyQuestions[difficulty]);
          }
        });
        console.log('Sending difficulty breakdown:', breakdown);
        data.append('difficultyBreakdown', JSON.stringify(breakdown));
        data.append('numQuestions', totalQuestions);
      } else {
        // Single difficulty mode (backward compatibility)
        data.append('numQuestions', formData.numQuestions);
        data.append('difficulty', formData.difficulty);
      }
      
      if (pdfFile) {
        data.append('pdfFile', pdfFile);
      }

      const response = await quizAPI.createQuiz(data);
      showToast(`Quiz created successfully! Code: ${response.data.quiz.quizCode}`, 'success');
      
      // Reset form
      setFormData({
        title: '',
        description: '',
        duration: 30,
        numQuestions: 10,
        difficulty: 'Medium',
        randomizeQuestions: false,
        contentUrl: '',
        startDate: '',
        endDate: '',
      });
      setPdfFile(null);
      setSelectedQuizIds([]);
      setSelectedDifficulties({ Easy: false, Medium: false, Hard: false });
      setDifficultyQuestions({ Easy: 0, Medium: 0, Hard: 0 });
      setError('');
      setSuccess('');
      
      // Call immediately to refresh quiz list
      onQuizCreated();
    } catch (err) {
      const errorMsg = err.response?.data?.message || 'Failed to create quiz';
      showToast(errorMsg, 'error');
      setError(errorMsg);
      if (err.response?.status === 403) {
        navigate('/user');
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ border: '2px solid #667eea', borderRadius: '12px', padding: '20px', marginBottom: '20px', background: '#f7fafc' }}>
      <h3 style={{ marginBottom: '16px', color: '#667eea', fontSize: '18px', fontWeight: '600' }}>✨ Create New Quiz</h3>
      {error && <div className="error">{error}</div>}
      {success && <div className="success">{success}</div>}
      
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

        <div className="form-group">
          <label>🌐 Content URL or YouTube Video Link {selectedQuizIds.length === 0 && !pdfFile ? '*' : '(Optional)'}</label>
          <input
            type="url"
            name="contentUrl"
            value={formData.contentUrl}
            onChange={handleChange}
            placeholder="https://example.com/article or https://youtube.com/watch?v=..."
            style={{
              width: '100%',
              padding: '10px 12px',
              border: '1.5px solid #e2e8f0',
              borderRadius: '8px',
              fontSize: '14px',
              background: '#fafafa'
            }}
            required={selectedQuizIds.length === 0 && !pdfFile}
          />
          <small style={{ color: '#718096', fontSize: '12px', marginTop: '4px', display: 'block' }}>
            Provide a URL to extract content from websites or YouTube videos for AI question generation
          </small>
          {formData.contentUrl && (
            <small style={{ color: '#155724', fontSize: '12px', marginTop: '4px', display: 'block' }}>
              ✓ URL provided
            </small>
          )}
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
        </div>

        {/* Multi-Difficulty Selection */}
        <div className="form-group">
          <label style={{ marginBottom: '12px', display: 'block', fontWeight: '600', fontSize: '14px', color: '#4a5568' }}>
            📊 Question Difficulty Distribution *
          </label>
          <small style={{ color: '#718096', fontSize: '12px', marginBottom: '12px', display: 'block' }}>
            Select difficulty levels and specify number of questions for each. This applies to AI-generated questions from PDFs/URLs.
          </small>
          
          {['Easy', 'Medium', 'Hard'].map((difficulty) => {
            const icons = { Easy: '🟢', Medium: '🟡', Hard: '🔴' };
            const descriptions = {
              Easy: 'Basic understanding and recall',
              Medium: 'Application and analysis',
              Hard: 'Critical thinking and deep understanding'
            };
            
            return (
              <div key={difficulty} style={{
                marginBottom: '12px',
                padding: '12px',
                border: `1.5px solid ${selectedDifficulties[difficulty] ? '#667eea' : '#e2e8f0'}`,
                borderRadius: '8px',
                backgroundColor: selectedDifficulties[difficulty] ? '#eef2ff' : 'white',
                transition: 'all 0.2s'
              }}>
                <label style={{ display: 'flex', alignItems: 'center', cursor: 'pointer', marginBottom: selectedDifficulties[difficulty] ? '8px' : '0' }}>
                  <input
                    type="checkbox"
                    checked={selectedDifficulties[difficulty]}
                    onChange={(e) => setSelectedDifficulties({ ...selectedDifficulties, [difficulty]: e.target.checked })}
                    style={{ marginRight: '10px', width: '18px', height: '18px', cursor: 'pointer' }}
                  />
                  <span style={{ fontWeight: '600', fontSize: '14px', color: '#2d3748' }}>
                    {icons[difficulty]} {difficulty}
                  </span>
                  <span style={{ marginLeft: '8px', fontSize: '13px', color: '#718096' }}>
                    - {descriptions[difficulty]}
                  </span>
                </label>
                
                {selectedDifficulties[difficulty] && (
                  <div style={{ marginLeft: '28px', marginTop: '8px' }}>
                    <input
                      type="number"
                      min="1"
                      max="50"
                      value={difficultyQuestions[difficulty]}
                      onChange={(e) => setDifficultyQuestions({ ...difficultyQuestions, [difficulty]: parseInt(e.target.value) || 0 })}
                      placeholder="Number of questions"
                      style={{
                        width: '150px',
                        padding: '6px 10px',
                        border: '1.5px solid #667eea',
                        borderRadius: '6px',
                        fontSize: '13px'
                      }}
                    />
                    <span style={{ marginLeft: '8px', fontSize: '13px', color: '#4a5568' }}>questions</span>
                  </div>
                )}
              </div>
            );
          })}
          
          {Object.values(selectedDifficulties).some(v => v) && (
            <div style={{ marginTop: '8px', padding: '10px', backgroundColor: '#f0fff4', borderRadius: '6px', border: '1px solid #48bb78' }}>
              <span style={{ fontSize: '13px', color: '#2f855a', fontWeight: '600' }}>
                Total: {Object.entries(selectedDifficulties)
                  .filter(([_, isSelected]) => isSelected)
                  .reduce((sum, [difficulty, _]) => sum + (difficultyQuestions[difficulty] || 0), 0)} questions
              </span>
            </div>
          )}
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
              🔀 Randomize Question Order for Students
            </span>
          </label>
          <small style={{ color: '#718096', fontSize: '12px', marginTop: '4px', display: 'block', marginLeft: '28px' }}>
            When enabled, each student will see questions in a different random order
          </small>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '15px' }}>
          <div className="form-group">
            <label>Start Date & Time (Optional)</label>
            <input
              type="datetime-local"
              name="startDate"
              value={formData.startDate}
              onChange={handleChange}
            />
            <small style={{ color: '#718096', fontSize: '12px', marginTop: '4px', display: 'block' }}>
              Leave empty for no start date
            </small>
          </div>

          <div className="form-group">
            <label>End Date & Time (Optional)</label>
            <input
              type="datetime-local"
              name="endDate"
              value={formData.endDate}
              onChange={handleChange}
            />
            <small style={{ color: '#718096', fontSize: '12px', marginTop: '4px', display: 'block' }}>
              Leave empty for no end date
            </small>
          </div>
        </div>

        {availableQuizzes.length > 0 && (
          <div className="form-group">
            <label>📚 Copy Questions from Existing Quizzes (Optional)</label>
            <div style={{ marginBottom: '10px', position: 'relative' }}>
              <input
                type="text"
                placeholder="🔍 Search quizzes..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                style={{
                  width: '100%',
                  padding: '10px 40px 10px 12px',
                  border: '1.5px solid #e2e8f0',
                  borderRadius: '8px',
                  fontSize: '14px',
                  background: '#fafafa'
                }}
              />
              {searchTerm && (
                <button
                  type="button"
                  onClick={() => setSearchTerm('')}
                  style={{
                    position: 'absolute',
                    right: '10px',
                    top: '50%',
                    transform: 'translateY(-50%)',
                    background: 'transparent',
                    border: 'none',
                    color: '#718096',
                    cursor: 'pointer',
                    fontSize: '18px',
                    padding: '0 5px'
                  }}
                >
                  ×
                </button>
              )}
            </div>
            <div style={{ 
              maxHeight: '200px', 
              overflowY: 'auto', 
              border: '1px solid #e2e8f0', 
              borderRadius: '8px', 
              padding: '12px',
              background: 'white'
            }}>
              {availableQuizzes
                .filter(quiz => 
                  quiz.title.toLowerCase().includes(searchTerm.toLowerCase())
                )
                .map((quiz) => (
                <label 
                  key={quiz.id} 
                  style={{ 
                    display: 'flex', 
                    alignItems: 'center', 
                    padding: '8px',
                    cursor: 'pointer',
                    borderRadius: '4px',
                    marginBottom: '4px',
                    background: selectedQuizIds.includes(quiz.id) ? '#f0f4ff' : 'transparent'
                  }}
                >
                  <input
                    type="checkbox"
                    checked={selectedQuizIds.includes(quiz.id)}
                    onChange={() => handleQuizSelection(quiz.id)}
                    style={{ marginRight: '10px' }}
                  />
                  <span style={{ fontSize: '14px' }}>
                    {quiz.title} <span style={{ color: '#718096', fontSize: '12px' }}>({quiz.questionsCount} questions)</span>
                  </span>
                </label>
              ))}
              {availableQuizzes.filter(quiz => 
                quiz.title.toLowerCase().includes(searchTerm.toLowerCase())
              ).length === 0 && (
                <div style={{ textAlign: 'center', padding: '20px', color: '#718096', fontSize: '14px' }}>
                  No quizzes found matching "{searchTerm}"
                </div>
              )}
            </div>
            {selectedQuizIds.length > 0 && (
              <p style={{ marginTop: '8px', color: '#155724', fontSize: '14px' }}>
                ✓ {selectedQuizIds.length} quiz{selectedQuizIds.length > 1 ? 'es' : ''} selected
              </p>
            )}
          </div>
        )}

        <div className="form-group">
          <label>📄 Upload PDF File {selectedQuizIds.length === 0 && !formData.contentUrl ? '*' : '(Optional)'}</label>
          <input
            type="file"
            accept="application/pdf"
            onChange={handleFileChange}
            required={selectedQuizIds.length === 0 && !formData.contentUrl}
          />
          {pdfFile && (
            <p style={{ marginTop: '8px', color: '#155724' }}>
              Selected: {pdfFile.name}
            </p>
          )}
          {(selectedQuizIds.length > 0 || formData.contentUrl) && (
            <small style={{ color: '#718096', fontSize: '12px', marginTop: '4px', display: 'block' }}>
              PDF is optional when using a URL or copying from existing quizzes
            </small>
          )}
        </div>

        <button 
          type="submit" 
          className="btn btn-primary"
          disabled={loading}
        >
          {loading ? 'Creating Quiz... (This may take a minute)' : 'Create Quiz'}
        </button>
      </form>
    </div>
  );
}

export default CreateQuiz;
