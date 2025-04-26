// imageUtils.js
import * as tf from "@tensorflow/tfjs";

/**
 * Converts a base64 image string to ImageData
 * @param {string} base64Image - The base64 encoded image string
 * @returns {Promise<ImageData>} The image data object
 */
export const base64ToImageData = async (base64Image) => {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = "anonymous";
    img.src = base64Image;

    img.onload = () => {
      const canvas = document.createElement("canvas");
      canvas.width = img.width;
      canvas.height = img.height;
      const ctx = canvas.getContext("2d");
      ctx.drawImage(img, 0, 0);
      resolve(ctx.getImageData(0, 0, img.width, img.height));
    };

    img.onerror = (error) => {
      reject(new Error("Failed to load image: " + error));
    };
  });
};

/**
 * Crops a face from video using facial landmarks
 * @param {HTMLVideoElement} videoElement - The video element
 * @param {Array} landmarks - The facial landmarks
 * @returns {string|null} - Base64 encoded cropped image or null
 */
export const cropFace = (videoElement, landmarks) => {
  if (!videoElement) return null;

  let minX = Infinity,
    minY = Infinity,
    maxX = -Infinity,
    maxY = -Infinity;

  landmarks.forEach((point) => {
    minX = Math.min(minX, point.x * videoElement.videoWidth);
    minY = Math.min(minY, point.y * videoElement.videoHeight);
    maxX = Math.max(maxX, point.x * videoElement.videoWidth);
    maxY = Math.max(maxY, point.y * videoElement.videoHeight);
  });

  const XPadding = 10;
  const YPadding = 10;
  const cropX = Math.max(0, minX - XPadding);
  const cropY = Math.max(0, minY - YPadding);
  const cropWidth = Math.min(
    videoElement.videoWidth - cropX,
    maxX - cropX + 2 * XPadding,
  );
  const cropHeight = Math.min(
    videoElement.videoHeight - cropY,
    maxY - cropY + 2 * YPadding,
  );

  // Create temporary canvas for cropping
  const tempCanvas = document.createElement("canvas");
  tempCanvas.width = cropWidth;
  tempCanvas.height = cropHeight;
  const tempCtx = tempCanvas.getContext("2d");

  // Get image directly from video (without filter)
  tempCtx.drawImage(
    videoElement,
    cropX,
    cropY,
    cropWidth,
    cropHeight, // Source crop area
    0,
    0,
    cropWidth,
    cropHeight, // Output size
  );

  // Resize to standard size
  const resizedCanvas = document.createElement("canvas");
  resizedCanvas.width = 112;
  resizedCanvas.height = 112;
  const resizedCtx = resizedCanvas.getContext("2d");

  resizedCtx.drawImage(tempCanvas, 0, 0, 112, 112);

  return resizedCanvas.toDataURL("image/png");
};

/**
 * Detects if person is wearing a mask using TensorFlow model
 * @param {string} base64Image - The base64 encoded image
 * @param {tf.LayersModel} maskModel - The loaded TensorFlow mask detection model
 * @returns {Promise<boolean>} - True if mask detected, false otherwise
 */
export const detectMask = async (base64Image, maskModel) => {
  return new Promise((resolve, reject) => {
    if (!maskModel) {
      console.error("maskModel is undefined");
      return reject(new Error("maskModel is not initialized"));
    }

    const img = new Image();
    img.src = base64Image;

    img.onload = async () => {
      try {
        // Prepare the tensor
        let offset = tf.scalar(127.5);
        const tensor = tf.browser
          .fromPixels(img)
          .resizeNearestNeighbor([112, 112])
          .toFloat()
          .sub(offset)
          .div(offset)
          .expandDims();

        const prediction = await maskModel.predict(tensor).data();

        // Clean up tensors
        tensor.dispose();
        offset.dispose();

        if (!prediction || prediction.length === 0) {
          throw new Error("Invalid prediction result");
        }

        // Determine if masked (0 = mask, 1 = no mask)
        const isMasked = prediction[0].toFixed(0) === "0";

        resolve(isMasked);
      } catch (error) {
        console.error("Error in mask detection:", error);
        reject(error);
      }
    };

    img.onerror = () => {
      console.error("Failed to load image");
      reject(new Error("Image loading failed"));
    };
  });
};

