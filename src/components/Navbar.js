import React from 'react';
import { useAuth } from '../context/AuthContext';
import { useNavigate, Link } from 'react-router-dom';

function Navbar() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  if (!user) return null;

  return (
    <nav className="navbar">
      <div className="navbar-content">
        <h1>Quiz App</h1>
        <div className="navbar-actions">
          <span style={{ marginRight: '20px', color: '#4a5568' }}>Welcome, {user.name} ({user.role})</span>
          {user.role === 'admin' ? (
            <>
              <Link to="/admin" className="nav-link">
                Dashboard
              </Link>
              <Link to="/questions" className="nav-link">
                📝 Questions
              </Link>
              <Link to="/students" className="nav-link">
                👥 Students
              </Link>
              <Link to="/groups" className="nav-link">
                👨‍👩‍👦 Groups
              </Link>
              <Link to="/leaderboard" className="nav-link">
                🏆 Leaderboard
              </Link>
            </>
          ) : (
            <>
              <Link to="/user" className="nav-link">
                Dashboard
              </Link>
              <Link to="/my-quizzes" className="nav-link">
                📚 My Quizzes
              </Link>
              <Link to="/leaderboard" className="nav-link">
                🏆 Leaderboard
              </Link>
            </>
          )}
          <button className="btn btn-danger" onClick={handleLogout} style={{ marginLeft: '10px' }}>
            Logout
          </button>
        </div>
      </div>
    </nav>
  );
}

export default Navbar;
