import React, { useState, useRef, useEffect } from "react";
import { Link, useNavigate, useLocation } from "react-router-dom";
import { useAuth } from "../contexts/AuthContext";
import { useSearch } from "../contexts/SearchContext";
import { useCommunitiesSearch } from '../contexts/CommunitiesSearchContext';
import { db } from "../config/firebase";
import {
  collection,
  query,
  where,
  onSnapshot,
  orderBy,
  updateDoc,
  doc,
  getDoc,
  writeBatch,
} from "firebase/firestore";
import {
  FaBell,
  FaUser,
  FaSignOutAlt,
  FaPlus,
  FaHome,
  FaSearch,
  FaSignInAlt,
  FaUserPlus,
  FaChevronDown,
  FaCog,
} from "react-icons/fa";
import { HiOutlineUserGroup } from "react-icons/hi";
import { MdNotifications } from "react-icons/md";
import CommunityImage from "./CommunityImage";
import { getInitials } from "../utils/stringUtils";

function Navbar() {
  const navigate = useNavigate();
  const location = useLocation();
  const { currentUser, logout } = useAuth();
  const { search, setSearch } = useSearch();
  const { navbarSearch, setNavbarSearch } = useCommunitiesSearch();
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [isProfileOpen, setIsProfileOpen] = useState(false);
  const [isNotificationsOpen, setIsNotificationsOpen] = useState(false);
  const [notifications, setNotifications] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const menuRef = useRef(null);
  const profileRef = useRef(null);
  const notificationsRef = useRef(null);
  const [userData, setUserData] = useState(null);

  useEffect(() => {
    if (!currentUser) return;

    // Fetch user data from Firestore
    const fetchUserData = async () => {
      try {
        const userDoc = await getDoc(doc(db, "users", currentUser.uid));
        if (userDoc.exists()) {
          setUserData(userDoc.data());
        }
      } catch (error) {
        console.error("Error fetching user data:", error);
      }
    };

    fetchUserData();

    // Subscribe to notifications
    const q = query(
      collection(db, "notifications"),
      where("toUser", "==", currentUser.uid),
      orderBy("createdAt", "desc")
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const notificationsList = snapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
        createdAt: doc.data().createdAt?.toDate?.() || new Date(),
      }));
      setNotifications(notificationsList);
      setUnreadCount(notificationsList.filter((n) => !n.read).length);
    });

    return () => unsubscribe();
  }, [currentUser]);

  // Close dropdowns when user changes
  useEffect(() => {
    setIsProfileOpen(false);
    setIsNotificationsOpen(false);
  }, [currentUser]);

  const handleLogout = async () => {
    try {
      await logout();
      navigate("/");
    } catch (error) {
      console.error("Failed to log out:", error);
    }
  };

  const handleSearch = (e) => {
    const value = e.target.value;
    setSearch(value);
    setNavbarSearch(value);
  };

  const handleSearchSubmit = (e) => {
    e.preventDefault();
    if (search.trim()) {
      navigate(`/communities?search=${encodeURIComponent(search.trim())}`);
    }
  };

  const handleNotificationClick = async (notification) => {
    if (!notification.read) {
      try {
        await updateDoc(doc(db, "notifications", notification.id), {
          read: true,
        });
      } catch (error) {
        console.error("Error marking notification as read:", error);
      }
    }

    // Navigate based on notification type
    switch (notification.type) {
      case "reaction":
      case "comment":
      case "reply":
        window.location.href = `/community/${notification.communityId}#post-${notification.postId}`;
        break;
      default:
        break;
    }
  };

  const getNotificationContent = (notification) => {
    switch (notification.type) {
      case "reaction":
        return `${notification.fromUserName} reacted to your post`;
      case "comment":
        return `${notification.fromUserName} commented on your post: "${notification.commentContent}"`;
      case "reply":
        return `${notification.fromUserName} replied to your comment: "${notification.commentContent}"`;
      default:
        return "New notification";
    }
  };

  const markAllAsRead = async () => {
    try {
      const batch = writeBatch(db);
      notifications.forEach(notification => {
        if (!notification.read) {
          const notificationRef = doc(db, "notifications", notification.id);
          batch.update(notificationRef, { read: true });
        }
      });
      await batch.commit();
    } catch (error) {
      console.error("Error marking all notifications as read:", error);
    }
  };

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (menuRef.current && !menuRef.current.contains(event.target)) {
        setIsMenuOpen(false);
      }
      if (profileRef.current && !profileRef.current.contains(event.target)) {
        setIsProfileOpen(false);
      }
      if (notificationsRef.current && !notificationsRef.current.contains(event.target)) {
        setIsNotificationsOpen(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  return (
    <nav className="bg-white/80 backdrop-blur-md border-b border-gray-200 fixed w-full z-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between h-16">
          <div className="flex items-center space-x-8">
            <Link to="/" className="flex-shrink-0 flex items-center">
              <span className="text-2xl font-bold bg-gradient-to-r from-primary-600 via-purple-600 to-primary-500 bg-clip-text text-transparent">
                Niche
              </span>
            </Link>
            {currentUser && (
              <div className="hidden md:flex items-center space-x-4">
                <Link
                  to="/communities"
                  className="text-gray-600 hover:text-primary-600 px-3 py-2 rounded-md text-sm font-medium flex items-center"
                >
                  <HiOutlineUserGroup className="mr-2 h-5 w-5" />
                  Communities
                </Link>
                <Link
                  to="/create-community"
                  className="text-gray-600 hover:text-primary-600 px-3 py-2 rounded-md text-sm font-medium flex items-center"
                >
                  <FaPlus className="mr-2 h-5 w-5" />
                  Create Community
                </Link>
              </div>
            )}
          </div>

          <div className="flex-1 flex items-center justify-center px-2 lg:ml-6 lg:justify-end">
            <div className="max-w-lg w-full lg:max-w-xs">
              <form onSubmit={handleSearchSubmit} className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <FaSearch className="h-5 w-5 text-gray-400" />
                </div>
                <input
                  type="text"
                  value={search}
                  onChange={handleSearch}
                  className="block w-full pl-10 pr-3 py-2 border border-gray-300 rounded-md leading-5 bg-white/50 backdrop-blur-sm placeholder-gray-500 focus:outline-none focus:placeholder-gray-400 focus:ring-1 focus:ring-primary-500 focus:border-primary-500 sm:text-sm"
                  placeholder="Search communities..."
                />
              </form>
            </div>
          </div>

          <div className="flex items-center space-x-4">
            {currentUser ? (
              <>
                <div className="relative" ref={notificationsRef}>
                  <button
                    onClick={() => setIsNotificationsOpen(!isNotificationsOpen)}
                    className="relative p-2 text-gray-500 hover:text-primary-600 focus:outline-none"
                  >
                    <FaBell className="h-6 w-6" />
                    {unreadCount > 0 && (
                      <span className="absolute top-0 right-0 inline-flex items-center justify-center px-2 py-1 text-xs font-bold leading-none text-white transform translate-x-1/2 -translate-y-1/2 bg-red-600 rounded-full">
                        {unreadCount}
                      </span>
                    )}
                  </button>

                  {isNotificationsOpen && (
                    <div className="absolute right-0 mt-2 w-80 bg-white rounded-lg shadow-lg overflow-hidden z-50">
                      <div className="p-4 border-b">
                        <h3 className="text-lg font-medium text-gray-900">Notifications</h3>
                      </div>
                      <div className="max-h-96 overflow-y-auto">
                        {notifications.length === 0 ? (
                          <div className="p-4 text-center text-gray-500">
                            No notifications yet
                          </div>
                        ) : (
                          notifications.map((notification) => (
                            <button
                              key={notification.id}
                              onClick={() => handleNotificationClick(notification)}
                              className={`w-full p-4 text-left hover:bg-gray-50 transition-colors ${
                                !notification.read ? "bg-blue-50" : ""
                              }`}
                            >
                              <div className="flex items-start space-x-3">
                                <div className="flex-1">
                                  <p className="text-sm text-gray-900">
                                    {getNotificationContent(notification)}
                                  </p>
                                  <p className="mt-1 text-xs text-gray-500">
                                    {notification.createdAt.toLocaleDateString()}
                                  </p>
                                </div>
                                {!notification.read && (
                                  <span className="inline-block w-2 h-2 bg-blue-600 rounded-full"></span>
                                )}
                              </div>
                            </button>
                          ))
                        )}
                      </div>
                    </div>
                  )}
                </div>

                <div className="relative" ref={profileRef}>
                  <button
                    onClick={() => setIsProfileOpen(!isProfileOpen)}
                    className="flex items-center space-x-2 p-2 rounded-full hover:bg-gray-100 focus:outline-none focus:ring-2 focus:ring-primary-500"
                  >
                    {currentUser.photoURL ? (
                      <img
                        src={currentUser.photoURL}
                        alt={currentUser.displayName || currentUser.email}
                        className="w-8 h-8 rounded-full object-cover border-2 border-white shadow-sm"
                      />
                    ) : (
                      <div className="w-8 h-8 rounded-full bg-gradient-to-r from-primary-600 to-purple-600 flex items-center justify-center">
                        <span className="text-sm font-medium text-white">
                          {getInitials(currentUser.displayName || currentUser.email)}
                        </span>
                      </div>
                    )}
                  </button>

                  {isProfileOpen && (
                    <div className="absolute right-0 mt-2 w-48 bg-white rounded-md shadow-lg py-1 z-50">
                      <div className="px-4 py-2 border-b border-gray-200">
                        <p className="text-sm font-medium text-gray-900 truncate">
                          {currentUser.displayName || currentUser.email}
                        </p>
                        <p className="text-xs text-gray-500 truncate">
                          {currentUser.email}
                        </p>
                      </div>
                      <Link
                        to="/profile"
                        className="flex items-center px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
                      >
                        <FaUser className="mr-3 h-5 w-5 text-gray-400" />
                        Profile
                      </Link>
                      <Link
                        to="/settings"
                        className="flex items-center px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
                      >
                        <FaCog className="mr-3 h-5 w-5 text-gray-400" />
                        Settings
                      </Link>
                      <button
                        onClick={handleLogout}
                        className="flex items-center w-full px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
                      >
                        <FaSignOutAlt className="mr-3 h-5 w-5 text-gray-400" />
                        Sign out
                      </button>
                    </div>
                  )}
                </div>
              </>
            ) : (
              <div className="flex items-center space-x-4">
                <Link
                  to="/login"
                  className="text-gray-600 hover:text-primary-600 px-3 py-2 rounded-md text-sm font-medium flex items-center"
                >
                  <FaSignInAlt className="mr-2 h-5 w-5" />
                  Sign in
                </Link>
                <Link
                  to="/signup"
                  className="bg-gradient-to-r from-primary-600 to-purple-600 text-white hover:from-primary-700 hover:to-purple-700 px-4 py-2 rounded-md text-sm font-medium flex items-center"
                >
                  <FaUserPlus className="mr-2 h-5 w-5" />
                  Sign up
                </Link>
              </div>
            )}
          </div>
        </div>
      </div>
    </nav>
  );
}

export default Navbar;
