// imageUtils.js
import * as tf from "@tensorflow/tfjs";

/**
 * Converts a Base64-encoded image string into an ImageData object.
 *
 * This function creates an HTMLImageElement, draws the image onto a canvas,
 * and retrieves the ImageData from the canvas. It resolves with the ImageData
 * if successful and rejects with an error if the image fails to load.
 *
 * @param {string} base64Image - A Base64-encoded string representing the image.
 * @returns {Promise<ImageData>} A promise that resolves with the ImageData object containing the pixel data of the image.
 * @throws {Error} If the image fails to load or cannot be processed.
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
 * Extracts and crops a face area from a video element based on facial landmarks,
 * then resizes the cropped image to a standard dimension and returns it as a Base64 encoded string.
 *
 * @param {HTMLVideoElement} videoElement - The source video element containing the face to be cropped.
 * @param {Array<{x: number, y: number}>} landmarks - Array of facial landmark points, each object containing `x` and `y` values normalized between 0 and 1.
 * @returns {string|null} A Base64 encoded PNG string of the cropped and resized face, or `null` if the video element is not provided.
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
 * Detects whether a person in a given base64 image is wearing a mask using a pre-trained machine learning model.
 *
 * @param {string} base64Image - A base64 string representation of the image to be analyzed.
 * @param {object} maskModel - A pre-trained TensorFlow.js machine learning model used for mask detection.
 * @returns {Promise<boolean>} A promise that resolves to a boolean indicating whether a mask is detected.
 *                              Resolves to `true` if a mask is detected, and `false` if not.
 * @throws {Error} Throws an error if the maskModel is undefined, the image fails to load, or if an invalid prediction result occurs.
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
 * An asynchronous function that detects the presence of a mask in an image
 * using a provided machine learning model.
 *
 * @param {string} base64Image - A base64-encoded string representation of the image
 * to be analyzed.
 * @param {tf.LayersModel} maskModel - A TensorFlow.js machine learning model
 * trained to detect masks.
 * @returns {Promise<boolean>} Resolves to `true` if a mask is detected in the image,
 * otherwise `false`.
 * @throws {Error} If the `maskModel` is not defined or not initialized.
 * @throws {Error} If the image fails to load or if an error occurs during the
 * prediction process.
 */
