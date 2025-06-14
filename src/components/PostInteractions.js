import React, { useState, useEffect } from "react";
import {
  doc,
  updateDoc,
  arrayUnion,
  arrayRemove,
  addDoc,
  collection,
  serverTimestamp,
  getDoc,
} from "firebase/firestore";
import { db } from "../config/firebase";
import { useAuth } from "../contexts/AuthContext";

const REACTIONS = {
  like: "❤️",
  love: "😍",
  laugh: "😂",
  wow: "😮",
  sad: "😢",
  angry: "😠",
};

export default function PostInteractions({
  post,
  communityId,
  onCommentAdded,
}) {
  const { currentUser } = useAuth();
  const [showReactions, setShowReactions] = useState(false);
  const [showComments, setShowComments] = useState(false);
  const [newComment, setNewComment] = useState("");
  const [replyingTo, setReplyingTo] = useState(null);
  const [localReactions, setLocalReactions] = useState(post.reactions || {});
  const [localComments, setLocalComments] = useState(post.comments || []);
  const [newReplies, setNewReplies] = useState({});

  // Update local state when post changes
  useEffect(() => {
    setLocalReactions(post.reactions || {});
    setLocalComments(post.comments || []);
  }, [post]);

  const handleReaction = async (reactionType) => {
    if (!currentUser) return;

    const postRef = doc(db, "communities", communityId, "posts", post.id);
    const reactions = localReactions || {};
    const hasReacted = reactions[reactionType]?.includes(currentUser.uid);

    try {
      // Update local state immediately for instant feedback
      const newReactions = { ...reactions };
      if (hasReacted) {
        newReactions[reactionType] = (newReactions[reactionType] || []).filter(
          (id) => id !== currentUser.uid
        );
      } else {
        newReactions[reactionType] = [
          ...(newReactions[reactionType] || []),
          currentUser.uid,
        ];
      }
      setLocalReactions(newReactions);

      // Update Firestore
      const updateData = {};
      updateData[`reactions.${reactionType}`] = hasReacted
        ? arrayRemove(currentUser.uid)
        : arrayUnion(currentUser.uid);

      await updateDoc(postRef, updateData);

      // Create notification for post creator if it's not the current user
      if (!hasReacted && post.uid !== currentUser.uid) {
        const notificationRef = collection(
          db,
          "users",
          post.uid,
          "notifications"
        );
        await addDoc(notificationRef, {
          type: "reaction",
          postId: post.id,
          communityId: communityId,
          createdBy: currentUser.uid,
          createdByDisplayName: currentUser.displayName,
          reactionType: reactionType,
          createdAt: new Date(),
          read: false,
        });
      }
    } catch (error) {
      console.error("Error updating reaction:", error);
      // Revert local state on error
      setLocalReactions(reactions);
    }
  };

  const handleDeleteComment = async (commentIndex) => {
    try {
      const postRef = doc(db, "communities", communityId, "posts", post.id);
      const updatedComments = [...localComments];
      updatedComments.splice(commentIndex, 1);

      // Update local state immediately
      setLocalComments(updatedComments);

      // Update Firestore
      await updateDoc(postRef, {
        comments: updatedComments,
      });
    } catch (error) {
      console.error("Error deleting comment:", error);
      // Revert local state on error
      setLocalComments(post.comments || []);
    }
  };

  const handleAddComment = async (e) => {
    e.preventDefault();
    if (!newComment.trim()) return;

    try {
      const now = new Date();
      const commentData = {
        content: newComment.trim(),
        createdAt: now,
        createdBy: currentUser.uid,
        createdByDisplayName: currentUser.displayName,
        replies: [],
      };

      // Update local state immediately
      setLocalComments((prev) => [commentData, ...prev]);
      setNewComment("");

      // Update Firestore
      const postRef = doc(db, "communities", communityId, "posts", post.id);
      await updateDoc(postRef, {
        comments: arrayUnion(commentData),
      });

      // Create notification for post creator
      if (post.uid !== currentUser.uid) {
        const notificationRef = collection(
          db,
          "users",
          post.uid,
          "notifications"
        );
        await addDoc(notificationRef, {
          type: "comment",
          postId: post.id,
          communityId: communityId,
          createdBy: currentUser.uid,
          createdByDisplayName: currentUser.displayName,
          content: newComment.trim(),
          createdAt: now,
          read: false,
        });
      }

      if (onCommentAdded) {
        onCommentAdded();
      }
    } catch (error) {
      console.error("Error adding comment:", error);
      // Revert local state on error
      setLocalComments(post.comments || []);
    }
  };

  const handleAddReply = async (commentIndex) => {
    if (!newReplies[commentIndex]?.trim()) return;

    try {
      const now = new Date();
      const replyData = {
        content: newReplies[commentIndex].trim(),
        createdAt: now,
        createdBy: currentUser.uid,
        createdByDisplayName: currentUser.displayName,
      };

      // Update local state immediately
      const updatedComments = [...localComments];
      updatedComments[commentIndex].replies = [
        ...(updatedComments[commentIndex].replies || []),
        replyData,
      ];
      setLocalComments(updatedComments);
      setNewReplies((prev) => ({ ...prev, [commentIndex]: "" }));

      // Update Firestore
      const postRef = doc(db, "communities", communityId, "posts", post.id);
      await updateDoc(postRef, {
        comments: updatedComments,
      });

      // Create notification for comment creator
      if (localComments[commentIndex].createdBy !== currentUser.uid) {
        const notificationRef = collection(
          db,
          "users",
          localComments[commentIndex].createdBy,
          "notifications"
        );
        await addDoc(notificationRef, {
          type: "reply",
          postId: post.id,
          communityId: communityId,
          createdBy: currentUser.uid,
          createdByDisplayName: currentUser.displayName,
          content: newReplies[commentIndex].trim(),
          createdAt: now,
          read: false,
        });
      }

      if (onCommentAdded) {
        onCommentAdded();
      }
    } catch (error) {
      console.error("Error adding reply:", error);
      // Revert local state on error
      setLocalComments(post.comments || []);
    }
  };

  const getReactionCount = (reactionType) => {
    return (localReactions?.[reactionType] || []).length;
  };

  const getUserReaction = () => {
    const reactions = localReactions || {};
    for (const [type, users] of Object.entries(reactions)) {
      if (users?.includes(currentUser?.uid)) {
        return type;
      }
    }
    return null;
  };

  const formatDate = (date) => {
    if (!date) return "";
    const now = new Date();
    const commentDate =
      date instanceof Date ? date : new Date(date.seconds * 1000);
    const diffInSeconds = Math.floor((now - commentDate) / 1000);

    if (diffInSeconds < 60) return "just now";
    if (diffInSeconds < 3600) return `${Math.floor(diffInSeconds / 60)}m`;
    if (diffInSeconds < 86400) return `${Math.floor(diffInSeconds / 3600)}h`;
    if (diffInSeconds < 604800) return `${Math.floor(diffInSeconds / 86400)}d`;
    return commentDate.toLocaleDateString();
  };

  return (
    <div className="mt-4 space-y-4">
      {/* Reactions */}
      <div className="flex items-center space-x-4">
        <div className="relative">
          <button
            onClick={() => setShowReactions(!showReactions)}
            className="flex items-center space-x-1 text-gray-500 hover:text-primary-600"
          >
            <span>
              {getUserReaction() ? REACTIONS[getUserReaction()] : "❤️"}
            </span>
            <span>React</span>
          </button>
          {showReactions && (
            <div className="absolute bottom-full mb-2 bg-white rounded-lg shadow-lg p-2 flex space-x-2">
              {Object.entries(REACTIONS).map(([type, emoji]) => (
                <button
                  key={type}
                  onClick={() => {
                    handleReaction(type);
                    setShowReactions(false);
                  }}
                  className="text-2xl hover:scale-110 transition-transform"
                >
                  {emoji}
                </button>
              ))}
            </div>
          )}
        </div>
        <button
          onClick={() => setShowComments(!showComments)}
          className="flex items-center space-x-1 text-gray-500 hover:text-primary-600"
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
              d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z"
            />
          </svg>
          <span>{localComments.length}</span>
        </button>
      </div>

      {/* Reaction Counts */}
      <div className="flex flex-wrap gap-2">
        {Object.entries(REACTIONS).map(([type, emoji]) => {
          const count = getReactionCount(type);
          if (count > 0) {
            return (
              <span
                key={type}
                className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-gray-100 text-gray-800"
              >
                {emoji} {count}
              </span>
            );
          }
          return null;
        })}
      </div>

      {/* Comments Section */}
      {showComments && (
        <div className="space-y-4">
          {localComments.map((comment, index) => (
            <div key={index} className="bg-gray-50 rounded-lg p-4">
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <div className="flex items-center space-x-2">
                    <span className="font-medium text-gray-900">
                      {comment.createdByDisplayName}
                    </span>
                    <span className="text-sm text-gray-500">
                      {formatDate(comment.createdAt)}
                    </span>
                  </div>
                  <p className="mt-1 text-gray-700">{comment.content}</p>
                </div>
                {comment.createdBy === currentUser?.uid && (
                  <button
                    onClick={() => handleDeleteComment(index)}
                    className="text-gray-400 hover:text-red-500"
                  >
                    <svg
                      className="h-4 w-4"
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

              {/* Replies */}
              {comment.replies?.map((reply, replyIndex) => (
                <div
                  key={replyIndex}
                  className="ml-8 mt-2 bg-white rounded-lg p-3"
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-2">
                      <span className="font-medium text-gray-900">
                        {reply.createdByDisplayName}
                      </span>
                      <span className="text-sm text-gray-500">
                        {formatDate(reply.createdAt)}
                      </span>
                    </div>
                    {reply.createdBy === currentUser?.uid && (
                      <button
                        onClick={() => handleDeleteComment(index)}
                        className="text-gray-400 hover:text-red-500"
                      >
                        <svg
                          className="h-4 w-4"
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
                  <p className="mt-1 text-gray-700">{reply.content}</p>
                </div>
              ))}

              {/* Reply Input */}
              <div className="ml-8 mt-2">
                <input
                  type="text"
                  value={newReplies[index] || ""}
                  onChange={(e) =>
                    setNewReplies((prev) => ({
                      ...prev,
                      [index]: e.target.value,
                    }))
                  }
                  placeholder="Write a reply..."
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
                <button
                  onClick={() => handleAddReply(index)}
                  className="mt-2 px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors"
                >
                  Reply
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Comment Input */}
      <form onSubmit={handleAddComment} className="mt-4">
        <input
          type="text"
          value={newComment}
          onChange={(e) => setNewComment(e.target.value)}
          placeholder="Write a comment..."
          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
        <button
          type="submit"
          className="mt-2 px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors"
        >
          Comment
        </button>
      </form>
    </div>
  );
}
