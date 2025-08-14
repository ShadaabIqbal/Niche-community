import React, { useState, useEffect, useMemo, useCallback } from "react";
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
import { FaSearch, FaUsers, FaPlus, FaMinus, FaChevronDown, FaRocket, FaLightbulb, FaUsersCog, FaArrowUp } from "react-icons/fa";
import Card from "../components/ui/Card";
import CommunityImage from "../components/CommunityImage";
import { useAuth } from "../contexts/AuthContext";
import Button from "../components/ui/Button";
import { getInitials } from "../utils/stringUtils";
import { useCommunitiesSearch } from '../contexts/CommunitiesSearchContext';
import { useSearch } from '../contexts/SearchContext';
import Typewriter from 'typewriter-effect';
import { TypeAnimation } from 'react-type-animation';
import Particles from "react-tsparticles";
import { loadFull } from "tsparticles";

const taglines = [
  "Where Ideas Take Flight ✨",
  "Connect. Create. Collaborate. 🚀",
  "Your Digital Community Awaits 🌟",
  "Discover Your Tribe 🎯",
  "Build Something Amazing 💫",
  "Share Your Passion 🎨",
  "Join the Conversation 🎭"
];

export default function Home() {
  const { currentUser } = useAuth();
  const { search, setSearch } = useSearch();
  const { navbarSearch } = useCommunitiesSearch();
  const [communities, setCommunities] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedCategory, setSelectedCategory] = useState("");
  const [showFilters, setShowFilters] = useState(false);
  const [userMemberships, setUserMemberships] = useState([]);
  const [categories] = useState([
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
  const [showScrollTop, setShowScrollTop] = useState(false);
  const [currentTagline, setCurrentTagline] = useState(0);

  const particlesInit = useCallback(async (engine) => {
    await loadFull(engine);
  }, []);

  useEffect(() => {
    const interval = setInterval(() => {
      setCurrentTagline((prev) => (prev + 1) % taglines.length);
    }, 3000);

    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    const handleScroll = () => {
      setShowScrollTop(window.scrollY > 400);
    };

    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  const scrollToTop = () => {
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const fetchCommunities = async () => {
    try {
      setLoading(true);
      const communitiesRef = collection(db, "communities");
      const q = query(communitiesRef, orderBy("createdAt", "desc"));
      const querySnapshot = await getDocs(q);
      const communitiesData = querySnapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
      }));
      setCommunities(communitiesData);

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
  }, []);

  const handleSearch = (e) => {
    setSearch(e.target.value);
  };

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
        const notificationRef = collection(db, "notifications");
        await addDoc(notificationRef, {
          type: "join",
          communityId: communityId,
          communityName: communityData.name,
          toUser: communityData.createdBy,
          fromUser: currentUser.uid,
          fromUserName: currentUser.displayName || currentUser.email,
          message: `${currentUser.displayName || currentUser.email} joined your community "${communityData.name}"`,
          createdAt: new Date(),
          read: false
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
        const notificationRef = collection(db, "notifications");
        await addDoc(notificationRef, {
          type: "leave",
          communityId: communityId,
          communityName: communityData.name,
          toUser: communityData.createdBy,
          fromUser: currentUser.uid,
          fromUserName: currentUser.displayName || currentUser.email,
          message: `${currentUser.displayName || currentUser.email} left your community "${communityData.name}"`,
          createdAt: new Date(),
          read: false
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

  // Filter communities based on search query and category
  const filteredCommunities = useMemo(() => {
    return communities
      .filter((community) => {
        // Search filter
        const searchValue = navbarSearch.trim() !== '' ? navbarSearch : search;
        const matchesSearch = !searchValue.trim() || 
          community.name.toLowerCase().includes(searchValue.toLowerCase().trim()) ||
          community.description.toLowerCase().includes(searchValue.toLowerCase().trim());

        // Category filter
        const matchesCategory = !selectedCategory || community.category === selectedCategory;

        return matchesSearch && matchesCategory;
      })
      .sort((a, b) => {
        // Sort by newest first
        return b.createdAt - a.createdAt;
      });
  }, [communities, search, navbarSearch, selectedCategory]);

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Hero Section */}
      <div className="relative min-h-[80vh] flex items-center justify-center overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-indigo-600 via-purple-600 to-pink-600 opacity-90">
          <div className="absolute inset-0 opacity-10">
            <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,_var(--tw-gradient-stops))] from-white/20 via-transparent to-transparent"></div>
          </div>
        </div>
        <div className="relative z-10 text-center px-4 sm:px-6 lg:px-8 py-20">
          <h1 className="text-4xl md:text-6xl font-bold text-white mb-6">
            <span className="inline-block animate-fade-in-out">
              {taglines[currentTagline]}
            </span>
          </h1>
          <div className="h-16 md:h-20 flex items-center justify-center">
            <Typewriter
              options={{
                strings: taglines,
                autoStart: true,
                loop: true,
                deleteSpeed: 30,
                delay: 30,
                cursor: '|',
                wrapperClassName: 'text-2xl md:text-4xl font-light text-white/90 font-display tracking-wide',
                cursorClassName: 'text-2xl md:text-4xl text-white/90 animate-pulse'
              }}
            />
          </div>
          <p className="mt-6 text-lg md:text-xl text-white/80 max-w-3xl mx-auto font-light leading-relaxed">
            Join vibrant communities, share your passions, and connect with like-minded individuals.
            Your journey to meaningful connections starts here.
          </p>
          <div className="mt-10 flex justify-center gap-4">
            <Link
              to="/communities"
              className="px-8 py-3 bg-gradient-to-r from-white to-white/90 text-indigo-600 rounded-full font-medium hover:from-white/90 hover:to-white/80 transition-all transform hover:scale-105 shadow-lg hover:shadow-xl cursor-pointer z-10 relative"
            >
              Explore Communities
            </Link>
            {currentUser ? (
              <Link
                to="/create-community"
                className="px-8 py-3 bg-gradient-to-r from-indigo-500 via-purple-500 to-pink-500 text-white rounded-full font-medium hover:from-indigo-600 hover:via-purple-600 hover:to-pink-600 transition-all transform hover:scale-105 shadow-lg hover:shadow-xl cursor-pointer z-10 relative"
              >
                Create Community
              </Link>
            ) : (
              <Link
                to="/signup"
                className="px-8 py-3 bg-gradient-to-r from-indigo-500 via-purple-500 to-pink-500 text-white rounded-full font-medium hover:from-indigo-600 hover:via-purple-600 hover:to-pink-600 transition-all transform hover:scale-105 shadow-lg hover:shadow-xl cursor-pointer z-10 relative"
              >
                Get Started
              </Link>
            )}
          </div>
        </div>
        <div className="absolute bottom-0 left-0 right-0 h-32 bg-gradient-to-t from-gray-50 to-transparent"></div>
      </div>

      {/* Features Section */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          <div className="p-6 rounded-2xl bg-white/80 backdrop-blur-md shadow-lg hover:shadow-xl transition-all transform hover:-translate-y-1 border border-gray-100">
            <div className="w-12 h-12 rounded-full bg-gradient-to-br from-indigo-500 to-purple-500 flex items-center justify-center mb-4 group">
              <FaRocket className="h-6 w-6 text-white transform group-hover:scale-110 transition-transform" />
            </div>
            <h3 className="text-xl font-semibold text-gray-900 mb-2">Discover</h3>
            <p className="text-gray-600">Find communities that match your interests and connect with like-minded people.</p>
          </div>
          <div className="p-6 rounded-2xl bg-white/80 backdrop-blur-md shadow-lg hover:shadow-xl transition-all transform hover:-translate-y-1 border border-gray-100">
            <div className="w-12 h-12 rounded-full bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center mb-4 group">
              <FaLightbulb className="h-6 w-6 text-white transform group-hover:scale-110 transition-transform" />
            </div>
            <h3 className="text-xl font-semibold text-gray-900 mb-2">Create</h3>
            <p className="text-gray-600">Start your own community and bring people together around shared passions.</p>
          </div>
          <div className="p-6 rounded-2xl bg-white/80 backdrop-blur-md shadow-lg hover:shadow-xl transition-all transform hover:-translate-y-1 border border-gray-100">
            <div className="w-12 h-12 rounded-full bg-gradient-to-br from-cyan-500 to-blue-500 flex items-center justify-center mb-4 group">
              <FaUsersCog className="h-6 w-6 text-white transform group-hover:scale-110 transition-transform" />
            </div>
            <h3 className="text-xl font-semibold text-gray-900 mb-2">Connect</h3>
            <p className="text-gray-600">Engage in meaningful discussions and build lasting relationships.</p>
          </div>
        </div>
      </div>

      {/* Communities Section */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16 bg-gray-50">
        <div className="bg-white/80 backdrop-blur-md rounded-2xl shadow-lg p-6 md:p-8">
          <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-8">
            <h2 className="text-2xl md:text-3xl font-bold text-gray-900 mb-4 md:mb-0">
              Featured Communities
            </h2>
            {currentUser ? (
              <Link
                to="/create-community"
                className="inline-flex items-center px-4 py-2 bg-gradient-to-r from-indigo-500 via-purple-500 to-pink-500 text-white rounded-lg hover:from-indigo-600 hover:via-purple-600 hover:to-pink-600 transition-all transform hover:scale-105"
              >
                <FaPlus className="h-4 w-4 mr-2" />
                Create Community
              </Link>
            ) : (
              <Link
                to="/signup"
                className="inline-flex items-center px-4 py-2 bg-gradient-to-r from-indigo-500 via-purple-500 to-pink-500 text-white rounded-lg hover:from-indigo-600 hover:via-purple-600 hover:to-pink-600 transition-all transform hover:scale-105"
              >
                <FaPlus className="h-4 w-4 mr-2" />
                Sign up to Create
              </Link>
            )}
          </div>

          {/* Search and Filter Section */}
          <div className="flex flex-col md:flex-row gap-4 mb-8">
            <div className="relative flex-1">
              <input
                type="text"
                placeholder="Search communities..."
                value={search}
                onChange={handleSearch}
                className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 bg-white/50 backdrop-blur-sm"
              />
              <FaSearch className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
            </div>
            <div className="flex gap-4">
              <div className="relative">
                <select
                  value={selectedCategory}
                  onChange={(e) => setSelectedCategory(e.target.value)}
                  className="w-full sm:w-48 px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 appearance-none bg-white/50 backdrop-blur-sm"
                >
                  <option value="">All Categories</option>
                  {categories.map((category) => (
                    <option key={category} value={category}>
                      {category}
                    </option>
                  ))}
                </select>
                <div className="absolute right-3 top-3 pointer-events-none">
                  <FaChevronDown className="h-4 w-4 text-gray-400" />
                </div>
              </div>
            </div>
          </div>

          {/* Communities Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredCommunities.map((community) => (
              <Link
                to={`/community/${community.id}`}
                key={community.id}
                className="block"
              >
                <Card className="hover:shadow-lg transition-all transform hover:-translate-y-1 h-full">
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
                          {currentUser && community.createdBy === currentUser.uid && (
                            <span className="px-2 py-0.5 text-xs font-medium bg-primary-100 text-primary-800 rounded-full">
                              Creator
                            </span>
                          )}
                          {community.members?.length > 100 && (
                            <span className="px-2 py-0.5 text-xs font-medium bg-green-100 text-green-800 rounded-full">
                              Trending
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
                      {currentUser ? (
                        community.createdBy !== currentUser.uid && (
                          <div onClick={(e) => e.stopPropagation()}>
                            {userMemberships.includes(community.id) ? (
                              <button
                                onClick={(e) => {
                                  e.preventDefault();
                                  e.stopPropagation();
                                  handleLeaveCommunity(community.id);
                                }}
                                className="inline-flex items-center px-4 py-2 rounded-lg bg-red-50 text-red-600 hover:bg-red-100 transition-all transform hover:scale-105"
                              >
                                <FaMinus className="h-4 w-4 mr-2" />
                                <span className="text-sm font-medium">Leave</span>
                              </button>
                            ) : (
                              <button
                                onClick={(e) => {
                                  e.preventDefault();
                                  e.stopPropagation();
                                  handleJoinCommunity(community.id);
                                }}
                                className="inline-flex items-center px-4 py-2 rounded-lg bg-primary-50 text-primary-600 hover:bg-primary-100 transition-all transform hover:scale-105"
                              >
                                <FaPlus className="h-4 w-4 mr-2" />
                                <span className="text-sm font-medium">Join</span>
                              </button>
                            )}
                          </div>
                        )
                      ) : (
                        <div onClick={(e) => e.stopPropagation()}>
                          <Link
                            to="/login"
                            className="inline-flex items-center px-4 py-2 rounded-lg bg-gray-50 text-gray-600 hover:bg-gray-100 transition-all transform hover:scale-105"
                          >
                            <FaPlus className="h-4 w-4 mr-2" />
                            <span className="text-sm font-medium">Sign in to Join</span>
                          </Link>
                        </div>
                      )}
                    </div>
                  </div>
                </Card>
              </Link>
            ))}
          </div>
        </div>
      </div>

      {/* Scroll to Top Button */}
      {showScrollTop && (
        <button
          onClick={scrollToTop}
          className="fixed bottom-8 right-8 p-3 bg-gradient-to-r from-indigo-500 via-purple-500 to-pink-500 text-white rounded-full shadow-lg hover:shadow-xl transition-all transform hover:scale-110 z-50"
          aria-label="Scroll to top"
        >
          <FaArrowUp className="h-6 w-6" />
        </button>
      )}
    </div>
  );
}