/**
 * Determines face direction based on facial landmarks
 * @param {Object} landmarks - The facial landmarks
 * @returns {Object} - Direction object with direction key and name
 */
export const determineFaceDirection = (landmarks) => {
  const noseTip = landmarks[1];
  const leftEye = landmarks[33];
  const rightEye = landmarks[263];
  const chin = landmarks[152];
  const forehead = landmarks[10];

  // Calculate head tilt
  const eyeDistance = Math.sqrt(
    Math.pow(rightEye.x - leftEye.x, 2) + Math.pow(rightEye.y - leftEye.y, 2),
  );

  const faceHeight = Math.sqrt(
    Math.pow(chin.x - forehead.x, 2) + Math.pow(chin.y - forehead.y, 2),
  );

  const horizontalThreshold = eyeDistance * 0.15;
  const verticalThreshold = faceHeight * 0.01;

  const noseCenterX = (leftEye.x + rightEye.x) / 2;
  let horizontalDirection = "Center";
  if (noseTip.x < noseCenterX - horizontalThreshold) {
    horizontalDirection = "Right";
  } else if (noseTip.x > noseCenterX + horizontalThreshold) {
    horizontalDirection = "Left";
  }

  const faceCenterY = (forehead.y + chin.y) / 2;
  let verticalDirection = "Center";
  if (noseTip.y < faceCenterY - verticalThreshold) {
    verticalDirection = "Up";
  } else if (noseTip.y > faceCenterY + verticalThreshold) {
    verticalDirection = "Down";
  }

  let faceDirection = "";
  if (horizontalDirection === "Center" && verticalDirection === "Center") {
    faceDirection = "Front";
  } else {
    faceDirection =
      `${verticalDirection !== "Center" ? verticalDirection : ""} ${horizontalDirection !== "Center" ? horizontalDirection : ""}`.trim();
    if (!faceDirection) faceDirection = "Center";
  }

  let directionKey;
  if (faceDirection === "Front") directionKey = "front";
  else if (faceDirection === "Left") directionKey = "left";
  else if (faceDirection === "Right") directionKey = "right";
  else if (faceDirection === "Up") directionKey = "up";
  else if (faceDirection === "Down") directionKey = "down";

  return {
    directionKey,
    faceDirection,
  };
};

/**
 * Checks if head is tilted based on eye positions
 * @param {Array} landmarks - The facial landmarks
 * @param {number} width - Canvas width
 * @param {number} height - Canvas height
 * @param {number} tiltThreshold - Degree threshold for tilt detection
 * @returns {boolean} - True if head is tilted beyond threshold
 */
export const isHeadTilted = (landmarks, width, height, tiltThreshold = 20) => {
  const leftEye = landmarks[33];
  const rightEye = landmarks[263];

  const leftEyePos = {
    x: leftEye.x * width,
    y: leftEye.y * height,
  };
  const rightEyePos = {
    x: rightEye.x * width,
    y: rightEye.y * height,
  };

  // Calculate head tilt angle
  const slope = (rightEyePos.y - leftEyePos.y) / (rightEyePos.x - leftEyePos.x);
  const angleRad = Math.atan(slope);
  const angleDeg = angleRad * (180 / Math.PI);

  return Math.abs(angleDeg) > tiltThreshold;
};

/**
 * Checks if face is within circle boundary
 * @param {Array} facePoints - Array of face point coordinates
 * @param {number} centerX - Circle center X
 * @param {number} centerY - Circle center Y
 * @param {number} radius - Circle radius
 * @returns {boolean} - True if face is in circle
 */
export const isFaceInCircle = (facePoints, centerX, centerY, radius) => {
  return facePoints.every(
    (point) =>
      Math.sqrt(
        Math.pow(point.x - centerX, 2) + Math.pow(point.y - centerY, 2),
      ) <= radius,
  );
};

/**
 * Updates canvas dimensions to match container
 * @param {HTMLVideoElement} videoElement - The video element
 * @param {HTMLCanvasElement} canvasElement - The canvas element
 * @param {HTMLDivElement} containerElement - The container element
 */
