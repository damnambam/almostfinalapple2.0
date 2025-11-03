import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { getCurrentUser, logout } from '../services/authService';
import '../styles/UserDashboard.css';

const UserDashboard = () => {
  const [user, setUser] = useState(null);
  const navigate = useNavigate();

  useEffect(() => {
    // Get current user from localStorage
    const currentUser = getCurrentUser();
    if (!currentUser) {
      // If not logged in, redirect to login
      navigate('/signup-login');
    } else {
      setUser(currentUser);
    }
  }, [navigate]);

  const handleLogout = () => {
    logout();
    navigate('/signup-login');
  };

  if (!user) {
    return <div className="loading">Loading...</div>;
  }

  return (
    <div className="user-dashboard">
      <div className="dashboard-container">
        {/* Header */}
        <div className="dashboard-header">
          <div>
            <h1 className="dashboard-title">
              Hello, {user.name || user.email}! 👋
            </h1>
            <p className="dashboard-subtitle">
              Explore apple varieties, manage your profile, and download your favorites.
            </p>
          </div>
          
        </div>

        

        {/* Quick Actions */}
        <div className="quick-actions">
          <h2 className="section-title">Quick Actions</h2>
          <div className="actions-grid">
            <Link to="/" className="action-card">
              <div className="action-icon">🍎</div>
              <h3>Browse Apples</h3>
              <p>Explore 900+ apple varieties with detailed information</p>
            </Link>

            
            

            <Link to="/about" className="action-card">
              <div className="action-icon">🌳</div>
              <h3>About</h3>
              <p>Learn more about Appleverse</p>
            </Link>

            <div className="action-card" onClick={() => navigate('/profile')}>
              <div className="action-icon">👤</div>
              <h3>My Profile</h3>
              <p>View and edit your profile information</p>
            </div>

          </div>
        </div>

        {/* Recent Activity */}
        <div className="recent-activity">
          <h2 className="section-title">Recent Activity</h2>
          <div className="activity-list">
            <div className="activity-item">
              <div className="activity-icon">👁️</div>
              <div className="activity-content">
                <p className="activity-title">Latest View</p>
                <p className="activity-description">No recent views yet</p>
              </div>
            </div>

            <div className="activity-item">
              <div className="activity-icon">⬇️</div>
              <div className="activity-content">
                <p className="activity-title">Latest Download</p>
                <p className="activity-description">No downloads yet</p>
              </div>
            </div>

            <div className="activity-item">
              <div className="activity-icon">🔍</div>
              <div className="activity-content">
                <p className="activity-title">Recent Search</p>
                <p className="activity-description">No searches yet</p>
              </div>
            </div>
          </div>
        </div>

        
      </div>
    </div>
  );
};

export default UserDashboard;