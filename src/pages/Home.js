import React, { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import {
  collection,
  getDocs,
  query,
  where,
  orderBy,
  updateDoc,
  doc,
  arrayUnion,
  arrayRemove,
  getDoc,
  addDoc,
} from "firebase/firestore";
import { db } from "../config/firebase";
import { FaSearch, FaUsers, FaPlus, FaMinus } from "react-icons/fa";
import Card from "../components/ui/Card";
import CommunityImage from "../components/CommunityImage";
import { useAuth } from "../contexts/AuthContext";
import Button from "../components/ui/Button";
import { getInitials } from "../components/CommunityImage";

export default function Home() {
  const { currentUser } = useAuth();
  const [communities, setCommunities] = useState([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("");
  const [loading, setLoading] = useState(true);
  const [userMemberships, setUserMemberships] = useState([]);
  const [categories, setCategories] = useState([
    "Technology",
    "Gaming",
    "Sports",
    "Music",
    "Art",
    "Science",
    "Education",
    "Other",
  ]);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [newCommunity, setNewCommunity] = useState({
    name: "",
    description: "",
    category: "",
    photoURL: "",
  });

  const fetchCommunities = async () => {
    try {
      setLoading(true);
      const communitiesQuery = query(collection(db, "communities"));
      const communitiesSnapshot = await getDocs(communitiesQuery);
      const communitiesList = communitiesSnapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
      }));
      setCommunities(communitiesList);

      // If user is logged in, fetch their memberships
      if (currentUser) {
        const userDoc = await getDoc(doc(db, "users", currentUser.uid));
        if (userDoc.exists()) {
          const userData = userDoc.data();
          setUserMemberships(userData.communities || []);
        }
      }
    } catch (error) {
      console.error("Error fetching communities:", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCommunities();
  }, [currentUser]);

  const handleJoinCommunity = async (communityId) => {
    if (!currentUser) return;

    try {
      // Update community document
      const communityRef = doc(db, "communities", communityId);
      await updateDoc(communityRef, {
        members: arrayUnion(currentUser.uid),
      });

      // Update user document
      const userRef = doc(db, "users", currentUser.uid);
      await updateDoc(userRef, {
        communities: arrayUnion(communityId),
      });

      // Update local state
      setUserMemberships((prev) => [...prev, communityId]);
      setCommunities((prev) =>
        prev.map((community) =>
          community.id === communityId
            ? {
                ...community,
                members: [...(community.members || []), currentUser.uid],
              }
            : community
        )
      );

      // Create notification for community creator
      const communityDoc = await getDoc(communityRef);
      if (communityDoc.exists()) {
        const communityData = communityDoc.data();
        const notificationRef = collection(
          db,
          "users",
          communityData.createdBy,
          "notifications"
        );
        await addDoc(notificationRef, {
          type: "join",
          communityId: communityId,
          communityName: communityData.name,
          createdBy: currentUser.uid,
          createdByDisplayName: currentUser.displayName,
          createdAt: new Date(),
          read: false,
        });
      }
    } catch (error) {
      console.error("Error joining community:", error);
    }
  };

  const handleLeaveCommunity = async (communityId) => {
    if (!currentUser) return;

    try {
      // Update community document
      const communityRef = doc(db, "communities", communityId);
      await updateDoc(communityRef, {
        members: arrayRemove(currentUser.uid),
      });

      // Update user document
      const userRef = doc(db, "users", currentUser.uid);
      await updateDoc(userRef, {
        communities: arrayRemove(communityId),
      });

      // Update local state
      setUserMemberships((prev) => prev.filter((id) => id !== communityId));
      setCommunities((prev) =>
        prev.map((community) =>
          community.id === communityId
            ? {
                ...community,
                members: (community.members || []).filter(
                  (id) => id !== currentUser.uid
                ),
              }
            : community
        )
      );

      // Create notification for community creator
      const communityDoc = await getDoc(communityRef);
      if (communityDoc.exists()) {
        const communityData = communityDoc.data();
        const notificationRef = collection(
          db,
          "users",
          communityData.createdBy,
          "notifications"
        );
        await addDoc(notificationRef, {
          type: "leave",
          communityId: communityId,
          communityName: communityData.name,
          createdBy: currentUser.uid,
          createdByDisplayName: currentUser.displayName,
          createdAt: new Date(),
          read: false,
        });
      }
    } catch (error) {
      console.error("Error leaving community:", error);
    }
  };

  const handleCreateCommunity = async (e) => {
    e.preventDefault();
    if (!currentUser) return;

    try {
      // Create community document
      const communityRef = await addDoc(collection(db, "communities"), {
        name: newCommunity.name,
        description: newCommunity.description,
        category: newCommunity.category,
        photoURL: newCommunity.photoURL || "https://via.placeholder.com/150",
        createdAt: new Date(),
        createdBy: currentUser.uid,
        members: [currentUser.uid],
      });

      // Update user document
      const userRef = doc(db, "users", currentUser.uid);
      await updateDoc(userRef, {
        communities: arrayUnion(communityRef.id),
      });

      // Update local state
      setCommunities((prev) => [
        {
          id: communityRef.id,
          name: newCommunity.name,
          description: newCommunity.description,
          category: newCommunity.category,
          photoURL: newCommunity.photoURL || "https://via.placeholder.com/150",
          createdAt: new Date(),
          createdBy: currentUser.uid,
          members: [currentUser.uid],
        },
        ...prev,
      ]);

      // Reset form and close modal
      setShowCreateModal(false);
      setNewCommunity({
        name: "",
        description: "",
        category: "",
        photoURL: "",
      });
    } catch (error) {
      console.error("Error creating community:", error);
    }
  };

  const filteredCommunities = communities.filter((community) => {
    const matchesSearch =
      community.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      community.description.toLowerCase().includes(searchQuery.toLowerCase());

    let matchesCategory;
    if (selectedCategory === "") {
      matchesCategory = true; // Show all communities
    } else if (selectedCategory === "Other") {
      // Show communities whose category is not in the predefined categories
      matchesCategory = !categories.includes(community.category);
    } else {
      // Show communities matching the selected category
      matchesCategory =
        community.category.toLowerCase() === selectedCategory.toLowerCase();
    }

    return matchesSearch && matchesCategory;
  });

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="py-8">
          <div className="flex flex-col md:flex-row md:items-center md:justify-between mb-8">
            <div>
              <h1 className="text-3xl font-bold text-gray-900 mb-2">
                Welcome to Niche
              </h1>
              <p className="text-gray-600">
                Discover and join communities that match your interests
              </p>
            </div>
            <Button
              onClick={() => setShowCreateModal(true)}
              className="mt-4 md:mt-0"
            >
              Create Community
            </Button>
          </div>

          <div className="bg-white rounded-lg shadow-sm p-4 mb-8">
            <div className="flex flex-col sm:flex-row gap-4">
              <div className="relative flex-1">
                <input
                  type="text"
                  placeholder="Search communities..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
                />
                <FaSearch className="absolute left-3 top-3 text-gray-400" />
              </div>
              <div className="relative">
                <select
                  value={selectedCategory}
                  onChange={(e) => setSelectedCategory(e.target.value)}
                  className="w-full sm:w-48 px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 appearance-none bg-white"
                >
                  <option value="">All Categories</option>
                  {categories.map((category) => (
                    <option key={category} value={category}>
                      {category}
                    </option>
                  ))}
                </select>
                <div className="absolute right-3 top-3 pointer-events-none">
                  <svg
                    className="h-5 w-5 text-gray-400"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M19 9l-7 7-7-7"
                    />
                  </svg>
                </div>
              </div>
            </div>
          </div>

          {loading ? (
            <div className="flex justify-center items-center min-h-[200px]">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600"></div>
            </div>
          ) : filteredCommunities.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {filteredCommunities.map((community) => (
                <Link
                  to={`/community/${community.id}`}
                  key={community.id}
                  className="block"
                >
                  <Card className="h-full hover:shadow-lg transition-shadow duration-200">
                    <div className="p-6">
                      <div className="flex items-center space-x-4 mb-4">
                        <CommunityImage
                          photoURL={community.photoURL}
                          name={community.name}
                          sizeClasses="h-12 w-12"
                        />
                        <div>
                          <h3 className="text-lg font-semibold text-gray-900">
                            {community.name}
                          </h3>
                          <div className="flex items-center space-x-2">
                            <p className="text-sm text-gray-500">
                              {community.category}
                            </p>
                            {currentUser &&
                              community.createdBy === currentUser.uid && (
                                <span className="px-2 py-0.5 text-xs font-medium bg-primary-100 text-primary-800 rounded-full">
                                  Creator
                                </span>
                              )}
                          </div>
                        </div>
                      </div>
                      <p className="text-gray-600 mb-4 line-clamp-2">
                        {community.description}
                      </p>
                      <div className="flex items-center justify-between">
                        <div className="flex items-center text-gray-500 text-sm">
                          <FaUsers className="mr-2" />
                          <span>{community.members?.length || 0} members</span>
                        </div>
                        {currentUser &&
                          community.createdBy !== currentUser.uid && (
                            <div onClick={(e) => e.preventDefault()}>
                              {userMemberships.includes(community.id) ? (
                                <button
                                  onClick={(e) => {
                                    e.preventDefault();
                                    handleLeaveCommunity(community.id);
                                  }}
                                  className="inline-flex items-center px-4 py-2 rounded-lg bg-red-50 text-red-600 hover:bg-red-100 transition-colors duration-200"
                                >
                                  <FaMinus className="h-4 w-4 mr-2" />
                                  <span className="text-sm font-medium">
                                    Leave
                                  </span>
                                </button>
                              ) : (
                                <button
                                  onClick={(e) => {
                                    e.preventDefault();
                                    handleJoinCommunity(community.id);
                                  }}
                                  className="inline-flex items-center px-4 py-2 rounded-lg bg-indigo-50 text-indigo-600 hover:bg-indigo-100 transition-colors duration-200"
                                >
                                  <FaPlus className="h-4 w-4 mr-2" />
                                  <span className="text-sm font-medium">
                                    Join
                                  </span>
                                </button>
                              )}
                            </div>
                          )}
                      </div>
                    </div>
                  </Card>
                </Link>
              ))}
            </div>
          ) : (
            <div className="text-center py-12">
              <p className="text-gray-500">
                No communities found. Be the first to create one!
              </p>
            </div>
          )}
        </div>
      </div>

      {/* Create Community Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <Card className="w-full max-w-2xl p-6">
            <h2 className="text-2xl font-bold mb-6">Create New Community</h2>
            <form onSubmit={handleCreateCommunity} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Community Name
                </label>
                <input
                  type="text"
                  value={newCommunity.name}
                  onChange={(e) =>
                    setNewCommunity({ ...newCommunity, name: e.target.value })
                  }
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Description
                </label>
                <textarea
                  value={newCommunity.description}
                  onChange={(e) =>
                    setNewCommunity({
                      ...newCommunity,
                      description: e.target.value,
                    })
                  }
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                  rows="4"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Category
                </label>
                <select
                  value={newCommunity.category}
                  onChange={(e) =>
                    setNewCommunity({
                      ...newCommunity,
                      category: e.target.value,
                    })
                  }
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                  required
                >
                  <option value="">Select a category</option>
                  {categories.map((category) => (
                    <option key={category} value={category}>
                      {category}
                    </option>
                  ))}
                </select>
              </div>
              <div className="flex justify-end space-x-4">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setShowCreateModal(false)}
                >
                  Cancel
                </Button>
                <Button type="submit">Create Community</Button>
              </div>
            </form>
          </Card>
        </div>
      )}
    </div>
  );
}