export const detectMask2 = async (base64Image, maskModel) => {
  if (!maskModel) {
    console.error("maskModel is undefined");
    throw new Error("maskModel is not initialized");
  }

  const img = new Image();
  img.src = base64Image;

  // Wait for the image to load before proceeding
  await new Promise((resolve, reject) => {
    img.onload = resolve;
    img.onerror = () => reject(new Error("Failed to load image"));
  });

  try {
    const rawImgTensor = tf.browser.fromPixels(img);
    const processedTensor = tf.tidy(() => {
      // Resize the image to the required dimensions for the model
      return rawImgTensor
        .resizeNearestNeighbor([224, 224])
        .toFloat()
        .div(tf.scalar(255))
        .expandDims();
    });

    // Run prediction
    const prediction = await maskModel.predict(processedTensor).arraySync();

    // Clean up tensors
    rawImgTensor.dispose();
    processedTensor.dispose();

    return prediction[0] > 0;
  } catch (error) {
    console.error("Error in mask detection:", error);
    throw error;
  }
};
/**
 * Determines the direction of the face based on given facial landmarks.
 *
 * This function analyzes the positions of specific facial points (nose tip, left eye, right eye,
 * chin, and forehead) from the `landmarks` argument to determine the horizontal and vertical
 * orientation of the face. It calculates the thresholds for movement detection and assigns
 * semantic values like "Up," "Down," "Left," "Right," or "Front" to describe the face's position.
 *
 * @param {Array} landmarks - An array of 2D or 3D points representing the facial landmarks.
 * Each point should have `x` and `y` properties, and optionally `z` if 3D points are used.
 * The function assumes specific landmark indices where:
 *   - `landmarks[1]`: Nose tip
 *   - `landmarks[33]`: Left eye
 *   - `landmarks[263]`: Right eye
 *   - `landmarks[152]`: Chin
 *   - `landmarks[10]`: Forehead
 * The arrangement and indices must adhere to commonly used facial landmarking systems.
 *
 * @returns {Object} An object containing:
 *   - `directionKey` {string}: A key representing the primary face direction. Possible values are:
 *     - "front": The face is directly facing forward.
 *     - "left": The face is tilted to the viewer's left.
 *     - "right": The face is tilted to the viewer's right.
 *     - "up": The face is tilted upward.
 *     - "down": The face is tilted downward.
 *   - `faceDirection` {string}: A more descriptive representation of the face's direction,
 *     combining both horizontal and vertical orientations when applicable. Examples:
 *     - "Up"
 *     - "Right"
 *     - "Up Left"
 *     - "Front"
 *
 * The function uses distance thresholds to determine whether movements from the center are
 * significant enough to classify the face as tilted or repositioned in any direction.
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

  // Use similar threshold sensitivities for horizontal and vertical detection
  const horizontalThreshold = eyeDistance * 0.1;
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

  // Set default directionKey value
  let directionKey = "front"; // Default value

  // Use includes() instead of contain()
  if (faceDirection.includes("Front")) directionKey = "front";
  else if (faceDirection.includes("Left")) directionKey = "left";
  else if (faceDirection.includes("Right")) directionKey = "right";
  else if (faceDirection.includes("Up")) directionKey = "up";
  else if (faceDirection.includes("Down")) directionKey = "down";

  return {
    directionKey,
    faceDirection,
  };
};

/**
 * Determines whether a face's vertical angle matches a given target angle within a specified tolerance.
 *
 * @param {Array} landmarks - The facial landmark points used to calculate angles, typically provided as an array of objects with `x` and `y` coordinates.
 * @param {number} targetAngle - The target vertical angle in degrees to check against.
 * @param {number} [tolerance=5] - The acceptable deviation from the target angle, given as degrees. Default value is 5.
 * @returns {boolean} - Returns true if the face's vertical angle is within the specified tolerance of the target angle, otherwise false.
 */
export const isFaceAtVerticalAngle = (
  landmarks,
  targetAngle,
  tolerance = 5,
) => {
  const noseTip = landmarks[1];
  const chin = landmarks[152];
  const forehead = landmarks[10];

  // Calculate angle between nose and vertical face axis
  const faceVector = {
    x: forehead.x - chin.x,
    y: forehead.y - chin.y,
  };

  const noseOffset = {
    x: noseTip.x - (forehead.x + chin.x) / 2,
    y: noseTip.y - (forehead.y + chin.y) / 2,
  };

  // Calculate the vertical angle using dot product and vector magnitudes
  const dotProduct = noseOffset.y * faceVector.y;
  const noseVectorMagnitude = Math.sqrt(
    noseOffset.x * noseOffset.x + noseOffset.y * noseOffset.y,
  );
  const faceVectorMagnitude = Math.sqrt(
    faceVector.x * faceVector.x + faceVector.y * faceVector.y,
  );

  // Calculate the angle in degrees
  const cosAngle = dotProduct / (noseVectorMagnitude * faceVectorMagnitude);
  const angleRad = Math.acos(Math.min(1, Math.max(-1, cosAngle)));
  const angleDeg = angleRad * (180 / Math.PI);

  // Determine if vertical tilt is upward or downward
  const isUpward = noseTip.y < (forehead.y + chin.y) / 2;
  const adjustedAngle = isUpward ? angleDeg : -angleDeg;

  // Check if the angle is within tolerance of the target angle
  return Math.abs(adjustedAngle - targetAngle) <= tolerance;
};

/**
 * Determines if a face is oriented at a specified horizontal angle within a given tolerance.
 *
 * This function takes facial landmarks to calculate the horizontal angle of the face.
 * It evaluates whether the current angle deviates from the target angle within a specified tolerance.
 *
 * @param {Array<Object>} landmarks - An array representing facial landmarks, where each landmark is
 * an object containing `x` and `y` coordinates. Specific indices used are:
 *   - Index 1: Tip of the nose
 *   - Index 33: Left eye
 *   - Index 263: Right eye
 * @param {number} targetAngle - The horizontal angle (in degrees) to verify against.
 * A positive angle typically indicates the face is turned to the right, while a
 * negative angle indicates leftward rotation.
 * @param {number} [tolerance=5] - The allowable variation (in degrees) from the target angle.
 * Defaults to 5 degrees if not provided.
 * @returns {boolean} - Returns `true` if the calculated horizontal angle is within the
 * specified tolerance of the target angle; otherwise, returns `false`.
 */
