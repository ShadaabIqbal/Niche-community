import React, { useState, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { collection, addDoc } from "firebase/firestore";
import { db } from "../config/firebase";
import { useAuth } from "../contexts/AuthContext";
import { FaCamera, FaUsers, FaHashtag } from "react-icons/fa";
import Button from "../components/ui/Button";
import Input from "../components/ui/Input";
import Card from "../components/ui/Card";
import { uploadImageToCloudinary } from "../config/cloudinary";

const CreateCommunity = () => {
  const [formData, setFormData] = useState({
    name: "",
    description: "",
    category: "",
  });
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [uploadingImage, setUploadingImage] = useState(false);
  const [imagePreview, setImagePreview] = useState(null);
  const [imageFile, setImageFile] = useState(null);
  const fileInputRef = useRef(null);
  const navigate = useNavigate();
  const { currentUser } = useAuth();

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }));
  };

  const handleImageSelect = (e) => {
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

    setImageFile(file);
    const reader = new FileReader();
    reader.onloadend = () => {
      setImagePreview(reader.result);
    };
    reader.readAsDataURL(file);
  };

  const uploadImage = async (file) => {
    try {
      setUploadingImage(true);
      const downloadURL = await uploadImageToCloudinary(file);
      return downloadURL;
    } catch (err) {
      console.error("Error uploading image to Cloudinary:", err);
      throw new Error("Failed to upload image");
    } finally {
      setUploadingImage(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    const { name, description, category } = formData;

    try {
      setError("");
      setLoading(true);

      let photoURL = null;
      if (imageFile) {
        photoURL = await uploadImage(imageFile);
      }

      // Create community document
      const communityRef = await addDoc(collection(db, "communities"), {
        name,
        description,
        category,
        photoURL: photoURL || "https://via.placeholder.com/150",
        createdBy: currentUser.uid,
        createdAt: new Date().toISOString(),
        members: [currentUser.uid],
        moderators: [currentUser.uid],
      });

      // Add community to user's communities
      await addDoc(collection(db, "users", currentUser.uid, "communities"), {
        communityId: communityRef.id,
        role: "admin",
        joinedAt: new Date().toISOString(),
      });

      navigate(`/community/${communityRef.id}`);
    } catch (err) {
      console.error("Error creating community:", err);
      setError("Failed to create community. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 py-12">
      <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-extrabold text-gray-900">
            Create a Community
          </h1>
          <p className="mt-2 text-sm text-gray-600">
            Build a space for your community to connect and share
          </p>
        </div>

        <Card variant="elevated" className="p-8">
          <form onSubmit={handleSubmit} className="space-y-6">
            {error && (
              <div className="bg-error-50 border border-error-200 text-error-700 px-4 py-3 rounded-lg">
                {error}
              </div>
            )}

            <div className="flex justify-center mb-6">
              <div className="relative">
                <div className="w-32 h-32 rounded-full bg-gray-100 flex items-center justify-center overflow-hidden">
                  {imagePreview ? (
                    <img
                      src={imagePreview}
                      alt="Community"
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <FaUsers className="w-16 h-16 text-gray-400" />
                  )}
                  {uploadingImage && (
                    <div className="absolute inset-0 flex items-center justify-center bg-black bg-opacity-50">
                      <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-white"></div>
                    </div>
                  )}
                </div>
                <input
                  type="file"
                  ref={fileInputRef}
                  onChange={handleImageSelect}
                  accept="image/*"
                  className="hidden"
                />
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  disabled={uploadingImage}
                  className="absolute bottom-0 right-0 bg-white p-2 rounded-full shadow-md hover:bg-gray-50 transition-colors duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <FaCamera className="w-5 h-5 text-gray-600" />
                </button>
              </div>
            </div>

            <Input
              label="Community Name"
              type="text"
              name="name"
              value={formData.name}
              onChange={handleChange}
              required
              icon={<FaHashtag className="text-gray-400" />}
              placeholder="Enter community name"
            />

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Description
              </label>
              <textarea
                name="description"
                value={formData.description}
                onChange={handleChange}
                required
                rows={4}
                className="w-full px-4 py-2 text-gray-900 bg-white border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-primary-500 transition-all duration-200"
                placeholder="Describe your community"
              />
            </div>

            <Input
              label="Category"
              type="text"
              name="category"
              value={formData.category}
              onChange={handleChange}
              required
              placeholder="e.g., Technology, Gaming, Art"
            />

            <Button
              type="submit"
              disabled={loading || uploadingImage}
              className="w-full"
            >
              {loading ? "Creating..." : "Create Community"}
            </Button>
          </form>
        </Card>
      </div>
    </div>
  );
};

export default CreateCommunity;
