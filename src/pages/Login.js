import React, { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { signInWithEmailAndPassword } from "firebase/auth";
import { auth } from "../config/firebase";
import { useAuth } from "../contexts/AuthContext";
import { FaEnvelope, FaLock, FaGoogle, FaGithub } from "react-icons/fa";
import Button from "../components/ui/Button";
import Input from "../components/ui/Input";
import Card from "../components/ui/Card";

const Login = () => {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();
  const { login } = useAuth();

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!email || !password) {
      return setError("Please fill in all fields");
    }

    try {
      setError("");
      setLoading(true);
      console.log("Starting login process...");
      
      const user = await login(email, password);
      console.log("Login successful, user:", user);
      
      // Check if user was actually logged in
      if (user && user.uid) {
        console.log("User logged in successfully with UID:", user.uid);
        
        // Clear the form
        setEmail("");
        setPassword("");
        
        // Navigate to home page
        navigate("/", { replace: true });
      } else {
        throw new Error("Login failed - no user object returned");
      }
    } catch (err) {
      console.error("Login error:", err);
      console.error("Error code:", err.code);
      console.error("Error message:", err.message);
      
      if (err.code === "auth/user-not-found") {
        setError("No account found with this email. Please check your email or sign up.");
      } else if (err.code === "auth/wrong-password") {
        setError("Incorrect password. Please try again.");
      } else if (err.code === "auth/invalid-email") {
        setError("Please enter a valid email address.");
      } else if (err.code === "auth/too-many-requests") {
        setError("Too many failed attempts. Please try again later.");
      } else if (err.code === "auth/network-request-failed") {
        setError("Network error. Please check your internet connection and try again.");
      } else {
        setError(`Failed to sign in: ${err.message}`);
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-primary-50 to-secondary-50 flex items-center justify-center py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-md w-full space-y-8">
        <div className="text-center">
          <h2 className="text-3xl font-extrabold text-gray-900">
            Welcome back
          </h2>
          <p className="mt-2 text-sm text-gray-600">
            Don't have an account?{" "}
            <Link
              to="/signup"
              className="font-medium text-primary-600 hover:text-primary-500 transition-colors duration-200"
            >
              Sign up
            </Link>
          </p>
        </div>

        <Card variant="elevated" className="p-8">
          <form onSubmit={handleSubmit} className="space-y-6">
            {error && (
              <div className="bg-error-50 border border-error-200 text-error-700 px-4 py-3 rounded-lg">
                {error}
              </div>
            )}

            <Input
              label="Email address"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              icon={<FaEnvelope className="text-gray-400" />}
              placeholder="Enter your email"
            />

            <Input
              label="Password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              icon={<FaLock className="text-gray-400" />}
              placeholder="Enter your password"
            />

            <div className="flex items-center justify-between">
              <div className="flex items-center">
                <input
                  id="remember-me"
                  name="remember-me"
                  type="checkbox"
                  className="h-4 w-4 text-primary-600 focus:ring-primary-500 border-gray-300 rounded"
                />
                <label
                  htmlFor="remember-me"
                  className="ml-2 block text-sm text-gray-900"
                >
                  Remember me
                </label>
              </div>

              <div className="text-sm">
                <Link
                  to="/forgot-password"
                  className="font-medium text-primary-600 hover:text-primary-500 transition-colors duration-200"
                >
                  Forgot your password?
                </Link>
              </div>
            </div>

            <Button
              type="submit"
              fullWidth
              loading={loading}
              disabled={loading}
            >
              Sign in
            </Button>

            <div className="mt-6">
              <div className="relative">
                <div className="absolute inset-0 flex items-center">
                  <div className="w-full border-t border-gray-300" />
                </div>
                <div className="relative flex justify-center text-sm">
                  <span className="px-2 bg-white text-gray-500">
                    Or continue with
                  </span>
                </div>
              </div>

              <div className="mt-6 grid grid-cols-2 gap-3">
                <Button
                  variant="outline"
                  icon={<FaGoogle className="text-red-500" />}
                >
                  Google
                </Button>
                <Button
                  variant="outline"
                  icon={<FaGithub className="text-gray-900" />}
                >
                  GitHub
                </Button>
              </div>
            </div>
          </form>
        </Card>
      </div>
    </div>
  );
};

export default Login;
