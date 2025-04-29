import React, { useCallback, useEffect, useRef, useState } from "react";
import { AlertCircle, Camera, CameraOff, RotateCcw } from "lucide-react";
import PropTypes from "prop-types";
import {
  base64ToImageData,
  checkCompletedProcess,
  checkCompletedUnmask,
  CheckImageDirection,
  CompletedDirectionLength,
  cropFace,
  detectMask,
  determineFaceDirectionWithHorizontalAngle,
  FirstUnCompletedDirection,
  getDeviceInfo,
  ImageDirection,
  isFaceInCircle,
  isHeadTilted,
} from "../../../helper/utils/LayMau";
import * as tf from "@tensorflow/tfjs";
import { ImageEmbedder } from "@mediapipe/tasks-vision";

/**
 * The `vision` variable represents an asynchronously imported module for the MediaPipe Vision Tasks library.
 * It provides advanced computer vision functionalities for building applications that perform real-time
 * image and video analysis, such as object detection, face tracking, and more.
 *
 * The MediaPipe Vision Tasks library offers a set of prebuilt machine learning (ML) models and tools
 * designed for various vision-based applications that can run efficiently on client devices.
 *
 * The imported module uses the ES module format and is retrieved from a specified CDN (Content Delivery Network).
 *
 * Note: Ensure network availability when importing this module dynamically from the CDN. This module
 * relies on the @mediapipe/tasks-vision library, and the specific version number is defined within the
 * module URL.
 *
 * Available through MediaPipe Tasks Vision library:
 * - Image/ImageFrame processing
 * - Preprocessing utilities for vision models
 * - Specialized APIs for running ML workflows
 */
const vision = await import(
  "https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.22-rc.20250304/+esm"
);

const { FaceLandmarker, FilesetResolver } = vision || {};
if (!FaceLandmarker || !FilesetResolver) {
  console.error("Failed to load Mediapipe vision components.");
  console.error("Failed to load Mediapipe vision components.");
}

/**
 * Handles operations related to live webcam streaming and image processing.
 * This includes starting/stopping the webcam, detecting images, processing face landmarks, saving captured images, and updating UI elements.
 *
 * @param {Object} config - Configuration object containing required parameters for the WebStream.
 * @param {Object} config.images - An object that stores images categorized by direction keys.
 * @param {Function} config.setImages - A state updater function to update image data.
 * @param {number} config.totalImages - The total number of images required to complete the process.
 * @return {void} This method does not return a value.
 */