export const updateCanvasDimensions = (
  videoElement,
  canvasElement,
  containerElement,
) => {
  if (!videoElement || !canvasElement || !containerElement) return;

  const containerRect = containerElement.getBoundingClientRect();
  const { width: containerWidth, height: containerHeight } = containerRect;

  // Get actual video dimensions
  const { videoWidth, videoHeight } = videoElement;
  if (videoWidth === 0 || videoHeight === 0) return;

  // Set canvas display size to match container
  canvasElement.style.width = `${containerWidth}px`;
  canvasElement.style.height = `${containerHeight}px`;

  // Set canvas internal dimensions to match video for proper drawing
  canvasElement.width = containerWidth;
  canvasElement.height = containerHeight;
};

/**
 * Checks device type and orientation
 * @returns {Object} - Object with isMobile and orientation properties
 */
export const getDeviceInfo = () => {
  const isMobile =
    /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(
      navigator.userAgent,
    );

  const isPortrait = window.innerHeight > window.innerWidth;
  const orientation = isPortrait ? "portrait" : "landscape";

  return {
    isMobile,
    orientation,
  };
};

/**
 * Draws the webcam interface with face guidance and progress
 * @param {CanvasRenderingContext2D} ctx - Canvas context
 * @param {Object} config - Configuration object
 */
export const drawWebcamInterface = (
  ctx,
  {
    width,
    height,
    centerX,
    centerY,
    radius,
    progress,
    totalProgress,
    currentDirection,
    currentCount,
    limit,
    completedDirections,
    totalDirections,
    faceDirection,
    isMasked,
    instructionText,
  },
) => {
  // Clear the canvas
  ctx.clearRect(0, 0, width, height);

  // Draw semi-transparent overlay
  ctx.fillStyle = "rgba(128, 128, 128, 0.6)";
  ctx.fillRect(0, 0, width, height);

  // Create transparent circle
  ctx.globalCompositeOperation = "destination-out";
  ctx.beginPath();
  ctx.arc(centerX, centerY, radius, 0, Math.PI * 2);
  ctx.fill();
  ctx.globalCompositeOperation = "source-over";

  // Draw circle border
  ctx.strokeStyle = "#bfdbfe";
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.arc(centerX, centerY, radius, 0, Math.PI * 2);
  ctx.stroke();

  // Draw progress arc
  ctx.strokeStyle = "#2563eb";
  ctx.lineWidth = 5;
  const progressPercentage = progress / totalProgress;
  ctx.beginPath();
  ctx.arc(
    centerX,
    centerY,
    radius,
    -Math.PI / 2, // Start at -90 degrees (12 o'clock)
    Math.PI * 2 * progressPercentage - Math.PI / 2, // End angle based on progress
  );
  ctx.stroke();

  // Display face direction if available
  if (faceDirection) {
    ctx.fillStyle = "#FF0000";
    ctx.font = "18px Arial";
    ctx.fillText(`Face: ${faceDirection}`, 10, 30);

    // Display mask status if available
    if (typeof isMasked === "boolean") {
      ctx.fillStyle = isMasked ? "#00AA00" : "#FFAA00";
      ctx.fillText(isMasked ? "Mask: Yes" : "Mask: No", 10, 60);
    }
  }

  // Show target direction and progress
  if (currentDirection) {
    ctx.fillStyle = "#FFFFFF";
    ctx.fillText(`Target: ${currentDirection}`, 10, 90);
    ctx.fillText(`Progress: ${currentCount}/${limit}`, 10, 120);
  }

  // Display instructions
  const fontSize = Math.max(16, Math.min(width, height) * 0.02);
  ctx.font = `${fontSize}px Arial`;
  ctx.fillStyle = "#FFFFFF";
  ctx.textAlign = "center";
  ctx.fillText(instructionText, centerX, centerY + radius + fontSize * 1.5);

  // Show overall completion status
  ctx.fillStyle = "#4CAF50";
  ctx.font = `bold ${fontSize}px Arial`;
  ctx.textAlign = "center";
  ctx.fillText(
    `Completed: ${completedDirections}/${totalDirections} directions`,
    centerX,
    centerY - radius - fontSize,
  );
};
