import React, { useState, useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
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
import { useAuth } from "../contexts/AuthContext";
import { FaSearch, FaUsers, FaPlus, FaMinus, FaFilter } from "react-icons/fa";
import Card from "../components/ui/Card";
import CommunityImage from "../components/CommunityImage";
import Button from "../components/ui/Button";
import { getInitials } from "../components/CommunityImage";

const Communities = () => {
  const navigate = useNavigate();
  const { currentUser } = useAuth();
  const [communities, setCommunities] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("");
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
  const [sortBy, setSortBy] = useState("newest");
  const [showFilters, setShowFilters] = useState(false);

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

  const filteredCommunities = communities
    .filter((community) => {
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
    })
    .sort((a, b) => {
      // Sort communities based on selected option
      switch (sortBy) {
        case "newest":
          return new Date(b.createdAt) - new Date(a.createdAt);
        case "oldest":
          return new Date(a.createdAt) - new Date(b.createdAt);
        case "members":
          return (b.members?.length || 0) - (a.members?.length || 0);
        case "name":
          return a.name.localeCompare(b.name);
        default:
          return 0;
      }
    });

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="py-8">
          <div className="flex flex-col md:flex-row md:items-center md:justify-between mb-8">
            <div>
              <h1 className="text-3xl font-bold text-gray-900 mb-2">
                All Communities
              </h1>
              <p className="text-gray-600">
                Browse and join communities that interest you
              </p>
            </div>
            <Button
              onClick={() => navigate("/create-community")}
              className="mt-4 md:mt-0"
            >
              Create Community
            </Button>
          </div>

          <div className="flex flex-col md:flex-row gap-4 mb-8">
            <div className="relative flex-1">
              <div className="relative">
                <input
                  type="text"
                  placeholder="Search communities..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
                />
                <FaSearch className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
              </div>
            </div>
            <div className="flex gap-4">
              <div className="relative w-full md:w-64">
                <select
                  value={selectedCategory}
                  onChange={(e) => setSelectedCategory(e.target.value)}
                  className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 appearance-none bg-white"
                >
                  <option value="">All Categories</option>
                  {categories.map((category) => (
                    <option key={category} value={category}>
                      {category}
                    </option>
                  ))}
                </select>
                <FaFilter className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
              </div>
              <div className="relative w-full md:w-48">
                <select
                  value={sortBy}
                  onChange={(e) => setSortBy(e.target.value)}
                  className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 appearance-none bg-white"
                >
                  <option value="newest">Newest First</option>
                  <option value="oldest">Oldest First</option>
                  <option value="members">Most Members</option>
                  <option value="name">Name (A-Z)</option>
                </select>
                <FaFilter className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
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
                <Link to={`/community/${community.id}`} key={community.id}>
                  <Card className="h-full hover:shadow-lg transition-shadow duration-200">
                    <div className="p-6">
                      <div className="flex items-center space-x-4">
                        <div className="flex-shrink-0">
                          <CommunityImage
                            photoURL={community.photoURL}
                            name={community.name}
                            sizeClasses="h-16 w-16"
                          />
                        </div>
                        <div>
                          <h3 className="text-lg font-semibold text-gray-900">
                            {community.name}
                          </h3>
                          <p className="text-sm text-gray-500">
                            {community.category}
                          </p>
                        </div>
                      </div>
                      <p className="mt-4 text-gray-600 line-clamp-2">
                        {community.description}
                      </p>
                      <div className="flex items-center justify-between pt-4 border-t border-gray-100">
                        <div className="flex items-center space-x-2 text-gray-500">
                          <FaUsers className="h-5 w-5" />
                          <span className="text-sm font-medium">
                            {community.members?.length || 0} members
                          </span>
                        </div>
                        {currentUser &&
                          community.createdBy !== currentUser.uid &&
                          (userMemberships.includes(community.id) ? (
                            <button
                              onClick={(e) => {
                                e.preventDefault();
                                handleLeaveCommunity(community.id);
                              }}
                              className="inline-flex items-center px-4 py-2 rounded-lg bg-red-50 text-red-600 hover:bg-red-100 transition-colors duration-200"
                            >
                              <FaMinus className="h-4 w-4 mr-2" />
                              <span className="text-sm font-medium">Leave</span>
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
                              <span className="text-sm font-medium">Join</span>
                            </button>
                          ))}
                      </div>
                    </div>
                  </Card>
                </Link>
              ))}
            </div>
          ) : (
            <div className="text-center py-12">
              <p className="text-gray-500 text-lg">
                No communities found. Be the first to create one!
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default Communities;
