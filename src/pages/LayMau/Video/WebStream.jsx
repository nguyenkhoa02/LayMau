import React, {useCallback, useEffect, useRef, useState} from 'react';
import vision from 'https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.3';
import {AlertCircle, Camera, CameraOff, RotateCcw} from 'lucide-react';
import {ImageEmbedder} from '@mediapipe/tasks-vision';
import {base64ToImageData} from "../../../helper/utils/ImageBase64";

const { FaceLandmarker, FilesetResolver } = vision;

const WebStream = ({ images, setImages, totalImages }) => {
  const videoRef = useRef(null);
  const canvasRef = useRef(null);
  const streamRef = useRef(null);
  const containerRef = useRef(null);
  const [faceLandmarker, setFaceLandmarker] = useState(null);
  const [isStreaming, setIsStreaming] = useState(false);
  const [error, setError] = useState(null);
  // const [videoDimensions, setVideoDimensions] = useState({ width: 0, height: 0 });
  const [imageEmbedder, setImageEmbedder] = useState(null);
  const [embs, setEmbs] = useState([]);
  const [isMobileDevice, setIsMobileDevice] = useState(false);
  const [orientation, setOrientation] = useState('landscape');
  const [progress, setProgress] = useState(0);
  const lastCaptureTime = useRef(0);
  const captureDelay = 1500; // 1 seconds delay

  const [text, setText] = useState('Position your face in the circle');


  useEffect(() => {
    const imageCollected = Object.values(images).reduce((acc, arr) => acc + arr.length, 0);
    const newProgress = totalImages > 0 ? (imageCollected / totalImages) * 100 : 0;
    setProgress(newProgress);
  }, [images, totalImages]);

  useEffect(() => {
    const checkMobileDevice = () => {
      const isMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
      setIsMobileDevice(isMobile);
      updateOrientation();
    };
    checkMobileDevice();
    window.addEventListener('resize', updateOrientation);
    return () => window.removeEventListener('resize', updateOrientation);
  }, []);

  useEffect(() => {
    const loadFaceLandmarker = async () => {
      try {
        const filesetResolver = await FilesetResolver.forVisionTasks(
            'https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.3/wasm',
        );

        const landmarker = await FaceLandmarker.createFromOptions(filesetResolver, {
          baseOptions: {
            modelAssetPath:
                'https://storage.googleapis.com/mediapipe-models/face_landmarker/face_landmarker/float16/1/face_landmarker.task',
            delegate: 'GPU',
          },
          outputFaceBlendshapes: true,
          runningMode: 'VIDEO',
          numFaces: 1,
          minDetectionConfidence: 0.8,
          minTrackingConfidence: 0.8,
        });

        setFaceLandmarker(landmarker);
      } catch (err) {
        console.error('Error loading FaceLandmarker:', err);
        setError('Failed to load face detection model.');
      }
    };

    loadFaceLandmarker();
  }, []);

  useEffect(() => {
    const loadImageEmbedder = async () => {
      try {
        const vision = await FilesetResolver.forVisionTasks(
            'https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.3/wasm',
        );
        const embedder = await ImageEmbedder.createFromOptions(vision, {
          baseOptions: {
            modelAssetPath: `https://storage.googleapis.com/mediapipe-models/image_embedder/mobilenet_v3_small/float32/1/mobilenet_v3_small.tflite`,
            delegate: 'GPU',
          },
        });
        setImageEmbedder(embedder);
      } catch (e) {
        console.error('Error loading ImageEmbedder:', e);
        setError('Failed to load embedding model.');
      }
    };
    loadImageEmbedder();
  }, []);


  const updateOrientation = () => {
    const isPortrait = window.innerHeight > window.innerWidth;
    setOrientation(isPortrait ? 'portrait' : 'landscape');
  };



  // Start video stream from webcam with proper resolution
  const startStream = async () => {
    try {
      if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        setError('Browser does not support camera');
        return;
      }


      const constraints = {
        video: {
          facingMode: 'user',
          // width: { ideal: containerWidth },
          // height: { ideal: containerHeight }
        }
      };

      const stream = await navigator.mediaDevices.getUserMedia(constraints);


      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        streamRef.current = stream;
        setIsStreaming(true);
        setError(null);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to access webcam');
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

  const restartStream = () => {
    if (isStreaming) {
      stopStream();
      setTimeout(() => startStream(), 500);
    }
  };

  // Update canvas dimensions when video size changes
  const updateCanvasDimensions = useCallback(() => {
    if (!videoRef.current || !canvasRef.current || !containerRef.current) return;

    const video = videoRef.current;
    const canvas = canvasRef.current;
    const container = containerRef.current;
    const containerRect = container.getBoundingClientRect();
    const {width: containerWidth, height: containerHeight} = containerRect;

    // Get actual video dimensions
    const {videoWidth, videoHeight} = video;
    if (videoWidth === 0 || videoHeight === 0) return;

    // Set display dimensions for UI
    // setVideoDimensions({ width: videoWidth, height: videoHeight });
    // setDisplayDimensions({ width: containerWidth, height: containerHeight });

    // Set canvas display size to match container
    canvas.style.width = `${containerWidth}px`;
    canvas.style.height = `${containerHeight}px`;

    // Set canvas internal dimensions to match video for proper drawing
    canvas.width = containerWidth;
    canvas.height = containerHeight;
  }, []);

  const cropFace = (landmarks) => {
    if (!videoRef.current) return null;

    let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
    landmarks.forEach((point) => {
      minX = Math.min(minX, point.x * videoRef.current.videoWidth);
      minY = Math.min(minY, point.y * videoRef.current.videoHeight);
      maxX = Math.max(maxX, point.x * videoRef.current.videoWidth);
      maxY = Math.max(maxY, point.y * videoRef.current.videoHeight);
    });

    const XPadding = 20;
    const YPadding = 20;
    const cropX = Math.max(0, minX - XPadding);
    const cropY = Math.max(0, minY - YPadding);
    const cropWidth = Math.min(videoRef.current.videoWidth - cropX, maxX - cropX + 2 * XPadding);
    const cropHeight = Math.min(videoRef.current.videoHeight - cropY, maxY - cropY + 2 * YPadding);

    // Create temporary canvas for cropping
    const tempCanvas = document.createElement('canvas');
    tempCanvas.width = cropWidth;
    tempCanvas.height = cropHeight;
    const tempCtx = tempCanvas.getContext('2d');

    // Get image directly from video (without filter)
    tempCtx.drawImage(
        videoRef.current,
        cropX, cropY, cropWidth, cropHeight, // Source crop area
        0, 0, cropWidth, cropHeight // Output size
    );

    return tempCanvas.toDataURL('image/png');
  };

  const predictWebcam = useCallback(async () => {
    if (!videoRef.current || !canvasRef.current || !faceLandmarker || !isStreaming) return;

    const video = videoRef.current;
    if (video.videoWidth === 0 || video.videoHeight === 0) return;

    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');

    // Make sure canvas is properly sized
    updateCanvasDimensions();

    const startTimeMs = performance.now();

    try {
      const results = faceLandmarker.detectForVideo(video, startTimeMs);

      // Calculate the appropriate circle size based on the video dimensions
      // For non-square videos, base the circle on the smaller dimension
      const videoWidth = canvas.width;
      const videoHeight = canvas.height;
      const smallerDimension = Math.min(videoWidth, videoHeight);

      // Circle should be centered in the frame
      const centerX = videoWidth / 2;
      const centerY = videoHeight / 2;

      // Make the circle 70% of the smaller dimension
      const radius = smallerDimension * (isMobileDevice ? 0.4 : 1);

      // Clear the canvas
      ctx.clearRect(0, 0, canvas.width, canvas.height);

      // Draw semi-transparent overlay
      ctx.fillStyle = 'rgba(128, 128, 128, 0.6)';
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      // Create transparent circle
      ctx.globalCompositeOperation = 'destination-out';
      ctx.beginPath();
      ctx.arc(centerX, centerY, radius, 0, Math.PI * 2);
      ctx.fill();
      ctx.globalCompositeOperation = 'source-over';

      // Draw circle border
      ctx.strokeStyle = '#bfdbfe';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.arc(centerX, centerY, radius, 0, Math.PI * 2);
      ctx.stroke();


      if (results.faceLandmarks && results.faceLandmarks.length > 0) {
        for (const landmarks of results.faceLandmarks) {
          const facePoints = landmarks.map(point => ({
            x: point.x * canvas.width,
            y: point.y * canvas.height,
          }));

          // Check if face is within the circle
          const isFaceInCircle = facePoints.every(point =>
              Math.sqrt(Math.pow(point.x - centerX, 2) + Math.pow(point.y - centerY, 2)) <= radius
          );

          if (isFaceInCircle) {
            setText('');
            const noseTip = landmarks[1];
            const leftEye = landmarks[33];
            const rightEye = landmarks[263];
            const chin = landmarks[152];
            const forehead = landmarks[10];

            const leftEyePos = { x: leftEye.x * canvas.width, y: leftEye.y * canvas.height };
            const rightEyePos = { x: rightEye.x * canvas.width, y: rightEye.y * canvas.height };

            // Tính độ dốc giữa hai mắt
            const slope = (rightEyePos.y - leftEyePos.y) / (rightEyePos.x - leftEyePos.x);
            const angleRad = Math.atan(slope); // Góc trong radian
            const angleDeg = angleRad * (180 / Math.PI); // Chuyển sang độ

            // Đặt ngưỡng để xác định đầu nghiêng (ví dụ: ±10 độ)
            const tiltThreshold = 10;
            const isHeadTilted = Math.abs(angleDeg) > tiltThreshold;

            if (!isHeadTilted) {
              const eyeDistance = Math.sqrt(
                  Math.pow(rightEye.x - leftEye.x, 2) + Math.pow(rightEye.y - leftEye.y, 2)
              );

              const faceHeight = Math.sqrt(
                  Math.pow(chin.x - forehead.x, 2) + Math.pow(chin.y - forehead.y, 2)
              );

              const horizontalThreshold = eyeDistance * 0.1;
              const verticalThreshold = faceHeight * 0.05;

              const noseCenterX = (leftEye.x + rightEye.x) / 2;
              let horizontalDirection = 'Center';
              if (noseTip.x < noseCenterX - horizontalThreshold) {
                horizontalDirection = 'Right';
              } else if (noseTip.x > noseCenterX + horizontalThreshold) {
                horizontalDirection = 'Left';
              }

              const faceCenterY = (forehead.y + chin.y) / 2;
              let verticalDirection = 'Center';
              if (noseTip.y < faceCenterY - verticalThreshold) {
                verticalDirection = 'Up';
              } else if (noseTip.y > faceCenterY + verticalThreshold) {
                verticalDirection = 'Down';
              }

              let faceDirection = '';
              if (horizontalDirection === 'Center' && verticalDirection === 'Center') {
                faceDirection = 'Front';
              } else {
                faceDirection = `${verticalDirection !== 'Center' ? verticalDirection : ''} ${horizontalDirection !== 'Center' ? horizontalDirection : ''}`.trim();
                if (!faceDirection) faceDirection = 'Center';
              }

              let directionKey;
              if (faceDirection === 'Front') directionKey = 'front';
              else if (faceDirection === 'Left') directionKey = 'left';
              else if (faceDirection === 'Right') directionKey = 'right';
              else if (faceDirection === 'Up') directionKey = 'up';
              else if (faceDirection === 'Down') directionKey = 'down';

              const limit = totalImages / 5;
              if (directionKey && images[directionKey] && images[directionKey].length < limit) {
                const currentTime = performance.now();

                // Only capture if enough time has passed since last capture
                if (currentTime - lastCaptureTime.current >= captureDelay) {
                  const faceImage = cropFace(landmarks);
                  if (faceImage) {
                    let imageData = await base64ToImageData(faceImage);

                    if (imageEmbedder) {

                      const embResult = await imageEmbedder.embed(imageData);
                      if (embResult && embResult.embeddings && embResult.embeddings.length > 0) {
                        const emb = embResult.embeddings[0];

                        if (emb && emb.floatEmbedding) {
                          if (embs.length === 0) {

                            setEmbs((prev) => {
                              const newEmbs = [...prev, emb];
                              console.log('Updated embs length (first):', newEmbs.length, newEmbs);
                              return newEmbs;
                            });

                            setImages((prev) => ({
                              ...prev,
                              [directionKey]: [...prev[directionKey], faceImage].slice(0, limit),
                            }));
                            lastCaptureTime.current = currentTime;

                          } else {
                            const similarities = embs.map((existingEmb) =>
                                ImageEmbedder.cosineSimilarity(emb, existingEmb)
                            );

                            const rate = Math.max(...similarities);
                            if ((rate <= 0.85 && embs.length === 1) || (0.5 < rate && rate <= 0.6)) {
                              setEmbs((prev) => {

                                const newEmbs = [...prev, emb];
                                console.log('Updated embs length (subsequent):', newEmbs.length, newEmbs);
                                return newEmbs;
                              });

                              setImages((prev) => ({
                                ...prev,
                                [directionKey]: [...prev[directionKey], faceImage].slice(0, limit),
                              }));
                            }
                            lastCaptureTime.current = currentTime;
                          }
                        }
                      }
                    }
                  }
                }
              }

              // Display face direction
              ctx.fillStyle = '#FF0000';
              ctx.font = '18px Arial';
              ctx.fillText(`Face: ${faceDirection}`, 10, 30);


            }
            else {
              setText('Please straighten your head');
            }
          }
          else {
            setText('Position your face in the circle');
          }

        }

        const fontSize = Math.max(16, Math.min(canvas.width, canvas.height) * 0.02);
        ctx.font = `${fontSize}px Arial`;
        ctx.fillStyle = '#FFFFFF';
        ctx.textAlign = 'center';
        ctx.fillText(text, centerX, centerY + radius + fontSize * 1.5);

      }


    } catch (err) {
      console.error('Face detection error:', err);
      setError('Face detection failed. Try restarting the camera.');
    }

    // Schedule the next frame
    setTimeout(predictWebcam, captureDelay);
  }, [faceLandmarker,
    isStreaming,
    updateCanvasDimensions,
    isMobileDevice,
    text,
    totalImages,
    images,
    imageEmbedder,
    embs,
    setImages]);

  // Handle window resize
  useEffect(() => {
    const handleResize = () => {
      updateCanvasDimensions();
      updateOrientation();
    };

    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
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
      window.addEventListener('orientationchange', handleOrientationChange);
      return () => window.removeEventListener('orientationchange', handleOrientationChange);
    }
  }, [isStreaming, isMobileDevice]);

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
      videoElement.addEventListener('loadedmetadata', handleVideoMetadata);
      return () => videoElement.removeEventListener('loadedmetadata', handleVideoMetadata);
    }
  }, [isStreaming, faceLandmarker, predictWebcam, updateCanvasDimensions]);


  // Clean up on unmount
  useEffect(() => {
    return () => stopStream();
  }, []);

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
                  isMobileDevice && orientation === 'portrait'
                      ? 'aspect-[9/16] md:aspect-[3/4]'
                      : 'aspect-video'
              }`}
          >
            <video
                ref={videoRef}
                autoPlay
                playsInline
                muted
                className="w-full h-full object-cover "
                style ={{transform: 'scaleX(-1)'}}
            />
            <canvas ref={canvasRef} className="absolute top-0 left-0" />

            {!isStreaming && !error && (
                <div className="absolute inset-0 flex items-center justify-center bg-gray-800 text-white">
                  <p className="text-center text-sm md:text-base px-4">Click the start button to enable webcam</p>
                </div>
            )}
          </div>
          <div className="mt-3 flex justify-center gap-2">
            <button
                onClick={isStreaming ? stopStream : startStream}
                className={`px-4 py-2 rounded-lg flex items-center text-sm md:text-base ${
                    isStreaming
                        ? 'bg-red-600 hover:bg-red-700 text-white'
                        : 'bg-blue-600 hover:bg-blue-700 text-white'
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
                    <span className="hidden xs:inline">Start</span> Camera
                  </>
              )}
            </button>

            {isStreaming && (
                <button
                    onClick={restartStream}
                    className="px-4 py-2 rounded-lg flex items-center bg-gray-600 hover:bg-gray-700 text-white text-sm md:text-base"
                >
                  <RotateCcw className="h-4 w-4 mr-1 md:h-5 md:w-5 md:mr-2" />
                  <span className="hidden xs:inline">Restart</span> Camera
                </button>
            )}
          </div>

          {/*{isStreaming  && (*/}
          {/*    <div className="mt-2 text-xs text-gray-500 text-center">*/}
          {/*      {text}*/}
          {/*      Mode: {orientation} |*/}



          {/*    </div>*/}
          {/*)}*/}

        </div>
      </div>
  );
};

export default WebStream;