import React from "react";
import { BrowserRouter as Router, Routes, Route } from "react-router-dom";
import { AuthProvider } from "./contexts/AuthContext";
import { SearchProvider } from "./contexts/SearchContext";
import PrivateRoute from "./components/PrivateRoute";
import Navbar from "./components/Navbar";
import Home from "./pages/Home";
import Login from "./pages/Login";
import Signup from "./pages/Signup";
import Community from "./pages/Community";
import Profile from "./pages/Profile";
import CreateCommunity from "./pages/CreateCommunity";
import Communities from "./pages/Communities";
import { CommunitiesSearchProvider } from './contexts/CommunitiesSearchContext';

function App() {
  return (
    <CommunitiesSearchProvider>
      <Router>
        <AuthProvider>
          <SearchProvider>
            <div className="min-h-screen bg-gray-50">
              <Navbar />
              <main className="container mx-auto px-4 py-8">
                <Routes>
                  <Route path="/" element={<Home />} />
                  <Route path="/login" element={<Login />} />
                  <Route path="/signup" element={<Signup />} />
                  <Route path="/communities" element={<Communities />} />
                  <Route path="/community/:id" element={<Community />} />
                  <Route
                    path="/profile"
                    element={
                      <PrivateRoute>
                        <Profile />
                      </PrivateRoute>
                    }
                  />
                  <Route
                    path="/create-community"
                    element={
                      <PrivateRoute>
                        <CreateCommunity />
                      </PrivateRoute>
                    }
                  />
                </Routes>
              </main>
            </div>
          </SearchProvider>
        </AuthProvider>
      </Router>
    </CommunitiesSearchProvider>
  );
}

export default App;
