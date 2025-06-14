import React, { useState, useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "../contexts/AuthContext";
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
} from "firebase/firestore";
import {
  FaBell,
  FaUser,
  FaSignOutAlt,
  FaPlus,
  FaHome,
  FaSearch,
} from "react-icons/fa";
import { HiOutlineUserGroup } from "react-icons/hi";
import { MdNotifications } from "react-icons/md";
import CommunityImage from "./CommunityImage";

export default function Navbar() {
  const { currentUser, logout } = useAuth();
  const navigate = useNavigate();
  const [showNotifications, setShowNotifications] = useState(false);
  const [notifications, setNotifications] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [searchQuery, setSearchQuery] = useState("");
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
    const notificationsRef = collection(
      db,
      "users",
      currentUser.uid,
      "notifications"
    );
    const q = query(notificationsRef, orderBy("createdAt", "desc"));

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const notificationsList = snapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
      }));
      setNotifications(notificationsList);
      setUnreadCount(notificationsList.filter((n) => !n.read).length);
    });

    return () => unsubscribe();
  }, [currentUser]);

  const handleLogout = async () => {
    try {
      await logout();
      navigate("/login");
    } catch (error) {
      console.error("Failed to log out:", error);
    }
  };

  const markNotificationAsRead = async (notificationId) => {
    try {
      const notificationRef = doc(
        db,
        "users",
        currentUser.uid,
        "notifications",
        notificationId
      );
      await updateDoc(notificationRef, {
        read: true,
      });
    } catch (error) {
      console.error("Error marking notification as read:", error);
    }
  };

  const markAllAsRead = async () => {
    try {
      const unreadNotifications = notifications.filter((n) => !n.read);
      const batch = db.batch();

      unreadNotifications.forEach((notification) => {
        const notificationRef = doc(
          db,
          "users",
          currentUser.uid,
          "notifications",
          notification.id
        );
        batch.update(notificationRef, { read: true });
      });

      await batch.commit();
    } catch (error) {
      console.error("Error marking all notifications as read:", error);
    }
  };

  const getNotificationContent = (notification) => {
    switch (notification.type) {
      case "comment":
        return `${notification.createdByDisplayName} commented on your post: "${notification.content}"`;
      case "reply":
        return `${notification.createdByDisplayName} replied to your comment: "${notification.content}"`;
      case "reaction":
        return `${notification.createdByDisplayName} reacted with ${notification.reactionType} to your post`;
      case "join":
        return `${notification.createdByDisplayName} joined your community "${notification.communityName}"`;
      case "leave":
        return `${notification.createdByDisplayName} left your community "${notification.communityName}"`;
      case "new_post":
        return `${notification.createdByDisplayName} created a new post in your community "${notification.communityName}"`;
      default:
        return "New notification";
    }
  };

  return (
    <nav className="bg-gradient-to-r from-indigo-600 to-purple-600 shadow-lg">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between h-16">
          <div className="flex items-center space-x-8">
            <Link to="/" className="flex items-center space-x-2 group">
              <HiOutlineUserGroup className="h-8 w-8 text-white group-hover:text-indigo-200 transition-colors duration-200" />
              <span className="text-xl font-bold text-white group-hover:text-indigo-200 transition-colors duration-200">
                Niche Communities
              </span>
            </Link>

            {currentUser && (
              <div className="hidden md:flex items-center space-x-4">
                <Link
                  to="/"
                  className="flex items-center space-x-2 text-white hover:text-indigo-200 transition-colors duration-200"
                >
                  <FaHome className="h-5 w-5" />
                  <span>Home</span>
                </Link>
                <Link
                  to="/communities"
                  className="flex items-center space-x-2 text-white hover:text-indigo-200 transition-colors duration-200"
                >
                  <HiOutlineUserGroup className="h-5 w-5" />
                  <span>Communities</span>
                </Link>
              </div>
            )}
          </div>

          {currentUser ? (
            <div className="flex items-center space-x-6">
              {/* Search Bar */}
              <div className="hidden md:flex items-center bg-white/10 rounded-full px-4 py-2">
                <FaSearch className="h-4 w-4 text-white/70" />
                <input
                  type="text"
                  placeholder="Search communities..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="bg-transparent border-none focus:ring-0 text-white placeholder-white/70 ml-2 w-48"
                />
              </div>

              <Link
                to="/create-community"
                className="flex items-center space-x-2 text-white hover:text-indigo-200 transition-colors duration-200"
              >
                <FaPlus className="h-5 w-5" />
                <span className="hidden md:inline">Create Community</span>
              </Link>

              {/* Notifications */}
              <div className="relative">
                <button
                  onClick={() => setShowNotifications(!showNotifications)}
                  className="relative p-2 text-white hover:text-indigo-200 focus:outline-none transition-colors duration-200"
                >
                  <MdNotifications className="h-6 w-6" />
                  {unreadCount > 0 && (
                    <span className="absolute -top-1 -right-1 inline-flex items-center justify-center w-5 h-5 text-xs font-bold leading-none text-white transform translate-x-1/2 -translate-y-1/2 bg-red-500 rounded-full animate-pulse">
                      {unreadCount}
                    </span>
                  )}
                </button>

                {/* Notifications Dropdown */}
                {showNotifications && (
                  <div className="absolute right-0 mt-2 w-96 bg-white rounded-xl shadow-xl overflow-hidden z-50 border border-gray-100">
                    <div className="p-4 border-b bg-gradient-to-r from-indigo-50 to-purple-50">
                      <div className="flex justify-between items-center">
                        <h3 className="text-lg font-semibold text-gray-900">
                          Notifications
                        </h3>
                        {unreadCount > 0 && (
                          <button
                            onClick={markAllAsRead}
                            className="text-sm text-indigo-600 hover:text-indigo-800 font-medium"
                          >
                            Mark all as read
                          </button>
                        )}
                      </div>
                    </div>
                    <div className="max-h-96 overflow-y-auto">
                      {notifications.length > 0 ? (
                        notifications.map((notification) => (
                          <div
                            key={notification.id}
                            className={`p-4 border-b hover:bg-gray-50 cursor-pointer transition-colors duration-200 ${
                              !notification.read ? "bg-indigo-50" : ""
                            }`}
                            onClick={() => {
                              markNotificationAsRead(notification.id);
                              if (
                                notification.type === "comment" ||
                                notification.type === "reply"
                              ) {
                                navigate(
                                  `/community/${notification.communityId}#post-${notification.postId}`
                                );
                              } else if (
                                notification.type === "join" ||
                                notification.type === "leave" ||
                                notification.type === "new_post"
                              ) {
                                navigate(
                                  `/community/${notification.communityId}`
                                );
                              }
                            }}
                          >
                            <p className="text-sm text-gray-900">
                              {getNotificationContent(notification)}
                            </p>
                            <p className="text-xs text-gray-500 mt-1">
                              {new Date(
                                notification.createdAt.seconds * 1000
                              ).toLocaleString()}
                            </p>
                          </div>
                        ))
                      ) : (
                        <div className="p-8 text-center text-gray-500">
                          <FaBell className="h-8 w-8 mx-auto mb-2 text-gray-400" />
                          <p>No notifications</p>
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </div>

              {/* User Profile Link */}
              <Link
                to="/profile"
                className="flex items-center space-x-2 text-white hover:text-indigo-200 transition-colors duration-200"
              >
                <CommunityImage
                  photoURL={userData?.photoURL}
                  name={userData?.displayName || currentUser.displayName}
                  sizeClasses="h-8 w-8"
                />
                <span className="hidden md:inline">Profile</span>
              </Link>

              <button
                onClick={handleLogout}
                className="flex items-center space-x-2 text-white hover:text-indigo-200 transition-colors duration-200"
              >
                <FaSignOutAlt className="h-5 w-5" />
                <span className="hidden md:inline">Logout</span>
              </button>
            </div>
          ) : (
            <div className="flex items-center space-x-4">
              <Link
                to="/login"
                className="px-4 py-2 text-white hover:text-indigo-200 transition-colors duration-200"
              >
                Login
              </Link>
              <Link
                to="/signup"
                className="px-4 py-2 bg-white text-indigo-600 rounded-full hover:bg-indigo-50 transition-colors duration-200 font-medium"
              >
                Sign Up
              </Link>
            </div>
          )}
        </div>
      </div>
    </nav>
  );
}
