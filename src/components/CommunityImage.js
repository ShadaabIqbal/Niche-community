import React, { useState } from "react";

export const getInitials = (name) => {
  if (!name) return "?";
  return name
    .split(" ")
    .map((word) => word[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);
};

const getRandomColor = (name) => {
  const colors = [
    "bg-blue-500",
    "bg-green-500",
    "bg-purple-500",
    "bg-pink-500",
    "bg-indigo-500",
    "bg-red-500",
    "bg-yellow-500",
    "bg-teal-500",
  ];

  // Use the name to consistently generate the same color for the same name
  const hash = name
    .split("")
    .reduce((acc, char) => char.charCodeAt(0) + acc, 0);
  return colors[hash % colors.length];
};

export default function CommunityImage({
  photoURL,
  name,
  sizeClasses = "h-10 w-10",
}) {
  const [error, setError] = useState(false);

  // If no photo URL or error loading image, show initials
  if (!photoURL || error) {
    const initials = getInitials(name);
    const bgColor = getRandomColor(name || "default");

    return (
      <div
        className={`${sizeClasses} ${bgColor} rounded-full flex items-center justify-center text-white font-semibold overflow-hidden`}
      >
        <span className="text-sm">{initials}</span>
      </div>
    );
  }

  return (
    <div className={`${sizeClasses} rounded-full overflow-hidden`}>
      <img
        src={photoURL}
        alt={name}
        className="w-full h-full object-cover"
        onError={() => setError(true)}
      />
    </div>
  );
}
