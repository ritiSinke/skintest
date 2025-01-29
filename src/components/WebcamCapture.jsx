import React, { useRef, useState } from "react";
import Webcam from "react-webcam";

function SkinTestCapture() {
  const webcamRef = useRef(null);
  const [image, setImage] = useState(null);
  const [analysisResult, setAnalysisResult] = useState(null);
  const [loading, setLoading] = useState(false); // Track loading state

  // Capture Image
  const capture = () => {
    const screenshot = webcamRef.current.getScreenshot();
    if (screenshot) {
      setImage(screenshot); // Set the captured image
    } else {
      console.error("Failed to capture screenshot.");
    }
  };

  // Process Image (resize, compress)
  const processImage = (imageSrc) => {
    return new Promise((resolve, reject) => {
      const img = new Image();
      img.src = imageSrc;

      img.onload = () => {
        const originalWidth = img.width;
        const originalHeight = img.height;

        const TARGET_SIZE = 1500 * 1024; // Target file size in bytes
        const SIZE_TOLERANCE = 0.05;
        const MIN_SIZE = TARGET_SIZE * (1 - SIZE_TOLERANCE);
        const MAX_SIZE = TARGET_SIZE * (1 + SIZE_TOLERANCE);
        const TARGET_WIDTH = 2048;
        let width = TARGET_WIDTH;
        let height = Math.round((TARGET_WIDTH / originalWidth) * originalHeight);

        // Ensure image dimensions meet minimum requirements
        if (width < 200 || height < 200) {
          reject("Image is too small. Minimum dimensions are 200x200 pixels.");
          return;
        }

        // Scale down if image exceeds max size
        if (width > 4096 || height > 4096) {
          const scale = Math.min(4096 / width, 4096 / height);
          width = Math.round(width * scale);
          height = Math.round(height * scale);
        }

        const shortSide = Math.min(width, height);
        const minFaceSize = Math.max(160, shortSide / 10);

        if (minFaceSize < 160) {
          reject(`Face might be too small. Minimum face size should be 160 pixels.`);
          return;
        }

        // Create a canvas for resizing and compressing
        const canvas = document.createElement("canvas");
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext("2d");

        ctx.imageSmoothingEnabled = true;
        ctx.imageSmoothingQuality = "high";
        ctx.drawImage(img, 0, 0, width, height);

        let minQuality = 0.5;
        let maxQuality = 1.0;
        let quality = 0.9;
        let bestResult = null;
        let attempts = 0;
        const MAX_ATTEMPTS = 10;

        const tryCompress = (currentQuality) => {
          canvas.toBlob((blob) => {
            if (!blob) {
              reject("Failed to process image.");
              return;
            }

            attempts++;

            // Check if the blob size is within the acceptable range
            if (blob.size >= MIN_SIZE && blob.size <= MAX_SIZE) {
              resolve({
                blob,
                width,
                height,
                originalWidth,
                originalHeight,
                quality: Math.round(currentQuality * 100),
                minPossibleFaceSize: Math.round(minFaceSize),
              });
              return;
            }

            // Track best result within size tolerance
            if (!bestResult || Math.abs(TARGET_SIZE - blob.size) < Math.abs(TARGET_SIZE - bestResult.size)) {
              bestResult = { blob, size: blob.size, quality: currentQuality };
            }

            // Adjust quality and retry compressing
            if (attempts < MAX_ATTEMPTS) {
              if (blob.size > MAX_SIZE) {
                maxQuality = currentQuality;
                quality = (minQuality + currentQuality) / 2;
              } else if (blob.size < MIN_SIZE) {
                minQuality = currentQuality;
                quality = (currentQuality + maxQuality) / 2;
              }
              tryCompress(quality);
            } else {
              // Return best result after maximum attempts
              resolve(bestResult);
            }
          }, "image/jpeg", currentQuality);
        };

        tryCompress(quality);
      };

      img.onerror = () => reject("Failed to load image.");
    });
  };

  // Analyze Image (Send to Backend)
  const analyzeImage = async () => {
    if (!image) {
      console.error("No image to analyze.");
      return;
    }
    setLoading(true);

    try {
      const processedImage = await processImage(image);
      const formData = new FormData();
      formData.append("image", processedImage.blob, "image.jpg");

      const response = await fetch("http://localhost:5000/analyze", {
        method: "POST",
        body: formData,
      });

      if (!response.ok) {
        throw new Error("Failed to analyze the image.");
      }

      const result = await response.json();
      console.log("Analysis Result:", result); // Log the result
      setAnalysisResult(result);
    } catch (error) {
      console.error("Error analyzing image:", error);
      alert("Error analyzing the image, please try again!");
    } finally {
      setLoading(false);
    }
  };

  const skinTypeLabels = ["Oily Skin", "Dry Skin", "Normal Skin", "Mixed Skin"];

  return (
    <div className="container">
      <h1>Skin Test </h1>

      <div className="webcam-container">
        {!image ? (
          <Webcam
            audio={false}
            ref={webcamRef}
            screenshotFormat="image/jpeg"
            width={800}
            height={600}
            className="webcam"
          />
        ) : (
          <img
            src={image}
            alt="Captured"
            className="captured-image"
            style={{ width: "800px", height: "600px" }}
          />
        )}
      </div>

      <div className="button-container">
        {!image ? (
          <button onClick={capture}>Capture Image</button>
        ) : (
          <>
            <button onClick={() => setImage(null)}>Retake</button>
            <button onClick={analyzeImage}>Analyze Skin</button>
          </>
        )}
      </div>

      {loading && <p>Analyzing Skin, please wait...</p>}

      {analysisResult && (
        <div className="result-container">
          <h3>Skin Analysis Result</h3>
          <p><strong>Skin Type:</strong> {skinTypeLabels[analysisResult.result?.skin_type] || "N/A"}</p>
          <p><strong>Acne Level:</strong> {analysisResult.result?.acne?.value || "N/A"}</p>
          <p><strong>Dark Circles:</strong> {analysisResult.result?.dark_circle?.value || "N/A"}</p>
        </div>
      )}
    </div>
  );
}

export default SkinTestCapture;