export const isFaceAtHorizontalAngle = (
  landmarks,
  targetAngle,
  tolerance = 5,
) => {
  const noseTip = landmarks[1];
  const leftEye = landmarks[33];
  const rightEye = landmarks[263];

  // Calculate distance between eyes for normalization
  const eyeDistance = Math.sqrt(
    Math.pow(rightEye.x - leftEye.x, 2) + Math.pow(rightEye.y - leftEye.y, 2),
  );

  // Calculate nose offset from the midpoint between eyes
  const noseMidpointX = (leftEye.x + rightEye.x) / 2;
  const noseOffset = Math.abs(noseTip.x - noseMidpointX);

  // Calculate the ratio of nose offset to eye distance
  // This ratio correlates with the horizontal angle of the face
  const offsetRatio = noseOffset / eyeDistance;

  // Convert ratio to angle (approximate based on trigonometry)
  // The conversion factors below are calibrated to match standard face angles
  const angleEstimate = Math.atan(offsetRatio * 2.5) * (180 / Math.PI);

  // Determine left/right direction
  const isLookingRight = noseTip.x < noseMidpointX;
  const horizontalAngle = isLookingRight ? angleEstimate : -angleEstimate;

  // Check if the angle is within tolerance of the target angle
  return Math.abs(Math.abs(horizontalAngle) - targetAngle) <= tolerance;
};

/**
 * Determines the face direction based on horizontal and vertical angles calculated
 * from facial landmarks. This includes evaluating the horizontal and vertical
 * orientation of the face to produce a string representation of direction and an
 * associated key.
 *
 * @param {Array<Object>} landmarks - Array of facial landmarks obtained from pose or face-detection models.
 * Each landmark object should include at least `x` and `y` properties representing the normalized 2D coordinates.
 *
 * @returns {Object} An object containing the following properties:
 * - `directionKey` {string} - A concise key describing the face direction, such as `front`, `left`, `right`, `up`, `down`, `halfLeft`, or `halfRight`.
 * - `faceDirection` {string} - A human-readable string describing the face direction, combining horizontal and vertical positioning.
 * - `horizontalAngle` {number} - The horizontal angle of the face in degrees, estimated based on the nose's position relative to the eyes.
 * - `absAngle` {number} - The absolute value of the horizontal angle in degrees.
 */
export const determineFaceDirectionWithHorizontalAngle = (landmarks) => {
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

  // Calculate horizontal angle
  const noseMidpointX = (leftEye.x + rightEye.x) / 2;
  const noseOffset = Math.abs(noseTip.x - noseMidpointX);
  const offsetRatio = noseOffset / eyeDistance;
  const horizontalAngleEstimate =
    Math.atan(offsetRatio * 2.5) * (180 / Math.PI);
  const isLookingRight = noseTip.x < noseMidpointX;
  const horizontalAngle = isLookingRight
    ? horizontalAngleEstimate
    : -horizontalAngleEstimate;

  // Determine horizontal direction based on angle ranges
  // 20-40 degrees is half, >50 is right/left
  let horizontalDirection = "Center";
  const absAngle = Math.abs(horizontalAngle);

  if (absAngle > 50) {
    horizontalDirection = isLookingRight ? "Right" : "Left";
  } else if (absAngle >= 20 && absAngle <= 40) {
    horizontalDirection = isLookingRight ? "Half Right" : "Half Left";
  } else if (absAngle > 10) {
    // Use the basic threshold approach as fallback for smaller angles
    const horizontalThreshold = eyeDistance * 0.075;
    if (noseTip.x < noseMidpointX - horizontalThreshold) {
      horizontalDirection = "Right";
    } else if (noseTip.x > noseMidpointX + horizontalThreshold) {
      horizontalDirection = "Left";
    }
  }

  // Determine vertical direction using the existing threshold approach
  const verticalThreshold = faceHeight * 0.05;
  const faceCenterY = (forehead.y + chin.y) / 2;
  let verticalDirection = "Center";
  if (noseTip.y < faceCenterY - verticalThreshold) {
    verticalDirection = "Up";
  } else if (noseTip.y > faceCenterY + verticalThreshold) {
    verticalDirection = "Down";
  }

  // Build final face direction string
  let faceDirection = "";
  if (horizontalDirection === "Center" && verticalDirection === "Center") {
    faceDirection = "Front";
  } else {
    faceDirection =
      `${verticalDirection !== "Center" ? verticalDirection : ""} ${horizontalDirection !== "Center" ? horizontalDirection : ""}`.trim();
    if (!faceDirection) faceDirection = "Center";
  }

  // Set directionKey based on face direction
  let directionKey = "front"; // Default value
  if (faceDirection.includes("Front")) directionKey = "front";
  else if (faceDirection.includes("Half Left")) directionKey = "halfLeft";
  else if (faceDirection.includes("Half Right")) directionKey = "halfRight";
  else if (faceDirection.includes("Left")) directionKey = "left";
  else if (faceDirection.includes("Right")) directionKey = "right";
  else if (faceDirection.includes("Up")) directionKey = "up";
  else if (faceDirection.includes("Down")) directionKey = "down";

  return {
    directionKey,
    faceDirection,
    horizontalAngle,
    absAngle,
  };
};