const WebStream = ({ images, setImages, totalImages }) => {
  const videoRef = useRef(null);
  const canvasRef = useRef(null);
  const streamRef = useRef(null);
  const containerRef = useRef(null);
  const maskDetectionRef = useRef(false);

  const [faceLandmarker, setFaceLandmarker] = useState(null);
  const [isStreaming, setIsStreaming] = useState(false);
  const [error, setError] = useState(null);
  const [imageEmbedder, setImageEmbedder] = useState(null);
  const [isMobileDevice, setIsMobileDevice] = useState(false);
  const [orientation, setOrientation] = useState("landscape");
  const progress = useRef(0);
  const lastCaptureTime = useRef(0);
  const captureDelay = 500; // 0.5 seconds delay
  const embsRef = useRef(structuredClone(ImageDirection));
  const imageRef = useRef(structuredClone(ImageDirection));
  const completedDirections = useRef(CheckImageDirection());
  const intructionRef = useRef("Position your face in the circle");
  const limit = 1;
  const [maskModel, setMaskModel] = useState(null);

  // Update canvas dimensions based on the container size
  const updateCanvasDimensions = useCallback(() => {
    if (!videoRef.current || !canvasRef.current || !containerRef.current)
      return;
    const video = videoRef.current;
    const canvas = canvasRef.current;
    const container = containerRef.current;
    const containerRect = container.getBoundingClientRect();
    const { width: containerWidth, height: containerHeight } = containerRect;

    const { videoWidth, videoHeight } = video;
    if (videoWidth === 0 || videoHeight === 0) return;

    canvas.style.width = `${containerWidth}px`;
    canvas.style.height = `${containerHeight}px`;

    canvas.width = containerWidth;
    canvas.height = containerHeight;
  }, []);

  // Update orientation based on window dimensions
  const updateOrientation = () => {
    const isPortrait = window.innerHeight > window.innerWidth;
    setOrientation(isPortrait ? "portrait" : "landscape");
  };

  // Start the webcam stream
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

  // Stop the webcam stream
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

  // Restart the webcam stream
  const restartStream = useCallback(() => {
    if (isStreaming) {
      stopStream();
      setTimeout(() => startStream(), 500);
    }
  }, [isStreaming]);

  const resetStream = () => {
    // Reset image references
    Object.keys(imageRef.current).forEach((key) => {
      imageRef.current[key] = [];
    });

    // Reset state
    setImages(ImageDirection);

    // Reset tracking variables
    embsRef.current = [];
    progress.current = 0;
    lastCaptureTime.current = 0;

    // Reset completion status
    completedDirections.current = CheckImageDirection();
    maskDetectionRef.current = false;
  };

  // Save the image to the local storage
  const saveImage = async (faceImage, directionKey) => {
    const isMasked = await detectMask(faceImage, maskModel);

    // Check if the image should be saved
    const checkMasked =
      (isMasked && maskDetectionRef.current) ||
      (!isMasked && !maskDetectionRef.current);
    directionKey = isMasked ? "masked_" + directionKey : directionKey;

    if (checkMasked) {
      if (!imageRef.current[directionKey]) {
        imageRef.current[directionKey] = [];
      }

      const prevImg = imageRef.current[directionKey];
      imageRef.current[directionKey] = [...prevImg, faceImage].slice(0, limit);
      setImages((prev) => ({
        ...prev,
        [directionKey]: imageRef.current[directionKey],
      }));
      completedDirections.current[directionKey] = true;
      return true;
    } else return false;
  };

  // Predict using the webcam stream
  const predictWebcam = useCallback(async () => {
    // Check if the video and canvas elements are available
    if (
      !videoRef.current ||
      !canvasRef.current ||
      !faceLandmarker ||
      !isStreaming
    )
      return;

    // Get the video and canvas elements
    const video = videoRef.current;
    // Check if the video is playing
    if (video.videoWidth === 0 || video.videoHeight === 0) return;

    // Get the canvas context
    const canvas = canvasRef.current;
    const ctx = canvas.getContext("2d");

    // Set the canvas dimensions
    updateCanvasDimensions();

    // Get timestamp
    const startTimeMs = performance.now();
    // Start the face detection
    try {
      const faceResults = await faceLandmarker.detectForVideo(
        video,
        startTimeMs,
      );

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
      const progressPercentage =
        CompletedDirectionLength(completedDirections.current) /
        (limit * totalImages);
      ctx.beginPath();
      ctx.arc(
        centerX,
        centerY,
        radius,
        -Math.PI / 2, // Start at -90 degrees (12 o'clock)
        Math.PI * 2 * progressPercentage - Math.PI / 2, // End angle based on progress
      );
      ctx.stroke();

      if (
        faceResults.faceLandmarks.length &&
        faceResults.faceLandmarks.length > 0
      ) {
        for (const landmarks of faceResults.faceLandmarks) {
          const facePoints = landmarks.map((point) => ({
            x: point.x * canvas.width,
            y: point.y * canvas.height,
          }));

          const isFaceInZone = isFaceInCircle(
            facePoints,
            centerX,
            centerY,
            radius,
          );

          // Check if the head is tilted, Tilt Threshold is 20 degrees
          if (
            isFaceInZone &&
            !isHeadTilted(landmarks, canvas.width, canvas.height, 20)
          ) {
            intructionRef.current = "";
            const { directionKey: initialDirectionKey } =
              determineFaceDirectionWithHorizontalAngle(landmarks);
            const faceImage = cropFace(video, landmarks);
            const directionKey = initialDirectionKey;
            const tempDirectionKey = maskDetectionRef.current
              ? "masked_" + directionKey
              : directionKey;
            console.log("tempDirectionKey: ", tempDirectionKey);
            const currentTime = performance.now();
            if (
              !completedDirections.current[tempDirectionKey] &&
              currentTime - lastCaptureTime.current >= captureDelay
            ) {
              let imageData = await base64ToImageData(faceImage);
              const embResult = await imageEmbedder.embed(imageData);
              if (
                embResult &&
                embResult.embeddings &&
                embResult.embeddings.length > 0
              ) {
                const emb = embResult.embeddings[0];

                console.log(embsRef.current);

                if (emb && emb.floatEmbedding) {
                  if (
                    Object.values(embsRef.current).every(
                      (arr) => arr.length === 0,
                    )
                  ) {
                    const saved = await saveImage(faceImage, directionKey);
                    if (saved) {
                      embsRef.current[directionKey] = emb;

                      progress.current = progress.current + 1;
                      lastCaptureTime.current = currentTime;
                    }
                  } else {
                    const similarities = Object.values(embsRef.current)
                      .flat()
                      .map((existingEmb) =>
                        ImageEmbedder.cosineSimilarity(emb, existingEmb),
                      );
                    const rate = Math.max(...similarities);
                    console.log("rate: ", rate);
                    if (
                      (rate <= 0.85 &&
                        Object.values(embsRef.current).length === 1) ||
                      (rate >= 0.5 && rate <= 0.85) ||
                      (rate >= 0.45 && maskDetectionRef.current)
                    ) {
                      const saved = await saveImage(faceImage, directionKey);
                      lastCaptureTime.current = currentTime;
                      if (
                        imageRef.current[directionKey].length <= limit &&
                        !(
                          typeof totalImages === "number" &&
                          progress.current >= totalImages
                        ) &&
                        saved
                      ) {
                        embsRef.current[directionKey] = emb;
                        progress.current = progress.current + 1;
                      }
                    }
                  }
                }
              }
            }

            const firstDirectionKey = FirstUnCompletedDirection(
              completedDirections.current,
            );

            intructionRef.current = `Please face ${firstDirectionKey} in the circle`;
            ctx.fillStyle = "#FFFFFF";
            ctx.font = "18px Arial";
            ctx.fillText(`Face: ${directionKey}`, 10, 30);

            if (maskDetectionRef.current) {
              // Draw indication that user should wear a mask
              const fontSize = Math.max(
                16,
                Math.min(canvas.width, canvas.height) * 0.02,
              );
              ctx.fillStyle = "#FFFFFF";
              ctx.textAlign = "center";
              ctx.font = `${fontSize}px Arial`;
              ctx.fillText(
                "Please put on a mask",
                centerX,
                centerY - radius - fontSize * 1.25,
              );
            }
          } else {
            intructionRef.current =
              "Position your face in the circle and keep your head straight";
          }
        }
      }

      const fontSize = Math.max(
        16,
        Math.min(canvas.width, canvas.height) * 0.02,
      );
      ctx.font = `${fontSize}px Arial`;
      ctx.fillStyle = "#FFFFFF";
      ctx.textAlign = "center";
      ctx.fillText(
        ` ${intructionRef.current}`,
        centerX,
        centerY + radius + fontSize * 1.5,
      );

      if (checkCompletedUnmask(completedDirections.current)) {
        console.log("All unmasked images collected, switching to mask mode");
        maskDetectionRef.current = true;
      }

      if (checkCompletedProcess(completedDirections.current)) {
        stopStream();
        return;
      }
    } catch (error) {
      console.error("Error during face detection:", error);
    }

    requestAnimationFrame(predictWebcam);
  }, [
    faceLandmarker,
    updateCanvasDimensions,
    isStreaming,
    images,
    setImages,
    totalImages,
    completedDirections,
    limit,
  ]);

  // Check if the device is mobile and update orientation
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

  // Load the FaceLandmarker model
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

  // Load the ImageEmbedder model
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

  // Load the TensorFlow.js model for mask classification
  useEffect(() => {
    let isMounted = true;
    let loadedModel;
    const face_mask_classification_model_url = "tfjs/face_mask/model.json";
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

    loadModel().then();

    return () => {
      isMounted = false;
      if (loadedModel) {
        loadedModel.dispose();
        console.log("Mask model disposed.");
      }
    };
  }, []);

  // Update canvas dimensions and orientation on window resize
  useEffect(() => {
    const handleResize = () => {
      updateCanvasDimensions();
      updateOrientation();
    };

    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, [updateCanvasDimensions]);

  // Stop the webcam stream when the component unmounts
  useEffect(() => {
    return () => stopStream();
  }, []);

  // Update canvas dimensions and start prediction when the video metadata is loaded
  useEffect(() => {
    // Check if the video element is available
    const handleVideoMetadata = () => {
      updateCanvasDimensions();
      if (isStreaming && faceLandmarker) {
        predictWebcam();
      }
    };
    // Check if the video element is available
    const videoElement = videoRef.current;
    if (videoElement) {
      videoElement.addEventListener("loadedmetadata", handleVideoMetadata);
      return () =>
        videoElement.removeEventListener("loadedmetadata", handleVideoMetadata);
    }
  }, [isStreaming, faceLandmarker, predictWebcam, updateCanvasDimensions]);

  // Add this to the WebStream3 component, in the useEffect section
  useEffect(() => {
    // Event listener for direction deleted event
    const handleDirectionDeleted = (event) => {
      const { directionKey } = event.detail;

      // Mark the direction as incomplete
      if (completedDirections.current[directionKey]) {
        completedDirections.current[directionKey] = false;
        imageRef.current[directionKey] = [];
        embsRef.current[directionKey] = [];
        maskDetectionRef.current = checkCompletedUnmask(
          completedDirections.current,
        );

        // If the stream is stopped, restart it to continue capturing
        if (!isStreaming && faceLandmarker && imageEmbedder && maskModel) {
          startStream().then(() => {
            console.log("Stream restarted after direction deletion");
          });
        }
      }
    };

    // Add the event listener
    window.addEventListener("directionDeleted", handleDirectionDeleted);

    // Clean up event listener
    return () => {
      window.removeEventListener("directionDeleted", handleDirectionDeleted);
    };
  }, [isStreaming, faceLandmarker, imageEmbedder, maskModel]);

  // Start the webcam stream when the component mounts
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
            onClick={resetStream}
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

/**
 * PropTypes definition for the WebStream component.
 *
 * This defines the expected types and requirements for the props
 * that the WebStream component can accept to ensure type safety
 * and validation during development.
 *
 * Each property listed within the `propTypes` object must match
 * its defined type when passed to the component.
 *
 * Developers can refer to these definitions to understand
 * the structure and constraints of the props for this component.
 */
WebStream.propTypes = {
  images: PropTypes.objectOf(PropTypes.arrayOf(PropTypes.string)),
  setImages: PropTypes.func.isRequired,
  totalImages: PropTypes.number,
};

export default WebStream;
