// src/SkinDetection.js
import React, { useState } from "react";
import axios from "axios";
import Webcam from "react-webcam"; // Import Webcam

const SkinDetection = () => {
  const [image, setImage] = useState(null); // Store the captured image
  const [analysisResult, setAnalysisResult] = useState(null); // Store API response
  const [loading, setLoading] = useState(false); // Loading state for button
  const [isCaptured, setIsCaptured] = useState(false); // Flag to track if the image was captured

  // Initialize the webcam settings
  const webcamRef = React.useRef(null);

  // Capture the image from the webcam
  const captureImage = () => {
    const imageSrc = webcamRef.current.getScreenshot(); // Capture image
    setImage(imageSrc); // Store the image
    setIsCaptured(true); // Mark that the image is captured
  };

  // Handle the image upload and API call
  const handleUpload = async () => {
    if (!image) {
      alert("Please capture an image first.");
      return;
    }

    setLoading(true); // Start loading
    const formData = new FormData();
    const file = dataURItoBlob(image); // Convert the image from data URI to a Blob
    formData.append("image_file", file); // Append image to form data

    // Replace these with your actual Face++ API key and secret
    const apiKey = "xBNjK9aX1ZN8Tb15g6PlVIG3Q-Zp9BsX";
    const apiSecret = "triz080BGPjlip0DpSVBCVxpmz3P6nlh";

    try {
      // Make the request to Face++ API for skin analysis
      const response = await axios.post(
        "https://api-us.faceplusplus.com/facepp/v1/skinanalyze",
        formData,
        {
          params: {
            api_key: apiKey,
            api_secret: apiSecret,
            return_attributes: "skinquality", // Request skin quality attributes
          },
        }
      );

      // Parse the response and extract the skin quality attributes
      const result = response.data;
      if (result.faces && result.faces.length > 0) {
        setAnalysisResult(result.faces[0].attributes.skinquality); // Update the result
      } else {
        alert("No faces detected in the image.");
      }
    } catch (error) {
      console.error("Error calling Face++ API", error);
      alert("An error occurred while processing the image.");
    } finally {
      setLoading(false); // Stop loading
    }
  };

  // Convert Data URI to Blob to send it to Face++ API
  const dataURItoBlob = (dataURI) => {
    const byteString = atob(dataURI.split(',')[1]);
    const arrayBuffer = new ArrayBuffer(byteString.length);
    const uintArray = new Uint8Array(arrayBuffer);
    for (let i = 0; i < byteString.length; i++) {
      uintArray[i] = byteString.charCodeAt(i);
    }
    return new Blob([uintArray], { type: "image/jpeg" });
  };

  return (
    <div>
      <h2>Skin Type Detection Using Camera</h2>

      {/* Webcam component */}
      {!isCaptured ? (
        <Webcam
          audio={false}
          ref={webcamRef}
          screenshotFormat="image/jpeg"
          width="100%"
          videoConstraints={{
            facingMode: "user", // Use the front camera
          }}
        />
      ) : (
        <div>
          <img src={image} alt="Captured" width="100%" /> {/* Display captured image */}
        </div>
      )}

      <div>
        {!isCaptured ? (
          <button onClick={captureImage}>Capture Image</button> // Capture image button
        ) : (
          <button onClick={handleUpload} disabled={loading}>
            {loading ? "Analyzing..." : "Upload & Analyze"}
          </button>
        )}
      </div>

      {/* Display skin quality analysis result */}
      {analysisResult && (
        <div>
          <h3>Skin Quality Analysis</h3>
          <ul>
            <li><strong>Blemishes:</strong> {analysisResult.blemishes}</li>
            <li><strong>Pores:</strong> {analysisResult.pores}</li>
            <li><strong>Wrinkles:</strong> {analysisResult.wrinkles}</li>
            <li><strong>Smoothness:</strong> {analysisResult.smoothness}</li>
          </ul>
        </div>
      )}
    </div>
  );
};

export default SkinDetection;
