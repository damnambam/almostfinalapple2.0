import React, { useState, useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import Navigation from './components/Navigation';
import HeroSection from './components/HeroSection';
import FeaturesGrid from './components/FeaturesGrid';
import AdvancedFilters from './components/AdvancedFilters';
import SearchResults from './components/SearchResults';
import TemplateCreator from './components/TemplateCreator';
import TreeScrollPage from './components/TreeScrollPage';
import AdminDashboard from './components/AdminDashboard';
import UserDashboard from './pages/UserDashboard';
import Footer from './components/Footer';
import CreateApple from './pages/CreateApple';
import SingleApple from './pages/SingleApple';
import SignupLogin from "./pages/SignupLogin";

import './App.css';

// 🔒 Protected Route for Admin
const ProtectedAdminRoute = ({ children }) => {
  const isAdmin = localStorage.getItem('isAdmin') === 'true';
  const adminToken = localStorage.getItem('adminToken');
  if (!isAdmin || !adminToken) return <Navigate to="/signup-login" replace />;
  return children;
};

// 🔒 Protected Route for Users
const ProtectedUserRoute = ({ children }) => {
  const token = localStorage.getItem('token');
  const user = localStorage.getItem('user');
  if (!token || !user) return <Navigate to="/signup-login" replace />;
  return children;
};

function App() {
  const [showAdvancedFilters, setShowAdvancedFilters] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [isSearching, setIsSearching] = useState(false);
  const [searchResults, setSearchResults] = useState([]);
  const [hasSearched, setHasSearched] = useState(false);
  const [isAdmin, setIsAdmin] = useState(false);

  // ✅ Check admin status on mount
  useEffect(() => {
    const adminStatus = localStorage.getItem('isAdmin') === 'true';
    setIsAdmin(adminStatus);
  }, []);

  // ✅ Listen for login/logout changes
  useEffect(() => {
    const handleAuthChange = () => {
      const adminStatus = localStorage.getItem('isAdmin') === 'true';
      setIsAdmin(adminStatus);
    };
    window.addEventListener('authChange', handleAuthChange);
    return () => window.removeEventListener('authChange', handleAuthChange);
  }, []);

  // ✅ Mock search data
  const mockResults = [
    { id: 1, name: 'Honeycrisp', origin: 'Minnesota, USA', taste: 'Sweet', emoji: '🍎' },
    { id: 2, name: 'Granny Smith', origin: 'Australia', taste: 'Tart', emoji: '🍏' },
    { id: 3, name: 'Gala', origin: 'New Zealand', taste: 'Sweet', emoji: '🍎' },
    { id: 4, name: 'McIntosh', origin: 'Canada', taste: 'Tart-Sweet', emoji: '🍎' },
  ];

  // ✅ Search Logic
  const performSearch = (query) => {
    if (!query) return mockResults;
    const q = query.toLowerCase();
    return mockResults.filter(
      (apple) =>
        apple.name.toLowerCase().includes(q) ||
        apple.origin.toLowerCase().includes(q) ||
        apple.taste.toLowerCase().includes(q)
    );
  };

  const handleSearch = () => {
    if (!searchQuery.trim()) {
      setSearchResults([]);
      setHasSearched(false);
      return;
    }
    setIsSearching(true);
    setTimeout(() => {
      const results = performSearch(searchQuery);
      setSearchResults(results);
      setIsSearching(false);
      setHasSearched(true);
    }, 800);
  };

  const handleClearSearch = () => {
    setSearchQuery('');
    setSearchResults([]);
    setHasSearched(false);
  };

  const handleLogout = () => {
    setIsAdmin(false);
    localStorage.clear();
    window.dispatchEvent(new Event('authChange'));
    alert('Logged out successfully');
  };

  return (
    <Router>
      <Navigation isAdmin={isAdmin} onLogout={handleLogout} />

      <Routes>
        {/* 🔐 Auth Pages */}
        <Route path="/signup-login" element={<SignupLogin setIsAdmin={setIsAdmin} />} />

        {/* 🔐 User Dashboard */}
        <Route
          path="/user-dashboard"
          element={
            <ProtectedUserRoute>
              <UserDashboard />
            </ProtectedUserRoute>
          }
        />

        {/* 🔐 Admin Dashboard */}
        <Route
          path="/dashboard"
          element={
            <ProtectedAdminRoute>
              <AdminDashboard isAdmin={true} />
            </ProtectedAdminRoute>
          }
        />

        {/* 🍎 Apple Upload Routes */}
        <Route path="/create-apple" element={<CreateApple />} />
        <Route path="/single-apple" element={<SingleApple />} />
        <Route path="/template-creator" element={<TemplateCreator />} />

        {/* 🌳 About Page */}
        <Route path="/about" element={<TreeScrollPage />} />

        {/* 🏠 Home Page */}
        <Route
          path="/"
          element={
            <>
              <HeroSection />
              {hasSearched ? (
                <SearchResults
                  query={searchQuery}
                  results={searchResults}
                  onClearSearch={handleClearSearch}
                  onFilter={() => setShowAdvancedFilters(true)}
                />
              ) : (
                <FeaturesGrid />
              )}
              {showAdvancedFilters && (
                <AdvancedFilters onClose={() => setShowAdvancedFilters(false)} />
              )}
              <Footer />
            </>
          }
        />
      </Routes>
    </Router>
  );
}

export default App;