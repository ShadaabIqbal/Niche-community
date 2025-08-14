import React, { useState, useEffect, useRef } from "react";
import { useParams } from "react-router-dom";
import {
  doc,
  getDoc,
  collection,
  query,
  where,
  getDocs,
  updateDoc,
} from "firebase/firestore";
import { db } from "../config/firebase";
import { useAuth } from "../contexts/AuthContext";
import {
  FaUsers,
  FaEdit,
  FaEnvelope,
  FaCalendarAlt,
  FaCamera,
  FaUserFriends,
} from "react-icons/fa";
import Card from "../components/ui/Card";
import Button from "../components/ui/Button";
import { uploadImageToCloudinary } from "../config/cloudinary";
import { updateProfile } from "firebase/auth";
import CommunityImage from "../components/CommunityImage";

const Profile = () => {
  const { userId } = useParams();
  const { currentUser } = useAuth();
  const [profile, setProfile] = useState(null);
  const [communities, setCommunities] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [isEditing, setIsEditing] = useState(false);
  const [uploadingImage, setUploadingImage] = useState(false);
  const [editForm, setEditForm] = useState({
    displayName: "",
    bio: "",
  });
  const fileInputRef = useRef(null);
  const isFetchingRef = useRef(false);

  // Check if we have a valid user to display
  const targetUserId = userId || currentUser?.uid;

  // Helper function to format date
  const formatDate = (timestamp) => {
    if (!timestamp) return "Recently";

    try {
      if (timestamp.toDate) {
        return new Date(timestamp.toDate()).toLocaleDateString();
      }
      return new Date(timestamp).toLocaleDateString();
    } catch (error) {
      console.error("Error formatting date:", error);
      return "Recently";
    }
  };

  const fetchUserProfile = async () => {
    if (isFetchingRef.current) {
      console.log("Profile: Already fetching, skipping...");
      return;
    }
    
    try {
      isFetchingRef.current = true;
      setLoading(true);
      setError("");
      
      console.log("Profile: Fetching profile for user:", targetUserId);
      console.log("Profile: userId from params:", userId);
      console.log("Profile: currentUser:", currentUser);
      
      if (!targetUserId) {
        setError("No user ID available");
        setLoading(false);
        return;
      }
      
      const userRef = doc(db, "users", targetUserId);
      const userSnap = await getDoc(userRef);

      if (userSnap.exists()) {
        const userData = { id: userSnap.id, ...userSnap.data() };
        console.log("Profile: User data found:", userData);
        setProfile(userData);
        setEditForm({
          displayName: userData.displayName || "",
          bio: userData.bio || "",
        });
      } else {
        console.log("Profile: User not found in Firestore");
        setError("User profile not found");
      }

      const communitiesQuery = query(
        collection(db, "communities"),
        where("members", "array-contains", targetUserId)
      );
      const communitiesSnap = await getDocs(communitiesQuery);
      const communitiesList = communitiesSnap.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
      }));
      console.log("Profile: Communities found:", communitiesList.length);
      setCommunities(communitiesList);
    } catch (err) {
      console.error("Profile: Error fetching profile:", err);
      setError("Failed to load profile. Please try again.");
    } finally {
      setLoading(false);
      isFetchingRef.current = false;
    }
  };

  useEffect(() => {
    console.log("Profile: useEffect triggered");
    console.log("Profile: targetUserId:", targetUserId);
    console.log("Profile: currentUser:", currentUser);
    
    if (targetUserId) {
      fetchUserProfile();
    } else if (currentUser === null) {
      // User is not authenticated
      setError("Please sign in to view profiles");
      setLoading(false);
    }
  }, [targetUserId, currentUser]);

  const handleEditClick = () => {
    setIsEditing(true);
  };

  const handleCancelEdit = () => {
    setIsEditing(false);
    setEditForm({
      displayName: profile.displayName || "",
      bio: profile.bio || "",
    });
  };

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setEditForm((prev) => ({
      ...prev,
      [name]: value,
    }));
  };

  const handleSaveProfile = async () => {
    try {
      setError("");
      const userRef = doc(db, "users", currentUser.uid);
      await updateDoc(userRef, {
        displayName: editForm.displayName,
        bio: editForm.bio,
        updatedAt: new Date().toISOString(),
      });

      // Update auth profile
      await updateProfile(currentUser, {
        displayName: editForm.displayName,
      });

      setProfile((prev) => ({
        ...prev,
        displayName: editForm.displayName,
        bio: editForm.bio,
      }));
      setIsEditing(false);
    } catch (err) {
      console.error("Error updating profile:", err);
      setError("Failed to update profile. Please try again.");
    }
  };

  const handleImageUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    // Validate file type
    if (!file.type.startsWith("image/")) {
      setError("Please select an image file");
      return;
    }

    // Validate file size (max 5MB)
    if (file.size > 5 * 1024 * 1024) {
      setError("Image size should be less than 5MB");
      return;
    }

    try {
      setUploadingImage(true);
      setError("");

      // First upload to Cloudinary
      const downloadURL = await uploadImageToCloudinary(file);

      // Update Firestore first
      const userRef = doc(db, "users", currentUser.uid);
      await updateDoc(userRef, {
        photoURL: downloadURL,
        updatedAt: new Date().toISOString(),
      });

      // Then update auth profile
      if (currentUser) {
        try {
          await updateProfile(currentUser, {
            photoURL: downloadURL,
          });
        } catch (authError) {
          console.error("Auth profile update error:", authError);
          // Continue even if auth update fails, as Firestore is updated
        }
      }

      // Update local state
      setProfile((prev) => ({
        ...prev,
        photoURL: downloadURL,
      }));

      // Clear the file input
      if (fileInputRef.current) {
        fileInputRef.current.value = "";
      }

      // Refresh the profile data
      await fetchUserProfile();
    } catch (err) {
      console.error("Error uploading image:", err);
      setError("Failed to upload image. Please try again.");
    } finally {
      setUploadingImage(false);
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center min-h-[60vh]">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600"></div>
      </div>
    );
  }

  // Debug render to see what's happening
  console.log("Profile: Rendering with state:", {
    loading,
    error,
    profile,
    targetUserId,
    currentUser: currentUser?.uid
  });

  if (!targetUserId) {
    return (
      <div className="max-w-4xl mx-auto px-4">
        <div className="bg-error-50 border border-error-200 text-error-700 px-4 py-3 rounded-lg">
          No user available to display profile.
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="max-w-4xl mx-auto px-4">
        <div className="bg-error-50 border border-error-200 text-error-700 px-4 py-3 rounded-lg">
          {error}
        </div>
      </div>
    );
  }

  if (!profile) {
    return (
      <div className="max-w-4xl mx-auto px-4">
        <div className="bg-error-50 border border-error-200 text-error-700 px-4 py-3 rounded-lg">
          Profile data not available.
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto px-4">
      {(() => {
        try {
          return (
            <>
              <div className="relative">
                <div className="h-48 bg-gradient-to-r from-primary-500 to-secondary-500 rounded-t-lg"></div>
                <div className="absolute -bottom-16 left-8">
                  <div className="relative">
                    <div className="relative">
                      <CommunityImage
                        photoURL={profile?.photoURL}
                        name={profile?.displayName}
                        sizeClasses="w-32 h-32"
                      />
                      {uploadingImage && (
                        <div className="absolute inset-0 flex items-center justify-center bg-black bg-opacity-50 rounded-full">
                          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-white"></div>
                        </div>
                      )}
                    </div>
                    {currentUser && currentUser.uid === targetUserId && (
                      <>
                        <input
                          type="file"
                          ref={fileInputRef}
                          onChange={handleImageUpload}
                          accept="image/*"
                          className="hidden"
                        />
                        <button
                          onClick={() => fileInputRef.current?.click()}
                          disabled={uploadingImage}
                          className="absolute bottom-0 right-0 bg-white p-2 rounded-full shadow-md hover:bg-gray-50 transition-colors duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                          <FaCamera className="w-5 h-5 text-gray-600" />
                        </button>
                      </>
                    )}
                  </div>
                </div>
              </div>

              <div className="mt-20">
                <div className="flex flex-col md:flex-row md:items-start md:justify-between">
                  <div className="md:flex-1">
                    {isEditing ? (
                      <div className="space-y-4">
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1">
                            Display Name
                          </label>
                          <input
                            type="text"
                            name="displayName"
                            value={editForm.displayName}
                            onChange={handleInputChange}
                            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
                            placeholder="Display Name"
                          />
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1">
                            Bio
                          </label>
                          <textarea
                            name="bio"
                            value={editForm.bio}
                            onChange={handleInputChange}
                            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
                            placeholder="Tell us about yourself"
                            rows="3"
                          />
                        </div>
                        <div className="flex space-x-2">
                          <Button onClick={handleSaveProfile}>Save Changes</Button>
                          <Button variant="outline" onClick={handleCancelEdit}>
                            Cancel
                          </Button>
                        </div>
                      </div>
                    ) : (
                      <>
                        <h1 className="text-3xl font-bold text-gray-900">
                          {profile?.displayName || "Loading..."}
                        </h1>
                        <p className="text-gray-600 mt-2">
                          {profile?.bio || "No bio provided."}
                        </p>
                        <div className="mt-4 text-sm text-gray-500">
                          <p className="flex items-center">
                            <FaEnvelope className="mr-2" />
                            {profile?.email}
                          </p>
                          <p className="flex items-center mt-1">
                            <FaCalendarAlt className="mr-2" />
                            Joined {formatDate(profile?.createdAt)}
                          </p>
                        </div>
                      </>
                    )}
                  </div>
                  {currentUser && currentUser.uid === targetUserId && !isEditing && (
                    <div className="mt-4 md:mt-0">
                      <Button onClick={handleEditClick} variant="outline">
                        <FaEdit className="mr-2" />
                        Edit Profile
                      </Button>
                    </div>
                  )}
                </div>
              </div>

              <div className="mt-8 grid grid-cols-1 md:grid-cols-3 gap-6">
                <Card className="md:col-span-1 p-6">
                  <h3 className="text-lg font-semibold text-gray-900 mb-4">
                    Statistics
                  </h3>
                  <p className="text-gray-600">
                    <span className="font-medium">Communities:</span>{" "}
                    {communities.length}
                  </p>
                </Card>

                <Card className="md:col-span-2 p-6">
                  <h3 className="text-lg font-semibold text-gray-900 mb-4">
                    Communities
                  </h3>
                  {communities.length > 0 ? (
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      {communities.map((community) => (
                        <div
                          key={community.id}
                          className="flex items-center space-x-3 p-3 rounded-lg hover:bg-gray-50 transition-colors duration-200"
                        >
                          <CommunityImage
                            photoURL={community.photoURL}
                            name={community.name}
                            sizeClasses="w-12 h-12"
                          />
                          <div>
                            <h4 className="font-medium text-gray-900">
                              {community.name}
                            </h4>
                            <p className="text-sm text-gray-500">
                              {community.category || "General"}
                            </p>
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="text-center py-8">
                      <FaUserFriends className="mx-auto h-12 w-12 text-gray-400" />
                      <h3 className="mt-2 text-sm font-medium text-gray-900">
                        No communities yet
                      </h3>
                      <p className="mt-1 text-sm text-gray-500">
                        Join or create a community to get started
                      </p>
                    </div>
                  )}
                </Card>
              </div>
            </>
          );
        } catch (renderError) {
          console.error("Profile: Render error:", renderError);
          return (
            <div className="bg-error-50 border border-error-200 text-error-700 px-4 py-3 rounded-lg">
              Error rendering profile: {renderError.message}
            </div>
          );
        }
      })()}
    </div>
  );
};

export default Profile;
