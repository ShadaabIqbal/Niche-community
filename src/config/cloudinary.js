const cloudName = "dobw3lzv9";
const uploadPreset = "niche-upload";

const uploadImageToCloudinary = async (file) => {
  const formData = new FormData();
  formData.append("file", file);
  formData.append("upload_preset", uploadPreset);
  formData.append("cloud_name", cloudName);

  try {
    const response = await fetch(
      `https://api.cloudinary.com/v1_1/${cloudName}/image/upload`,
      {
        method: "POST",
        body: formData,
      }
    );

    if (!response.ok) {
      const errorData = await response.json();
      console.error("Cloudinary upload error:", errorData);
      throw new Error(
        `Failed to upload image to Cloudinary: ${
          errorData.error.message || response.statusText
        }`
      );
    }

    const data = await response.json();
    return data.secure_url;
  } catch (error) {
    console.error("Error in uploadImageToCloudinary:", error);
    throw error;
  }
};

export { uploadImageToCloudinary };
