import React, { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import {
  doc,
  getDoc,
  collection,
  query,
  orderBy,
  getDocs,
  addDoc,
  serverTimestamp,
  updateDoc,
  arrayUnion,
  arrayRemove,
  deleteDoc,
} from "firebase/firestore";
import { db } from "../config/firebase";
import { useAuth } from "../contexts/AuthContext";
import PostInteractions from "../components/PostInteractions";
import { getAuth } from "firebase/auth";
import CommunityImage, { getInitials } from "../components/CommunityImage";
import Button from "../components/ui/Button";
import Card from "../components/ui/Card";
import { uploadImageToCloudinary } from "../config/cloudinary";
import { FaUsers, FaCamera } from "react-icons/fa";

export default function Community() {
  const { id } = useParams();
  const { currentUser } = useAuth();
  const navigate = useNavigate();
  const [community, setCommunity] = useState(null);
  const [posts, setPosts] = useState([]);
  const [newPost, setNewPost] = useState("");
  const [mediaFile, setMediaFile] = useState(null);
  const [mediaPreview, setMediaPreview] = useState(null);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [memberDetails, setMemberDetails] = useState({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [coverImageFile, setCoverImageFile] = useState(null);
  const [coverImagePreview, setCoverImagePreview] = useState(null);
  const [isUploadingCover, setIsUploadingCover] = useState(false);

  const isCreator = community?.createdBy === currentUser?.uid;
  const isMember = community?.members?.includes(currentUser?.uid);

  // Check if user can post (must be authenticated and a member)
  const canPost = currentUser && isMember;

  useEffect(() => {
    async function fetchMemberDetails() {
      if (!community?.members?.length) return;

      try {
        const memberPromises = community.members.map(async (memberId) => {
          try {
            const userDoc = await getDoc(doc(db, "users", memberId));
            if (userDoc.exists()) {
              const userData = userDoc.data();
              // Ensure we have a display name, fallback to email username or "Unknown User"
              const displayName =
                userData.displayName ||
                (userData.email ? userData.email.split("@")[0] : null) ||
                "Unknown User";

              return [
                memberId,
                {
                  displayName,
                  photoURL: userData.photoURL || null, // Set to null if no photo URL
                  email: userData.email,
                },
              ];
            }
          } catch (error) {
            console.error(`Error fetching user ${memberId}:`, error);
          }
          return [
            memberId,
            {
              displayName: "Unknown User",
              photoURL: null,
              email: null,
            },
          ];
        });

        const memberData = await Promise.all(memberPromises);
        const memberMap = Object.fromEntries(memberData);
        setMemberDetails(memberMap);
      } catch (error) {
        console.error("Error fetching member details:", error);
      }
    }

    fetchMemberDetails();
  }, [community?.members]);

  const fetchCommunity = async () => {
    try {
      setLoading(true);
      const communityDoc = await getDoc(doc(db, "communities", id));

      if (!communityDoc.exists()) {
        setError("Community not found");
        setLoading(false);
        return;
      }

      const communityData = communityDoc.data();
      console.log("Community Data:", communityData); // Debug log
      console.log("Current User:", currentUser); // Debug log
      console.log("Is Creator:", communityData.createdBy === currentUser?.uid); // Debug log

      setCommunity({
        id: communityDoc.id,
        ...communityData,
      });

      // Fetch posts
      const postsQuery = query(
        collection(db, "communities", id, "posts"),
        orderBy("createdAt", "desc")
      );
      const postsSnapshot = await getDocs(postsQuery);
      const postsList = postsSnapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
      }));
      setPosts(postsList);
      setLoading(false);
    } catch (error) {
      console.error("Error fetching community:", error);
      setError("Failed to load community");
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCommunity();
  }, [id]);

  async function handleDeleteCommunity() {
    try {
      // Delete all posts in the community
      const postsQuery = query(collection(db, "communities", id, "posts"));
      const postsSnapshot = await getDocs(postsQuery);
      const deletePromises = postsSnapshot.docs.map((doc) =>
        deleteDoc(doc.ref)
      );
      await Promise.all(deletePromises);

      // Delete the community
      await deleteDoc(doc(db, "communities", id));
      navigate("/");
    } catch (error) {
      console.error("Error deleting community:", error);
      setError("Failed to delete community");
    }
  }

  const handleRemoveMember = async (memberId) => {
    // Prevent community creator from removing themselves
    if (memberId === currentUser.uid) {
      setError("You cannot remove yourself from the community");
      return;
    }

    try {
      const communityRef = doc(db, "communities", id);
      await updateDoc(communityRef, {
        members: arrayRemove(memberId),
      });

      // Create notification for removed member
      const notificationRef = collection(db, "notifications");
      await addDoc(notificationRef, {
        type: "removed",
        communityId: id,
        communityName: community.name,
        toUser: memberId,
        fromUser: currentUser.uid,
        fromUserName: currentUser.displayName || currentUser.email,
        message: `${
          currentUser.displayName || currentUser.email
        } removed you from the community "${community.name}"`,
        createdAt: new Date(),
        read: false,
      });

      // Update local state
      setCommunity((prev) => ({
        ...prev,
        members: prev.members.filter((m) => m !== memberId),
      }));
    } catch (error) {
      console.error("Error removing member:", error);
      setError("Failed to remove member");
    }
  };

  const handleJoinCommunity = async () => {
    if (!currentUser) {
      navigate("/login");
      return;
    }

    try {
      // Update community document
      const communityRef = doc(db, "communities", id);
      await updateDoc(communityRef, {
        members: arrayUnion(currentUser.uid),
      });

      // Update user document
      const userRef = doc(db, "users", currentUser.uid);
      await updateDoc(userRef, {
        communities: arrayUnion(id),
      });

      // Update local state
      setCommunity((prev) => ({
        ...prev,
        members: [...prev.members, currentUser.uid],
      }));

      // Create notification for community creator
      const notificationRef = collection(db, "notifications");
      await addDoc(notificationRef, {
        type: "join",
        communityId: id,
        communityName: community.name,
        toUser: community.createdBy,
        fromUser: currentUser.uid,
        fromUserName: currentUser.displayName || currentUser.email,
        message: `${currentUser.displayName || currentUser.email} joined your community "${community.name}"`,
        createdAt: new Date(),
        read: false
      });
    } catch (error) {
      console.error("Error joining community:", error);
    }
  };

  const handleLeaveCommunity = async () => {
    if (!currentUser) return;

    try {
      // Update community document
      const communityRef = doc(db, "communities", id);
      await updateDoc(communityRef, {
        members: arrayRemove(currentUser.uid),
      });

      // Update user document
      const userRef = doc(db, "users", currentUser.uid);
      await updateDoc(userRef, {
        communities: arrayRemove(id),
      });

      // Update local state
      setCommunity((prev) => ({
        ...prev,
        members: prev.members.filter((m) => m !== currentUser.uid),
      }));

      // Create notification for community creator
      const notificationRef = collection(db, "notifications");
      await addDoc(notificationRef, {
        type: "leave",
        communityId: id,
        communityName: community.name,
        toUser: community.createdBy,
        fromUser: currentUser.uid,
        fromUserName: currentUser.displayName || currentUser.email,
        message: `${currentUser.displayName || currentUser.email} left your community "${community.name}"`,
        createdAt: new Date(),
        read: false
      });
    } catch (error) {
      console.error("Error leaving community:", error);
    }
  };

  const handleCoverImageChange = async (e) => {
    const file = e.target.files[0];
    if (file) {
      if (file.size > 5 * 1024 * 1024) {
        // 5MB limit
        setError("Image size should be less than 5MB");
        return;
      }
      setCoverImageFile(file);
      setCoverImagePreview(URL.createObjectURL(file));
    }
  };

  const handleCoverImageUpload = async () => {
    if (!coverImageFile) return;

    try {
      setIsUploadingCover(true);
      setError("");

      // Upload to Cloudinary
      const imageUrl = await uploadImageToCloudinary(coverImageFile);

      // Update community document
      const communityRef = doc(db, "communities", id);
      await updateDoc(communityRef, {
        photoURL: imageUrl,
      });

      // Update local state
      setCommunity((prev) => ({
        ...prev,
        photoURL: imageUrl,
      }));

      // Clear the file and preview
      setCoverImageFile(null);
      setCoverImagePreview(null);
    } catch (error) {
      console.error("Error uploading cover image:", error);
      setError("Failed to upload cover image");
    } finally {
      setIsUploadingCover(false);
    }
  };

  async function handleMediaChange(e) {
    const file = e.target.files[0];
    if (file) {
      setMediaFile(file);
      setMediaPreview(URL.createObjectURL(file));
    }
  }

  async function handleDeletePost(postId) {
    try {
      await deleteDoc(doc(db, "communities", id, "posts", postId));
      setPosts(posts.filter((post) => post.id !== postId));
    } catch (error) {
      console.error("Error deleting post:", error);
      setError("Failed to delete post");
    }
  }

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

  async function handleCreatePost(e) {
    e.preventDefault();
    if (!newPost.trim() && !mediaFile) return;

    try {
      let mediaURL = "";
      if (mediaFile) {
        mediaURL = await uploadImageToCloudinary(mediaFile);
      }

      // Get the current user's display name and photo URL
      const userDoc = await getDoc(doc(db, "users", currentUser.uid));
      const userData = userDoc.exists() ? userDoc.data() : {};
      const displayName =
        userData.displayName ||
        (userData.email ? userData.email.split("@")[0] : null) ||
        "Unknown User";

      await addDoc(collection(db, "communities", id, "posts"), {
        content: newPost,
        mediaURL: mediaURL,
        createdAt: serverTimestamp(),
        uid: currentUser.uid,
        authorDisplayName: displayName,
        authorPhotoURL: userData.photoURL || null,
        likes: [],
        comments: [],
      });
      setNewPost("");
      setMediaFile(null);
      setMediaPreview(null);
      fetchCommunity(); // Refresh posts
    } catch (error) {
      console.error("Error creating post:", error);
      setError("Failed to create post");
    }
  }

  if (loading) {
    return (
      <div className="flex justify-center items-center min-h-[60vh]">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600"></div>
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

  return (
    <div className="max-w-4xl mx-auto px-4 py-8">
      {community && (
        <div className="bg-white rounded-lg shadow-md mb-6 p-6">
          <div className="relative h-48 bg-gray-200 rounded-t-lg overflow-hidden group">
            {community.photoURL &&
            community.photoURL !== "https://via.placeholder.com/150" ? (
              <img
                src={community.photoURL}
                alt={community.name}
                className="w-full h-full object-cover"
                onError={(e) => {
                  e.target.style.display = "none";
                  e.target.nextElementSibling.style.display = "flex";
                }}
              />
            ) : null}
            <div
              className={`w-full h-full flex items-center justify-center bg-gradient-to-r from-primary-500 to-primary-600 ${
                community.photoURL &&
                community.photoURL !== "https://via.placeholder.com/150"
                  ? "hidden"
                  : "flex"
              }`}
            >
              <div className="text-4xl font-bold text-white">
                {getInitials(community.name)}
              </div>
            </div>

            {isCreator && (
              <div className="absolute inset-0 bg-black bg-opacity-50 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity duration-200">
                <label className="cursor-pointer p-2 rounded-full bg-white hover:bg-gray-100 transition-colors">
                  <input
                    type="file"
                    accept="image/*"
                    onChange={handleCoverImageChange}
                    className="hidden"
                  />
                  <FaCamera className="h-6 w-6 text-gray-700" />
                </label>
              </div>
            )}
          </div>

          {coverImagePreview && (
            <div className="mt-4 p-4 border border-gray-200 rounded-lg">
              <h4 className="text-sm font-medium text-gray-700 mb-2">
                Preview
              </h4>
              <div className="relative h-32 rounded-lg overflow-hidden">
                <img
                  src={coverImagePreview}
                  alt="Cover preview"
                  className="w-full h-full object-cover"
                />
              </div>
              <div className="mt-2 flex space-x-2">
                <Button
                  onClick={handleCoverImageUpload}
                  disabled={isUploadingCover}
                  className="flex-1"
                >
                  {isUploadingCover ? "Uploading..." : "Save Cover Image"}
                </Button>
                <Button
                  onClick={() => {
                    setCoverImageFile(null);
                    setCoverImagePreview(null);
                  }}
                  variant="outline"
                  className="flex-1"
                >
                  Cancel
                </Button>
              </div>
            </div>
          )}

          <div className="p-4">
            <h2 className="text-3xl font-bold text-gray-900 mb-2">
              {community.name}
            </h2>
            <p className="text-gray-600 mb-4">{community.description}</p>
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center text-gray-500 text-sm">
                <FaUsers className="mr-2" />
                <span>{community.members?.length || 0} members</span>
              </div>
              {isCreator && (
                <Button
                  onClick={() => setShowDeleteConfirm(true)}
                  variant="danger"
                  className="bg-red-600 hover:bg-red-700 text-white"
                >
                  Delete Community
                </Button>
              )}
            </div>

            {currentUser && (
              <div className="flex space-x-2">
                {!isMember && !isCreator && (
                  <Button onClick={handleJoinCommunity}>Join Community</Button>
                )}
                {isMember && !isCreator && (
                  <Button onClick={handleLeaveCommunity} variant="outline">
                    Leave Community
                  </Button>
                )}
              </div>
            )}

            {showDeleteConfirm && (
              <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
                <Card className="p-6">
                  <h3 className="text-lg font-semibold mb-4">
                    Confirm Deletion
                  </h3>
                  <p>
                    Are you sure you want to delete the community "
                    {community.name}"? This action cannot be undone.
                  </p>
                  <div className="flex justify-end space-x-4 mt-6">
                    <Button
                      variant="outline"
                      onClick={() => setShowDeleteConfirm(false)}
                      className="border border-gray-300 text-gray-700 hover:bg-gray-50"
                    >
                      Cancel
                    </Button>
                    <Button
                      variant="danger"
                      onClick={handleDeleteCommunity}
                      className="bg-red-600 hover:bg-red-700 text-white"
                    >
                      Delete
                    </Button>
                  </div>
                </Card>
              </div>
            )}

            <h3 className="text-xl font-semibold text-gray-900 mt-8 mb-4">
              Members
            </h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
              {community.members && community.members.length > 0 ? (
                community.members.map((memberId) => {
                  const member = memberDetails[memberId];
                  return (
                    <Card
                      key={memberId}
                      className="p-4 flex items-center space-x-4"
                    >
                      <CommunityImage
                        photoURL={member?.photoURL}
                        name={member?.displayName}
                        sizeClasses="h-12 w-12"
                      />
                      <div>
                        <p className="font-semibold">
                          {member?.displayName || "Unknown User"}
                        </p>
                        {isCreator && memberId !== currentUser.uid && (
                          <button
                            onClick={() => handleRemoveMember(memberId)}
                            className="text-red-500 text-sm hover:underline"
                          >
                            Remove
                          </button>
                        )}
                      </div>
                    </Card>
                  );
                })
              ) : (
                <p className="text-gray-500">No members yet.</p>
              )}
            </div>

            {/* Post Creation Form */}
            {canPost && (
              <div className="mt-8">
                <h3 className="text-xl font-semibold text-gray-900 mb-4">
                  Create a Post
                </h3>
                <form onSubmit={handleCreatePost} className="space-y-4">
                  <textarea
                    className="w-full p-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
                    rows="4"
                    placeholder="What's on your mind?"
                    value={newPost}
                    onChange={(e) => setNewPost(e.target.value)}
                  ></textarea>
                  <input
                    type="file"
                    onChange={handleMediaChange}
                    accept="image/*,video/*"
                  />
                  {mediaPreview && (
                    <div className="mt-2">
                      {mediaFile.type.startsWith("image/") ? (
                        <img
                          src={mediaPreview}
                          alt="Media Preview"
                          className="max-w-xs h-auto rounded-lg"
                        />
                      ) : (
                        <video
                          src={mediaPreview}
                          controls
                          className="max-w-xs h-auto rounded-lg"
                        />
                      )}
                    </div>
                  )}
                  <Button
                    type="submit"
                    disabled={!newPost.trim() && !mediaFile}
                  >
                    Post
                  </Button>
                </form>
              </div>
            )}
            {!canPost && (
              <div className="mt-8 text-center text-gray-600">
                <p>
                  You must be a member of this community to create posts.
                </p>
                <Button onClick={handleJoinCommunity} className="mt-4">
                  Join Community
                </Button>
              </div>
            )}

            {/* Posts Section */}
            <div className="mt-8">
              <h3 className="text-xl font-semibold text-gray-900 mb-4">
                Posts
              </h3>
              {posts.length > 0 ? (
                posts.map((post) => (
                  <Card key={post.id} className="mb-4 p-4">
                    <div className="flex items-center space-x-4 mb-4">
                      <CommunityImage
                        photoURL={post.authorPhotoURL}
                        name={post.authorDisplayName}
                        sizeClasses="h-10 w-10"
                      />
                      <div className="flex-1">
                        <p className="font-semibold text-gray-900">
                          {post.authorDisplayName}
                        </p>
                        <p className="text-sm text-gray-500">
                          {formatDate(post.createdAt)}
                        </p>
                      </div>
                      {post.uid === currentUser?.uid && (
                        <button
                          onClick={() => handleDeletePost(post.id)}
                          className="text-gray-400 hover:text-red-500 transition-colors"
                          title="Delete post"
                        >
                          <svg
                            className="h-5 w-5"
                            fill="none"
                            stroke="currentColor"
                            viewBox="0 0 24 24"
                          >
                            <path
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              strokeWidth={2}
                              d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
                            />
                          </svg>
                        </button>
                      )}
                    </div>
                    <p className="text-gray-700 mb-4">{post.content}</p>
                    {post.mediaURL && typeof post.mediaURL === "string" && (
                      <div className="my-4 max-w-full overflow-hidden rounded-lg">
                        {post.mediaURL.endsWith(".jpg") ||
                        post.mediaURL.endsWith(".jpeg") ||
                        post.mediaURL.endsWith(".png") ||
                        post.mediaURL.endsWith(".gif") ? (
                          <img
                            src={post.mediaURL}
                            alt="Post Media"
                            className="w-full h-auto object-cover"
                          />
                        ) : (
                          <video
                            src={post.mediaURL}
                            controls
                            className="w-full h-auto object-cover"
                          />
                        )}
                      </div>
                    )}
                    <PostInteractions
                      post={post}
                      communityId={community.id}
                      currentUserId={currentUser?.uid || null}
                    />
                  </Card>
                ))
              ) : (
                <p className="text-gray-500">
                  No posts yet. Be the first to post!
                </p>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
