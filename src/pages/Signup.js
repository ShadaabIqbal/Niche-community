import React, { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "../contexts/AuthContext";
import { FaEnvelope, FaLock, FaUser, FaGoogle, FaGithub } from "react-icons/fa";
import Button from "../components/ui/Button";
import Input from "../components/ui/Input";
import Card from "../components/ui/Card";

const Signup = () => {
  const [formData, setFormData] = useState({
    displayName: "",
    email: "",
    password: "",
    confirmPassword: "",
  });
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();
  const { signup } = useAuth();

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    const { displayName, email, password, confirmPassword } = formData;

    if (password !== confirmPassword) {
      return setError("Passwords do not match");
    }

    if (password.length < 6) {
      return setError("Password must be at least 6 characters long");
    }

    try {
      setError("");
      setLoading(true);
      console.log("Starting signup process...");

      // Use the AuthContext signup function
      const user = await signup(email, password, displayName);
      console.log("Signup successful, user:", user);
      
      // Check if user was actually created
      if (user && user.uid) {
        console.log("User created successfully with UID:", user.uid);
        
        // Clear the form
        setFormData({
          displayName: "",
          email: "",
          password: "",
          confirmPassword: "",
        });
        
        // Navigate to home page
        navigate("/", { replace: true });
      } else {
        throw new Error("User creation failed - no user object returned");
      }
    } catch (err) {
      console.error("Signup error:", err);
      console.error("Error code:", err.code);
      console.error("Error message:", err.message);
      
      if (err.code === "auth/email-already-in-use") {
        setError("An account with this email already exists. Please try signing in instead.");
      } else if (err.code === "auth/weak-password") {
        setError("Password is too weak. Please choose a stronger password.");
      } else if (err.code === "auth/invalid-email") {
        setError("Please enter a valid email address.");
      } else if (err.code === "auth/network-request-failed") {
        setError("Network error. Please check your internet connection and try again.");
      } else {
        setError(`Failed to create an account: ${err.message}`);
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
            Create your account
          </h2>
          <p className="mt-2 text-sm text-gray-600">
            Already have an account?{" "}
            <Link
              to="/login"
              className="font-medium text-primary-600 hover:text-primary-500 transition-colors duration-200"
            >
              Sign in
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
              label="Full name"
              type="text"
              name="displayName"
              value={formData.displayName}
              onChange={handleChange}
              required
              icon={<FaUser className="text-gray-400" />}
              placeholder="Enter your full name"
            />

            <Input
              label="Email address"
              type="email"
              name="email"
              value={formData.email}
              onChange={handleChange}
              required
              icon={<FaEnvelope className="text-gray-400" />}
              placeholder="Enter your email"
            />

            <Input
              label="Password"
              type="password"
              name="password"
              value={formData.password}
              onChange={handleChange}
              required
              icon={<FaLock className="text-gray-400" />}
              placeholder="Create a password"
            />

            <Input
              label="Confirm password"
              type="password"
              name="confirmPassword"
              value={formData.confirmPassword}
              onChange={handleChange}
              required
              icon={<FaLock className="text-gray-400" />}
              placeholder="Confirm your password"
            />

            <Button
              type="submit"
              fullWidth
              loading={loading}
              disabled={loading}
            >
              Create account
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

export default Signup;
