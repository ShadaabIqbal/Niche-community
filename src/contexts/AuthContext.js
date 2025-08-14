import React, { createContext, useContext, useState, useEffect } from "react";
import { auth, db } from "../config/firebase";
import {
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signOut,
  onAuthStateChanged,
  updateProfile,
} from "firebase/auth";
import { doc, setDoc, getDoc } from "firebase/firestore";

const AuthContext = createContext();

export function useAuth() {
  return useContext(AuthContext);
}

export function AuthProvider({ children }) {
  const [currentUser, setCurrentUser] = useState(null);
  const [loading, setLoading] = useState(true);

  async function signup(email, password, displayName) {
    try {
      console.log("AuthContext: Starting signup for email:", email);
      const userCredential = await createUserWithEmailAndPassword(
        auth,
        email,
        password
      );
      console.log("AuthContext: User created successfully:", userCredential.user.uid);

      // Update auth profile with display name
      await updateProfile(userCredential.user, {
        displayName,
        photoURL: null,
      });
      console.log("AuthContext: Profile updated successfully");

      // Store user data in Firestore
      await setDoc(doc(db, "users", userCredential.user.uid), {
        displayName,
        email,
        photoURL: null,
        createdAt: new Date().toISOString(),
        communities: [],
        bio: "",
        location: "",
        website: "",
      });
      console.log("AuthContext: User data stored in Firestore");

      // Return the user object immediately
      return userCredential.user;
    } catch (error) {
      console.error("AuthContext: Signup error:", error);
      throw error;
    }
  }

  async function login(email, password) {
    try {
      console.log("AuthContext: Starting login for email:", email);
      const userCredential = await signInWithEmailAndPassword(auth, email, password);
      console.log("AuthContext: Login successful for user:", userCredential.user.uid);
      return userCredential.user;
    } catch (error) {
      console.error("AuthContext: Login error:", error);
      throw error;
    }
  }

  function logout() {
    return signOut(auth);
  }

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      console.log("Auth state changed:", user ? "User logged in" : "User logged out");
      
      if (user) {
        try {
          console.log("Fetching user data for:", user.uid);
          // Fetch additional user data from Firestore
          const userDoc = await getDoc(doc(db, "users", user.uid));
          if (userDoc.exists()) {
            const userData = userDoc.data();
            console.log("User data found:", userData);
            // Update the user object with Firestore data
            const enrichedUser = {
              ...user,
              displayName: userData.displayName || user.displayName,
              photoURL: userData.photoURL || null,
              communities: userData.communities || [],
              bio: userData.bio || "",
              location: userData.location || "",
              website: userData.website || "",
            };
            console.log("Setting current user:", enrichedUser);
            setCurrentUser(enrichedUser);
          } else {
            console.log("User document not found, creating one");
            // If user document doesn't exist, create it
            await setDoc(doc(db, "users", user.uid), {
              displayName: user.displayName || "",
              email: user.email,
              photoURL: user.photoURL || null,
              createdAt: new Date().toISOString(),
              communities: [],
              bio: "",
              location: "",
              website: "",
            });
            console.log("Setting current user:", user);
            setCurrentUser(user);
          }
        } catch (error) {
          console.error("Error fetching user data:", error);
          console.log("Setting current user (fallback):", user);
          setCurrentUser(user);
        }
      } else {
        console.log("Setting current user to null");
        setCurrentUser(null);
      }
      setLoading(false);
    });

    return unsubscribe;
  }, []);

  const value = {
    currentUser,
    signup,
    login,
    logout,
  };

  return (
    <AuthContext.Provider value={value}>
      {!loading && children}
    </AuthContext.Provider>
  );
}
