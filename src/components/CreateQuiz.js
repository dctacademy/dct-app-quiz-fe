import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { quizAPI } from '../services/api';
import { useToast } from './Toast';
import { useAuth } from '../context/AuthContext';
import CodeDragDropForm from './CodeDragDropForm';
import { FormattedText } from '../utils/formatText';
import CreatableSelect from 'react-select/creatable';

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
  const [pastedText, setPastedText] = useState('');
  const [keywords, setKeywords] = useState('');
  const [contentSource, setContentSource] = useState(''); // 'pdf', 'url', 'text', 'questionBank', 'copyQuiz'
  const [textType, setTextType] = useState('article'); // 'article' or 'code'
  const [articleType, setArticleType] = useState('regular'); // 'regular' or 'transcript'
  const [showCodeReference, setShowCodeReference] = useState(false);
  const [codeLanguage, setCodeLanguage] = useState('javascript');
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
  
  // Multi-type selection state
  const [selectedQuestionTypes, setSelectedQuestionTypes] = useState({
    MCQ: false,
    TrueFalse: false,
    FillInBlank: false,
    CodeSnippet: false,
    Essay: false,
    CodeDragDrop: false,
    TrickyQuestion: false
  });
  
  // CodeDragDrop questions state
  const [codeDragDropQuestions, setCodeDragDropQuestions] = useState([]);
  const [showCodeDragDropForm, setShowCodeDragDropForm] = useState(false);
  
  // Essay grading settings
  const [essayGradingMode, setEssayGradingMode] = useState('afterSubmission');
  const [essayGradingLevel, setEssayGradingLevel] = useState('intermediate');
  
  // Question bank state
  const [questionBank, setQuestionBank] = useState([]);
  const [selectedBankQuestions, setSelectedBankQuestions] = useState([]);
  const [bankFilters, setBankFilters] = useState({
    difficulty: '',
    questionType: '',
    search: ''
  });
  const [showQuestionBank, setShowQuestionBank] = useState(false);
  const [loadingBank, setLoadingBank] = useState(false);
  
  // Tags state
  const [selectedTags, setSelectedTags] = useState([]);
  const [availableTags, setAvailableTags] = useState([]);
  
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
    
    const fetchTags = async () => {
      try {
        const response = await quizAPI.getAllTags();
        const tagOptions = response.data.map(tag => ({ value: tag, label: tag }));
        setAvailableTags(tagOptions);
      } catch (err) {
        console.error('Error fetching tags:', err);
      }
    };
    
    if (user && user.role === 'admin') {
      fetchQuizzes();
      fetchTags();
    }
  }, [user]);
  
  // Fetch question bank when filters change
  useEffect(() => {
    const fetchQuestionBank = async () => {
      if (!showQuestionBank) return;
      
      setLoadingBank(true);
      try {
        const params = new URLSearchParams();
        if (bankFilters.difficulty) params.append('difficulty', bankFilters.difficulty);
        if (bankFilters.questionType) params.append('questionType', bankFilters.questionType);
        if (bankFilters.search) params.append('search', bankFilters.search);
        
        const response = await quizAPI.getQuestionBank(params.toString());
        setQuestionBank(response.data.questions || []);
      } catch (err) {
        console.error('Error fetching question bank:', err);
      } finally {
        setLoadingBank(false);
      }
    };
    
    fetchQuestionBank();
  }, [bankFilters, showQuestionBank]);
  
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
  
  const handleBankQuestionToggle = (question) => {
    setSelectedBankQuestions(prev => {
      const exists = prev.find(q => q._id === question._id);
      if (exists) {
        return prev.filter(q => q._id !== question._id);
      } else {
        // Add question without sourceQuiz field
        const { sourceQuiz, ...cleanQuestion } = question;
        return [...prev, cleanQuestion];
      }
    });
  };
  
  const handleBankFilterChange = (filterName, value) => {
    setBankFilters(prev => ({
      ...prev,
      [filterName]: value
    }));
  };
  
  const clearBankSelection = () => {
    setSelectedBankQuestions([]);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setSuccess('');

    // If only CodeDragDrop is selected, we only need the manual questions
    if (isOnlyCodeDragDrop) {
      if (codeDragDropQuestions.length === 0) {
        setError('Please add at least one CodeDragDrop question');
        return;
      }
    } else {
      // For other question types, we need content source OR keywords
      if (!pdfFile && !formData.contentUrl && !pastedText.trim() && !keywords.trim() && selectedQuizIds.length === 0 && selectedBankQuestions.length === 0 && codeDragDropQuestions.length === 0) {
        setError('Please provide a PDF file, URL, paste text/code, enter keywords, select existing quizzes, select questions from the question bank, or add CodeDragDrop questions');
        return;
      }
    }
    
    // Validate multi-difficulty selection (only for AI-generated content)
    const hasSelectedDifficulty = Object.values(selectedDifficulties).some(v => v);
    const totalQuestions = Object.entries(selectedDifficulties)
      .filter(([_, isSelected]) => isSelected)
      .reduce((sum, [difficulty, _]) => sum + (difficultyQuestions[difficulty] || 0), 0);
    
    if (!isOnlyCodeDragDrop) {
      if ((pdfFile || formData.contentUrl || pastedText.trim() || keywords.trim()) && hasSelectedDifficulty && totalQuestions === 0) {
        setError('Please specify number of questions for selected difficulty levels');
        return;
      }
      
      // Validate question type selection (only for AI-generated quizzes)
      const hasSelectedTypes = Object.values(selectedQuestionTypes).some(v => v);
      if ((pdfFile || formData.contentUrl || pastedText.trim() || keywords.trim()) && !hasSelectedTypes) {
        setError('Please select at least one question type');
        return;
      }
    }

    setLoading(true);

    try {
      const data = new FormData();
      data.append('title', formData.title);
      data.append('description', formData.description);
      data.append('duration', formData.duration);
      data.append('randomizeQuestions', formData.randomizeQuestions);
      
      // Send selected question types
      const selectedTypes = Object.entries(selectedQuestionTypes)
        .filter(([_, isSelected]) => isSelected)
        .map(([type, _]) => type);
      if (selectedTypes.length > 0) {
        data.append('questionTypes', JSON.stringify(selectedTypes));
      }
      
      // Send essay grading settings if Essay is selected
      if (selectedTypes.includes('Essay')) {
        data.append('essayGradingMode', essayGradingMode);
        data.append('essayGradingLevel', essayGradingLevel);
      }
      
      if (formData.contentUrl) data.append('contentUrl', formData.contentUrl);
      if (pastedText.trim()) {
        data.append('pastedText', pastedText.trim());
        data.append('textType', textType);
        if (keywords.trim()) {
          data.append('keywords', keywords.trim());
        }
        if (textType === 'article') {
          data.append('articleType', articleType);
        }
        if (textType === 'code') {
          data.append('showCodeReference', showCodeReference);
          data.append('codeLanguage', codeLanguage);
        }
      }
      if (formData.startDate) data.append('startDate', formData.startDate);
      if (formData.endDate) data.append('endDate', formData.endDate);
      if (selectedQuizIds.length > 0) {
        data.append('selectedQuizIds', JSON.stringify(selectedQuizIds));
      }
      
      // Send selected bank questions
      if (selectedBankQuestions.length > 0) {
        data.append('selectedBankQuestions', JSON.stringify(selectedBankQuestions));
      }
      
      // Send CodeDragDrop questions
      if (codeDragDropQuestions.length > 0) {
        data.append('codeDragDropQuestions', JSON.stringify(codeDragDropQuestions));
      }
      
      // Send tags
      if (selectedTags.length > 0) {
        const tagValues = selectedTags.map(tag => tag.value);
        data.append('tags', JSON.stringify(tagValues));
      }
      
      // Handle multi-difficulty or single difficulty (only for AI-generated quizzes)
      if (!isOnlyCodeDragDrop) {
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
      }
      
      if (pdfFile) {
        data.append('pdfFile', pdfFile);
      }

      console.log('Submitting quiz with data:', {
        title: formData.title,
        selectedTypes: Object.entries(selectedQuestionTypes).filter(([_, v]) => v).map(([k]) => k),
        codeDragDropCount: codeDragDropQuestions.length,
        isOnlyCodeDragDrop
      });

      const response = await quizAPI.createQuiz(data);
      showToast(`Quiz created successfully! Code: ${response.data.quiz.quizCode}`, 'success');
      
      // Reset form only on success
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
      setPastedText('');
      setKeywords('');
      setContentSource('');
      setTextType('article');
      setArticleType('regular');
      setShowCodeReference(false);
      setCodeLanguage('javascript');
      setSelectedQuizIds([]);
      setSelectedBankQuestions([]);
      setSelectedDifficulties({ Easy: false, Medium: false, Hard: false });
      setDifficultyQuestions({ Easy: 0, Medium: 0, Hard: 0 });
      setSelectedQuestionTypes({ MCQ: false, TrueFalse: false, FillInBlank: false, CodeSnippet: false, Essay: false, CodeDragDrop: false, TrickyQuestion: false });
      setCodeDragDropQuestions([]);
      setEssayGradingMode('afterSubmission');
      setEssayGradingLevel('intermediate');
      setSelectedTags([]);
      setError('');
      setSuccess('');
      
      // Call immediately to refresh quiz list
      onQuizCreated();
    } catch (err) {
      console.error('Quiz creation error:', err);
      console.error('Error response:', err.response?.data);
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

  // Check if only CodeDragDrop is selected (no other question types)
  const isOnlyCodeDragDrop = selectedQuestionTypes.CodeDragDrop && 
    !selectedQuestionTypes.MCQ && 
    !selectedQuestionTypes.TrueFalse && 
    !selectedQuestionTypes.FillInBlank && 
    !selectedQuestionTypes.CodeSnippet && 
    !selectedQuestionTypes.Essay && 
    !selectedQuestionTypes.TrickyQuestion;

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
          <label>Description *</label>
          <textarea
            name="description"
            value={formData.description}
            onChange={handleChange}
            required
            rows="3"
            placeholder="Enter quiz description"
          />
        </div>

        {/* Tags field */}
        <div className="form-group">
          <label style={{ marginBottom: '8px', display: 'block', fontWeight: '600', fontSize: '14px', color: '#4a5568' }}>
            🏷️ Tags
          </label>
          <small style={{ color: '#718096', fontSize: '12px', marginBottom: '8px', display: 'block' }}>
            Add tags to organize and categorize your quiz. You can select existing tags or create new ones.
          </small>
          <CreatableSelect
            isMulti
            value={selectedTags}
            onChange={setSelectedTags}
            options={availableTags}
            placeholder="Select or create tags..."
            styles={{
              control: (base) => ({
                ...base,
                borderColor: '#e2e8f0',
                '&:hover': { borderColor: '#cbd5e0' },
                boxShadow: 'none',
              }),
              multiValue: (base) => ({
                ...base,
                backgroundColor: '#eef2ff',
              }),
              multiValueLabel: (base) => ({
                ...base,
                color: '#667eea',
                fontWeight: '500',
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

        {/* Content Source Selector */}
        <div className="form-group">
          <label style={{ marginBottom: '12px', display: 'block', fontWeight: '600', fontSize: '14px', color: '#4a5568' }}>
            📚 How would you like to create this quiz? *
          </label>
          <small style={{ color: '#718096', fontSize: '12px', marginBottom: '12px', display: 'block' }}>
            Choose one method to provide content for quiz generation
          </small>
          
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '10px' }}>
            {[
              { value: 'pdf', label: 'Upload PDF', icon: '📄', desc: 'Upload a PDF document' },
              { value: 'url', label: 'From URL', icon: '🌐', desc: 'Extract from website/video' },
              { value: 'text', label: 'Paste Text/Code', icon: '📝', desc: 'Paste content directly' },
              { value: 'questionBank', label: 'Question Bank', icon: '🗄️', desc: 'Select existing questions' },
              { value: 'copyQuiz', label: 'Copy Quiz', icon: '📚', desc: 'Duplicate quiz questions' }
            ].map((source) => (
              <div
                key={source.value}
                onClick={() => {
                  setContentSource(source.value);
                  // Reset other sources when changing
                  if (source.value !== 'pdf') setPdfFile(null);
                  if (source.value !== 'url') setFormData({ ...formData, contentUrl: '' });
                  if (source.value !== 'text') setPastedText('');
                  if (source.value !== 'questionBank') setSelectedBankQuestions([]);
                  if (source.value !== 'copyQuiz') setSelectedQuizIds([]);
                }}
                style={{
                  padding: '12px',
                  border: `2px solid ${contentSource === source.value ? '#667eea' : '#e2e8f0'}`,
                  borderRadius: '8px',
                  backgroundColor: contentSource === source.value ? '#eef2ff' : 'white',
                  cursor: 'pointer',
                  transition: 'all 0.2s',
                  textAlign: 'center'
                }}
              >
                <div style={{ fontSize: '24px', marginBottom: '4px' }}>{source.icon}</div>
                <div style={{ fontWeight: '600', fontSize: '12px', color: '#2d3748', marginBottom: '2px' }}>
                  {source.label}
                </div>
                <p style={{ margin: 0, fontSize: '10px', color: '#718096', lineHeight: '1.3' }}>
                  {source.desc}
                </p>
              </div>
            ))}
          </div>
        </div>

        {/* Show question types and other fields only if content source is selected and uses AI generation */}
        {contentSource && ['pdf', 'url', 'text'].includes(contentSource) && (
          <>
        {/* Quiz Type Selector */}
        <div className="form-group">
          <label style={{ marginBottom: '12px', display: 'block', fontWeight: '600', fontSize: '14px', color: '#4a5568' }}>
            📝 Question Types *
          </label>
          <small style={{ color: '#718096', fontSize: '12px', marginBottom: '12px', display: 'block' }}>
            Select one or more question types for this quiz. Questions will be randomly distributed across selected types.
          </small>
          
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '12px' }}>
            {[
              { value: 'MCQ', label: 'Multiple Choice', icon: '☑️', desc: 'Choose one correct option from four choices' },
              { value: 'TrueFalse', label: 'True or False', icon: '✓✗', desc: 'Evaluate statements as true or false' },
              { value: 'FillInBlank', label: 'Fill in the Blank', icon: '📝', desc: 'Complete sentences with correct answers' },
              { value: 'CodeSnippet', label: 'Code Questions', icon: '💻', desc: 'Questions with code syntax highlighting' },
              { value: 'Essay', label: 'Essay/Short Answer', icon: '📄', desc: 'Written responses graded by AI' },
              { value: 'CodeDragDrop', label: 'Code Drag & Drop', icon: '🧩', desc: 'Drag correct code into blanks' },
              { value: 'TrickyQuestion', label: 'Tricky Questions', icon: '🎭', desc: 'MCQ with deceptive options to test deep understanding' }
            ].map((type) => (
              <div
                key={type.value}
                onClick={() => !type.disabled && setSelectedQuestionTypes({ ...selectedQuestionTypes, [type.value]: !selectedQuestionTypes[type.value] })}
                style={{
                  padding: '16px',
                  border: `2px solid ${selectedQuestionTypes[type.value] ? '#667eea' : '#e2e8f0'}`,
                  borderRadius: '8px',
                  backgroundColor: selectedQuestionTypes[type.value] ? '#eef2ff' : 'white',
                  cursor: type.disabled ? 'not-allowed' : 'pointer',
                  transition: 'all 0.2s',
                  position: 'relative',
                  opacity: type.disabled ? 0.5 : 1
                }}
              >
                {type.disabled && (
                  <div style={{ position: 'absolute', top: '8px', right: '8px', backgroundColor: '#fbbf24', color: '#92400e', padding: '2px 6px', borderRadius: '4px', fontSize: '10px', fontWeight: '600' }}>
                    Manual Only
                  </div>
                )}
                <div style={{ display: 'flex', alignItems: 'center', marginBottom: '8px' }}>
                  <input
                    type="checkbox"
                    checked={selectedQuestionTypes[type.value]}
                    onChange={() => {}}
                    disabled={type.disabled}
                    style={{ marginRight: '8px', width: '18px', height: '18px', cursor: type.disabled ? 'not-allowed' : 'pointer' }}
                    onClick={(e) => e.stopPropagation()}
                  />
                  <span style={{ fontSize: '18px', marginRight: '8px' }}>{type.icon}</span>
                  <span style={{ fontWeight: '600', fontSize: '14px', color: '#2d3748' }}>
                    {type.label}
                  </span>
                </div>
                <p style={{ margin: '0 0 0 26px', fontSize: '12px', color: '#718096', lineHeight: '1.4' }}>
                  {type.desc}
                </p>
              </div>
            ))}
          </div>
          
          {Object.values(selectedQuestionTypes).some(v => v) && (
            <div style={{ marginTop: '8px', padding: '10px', backgroundColor: '#f0fff4', borderRadius: '6px', border: '1px solid #48bb78' }}>
              <span style={{ fontSize: '13px', color: '#2f855a', fontWeight: '600' }}>
                Selected: {Object.entries(selectedQuestionTypes)
                  .filter(([_, isSelected]) => isSelected)
                  .map(([type, _]) => type)
                  .join(', ')}
              </span>
            </div>
          )}
        </div>

        {/* Essay Grading Settings - Show only when Essay is selected */}
        {selectedQuestionTypes.Essay && (
          <div className="form-group" style={{ 
            border: '2px solid #9f7aea', 
            borderRadius: '12px', 
            padding: '20px', 
            backgroundColor: '#faf5ff' 
          }}>
            <h4 style={{ marginTop: 0, marginBottom: '16px', color: '#6b46c1', fontSize: '15px', fontWeight: '600' }}>
              🤖 AI Essay Grading Settings
            </h4>
            
            <div style={{ marginBottom: '16px' }}>
              <label style={{ display: 'block', marginBottom: '8px', fontWeight: '600', fontSize: '14px', color: '#4a5568' }}>
                When to Grade Essays
              </label>
              <small style={{ color: '#718096', fontSize: '12px', marginBottom: '12px', display: 'block' }}>
                Choose when AI should grade essay responses
              </small>
              
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                <div
                  onClick={() => setEssayGradingMode('perQuestion')}
                  style={{
                    padding: '14px',
                    border: `2px solid ${essayGradingMode === 'perQuestion' ? '#9f7aea' : '#e2e8f0'}`,
                    borderRadius: '8px',
                    backgroundColor: essayGradingMode === 'perQuestion' ? '#f3e8ff' : 'white',
                    cursor: 'pointer',
                    transition: 'all 0.2s'
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', marginBottom: '6px' }}>
                    <input
                      type="radio"
                      checked={essayGradingMode === 'perQuestion'}
                      onChange={() => {}}
                      style={{ marginRight: '8px', cursor: 'pointer' }}
                    />
                    <span style={{ fontWeight: '600', fontSize: '14px', color: '#2d3748' }}>
                      Per Question
                    </span>
                  </div>
                  <p style={{ margin: '0 0 0 24px', fontSize: '12px', color: '#718096', lineHeight: '1.4' }}>
                    Grade immediately after each essay question
                  </p>
                </div>

                <div
                  onClick={() => setEssayGradingMode('afterSubmission')}
                  style={{
                    padding: '14px',
                    border: `2px solid ${essayGradingMode === 'afterSubmission' ? '#9f7aea' : '#e2e8f0'}`,
                    borderRadius: '8px',
                    backgroundColor: essayGradingMode === 'afterSubmission' ? '#f3e8ff' : 'white',
                    cursor: 'pointer',
                    transition: 'all 0.2s'
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', marginBottom: '6px' }}>
                    <input
                      type="radio"
                      checked={essayGradingMode === 'afterSubmission'}
                      onChange={() => {}}
                      style={{ marginRight: '8px', cursor: 'pointer' }}
                    />
                    <span style={{ fontWeight: '600', fontSize: '14px', color: '#2d3748' }}>
                      After Submission
                    </span>
                  </div>
                  <p style={{ margin: '0 0 0 24px', fontSize: '12px', color: '#718096', lineHeight: '1.4' }}>
                    Grade all essays when quiz is submitted
                  </p>
                </div>
              </div>
            </div>

            <div>
              <label style={{ display: 'block', marginBottom: '8px', fontWeight: '600', fontSize: '14px', color: '#4a5568' }}>
                Grading Strictness Level
              </label>
              <small style={{ color: '#718096', fontSize: '12px', marginBottom: '12px', display: 'block' }}>
                Set how strictly AI should evaluate responses
              </small>
              
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '12px' }}>
                {[
                  { value: 'beginner', label: 'Beginner', icon: '🌱', desc: 'Lenient - focuses on basic understanding' },
                  { value: 'intermediate', label: 'Intermediate', icon: '📚', desc: 'Balanced - standard expectations' },
                  { value: 'expert', label: 'Expert', icon: '🎓', desc: 'Strict - expects comprehensive answers' }
                ].map((level) => (
                  <div
                    key={level.value}
                    onClick={() => setEssayGradingLevel(level.value)}
                    style={{
                      padding: '12px',
                      border: `2px solid ${essayGradingLevel === level.value ? '#9f7aea' : '#e2e8f0'}`,
                      borderRadius: '8px',
                      backgroundColor: essayGradingLevel === level.value ? '#f3e8ff' : 'white',
                      cursor: 'pointer',
                      transition: 'all 0.2s',
                      textAlign: 'center'
                    }}
                  >
                    <div style={{ fontSize: '24px', marginBottom: '6px' }}>{level.icon}</div>
                    <div style={{ fontWeight: '600', fontSize: '13px', color: '#2d3748', marginBottom: '4px' }}>
                      {level.label}
                    </div>
                    <p style={{ margin: 0, fontSize: '11px', color: '#718096', lineHeight: '1.3' }}>
                      {level.desc}
                    </p>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}
        
        {/* CodeDragDrop Form - Show only when CodeDragDrop is selected */}
        {selectedQuestionTypes.CodeDragDrop && (
          <CodeDragDropForm
            questions={codeDragDropQuestions}
            onQuestionsChange={setCodeDragDropQuestions}
          />
        )}
        </>
        )}

        {/* Content Source Specific Fields */}
        {/* URL Field */}
        {contentSource === 'url' && (
        <div className="form-group">
          <label>🌐 Content URL or YouTube Video Link *</label>
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
            required
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
        )}

        {/* Pasted Text Field */}
        {contentSource === 'text' && !isOnlyCodeDragDrop && (
        <div className="form-group">
          <label>📝 Paste Text/Code Content *</label>
          
          {/* Content Type Selector */}
          <div style={{ marginBottom: '12px', marginTop: '8px' }}>
            <label style={{ display: 'block', marginBottom: '8px', fontWeight: '500', fontSize: '13px', color: '#4a5568' }}>
              Content Type
            </label>
            <div style={{ display: 'flex', gap: '12px' }}>
              <div
                onClick={() => {
                  setTextType('article');
                  setShowCodeReference(false);
                }}
                style={{
                  flex: 1,
                  padding: '10px 16px',
                  border: `2px solid ${textType === 'article' ? '#667eea' : '#e2e8f0'}`,
                  borderRadius: '8px',
                  backgroundColor: textType === 'article' ? '#eef2ff' : 'white',
                  cursor: 'pointer',
                  textAlign: 'center',
                  transition: 'all 0.2s'
                }}
              >
                <div style={{ fontSize: '20px', marginBottom: '4px' }}>📄</div>
                <div style={{ fontWeight: '600', fontSize: '13px', color: '#2d3748' }}>Text/Article</div>
              </div>
              
              <div
                onClick={() => setTextType('code')}
                style={{
                  flex: 1,
                  padding: '10px 16px',
                  border: `2px solid ${textType === 'code' ? '#667eea' : '#e2e8f0'}`,
                  borderRadius: '8px',
                  backgroundColor: textType === 'code' ? '#eef2ff' : 'white',
                  cursor: 'pointer',
                  textAlign: 'center',
                  transition: 'all 0.2s'
                }}
              >
                <div style={{ fontSize: '20px', marginBottom: '4px' }}>💻</div>
                <div style={{ fontWeight: '600', fontSize: '13px', color: '#2d3748' }}>Source Code</div>
              </div>
            </div>
          </div>

          {/* Article Type Selection */}
          {textType === 'article' && (
            <div style={{ marginBottom: '12px' }}>
              <label style={{ display: 'block', marginBottom: '8px', fontWeight: '500', fontSize: '13px', color: '#4a5568' }}>
                Article Type
              </label>
              <div style={{ display: 'flex', gap: '10px' }}>
                <div
                  onClick={() => setArticleType('regular')}
                  style={{
                    flex: 1,
                    padding: '10px 14px',
                    border: `2px solid ${articleType === 'regular' ? '#667eea' : '#e2e8f0'}`,
                    borderRadius: '8px',
                    backgroundColor: articleType === 'regular' ? '#eef2ff' : 'white',
                    cursor: 'pointer',
                    textAlign: 'center',
                    transition: 'all 0.2s'
                  }}
                >
                  <div style={{ fontSize: '18px', marginBottom: '4px' }}>📝</div>
                  <div style={{ fontWeight: '600', fontSize: '12px', color: '#2d3748' }}>Regular Text</div>
                  <div style={{ fontSize: '10px', color: '#718096', marginTop: '2px' }}>Articles, notes, etc.</div>
                </div>
                
                <div
                  onClick={() => setArticleType('transcript')}
                  style={{
                    flex: 1,
                    padding: '10px 14px',
                    border: `2px solid ${articleType === 'transcript' ? '#667eea' : '#e2e8f0'}`,
                    borderRadius: '8px',
                    backgroundColor: articleType === 'transcript' ? '#eef2ff' : 'white',
                    cursor: 'pointer',
                    textAlign: 'center',
                    transition: 'all 0.2s'
                  }}
                >
                  <div style={{ fontSize: '18px', marginBottom: '4px' }}>🎙️</div>
                  <div style={{ fontWeight: '600', fontSize: '12px', color: '#2d3748' }}>Transcript</div>
                  <div style={{ fontSize: '10px', color: '#718096', marginTop: '2px' }}>Video/audio transcripts</div>
                </div>
              </div>
              {articleType === 'transcript' && (
                <small style={{ display: 'block', marginTop: '8px', padding: '8px', backgroundColor: '#fffbeb', border: '1px solid #fbbf24', borderRadius: '6px', fontSize: '11px', color: '#92400e' }}>
                  💡 Transcripts will be automatically cleaned (timestamps removed), summarized, and questions will be generated from the summary.
                </small>
              )}
            </div>
          )}

          {/* Code-specific options */}
          {textType === 'code' && (
            <div style={{ marginBottom: '12px' }}>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', marginBottom: '12px' }}>
                <div>
                  <label style={{ display: 'block', marginBottom: '6px', fontWeight: '500', fontSize: '13px', color: '#4a5568' }}>
                    Programming Language
                  </label>
                  <select
                    value={codeLanguage}
                    onChange={(e) => setCodeLanguage(e.target.value)}
                    style={{
                      width: '100%',
                      padding: '8px 12px',
                      border: '1.5px solid #e2e8f0',
                      borderRadius: '6px',
                      fontSize: '13px',
                      background: 'white'
                    }}
                  >
                    <option value="javascript">JavaScript</option>
                    <option value="python">Python</option>
                    <option value="java">Java</option>
                    <option value="cpp">C++</option>
                    <option value="csharp">C#</option>
                    <option value="typescript">TypeScript</option>
                    <option value="go">Go</option>
                    <option value="rust">Rust</option>
                    <option value="php">PHP</option>
                    <option value="ruby">Ruby</option>
                    <option value="swift">Swift</option>
                    <option value="kotlin">Kotlin</option>
                  </select>
                </div>
              </div>
              
              <div
                onClick={() => setShowCodeReference(!showCodeReference)}
                style={{
                  padding: '12px',
                  border: '1.5px solid #e2e8f0',
                  borderRadius: '8px',
                  backgroundColor: '#fafafa',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '10px'
                }}
              >
                <input
                  type="checkbox"
                  checked={showCodeReference}
                  onChange={() => {}}
                  style={{ cursor: 'pointer', width: '16px', height: '16px' }}
                />
                <div>
                  <div style={{ fontWeight: '600', fontSize: '13px', color: '#2d3748' }}>
                    Show code to students as reference
                  </div>
                  <div style={{ fontSize: '12px', color: '#718096', marginTop: '2px' }}>
                    Students can view the code while taking the quiz
                  </div>
                </div>
              </div>
            </div>
          )}

          <textarea
            value={pastedText}
            onChange={(e) => setPastedText(e.target.value)}
            placeholder={
              textType === 'code' 
                ? "Paste your source code here..." 
                : articleType === 'transcript'
                  ? "Paste your video/audio transcript here (with or without timestamps)..."
                  : keywords.trim()
                    ? "Optional: Paste text to combine with keywords for better context..."
                    : "Paste your text content or article here..."
            }
            rows="10"
            required={!keywords.trim()}
            style={{
              width: '100%',
              padding: '12px 16px',
              border: '1.5px solid #e2e8f0',
              borderRadius: '8px',
              fontSize: '13px',
              fontFamily: 'monospace',
              background: '#fafafa',
              resize: 'vertical'
            }}
          />
          <small style={{ color: '#718096', fontSize: '12px', marginTop: '4px', display: 'block' }}>
            {keywords.trim() 
              ? 'Text is optional when keywords are provided. AI will generate questions based on keywords and any text you provide.'
              : textType === 'code' 
              ? 'Paste source code. AI will generate questions to test understanding of this code.'
              : articleType === 'transcript'
                ? 'Paste transcript content. Timestamps will be automatically removed, text will be summarized, and questions generated from the summary.'
                : 'Paste any text content, articles, or notes. AI will analyze it to generate quiz questions.'}
          </small>
          {pastedText.trim() && (
            <small style={{ color: '#155724', fontSize: '12px', marginTop: '4px', display: 'block' }}>
              ✓ {pastedText.length} characters pasted ({Math.ceil(pastedText.length / 1000)}KB)
            </small>
          )}
        </div>
        )}

        {/* PDF Upload Field */}
        {contentSource === 'pdf' && (
        <div className="form-group">
          <label>📄 Upload PDF File *</label>
          <input
            type="file"
            accept="application/pdf"
            onChange={handleFileChange}
            required
          />
          {pdfFile && (
            <p style={{ marginTop: '8px', color: '#155724' }}>
              Selected: {pdfFile.name}
            </p>
          )}
        </div>
        )}

        {/* Keywords Input - Available for all content types */}
        {contentSource && ['pdf', 'url', 'text'].includes(contentSource) && !isOnlyCodeDragDrop && (
        <div className="form-group">
          <label style={{ fontWeight: '600', fontSize: '14px', color: '#4a5568', display: 'block', marginBottom: '8px' }}>
            🔑 Keywords (Optional)
          </label>
          <input
            type="text"
            value={keywords}
            onChange={(e) => {
              setKeywords(e.target.value);
              // Auto-set article type to regular when keywords are entered
              if (e.target.value.trim() && textType === 'article') {
                setArticleType('regular');
              }
            }}
            placeholder="e.g., variables, loops, functions, API, authentication"
            style={{
              width: '100%',
              padding: '10px 14px',
              border: '1.5px solid #e2e8f0',
              borderRadius: '8px',
              fontSize: '13px',
              background: 'white'
            }}
          />
          <small style={{ color: '#718096', fontSize: '12px', marginTop: '4px', display: 'block' }}>
            Add comma-separated keywords to focus question generation on specific topics or concepts from your content.
          </small>
          {keywords.trim() && (
            <small style={{ color: '#155724', fontSize: '12px', marginTop: '4px', display: 'block' }}>
              ✓ Keywords: {keywords.split(',').map(k => k.trim()).filter(k => k).join(', ')}
            </small>
          )}
        </div>
        )}

        {/* Duration and other common fields */}
        {contentSource && (
        <>
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
        {!isOnlyCodeDragDrop && (
        <div className="form-group">
          <label style={{ marginBottom: '12px', display: 'block', fontWeight: '600', fontSize: '14px', color: '#4a5568' }}>
            📊 Question Difficulty Distribution *
          </label>
          <small style={{ color: '#718096', fontSize: '12px', marginBottom: '12px', display: 'block' }}>
            Select difficulty levels and specify number of questions for each. This applies to AI-generated questions from PDFs/URLs.
          </small>
          {selectedQuestionTypes.TrickyQuestion && (
            <div style={{ 
              marginBottom: '12px', 
              padding: '10px 12px', 
              backgroundColor: '#fef3c7', 
              borderLeft: '3px solid #f59e0b',
              borderRadius: '4px'
            }}>
              <span style={{ fontSize: '12px', color: '#92400e', fontWeight: '600' }}>
                💡 Tricky Questions Note:
              </span>
              <p style={{ fontSize: '12px', color: '#78350f', margin: '4px 0 0 0', lineHeight: '1.5' }}>
                <strong>Easy Tricky:</strong> Subtle distinctions for basic concepts<br/>
                <strong>Medium Tricky:</strong> Nuanced differences requiring careful analysis<br/>
                <strong>Hard Tricky:</strong> Extremely deceptive options testing mastery
              </p>
            </div>
          )}
          
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
        )}

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
        </>
        )}

        {/* Copy Quiz Section */}
        {contentSource === 'copyQuiz' && availableQuizzes.length > 0 && (
          <div className="form-group">
            <label>📚 Select Quizzes to Copy Questions From *</label>
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

        {/* Question Bank Selector */}
        {contentSource === 'questionBank' && (
        <div className="form-group">
          <label style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span>🗄️ Select Questions from Question Bank *</span>
            <button
              type="button"
              onClick={() => setShowQuestionBank(!showQuestionBank)}
              style={{
                padding: '6px 12px',
                background: showQuestionBank ? '#667eea' : '#e2e8f0',
                color: showQuestionBank ? 'white' : '#4a5568',
                border: 'none',
                borderRadius: '6px',
                cursor: 'pointer',
                fontSize: '13px',
                fontWeight: '500'
              }}
            >
              {showQuestionBank ? 'Hide' : 'Show'} Question Bank
            </button>
          </label>
          <small style={{ color: '#718096', fontSize: '12px', marginTop: '4px', display: 'block' }}>
            Browse and select individual questions from all your previous quizzes
          </small>
          
          {selectedBankQuestions.length > 0 && (
            <div style={{ 
              marginTop: '12px', 
              padding: '12px', 
              background: '#f0fff4', 
              border: '1px solid #9ae6b4', 
              borderRadius: '6px',
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center'
            }}>
              <span style={{ color: '#155724', fontSize: '14px', fontWeight: '500' }}>
                ✓ {selectedBankQuestions.length} question{selectedBankQuestions.length > 1 ? 's' : ''} selected from bank
              </span>
              <button
                type="button"
                onClick={clearBankSelection}
                style={{
                  padding: '4px 10px',
                  background: 'white',
                  color: '#e53e3e',
                  border: '1px solid #e53e3e',
                  borderRadius: '4px',
                  cursor: 'pointer',
                  fontSize: '12px'
                }}
              >
                Clear Selection
              </button>
            </div>
          )}

          {showQuestionBank && (
            <div style={{ 
              marginTop: '12px', 
              border: '1px solid #e2e8f0', 
              borderRadius: '8px', 
              padding: '16px',
              background: 'white'
            }}>
              {/* Filters */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '12px', marginBottom: '16px' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '13px', fontWeight: '500', marginBottom: '4px', color: '#4a5568' }}>
                    Difficulty
                  </label>
                  <select
                    value={bankFilters.difficulty}
                    onChange={(e) => handleBankFilterChange('difficulty', e.target.value)}
                    style={{
                      width: '100%',
                      padding: '8px',
                      border: '1px solid #e2e8f0',
                      borderRadius: '6px',
                      fontSize: '13px'
                    }}
                  >
                    <option value="">All Levels</option>
                    <option value="Easy">Easy</option>
                    <option value="Medium">Medium</option>
                    <option value="Hard">Hard</option>
                  </select>
                </div>
                
                <div>
                  <label style={{ display: 'block', fontSize: '13px', fontWeight: '500', marginBottom: '4px', color: '#4a5568' }}>
                    Question Type
                  </label>
                  <select
                    value={bankFilters.questionType}
                    onChange={(e) => handleBankFilterChange('questionType', e.target.value)}
                    style={{
                      width: '100%',
                      padding: '8px',
                      border: '1px solid #e2e8f0',
                      borderRadius: '6px',
                      fontSize: '13px'
                    }}
                  >
                    <option value="">All Types</option>
                    <option value="MCQ">Multiple Choice</option>
                    <option value="TrueFalse">True/False</option>
                    <option value="FillInBlank">Fill in Blank</option>
                    <option value="CodeSnippet">Code Snippet</option>
                    <option value="Essay">Essay</option>
                  </select>
                </div>
                
                <div>
                  <label style={{ display: 'block', fontSize: '13px', fontWeight: '500', marginBottom: '4px', color: '#4a5568' }}>
                    Search Keywords
                  </label>
                  <input
                    type="text"
                    placeholder="Search in questions..."
                    value={bankFilters.search}
                    onChange={(e) => handleBankFilterChange('search', e.target.value)}
                    style={{
                      width: '100%',
                      padding: '8px',
                      border: '1px solid #e2e8f0',
                      borderRadius: '6px',
                      fontSize: '13px'
                    }}
                  />
                </div>
              </div>

              {/* Question List */}
              {loadingBank ? (
                <div style={{ textAlign: 'center', padding: '20px', color: '#718096' }}>
                  Loading questions...
                </div>
              ) : (
                <div style={{ 
                  maxHeight: '400px', 
                  overflowY: 'auto',
                  border: '1px solid #e2e8f0',
                  borderRadius: '6px',
                  padding: '8px'
                }}>
                  {questionBank.length === 0 ? (
                    <div style={{ textAlign: 'center', padding: '40px', color: '#718096' }}>
                      <div style={{ fontSize: '48px', marginBottom: '12px' }}>📭</div>
                      <p style={{ margin: 0, fontSize: '14px' }}>
                        No questions found. Try adjusting your filters.
                      </p>
                    </div>
                  ) : (
                    questionBank.map((question, idx) => {
                      const isSelected = selectedBankQuestions.find(q => q._id === question._id);
                      
                      return (
                        <div
                          key={question._id || idx}
                          onClick={() => handleBankQuestionToggle(question)}
                          style={{
                            padding: '12px',
                            marginBottom: '8px',
                            border: `2px solid ${isSelected ? '#667eea' : '#e2e8f0'}`,
                            borderRadius: '6px',
                            background: isSelected ? '#eef2ff' : 'white',
                            cursor: 'pointer',
                            transition: 'all 0.2s'
                          }}
                        >
                          <div style={{ display: 'flex', alignItems: 'start', gap: '12px' }}>
                            <input
                              type="checkbox"
                              checked={!!isSelected}
                              onChange={() => {}}
                              style={{ marginTop: '4px' }}
                            />
                            <div style={{ flex: 1 }}>
                              <div style={{ fontSize: '14px', color: '#2d3748', marginBottom: '8px', fontWeight: '500' }}>
                                <FormattedText text={question.question} />
                              </div>
                              <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                                <span style={{ 
                                  fontSize: '11px', 
                                  padding: '3px 8px', 
                                  background: '#e2e8f0', 
                                  borderRadius: '4px',
                                  color: '#4a5568'
                                }}>
                                  {question.difficulty || 'Medium'}
                                </span>
                                <span style={{ 
                                  fontSize: '11px', 
                                  padding: '3px 8px', 
                                  background: '#e2e8f0', 
                                  borderRadius: '4px',
                                  color: '#4a5568'
                                }}>
                                  {question.questionType || 'MCQ'}
                                </span>
                                {question.sourceQuiz && (
                                  <span style={{ 
                                    fontSize: '11px', 
                                    padding: '3px 8px', 
                                    background: '#f0f4ff', 
                                    borderRadius: '4px',
                                    color: '#667eea'
                                  }}>
                                    📚 {question.sourceQuiz.title}
                                  </span>
                                )}
                              </div>
                            </div>
                          </div>
                        </div>
                      );
                    })
                  )}
                </div>
              )}
            </div>
          )}
        </div>
        )}

        <button 
          type="submit" 
          className="btn btn-primary"
          disabled={loading || !contentSource}
        >
          {loading ? 'Creating Quiz... (This may take a minute)' : 'Create Quiz'}
        </button>
      </form>
    </div>
  );
}

export default CreateQuiz;