/**
 * Determines if the head is tilted based on facial landmarks.
 *
 * @param {Object[]} landmarks - Array of facial landmark objects, where each object contains normalized positions (x and y) of points.
 * @param {number} width - The width of the frame or canvas, used to scale normalized landmark coordinates.
 * @param {number} height - The height of the frame or canvas, used to scale normalized landmark coordinates.
 * @param {number} [tiltThreshold=20] - The angle in degrees beyond which the head is considered tilted. Default is 20 degrees.
 * @returns {boolean} - Returns `true` if the calculated head tilt angle exceeds the provided tilt threshold, otherwise `false`.
 */
export const isHeadTilted = (landmarks, width, height, tiltThreshold = 30) => {
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
 * Checks whether all points of a face are within a given circle.
 *
 * This function determines if every point in the `facePoints` array lies
 * within or on the boundary of a circle defined by its center coordinates
 * (`centerX`, `centerY`) and radius.
 *
 * @param {Array<{x: number, y: number}>} facePoints - An array of objects representing
 *        the x and y coordinates of points that make up the face.
 * @param {number} centerX - The x-coordinate of the circle's center.
 * @param {number} centerY - The y-coordinate of the circle's center.
 * @param {number} radius - The radius of the circle.
 * @returns {boolean} Returns `true` if all points of the face are within
 *          or on the boundary of the circle; otherwise, returns `false`.
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
 * Updates the dimensions of a canvas element to match those of a container element,
 * and adjusts its display size and internal resolution to align with the dimensions
 * of a video element.
 *
 * @param {HTMLVideoElement} videoElement - The video element whose dimensions will be used as a reference.
 * @param {HTMLCanvasElement} canvasElement - The canvas element to be resized and updated.
 * @param {HTMLElement} containerElement - The container element whose dimensions determine the display size of the canvas.
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
 * Retrieves device information based on the user agent and screen dimensions.
 *
 * @function
 *
 * @returns {Object} An object containing information about the device:
 * - `isMobile` {boolean}: Indicates whether the device is identified as a mobile device.
 * - `orientation` {string}: The current screen orientation, either "portrait" or "landscape".
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

// Sample image object
/**
 * An object representing different possible directions for an image. Each direction is associated with an empty array,
 * which can later hold specific data or objects related to that direction.
 *
 * Properties:
 * - `front`: Represents the front direction.
 * - `left`: Represents the left direction.
 * - `halfLeft`: Represents the half-left direction (diagonal left/front view).
 * - `right`: Represents the right direction.
 * - `halfRight`: Represents the half-right direction (diagonal right/front view).
 * - `down`: Represents the downward direction.
 * - `up`: Represents the upward direction.
 * - `masked_front`: Represents the masked front direction.
 * - `masked_left`: Represents the masked left direction.
 * - `masked_halfLeft`: Represents the masked half-left direction.
 * - `masked_right`: Represents the masked right direction.
 * - `masked_halfRight`: Represents the masked half-right direction.
 * - `masked_down`: Represents the masked downward direction.
 * - `masked_up`: Represents the masked upward direction.
 */
export const ImageDirection = {
  front: [],
  left: [],
  halfLeft: [],
  right: [],
  halfRight: [],
  down: [],
  up: [],
  masked_front: [],
  masked_left: [],
  masked_halfLeft: [],
  masked_right: [],
  masked_halfRight: [],
  masked_down: [],
  masked_up: [],
};

export const ImageDirectionEmb = () =>
  Object.fromEntries(Object.keys(ImageDirection).map((key) => [key, null]));

/**
 * Generates an object representing the state of all image directions, initializing each direction to `false`.
 *
 * This function iterates over all keys in the `ImageDirection` object and sets their values to `false` in the resulting object.
 * It is commonly used to initialize or reset flags related to image direction states.
 *
 * @function CheckImageDirection
 * @returns {Object} An object where each key corresponds to a key in the `ImageDirection` object, and the value is `false`.
 */
export const CheckImageDirection = () =>
  Object.fromEntries(Object.keys(ImageDirection).map((key) => [key, false]));

/**
 * Evaluates whether all specified directions in the `completedDirections` object
 * are marked as completed by checking if their values are `true`.
 *
 * The function checks a predefined list of direction keys:
 * "front", "left", "halfLeft", "right", "halfRight", "down", and "up".
 *
 * @param {Object} completedDirections - An object where keys represent direction names
 * and values denote whether the corresponding direction has been completed (true) or not.
 * @returns {boolean} - Returns `true` if all the predefined direction keys are set to `true`
 * in the `completedDirections` object; otherwise, returns `false`.
 */
export const checkCompletedUnmask = (completedDirections) => {
  const unmaskKeys = [
    "front",
    "left",
    "halfLeft",
    "right",
    "halfRight",
    "down",
    "up",
  ];
  return unmaskKeys.every((key) => completedDirections[key] === true);
};

/**
 * Determines if all processes in a set of directions have been completed.
 *
 * @param {Object} completedDirections - An object where the keys represent directions or tasks,
 * and the values are boolean flags indicating whether the corresponding process is completed.
 * @returns {boolean} Returns true if all processes are completed (i.e., all values in the object are true); otherwise, returns false.
 */
export const checkCompletedProcess = (completedDirections) => {
  for (const direction of Object.keys(completedDirections)) {
    if (!completedDirections[direction]) {
      return false;
    }
  }
  return true;
};

/**
 * Determines the first uncompleted direction from a given object of directions.
 *
 * This function iterates through the provided `completedDirections` object, where
 * each key represents a direction (e.g., "north", "south") and the corresponding
 * value is a boolean indicating whether the direction is completed (true) or not (false).
 * The function returns the first key (direction) with a value of `false`. If all
 * directions are completed, or if the input is invalid, the function returns `null`.
 *
 * @param {Object} completedDirections - An object where keys are direction names and values are booleans.
 * @returns {string|null} The first uncompleted direction as a string, or null if all directions are completed or input is invalid.
 */
export const FirstUnCompletedDirection = (completedDirections) => {
  if (!completedDirections || typeof completedDirections !== "object") {
    return null;
  }

  // Iterate through all directions in the object
  for (const direction in completedDirections) {
    // If a direction is found that is not completed (false), return it
    if (!completedDirections[direction]) {
      return direction;
    }
  }
  return null;
};

/**
 * Calculates the total count of completed directions.
 *
 * This function iterates through the provided directions object
 * and counts how many directions have been marked as completed
 * (i.e., their value evaluates to a truthy value).
 *
 * @param {Object} completedDirections - An object where keys represent directions
 *        and the corresponding values indicate whether the direction is completed.
 *        A truthy value signifies completion, whereas falsy indicates otherwise.
 * @returns {number} The count of completed directions.
 */
export const CompletedDirectionLength = (completedDirections) => {
  let count = 0;
  for (const direction in completedDirections) {
    if (completedDirections[direction]) {
      count++;
    }
  }
  return count;
};
