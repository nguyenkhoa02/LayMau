import React, { useCallback, useEffect, useRef, useState } from "react";
// import vision from "https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.22-rc.20250304/+esm";
import { AlertCircle, Camera, CameraOff, RotateCcw } from "lucide-react";
import { ImageEmbedder } from "@mediapipe/tasks-vision";
import PropTypes from "prop-types";
import * as tf from "@tensorflow/tfjs";
import {
  getDeviceInfo,
  base64ToImageData,
  detectMask,
  determineFaceDirection,
  isHeadTilted,
  isFaceInCircle,
} from "../../../helper/utils/LayMau";

const vision = await import(
  "https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.22-rc.20250304/+esm"
);

const { FaceLandmarker, FilesetResolver } = vision || {};
if (!FaceLandmarker || !FilesetResolver) {
  console.error("Failed to load Mediapipe vision components.");
  console.error("Failed to load Mediapipe vision components.");
}

const WebStream = ({ images, setImages, totalImages }) => {
  const videoRef = useRef(null);
  const canvasRef = useRef(null);
  const streamRef = useRef(null);
  const containerRef = useRef(null);

  const [faceLandmarker, setFaceLandmarker] = useState(null);
  const [isStreaming, setIsStreaming] = useState(false);
  const [error, setError] = useState(null);

  const [imageEmbedder, setImageEmbedder] = useState(null);

  const [isMobileDevice, setIsMobileDevice] = useState(false);
  const [orientation, setOrientation] = useState("landscape");
  const progress = useRef(0);
  const lastCaptureTime = useRef(0);
  const captureDelay = 1500; // 1.5 seconds delay
  const embsRef = useRef([]);
  const imageRef = useRef({
    front: [],
    left: [],
    right: [],
    down: [],
    up: [],
    // New masked direction properties
    masked_front: [],
    masked_left: [],
    masked_right: [],
    masked_down: [],
    masked_up: [],
  });
  const textRef = useRef("Position your face in the circle");
  const [direction, setDirection] = useState([]);
  const currentDirectionIndex = useRef(0);
  const limit = totalImages / 10; // Adjust limit for 10 categories (5 normal + 5 masked)
  const [maskModel, setMaskModel] = useState(null);

  const face_mask_classification_model_url = "tfjs/face_mask/model.json";

  const completedDirections = useRef({
    front: false,
    left: false,
    right: false,
    up: false,
    down: false,
    masked_front: false,
    masked_left: false,
    masked_right: false,
    masked_up: false,
    masked_down: false,
  });

  useEffect(() => {
    let isMounted = true;
    let loadedModel;

    const loadModel = async () => {
      console.log("Setting TensorFlow.js to CPU backend...");
      await tf.setBackend("cpu");
      console.log("Loading TensorFlow.js model...");
      loadedModel = await tf.loadLayersModel(
        face_mask_classification_model_url,
      );
      console.log("Loading TensorFlow.js model...");
      if (isMounted) {
        setMaskModel(loadedModel);
      }
    };

    loadModel();

    return () => {
      isMounted = false;
      if (loadedModel) {
        loadedModel.dispose();
        console.log("Mask model disposed.");
      }
    };
  }, []);

  useEffect(() => {
    if (!images) return;
    // Ensure our directions include both normal and masked variants
    let allDirections = Object.keys(images).filter(
      (dir) => !dir.startsWith("masked_"),
    );
    // Add masked directions if not already present
    const maskedDirections = allDirections.map((dir) => `masked_${dir}`);
    setDirection([...allDirections, ...maskedDirections]);
  }, [images]);

  useEffect(() => {
    const checkMobileDevice = () => {
      const { isMobile } = getDeviceInfo();
      setIsMobileDevice(isMobile);
      updateOrientation();
    };
    checkMobileDevice();
    window.addEventListener("resize", updateOrientation);
    return () => window.removeEventListener("resize", updateOrientation);
  }, []);

  useEffect(() => {
    const loadFaceLandmarker = async () => {
      try {
        const filesetResolver = await FilesetResolver.forVisionTasks(
          "https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision/wasm",
        );

        const landmarker = await FaceLandmarker.createFromOptions(
          filesetResolver,
          {
            baseOptions: {
              modelAssetPath:
                "https://storage.googleapis.com/mediapipe-models/face_landmarker/face_landmarker/float16/1/face_landmarker.task",
              delegate: "CPU",
            },
            outputFaceBlendshapes: true,
            runningMode: "VIDEO",
            numFaces: 1,
            minDetectionConfidence: 0.5,
            minTrackingConfidence: 0.5,
          },
        );

        setFaceLandmarker(landmarker);
      } catch (err) {
        console.error("Error loading FaceLandmarker:", err);
        setError("Failed to load face detection model.");
      }
    };

    loadFaceLandmarker();
  }, []);

  useEffect(() => {
    const loadImageEmbedder = async () => {
      try {
        const vision = await FilesetResolver.forVisionTasks(
          "https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision/wasm",
        );
        const embedder = await ImageEmbedder.createFromOptions(vision, {
          baseOptions: {
            modelAssetPath: `https://storage.googleapis.com/mediapipe-models/image_embedder/mobilenet_v3_small/float32/1/mobilenet_v3_small.tflite`,
            delegate: "CPU",
          },
        });
        setImageEmbedder(embedder);
      } catch (e) {
        console.error("Error loading ImageEmbedder:", e);
        setError("Failed to load embedding model.");
      }
    };
    loadImageEmbedder();
  }, []);

  const updateOrientation = () => {
    const isPortrait = window.innerHeight > window.innerWidth;
    setOrientation(isPortrait ? "portrait" : "landscape");
  };

  // Start video stream from webcam with proper resolution
  const startStream = async () => {
    try {
      if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        setError("Browser does not support camera");
        return;
      }

      const constraints = {
        video: {
          facingMode: "user",
        },
      };

      const stream = await navigator.mediaDevices.getUserMedia(constraints);

      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        streamRef.current = stream;
        setIsStreaming(true);
        setError(null);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to access webcam");
      setIsStreaming(false);
    }
  };

  const stopStream = () => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => track.stop());
      if (videoRef.current) {
        videoRef.current.srcObject = null;
      }
      streamRef.current = null;
      setIsStreaming(false);
    }
  };

  const restartStream = useCallback(() => {
    if (isStreaming) {
      stopStream();
      setTimeout(() => startStream(), 500);
    }
  }, [isStreaming]);

  // Update canvas dimensions when video size changes
  const updateCanvasDimensions = useCallback(() => {
    if (!videoRef.current || !canvasRef.current || !containerRef.current)
      return;

    const video = videoRef.current;
    const canvas = canvasRef.current;
    const container = containerRef.current;
    const containerRect = container.getBoundingClientRect();
    const { width: containerWidth, height: containerHeight } = containerRect;

    // Get actual video dimensions
    const { videoWidth, videoHeight } = video;
    if (videoWidth === 0 || videoHeight === 0) return;

    // Set canvas display size to match container
    canvas.style.width = `${containerWidth}px`;
    canvas.style.height = `${containerHeight}px`;

    // Set canvas internal dimensions to match video for proper drawing
    canvas.width = containerWidth;
    canvas.height = containerHeight;
  }, []);

  const cropFace = (landmarks) => {
    if (!videoRef.current) return null;

    let minX = Infinity,
      minY = Infinity,
      maxX = -Infinity,
      maxY = -Infinity;
    landmarks.forEach((point) => {
      minX = Math.min(minX, point.x * videoRef.current.videoWidth);
      minY = Math.min(minY, point.y * videoRef.current.videoHeight);
      maxX = Math.max(maxX, point.x * videoRef.current.videoWidth);
      maxY = Math.max(maxY, point.y * videoRef.current.videoHeight);
    });

    const XPadding = 10;
    const YPadding = 10;
    const cropX = Math.max(0, minX - XPadding);
    const cropY = Math.max(0, minY - YPadding);
    const cropWidth = Math.min(
      videoRef.current.videoWidth - cropX,
      maxX - cropX + 2 * XPadding,
    );
    const cropHeight = Math.min(
      videoRef.current.videoHeight - cropY,
      maxY - cropY + 2 * YPadding,
    );

    // Create temporary canvas for cropping
    const tempCanvas = document.createElement("canvas");
    tempCanvas.width = cropWidth;
    tempCanvas.height = cropHeight;
    const tempCtx = tempCanvas.getContext("2d");

    // Get image directly from video (without filter)
    tempCtx.drawImage(
      videoRef.current,
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

  const getNextIncompleteDirection = () => {
    for (let i = 0; i < direction.length; i++) {
      const dir = direction[i];
      if (!completedDirections.current[dir]) {
        return { direction: dir, index: i };
      }
    }
    return null; // All directions are complete
  };

  // Update the current direction if the current one is complete
  const updateCurrentDirectionIfComplete = useCallback(() => {
    const currentDir = direction[currentDirectionIndex.current];

    if (currentDir && imageRef.current[currentDir]?.length >= limit) {
      completedDirections.current[currentDir] = true;

      // Find next incomplete direction
      const next = getNextIncompleteDirection();
      if (next) {
        currentDirectionIndex.current = next.index;
      }
    }
  }, [direction, limit]);

  const predictWebcam = useCallback(async () => {
    if (
      !videoRef.current ||
      !canvasRef.current ||
      !faceLandmarker ||
      !isStreaming
    )
      return;

    const video = videoRef.current;
    if (video.videoWidth === 0 || video.videoHeight === 0) return;

    const canvas = canvasRef.current;
    const ctx = canvas.getContext("2d");

    // Make sure canvas is properly sized
    updateCanvasDimensions();

    const startTimeMs = performance.now();

    try {
      const results = faceLandmarker.detectForVideo(video, startTimeMs);

      // Calculate the appropriate circle size based on the video dimensions
      const videoWidth = canvas.width;
      const videoHeight = canvas.height;
      const smallerDimension = Math.min(videoWidth, videoHeight);

      // Circle should be centered in the frame
      const centerX = videoWidth / 2;
      const centerY = videoHeight / 2;

      // Make the circle 70% of the smaller dimension
      const radius = smallerDimension * (isMobileDevice ? 0.4 : 0.4);

      // Clear the canvas
      ctx.clearRect(0, 0, canvas.width, canvas.height);

      // Draw semi-transparent overlay
      ctx.fillStyle = "rgba(128, 128, 128, 0.6)";
      ctx.fillRect(0, 0, canvas.width, canvas.height);

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
      const totalDirectionsToCapture = direction.length; // 10 directions (5 normal, 5 masked)
      const progressPercentage =
        progress.current / (limit * totalDirectionsToCapture);
      ctx.beginPath();
      ctx.arc(
        centerX,
        centerY,
        radius,
        -Math.PI / 2, // Start at -90 degrees (12 o'clock)
        Math.PI * 2 * progressPercentage - Math.PI / 2, // End angle based on progress
      );
      ctx.stroke();

      // Check if we need to update current direction
      updateCurrentDirectionIfComplete();

      if (results.faceLandmarks && results.faceLandmarks.length > 0) {
        for (const landmarks of results.faceLandmarks) {
          const facePoints = landmarks.map((point) => ({
            x: point.x * canvas.width,
            y: point.y * canvas.height,
          }));

          if (isFaceInCircle(facePoints, centerX, centerY, radius)) {
            textRef.current = "";

            const tiltThreshold = 20;

            if (
              !isHeadTilted(
                landmarks,
                canvas.width,
                canvas.height,
                tiltThreshold,
              )
            ) {
              // Check if the user is wearing a mask
              let isWearingMask;
              await detectMask(cropFace(landmarks), maskModel)
                .then((mask) => {
                  isWearingMask = mask;
                  console.log("Mask detected:", mask);
                })
                .catch((error) => {
                  isWearingMask = false;
                  console.error("Error detecting mask:", error);
                });
              const { directionKey, faceDirection } =
                determineFaceDirection(landmarks);
              const currentTargetDirection =
                direction[currentDirectionIndex.current];
              const isMaskedDirectionTarget =
                currentTargetDirection?.startsWith("masked_");
              if (
                (isMaskedDirectionTarget && !isWearingMask) ||
                (!isMaskedDirectionTarget && isWearingMask)
              ) {
                if (isMaskedDirectionTarget) {
                  textRef.current = "Please wear a mask for this sample";
                } else {
                  textRef.current = "Please remove mask for this sample";
                }
              } else {
                const baseTargetDirection = isMaskedDirectionTarget
                  ? currentTargetDirection.replace("masked_", "")
                  : currentTargetDirection;
                const currentImageKey = isMaskedDirectionTarget
                  ? `masked_${directionKey}`
                  : directionKey;

                if (directionKey !== baseTargetDirection) {
                  textRef.current = `Please face ${baseTargetDirection}`;
                } else {
                  textRef.current = "";
                  const currentTime = performance.now();

                  if (currentTime - lastCaptureTime.current >= captureDelay) {
                    const faceImage = cropFace(landmarks);
                    if (faceImage && imageEmbedder) {
                      let imageData = await base64ToImageData(faceImage);
                      const embResult = await imageEmbedder.embed(imageData);
                      if (
                        embResult &&
                        embResult.embeddings &&
                        embResult.embeddings.length > 0
                      ) {
                        const emb = embResult.embeddings[0];

                        if (
                          emb &&
                          emb.floatEmbedding &&
                          embsRef.current.length === 0
                        ) {
                          embsRef.current = [emb];

                          // Initialize the array if it doesn't exist
                          if (!imageRef.current[currentImageKey]) {
                            imageRef.current[currentImageKey] = [];
                          }

                          const prevImg = imageRef.current[currentImageKey];
                          imageRef.current[currentImageKey] = [
                            ...prevImg,
                            faceImage,
                          ].slice(0, limit);

                          setImages((prev) => ({
                            ...prev,
                            [currentImageKey]:
                              imageRef.current[currentImageKey],
                          }));
                          progress.current = progress.current + 1;
                          lastCaptureTime.current = currentTime;
                        } else {
                          const similarities = embsRef.current.map(
                            (existingEmb) =>
                              ImageEmbedder.cosineSimilarity(emb, existingEmb),
                          );

                          const rate = Math.max(...similarities);
                          if (
                            (rate <= 0.85 && embsRef.current.length === 1) ||
                            (rate >= 0.5 && rate <= 0.85)
                          ) {
                            // Initialize the array if it doesn't exist
                            if (!imageRef.current[currentImageKey]) {
                              imageRef.current[currentImageKey] = [];
                            }

                            const prevImg = imageRef.current[currentImageKey];
                            imageRef.current[currentImageKey] = [
                              ...prevImg,
                              faceImage,
                            ].slice(0, limit);

                            setImages((prev) => ({
                              ...prev,
                              [currentImageKey]:
                                imageRef.current[currentImageKey],
                            }));

                            if (
                              imageRef.current[currentImageKey].length <=
                                limit &&
                              !(
                                typeof totalImages === "number" &&
                                progress.current >= totalImages
                              )
                            ) {
                              embsRef.current = [...embsRef.current, emb];
                              progress.current = progress.current + 1;
                            } else {
                              return;
                            }
                          }
                          lastCaptureTime.current = currentTime;
                        }
                      }
                    }
                  }
                }
              }

              // Display face direction and mask status
              ctx.fillStyle = "#FF0000";
              ctx.font = "18px Arial";
              ctx.fillText(`Face: ${faceDirection}`, 10, 30);

              ctx.fillStyle = isWearingMask ? "#00AA00" : "#FFAA00";
              console.log("Mask log:", isWearingMask);
              ctx.fillText(isWearingMask ? "Mask: Yes" : "Mask: No", 10, 60);

              // Show target mode
              const targetDirection = direction[currentDirectionIndex.current];
              if (targetDirection) {
                ctx.fillStyle = "#FFFFFF";
                ctx.fillText(`Target: ${targetDirection}`, 10, 90);

                // Show count for current direction
                const count = imageRef.current[targetDirection]?.length || 0;
                ctx.fillText(`Progress: ${count}/${limit}`, 10, 120);
              }
            } else {
              textRef.current = "Please keep your head straight";
            }
          } else {
            textRef.current = "Position your face in the circle";
          }
        }

        // Display instructions
        const fontSize = Math.max(
          16,
          Math.min(canvas.width, canvas.height) * 0.02,
        );
        ctx.font = `${fontSize}px Arial`;
        ctx.fillStyle = "#FFFFFF";
        ctx.textAlign = "center";
        ctx.fillText(
          textRef.current,
          centerX,
          centerY + radius + fontSize * 1.5,
        );

        // Show overall completion status
        const completed = Object.values(completedDirections.current).filter(
          Boolean,
        ).length;
        const total = Object.keys(completedDirections.current).length;

        ctx.fillStyle = "#4CAF50";
        ctx.font = `bold ${fontSize}px Arial`;
        ctx.textAlign = "center";
        ctx.fillText(
          `Completed: ${completed}/${total} directions`,
          centerX,
          centerY - radius - fontSize,
        );
      }
    } catch (err) {
      console.error("Face detection error:", err);
      setError("Face detection failed. Try restarting the camera.");
    }

    requestAnimationFrame(predictWebcam);
  }, [
    faceLandmarker,
    isStreaming,
    updateCanvasDimensions,
    isMobileDevice,
    totalImages,
    images,
    imageEmbedder,
    setImages,
    direction,
    limit,
    updateCurrentDirectionIfComplete,
  ]);

  // Reset all captured images
  const resetAllSamples = () => {
    // Reset image references
    Object.keys(imageRef.current).forEach((key) => {
      imageRef.current[key] = [];
    });

    // Reset state
    setImages({
      front: [],
      left: [],
      right: [],
      down: [],
      up: [],
      masked_front: [],
      masked_left: [],
      masked_right: [],
      masked_down: [],
      masked_up: [],
    });

    // Reset tracking variables
    embsRef.current = [];
    progress.current = 0;
    lastCaptureTime.current = 0;

    // Reset completion status
    Object.keys(completedDirections.current).forEach((key) => {
      completedDirections.current[key] = false;
    });

    // Reset to first direction
    currentDirectionIndex.current = 0;
  };

  // Handle window resize
  useEffect(() => {
    const handleResize = () => {
      updateCanvasDimensions();
      updateOrientation();
    };

    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, [updateCanvasDimensions]);

  // Handle device orientation change
  useEffect(() => {
    const handleOrientationChange = () => {
      // Small delay to allow the browser to complete rotation
      setTimeout(() => {
        updateOrientation();
        if (isStreaming) {
          restartStream();
        }
      }, 300);
    };

    if (isMobileDevice) {
      window.addEventListener("orientationchange", handleOrientationChange);
      return () =>
        window.removeEventListener(
          "orientationchange",
          handleOrientationChange,
        );
    }
  }, [isStreaming, isMobileDevice, restartStream]);

  // Start face detection when video is ready
  useEffect(() => {
    const handleVideoMetadata = () => {
      updateCanvasDimensions();
      if (isStreaming && faceLandmarker) {
        predictWebcam();
      }
    };

    const videoElement = videoRef.current;
    if (videoElement) {
      videoElement.addEventListener("loadedmetadata", handleVideoMetadata);
      return () =>
        videoElement.removeEventListener("loadedmetadata", handleVideoMetadata);
    }
  }, [isStreaming, faceLandmarker, predictWebcam, updateCanvasDimensions]);

  // Clean up on unmount
  useEffect(() => {
    return () => stopStream();
  }, []);

  // Check if capture is complete
  useEffect(() => {
    const allDirectionsComplete =
      direction.length > 0 &&
      direction.every((dir) => imageRef.current[dir]?.length >= limit);

    if (
      allDirectionsComplete ||
      (typeof totalImages === "number" && progress.current >= totalImages)
    ) {
      console.log("Capture complete:", progress.current, totalImages);
      stopStream();
    }
  }, [progress.current, totalImages, direction, limit]);

  return (
    <div className="w-full max-w-3xl mx-auto p-2 md:p-4">
      {error && (
        <div className="mb-4 p-3 bg-red-50 rounded-lg flex items-center text-red-700 text-sm">
          <AlertCircle className="h-4 w-4 mr-2 flex-shrink-0" />
          <span>{error}</span>
        </div>
      )}
      <div className="relative">
        <div
          ref={containerRef}
          className={`relative bg-gray-900 rounded-lg overflow-hidden ${
            isMobileDevice && orientation === "portrait"
              ? "aspect-[9/16] md:aspect-[3/4]"
              : "aspect-video"
          }`}
        >
          <video
            ref={videoRef}
            autoPlay
            playsInline
            muted
            className="w-full h-full object-cover "
            style={{ transform: "scaleX(-1)" }}
          />
          <canvas ref={canvasRef} className="absolute top-0 left-0" />

          {!isStreaming && !error && (
            <div className="absolute inset-0 flex items-center justify-center bg-gray-800 text-white">
              <p className="text-center text-sm md:text-base px-4">
                Click the start button to enable webcam
              </p>
            </div>
          )}
        </div>
        <div className="mt-3 flex justify-center gap-2">
          <button
            onClick={isStreaming ? stopStream : startStream}
            className={`px-4 py-2 rounded-lg flex items-center text-sm md:text-base ${
              isStreaming
                ? "bg-red-600 hover:bg-red-700 text-white"
                : "bg-blue-600 hover:bg-blue-700 text-white"
            }`}
          >
            {isStreaming ? (
              <>
                <CameraOff className="h-4 w-4 mr-1 md:h-5 md:w-5 md:mr-2" />
                <span className="hidden xs:inline">Stop</span> Camera
              </>
            ) : (
              <>
                <Camera className="h-4 w-4 mr-1 md:h-5 md:w-5 md:mr-2" />
                <span className="xs:inline">Start </span> Camera
              </>
            )}
          </button>

          {isStreaming && (
            <button
              onClick={restartStream}
              className="px-4 py-2 rounded-lg flex items-center bg-gray-600 hover:bg-gray-700 text-white text-sm md:text-base"
            >
              <RotateCcw className="h-4 w-4 mr-1 md:h-5 md:w-5 md:mr-2" />
              <span className="xs:inline">Restart </span> Camera
            </button>
          )}
          <button
            onClick={resetAllSamples}
            className="px-4 py-2 rounded-lg flex items-center bg-gray-600 hover:bg-gray-700 text-white text-sm md:text-base"
          >
            <RotateCcw className="h-4 w-4 mr-1 md:h-5 md:w-5 md:mr-2" />
            <span className="xs:inline">Reset</span>
          </button>
        </div>
      </div>
    </div>
  );
};

WebStream.propTypes = {
  images: PropTypes.array,
  setImages: PropTypes.func.isRequired,
  totalImages: PropTypes.number,
};

export default WebStream;
