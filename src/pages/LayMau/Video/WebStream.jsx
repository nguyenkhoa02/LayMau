// import React, { useCallback, useEffect, useRef, useState } from 'react';
// import vision from 'https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.3';
// import { AlertCircle, Camera, CameraOff } from 'lucide-react';
// import { ImageEmbedder } from '@mediapipe/tasks-vision';
//
// const { FaceLandmarker, FilesetResolver } = vision;
//
// const WebStream = ({ images, setImages, totalImages }) => {
//   const videoRef = useRef(null);
//   const canvasRef = useRef(null);
//   const streamRef = useRef(null);
//   const containerRef = useRef(null);
//   const [faceLandmarker, setFaceLandmarker] = useState(null);
//   const [isStreaming, setIsStreaming] = useState(false);
//   const [error, setError] = useState(null);
//   const [videoDimensions, setVideoDimensions] = useState({ width: 0, height: 0 });
//   const [imageEmbedder, setImageEmbedder] = useState(null);
//   const [embs, setEmbs] = useState([]);
//
//   useEffect(() => {
//     const loadFaceLandmarker = async () => {
//       try {
//         const filesetResolver = await FilesetResolver.forVisionTasks(
//           'https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.3/wasm',
//         );
//
//         const landmarker = await FaceLandmarker.createFromOptions(filesetResolver, {
//           baseOptions: {
//             modelAssetPath:
//               'https://storage.googleapis.com/mediapipe-models/face_landmarker/face_landmarker/float16/1/face_landmarker.task',
//             delegate: 'GPU',
//           },
//           outputFaceBlendshapes: true,
//           runningMode: 'VIDEO',
//           numFaces: 1,
//           minDetectionConfidence: 0.8, // Tăng lên để chính xác hơn
//           minTrackingConfidence: 0.8,  // Giữ track chính xác hơn
//         });
//
//         setFaceLandmarker(landmarker);
//       } catch (err) {
//         console.error('Error loading FaceLandmarker:', err);
//         setError('Failed to load face detection model.');
//       }
//     };
//
//     loadFaceLandmarker();
//   }, []);
//
//   useEffect(() => {
//     const loadImageEmbedder = async () => {
//       try {
//         const vision = await FilesetResolver.forVisionTasks(
//           'https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.3/wasm',
//         );
//         const embedder = await ImageEmbedder.createFromOptions(vision, {
//           baseOptions: {
//             modelAssetPath: `https://storage.googleapis.com/mediapipe-models/image_embedder/mobilenet_v3_small/float32/1/mobilenet_v3_small.tflite`,
//             delegate: 'GPU',
//           },
//         });
//         setImageEmbedder(embedder);
//       } catch (e) {
//         console.error('Error loading FaceLandmarker:', e);
//         setError('Failed to load embedding model.');
//       }
//     };
//     loadImageEmbedder();
//   }, []);
//
//   // Bắt đầu phát video từ webcam
//   const startStream = async () => {
//     try {
//       if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
//         setError('Trình duyệt không hỗ trợ camera');
//       }
//       const stream = await navigator.mediaDevices.getUserMedia({
//         video: {
//           width: { ideal: 1280 },
//           height: { ideal: 720 },
//           facingMode: 'user',
//         },
//       });
//
//       if (videoRef.current) {
//         videoRef.current.srcObject = stream;
//         streamRef.current = stream;
//         setIsStreaming(true);
//         setError(null);
//       }
//     } catch (err) {
//       setError(err instanceof Error ? err.message : 'Failed to access webcam');
//       setIsStreaming(false);
//     }
//   };
//
//   // Dừng camera
//   const stopStream = () => {
//     if (streamRef.current) {
//       streamRef.current.getTracks().forEach((track) => track.stop());
//       if (videoRef.current) {
//         videoRef.current.srcObject = null;
//       }
//       streamRef.current = null;
//       setIsStreaming(false);
//     }
//   };
//
//   // Cập nhật kích thước canvas khi video thay đổi kích thước
//   const updateCanvasDimensions = useCallback(() => {
//     if (!videoRef.current || !canvasRef.current || !containerRef.current) return;
//
//     const video = videoRef.current;
//     const canvas = canvasRef.current;
//     const container = containerRef.current;
//
//     const containerRect = container.getBoundingClientRect();
//
//     const videoWidth = video.videoWidth;
//     const videoHeight = video.videoHeight;
//
//     if (videoWidth === 0 || videoHeight === 0) return;
//
//     setVideoDimensions({ width: videoWidth, height: videoHeight });
//
//     const containerRatio = containerRect.width / containerRect.height;
//     const videoRatio = videoWidth / videoHeight;
//
//     let newWidth, newHeight;
//
//     if (containerRatio > videoRatio) {
//       newHeight = containerRect.height;
//       newWidth = newHeight * videoRatio;
//     } else {
//       newWidth = containerRect.width;
//       newHeight = newWidth / videoRatio;
//     }
//
//     canvas.style.width = `${newWidth}px`;
//     canvas.style.height = `${newHeight}px`;
//
//     canvas.width = videoWidth;
//     canvas.height = videoHeight;
//   }, []);
//
//   const cropFace = (landmarks) => {
//     let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
//     landmarks.forEach((point) => {
//       minX = Math.min(minX, point.x * videoRef.current.videoWidth);
//       minY = Math.min(minY, point.y * videoRef.current.videoHeight);
//       maxX = Math.max(maxX, point.x * videoRef.current.videoWidth);
//       maxY = Math.max(maxY, point.y * videoRef.current.videoHeight);
//     });
//
//     const XPadding = 20;
//     const YPadding = 20;
//     const cropX = Math.max(0, minX - XPadding);
//     const cropY = Math.max(0, minY - YPadding);
//     const cropWidth = Math.min(videoRef.current.videoWidth - cropX, maxX - cropX + 2 * XPadding);
//     const cropHeight = Math.min(videoRef.current.videoHeight - cropY, maxY - cropY + 2 * YPadding);
//
//     // Tạo canvas tạm để crop ảnh từ video (không có filter)
//     const tempCanvas = document.createElement('canvas');
//     tempCanvas.width = cropWidth;
//     tempCanvas.height = cropHeight;
//     const tempCtx = tempCanvas.getContext('2d');
//
//     // Lấy ảnh trực tiếp từ video (không qua filter)
//     tempCtx.drawImage(
//       videoRef.current,
//       cropX, cropY, cropWidth, cropHeight, // Vùng cần crop
//       0, 0, cropWidth, cropHeight // Kích thước đầu ra
//     );
//
//     return tempCanvas.toDataURL('image/png');
//   };
//
//   const base64ToImageData = (base64) => {
//     return new Promise((resolve, reject) => {
//       const img = new Image();
//       img.onload = () => {
//         const canvas = document.createElement('canvas');
//         canvas.width = img.width;
//         canvas.height = img.height;
//         const ctx = canvas.getContext('2d');
//         if (!ctx) {
//           reject(new Error('Failed to get canvas context'));
//           return;
//         }
//         ctx.drawImage(img, 0, 0);
//         const imageData = ctx.getImageData(0, 0, img.width, img.height);
//         resolve(imageData);
//       };
//       img.onerror = () => reject(new Error('Failed to load image'));
//       img.src = base64;
//     });
//   };
//
//
//   const lastCaptureTime = useRef(0); // Lưu thời gian capture gần nhất
//   const captureDelay = 2000; // 2 giây delay
//
//
//   const predictWebcam = useCallback(async () => {
//     if (!videoRef.current || !canvasRef.current || !faceLandmarker || !isStreaming) return;
//
//     const video = videoRef.current;
//     if (video.videoWidth === 0 || video.videoHeight === 0) return;
//
//     const canvas = canvasRef.current;
//     const ctx = canvas.getContext('2d');
//     updateCanvasDimensions();
//
//     const startTimeMs = performance.now();
//
//     // Define the bounding box area in the center of the canvas
//     const boxSize = 500;
//     const boxX = (canvas.width - boxSize) / 2;
//     const boxY = (canvas.height - boxSize) / 2;
//
//     try {
//       const results = faceLandmarker.detectForVideo(video, startTimeMs);
//
//       // Kích thước và vị trí của hình tròn
//       const radius = 300;
//       const centerX = canvas.width / 2;
//       const centerY = canvas.height / 2;
//
//       // Xóa canvas trước khi vẽ
//       ctx.clearRect(0, 0, canvas.width, canvas.height);
//
//       // Vẽ lớp mờ xung quanh hình tròn
//       ctx.fillStyle = 'rgba(128, 128, 128, 0.6)'; // Màu xám với opacity 60%
//       ctx.fillRect(0, 0, canvas.width, canvas.height);
//
//       // Tạo vùng trong suốt hình tròn
//       ctx.globalCompositeOperation = 'destination-out';
//       ctx.beginPath();
//       ctx.arc(centerX, centerY, radius, 0, Math.PI * 2);
//       ctx.fill();
//       ctx.globalCompositeOperation = 'source-over'; // Đặt lại chế độ vẽ bình thường
//
//       // Vẽ viền hình tròn (màu xanh lá cây)
//       ctx.strokeStyle = '#00FF00';
//       ctx.lineWidth = 2;
//       ctx.beginPath();
//       ctx.arc(centerX, centerY, radius, 0, Math.PI * 2);
//       ctx.stroke();
//
//
//       if (results.faceLandmarks) {
//         for (const landmarks of results.faceLandmarks) {
//           const facePoints = landmarks.map(point => ({
//             x: point.x * canvas.width,
//             y: point.y * canvas.height,
//           }));
//
//           // Check if all landmarks are within the bounding box
//           const isFaceInBox = facePoints.every(point =>
//             point.x >= boxX && point.x <= boxX + boxSize &&
//             point.y >= boxY && point.y <= boxY + boxSize
//           );
//
//           if (isFaceInBox) {
//             const noseTip = landmarks[1];
//             const leftEye = landmarks[33];
//             const rightEye = landmarks[263];
//             const chin = landmarks[152];
//             const forehead = landmarks[10];
//
//             const eyeDistance = Math.sqrt(
//               Math.pow(rightEye.x - leftEye.x, 2) + Math.pow(rightEye.y - leftEye.y, 2)
//             );
//
//             const faceHeight = Math.sqrt(
//               Math.pow(chin.x - forehead.x, 2) + Math.pow(chin.y - forehead.y, 2)
//             );
//
//             const horizontalThreshold = eyeDistance * 0.1;
//             const verticalThreshold = faceHeight * 0.05;
//
//             const noseCenterX = (leftEye.x + rightEye.x) / 2;
//             let horizontalDirection = 'Center';
//             if (noseTip.x < noseCenterX - horizontalThreshold) {
//               horizontalDirection = 'Right';
//             } else if (noseTip.x > noseCenterX + horizontalThreshold) {
//               horizontalDirection = 'Left';
//             }
//
//             const faceCenterY = (forehead.y + chin.y) / 2;
//             let verticalDirection = 'Center';
//             if (noseTip.y < faceCenterY - verticalThreshold) {
//               verticalDirection = 'Up';
//             } else if (noseTip.y > faceCenterY + verticalThreshold) {
//               verticalDirection = 'Down';
//             }
//
//             let faceDirection = '';
//             if (horizontalDirection === 'Center' && verticalDirection === 'Center') {
//               faceDirection = 'Front';
//             } else {
//               faceDirection = `${verticalDirection !== 'Center' ? verticalDirection : ''} ${horizontalDirection !== 'Center' ? horizontalDirection : ''}`.trim();
//               if (!faceDirection) faceDirection = 'Center';
//             }
//
//             let directionKey;
//             if (faceDirection === 'Front') directionKey = 'front';
//             else if (faceDirection === 'Left') directionKey = 'left';
//             else if (faceDirection === 'Right') directionKey = 'right';
//             else if (faceDirection === 'Up') directionKey = 'up';
//             else if (faceDirection === 'Down') directionKey = 'down';
//
//             const limit = totalImages / 5;
//             if (directionKey && images[directionKey] && images[directionKey].length < limit) {
//               const faceImage = cropFace(landmarks);
//               let imageData = await base64ToImageData(faceImage);
//
//               const embResult = await imageEmbedder.embed(imageData);
//               if (!embResult || !embResult.embeddings || embResult.embeddings.length === 0) {
//                 console.error('Failed to generate embedding:', embResult);
//                 continue;
//               }
//               const emb = embResult.embeddings[0];
//
//               if (!emb || !emb.floatEmbedding) {
//                 console.warn('Invalid embedding, skipping:', emb);
//                 continue;
//               }
//
//               if (embs.length === 0) {
//                 setEmbs([emb]);
//                 setImages((prev) => ({
//                   ...prev,
//                   [directionKey]: [...prev[directionKey], faceImage].slice(0, limit),
//                 }));
//               } else {
//                 const similarities = embs.map((existingEmb) =>
//                   ImageEmbedder.cosineSimilarity(emb, existingEmb)
//                 );
//                 const currentTime = performance.now();
//                 const rate = Math.max(...similarities);
//                 if (currentTime - lastCaptureTime.current >= captureDelay) {
//                   if ((rate <= 0.85 && embs.length === 1) || (0.5 < rate && rate <= 0.85)) {
//                     setEmbs((prev) => [...prev, emb]);
//                     setImages((prev) => ({
//                       ...prev,
//                       [directionKey]: [...prev[directionKey], faceImage].slice(0, limit),
//                     }));
//                   }
//                   lastCaptureTime.current = currentTime;
//                 }
//               }
//             }
//
//             ctx.fillStyle = '#FF0000';
//             ctx.font = '18px Arial';
//             ctx.fillText(`Face: ${faceDirection}`, 10, 30);
//           }
//         }
//       }
//     } catch (err) {
//       console.error('Face detection error:', err);
//       setError('Face detection failed. Try restarting the camera.');
//     }
//
//     setTimeout(predictWebcam, 1000);
//   }, [
//     faceLandmarker,
//     totalImages,
//     images,
//     isStreaming,
//     setImages,
//     updateCanvasDimensions,
//     embs,
//     setEmbs,
//     imageEmbedder,
//   ]);
//
//
//   // Cập nhật canvas khi cửa sổ thay đổi kích thước
//   useEffect(() => {
//     const handleResize = () => {
//       updateCanvasDimensions();
//     };
//
//     window.addEventListener('resize', handleResize);
//     return () => window.removeEventListener('resize', handleResize);
//   }, [updateCanvasDimensions]);
//
//   // Kích hoạt vòng lặp nhận diện khi `isStreaming` thay đổi
//   // useEffect(() => {
//   //   if (isStreaming && faceLandmarker) {
//   //     predictWebcam();
//   //   }
//   // }, [isStreaming, faceLandmarker, predictWebcam]);
//
//   // Thêm sự kiện để cập nhật kích thước khi video đã tải
//   useEffect(() => {
//     const handleVideoMetadata = () => {
//       updateCanvasDimensions();
//       if (isStreaming && faceLandmarker) {
//         predictWebcam();
//       }
//     };
//
//     const videoElement = videoRef.current;
//     if (videoElement) {
//       videoElement.addEventListener('loadedmetadata', handleVideoMetadata);
//       return () => videoElement.removeEventListener('loadedmetadata', handleVideoMetadata);
//     }
//   }, [isStreaming, faceLandmarker, predictWebcam, updateCanvasDimensions]);
//
//   // Cleanup khi component bị hủy
//   useEffect(() => {
//     return () => stopStream();
//   }, []);
//
//   return (
//     <div className="w-full max-w-3xl mx-auto p-4">
//       {error && (
//         <div className="mb-4 p-4 bg-red-50 rounded-lg flex items-center text-red-700">
//           <AlertCircle className="h-5 w-5 mr-2" />
//           <span>{error}</span>
//         </div>
//       )}
//       <div className="relative">
//         <div
//           ref={containerRef}
//           className="relative aspect-video bg-gray-900 rounded-lg overflow-hidden"
//         >
//           <video ref={videoRef} autoPlay playsInline className="w-full h-full object-cover" />
//           <canvas ref={canvasRef} className="absolute top-0 left-0" />
//
//           {!isStreaming && !error && (
//             <div className="absolute inset-0 flex items-center justify-center bg-gray-800 text-white">
//               <p className="text-center">Click the start button to enable webcam</p>
//             </div>
//           )}
//         </div>
//         <div className="mt-4 flex justify-center">
//           <button
//             onClick={isStreaming ? stopStream : startStream}
//             className={`px-6 py-2 rounded-lg flex items-center ${
//               isStreaming
//                 ? 'bg-red-600 hover:bg-red-700 text-white'
//                 : 'bg-blue-600 hover:bg-blue-700 text-white'
//             }`}
//           >
//             {isStreaming ? (
//               <>
//                 <CameraOff className="h-5 w-5 mr-2" />
//                 Stop Camera
//               </>
//             ) : (
//               <>
//                 <Camera className="h-5 w-5 mr-2" />
//                 Start Camera
//               </>
//             )}
//           </button>
//         </div>
//         {isStreaming && videoDimensions.width > 0 && (
//           <div className="mt-2 text-xs text-gray-500 text-center">
//             Video resolution: {videoDimensions.width}×{videoDimensions.height}
//           </div>
//         )}
//       </div>
//     </div>
//   );
// };
//
// export default WebStream;

import React, { useCallback, useEffect, useRef, useState } from 'react';
import vision from 'https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.3';
import { AlertCircle, Camera, CameraOff, RotateCcw } from 'lucide-react';
import { ImageEmbedder } from '@mediapipe/tasks-vision';

const { FaceLandmarker, FilesetResolver } = vision;

const WebStream = ({ images, setImages, totalImages }) => {
  const videoRef = useRef(null);
  const canvasRef = useRef(null);
  const streamRef = useRef(null);
  const containerRef = useRef(null);
  const [faceLandmarker, setFaceLandmarker] = useState(null);
  const [isStreaming, setIsStreaming] = useState(false);
  const [error, setError] = useState(null);
  const [videoDimensions, setVideoDimensions] = useState({ width: 0, height: 0 });
  const [imageEmbedder, setImageEmbedder] = useState(null);
  const [embs, setEmbs] = useState([]);
  const [isMobileDevice, setIsMobileDevice] = useState(false);
  const [orientation, setOrientation] = useState('landscape');
  const [displayDimensions, setDisplayDimensions] = useState({ width: 0, height: 0 });

  // Detect if device is mobile
  useEffect(() => {
    const checkMobileDevice = () => {
      const isMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
      setIsMobileDevice(isMobile);

      // Check orientation
      updateOrientation();
    };

    checkMobileDevice();

    // Listen for orientation changes
    window.addEventListener('resize', updateOrientation);
    return () => window.removeEventListener('resize', updateOrientation);
  }, []);

  // Update orientation based on window dimensions
  const updateOrientation = () => {
    const isPortrait = window.innerHeight > window.innerWidth;
    setOrientation(isPortrait ? 'portrait' : 'landscape');
  };

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

  // Start webcam stream with appropriate constraints for mobile
  const startStream = async () => {
    try {
      if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        setError('Browser does not support camera');
        return;
      }

      // Use different constraints for mobile in portrait mode
      const constraints = {
        video: {
          facingMode: 'user',
          width: orientation === 'portrait' && isMobileDevice ? { ideal: 480 } : { ideal: 1280 },
          height: orientation === 'portrait' && isMobileDevice ? { ideal: 640 } : { ideal: 720 },
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

  // Stop webcam stream
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

  // Restart webcam when orientation changes
  const restartStream = () => {
    if (isStreaming) {
      stopStream();
      setTimeout(() => startStream(), 500);
    }
  };

  // Calculate display dimensions (for CSS) and internal canvas dimensions
  const updateCanvasDimensions = useCallback(() => {
    if (!videoRef.current || !canvasRef.current || !containerRef.current) return;

    const video = videoRef.current;
    const canvas = canvasRef.current;
    const container = containerRef.current;

    const containerRect = container.getBoundingClientRect();
    const containerWidth = containerRect.width;
    const containerHeight = containerRect.height;

    const videoWidth = video.videoWidth;
    const videoHeight = video.videoHeight;

    if (videoWidth === 0 || videoHeight === 0) return;

    setVideoDimensions({ width: videoWidth, height: videoHeight });

    // Calculate display dimensions
    let displayWidth, displayHeight;

    // Account for different orientations and device types
    if (isMobileDevice && orientation === 'portrait') {
      if (videoWidth > videoHeight) {
        // Video is landscape but container is portrait (common on mobile)
        const videoRatio = videoWidth / videoHeight;
        displayHeight = containerHeight;
        displayWidth = displayHeight * videoRatio;

        // If width exceeds container, scale down
        if (displayWidth > containerWidth) {
          displayWidth = containerWidth;
          displayHeight = displayWidth / videoRatio;
        }
      } else {
        // Both video and container are portrait
        const videoRatio = videoHeight / videoWidth;
        displayWidth = containerWidth;
        displayHeight = displayWidth * videoRatio;

        // If height exceeds container, scale down
        if (displayHeight > containerHeight) {
          displayHeight = containerHeight;
          displayWidth = displayHeight / videoRatio;
        }
      }
    } else {
      // Standard landscape layout
      const containerRatio = containerWidth / containerHeight;
      const videoRatio = videoWidth / videoHeight;

      if (containerRatio > videoRatio) {
        displayHeight = containerHeight;
        displayWidth = displayHeight * videoRatio;
      } else {
        displayWidth = containerWidth;
        displayHeight = displayWidth / videoRatio;
      }
    }

    // Set display dimensions for canvas
    // canvas.style.width = `${displayWidth}px`;
    // canvas.style.height = `${displayHeight}px`;
    canvas.style.width = `${videoWidth}px`;
    canvas.style.height = `${videoHeight}px`;
    // containerRef.current.style.width = `${videoWidth}px`;
    // containerRef.current.style.height = `${videoHeight}px`;

    // Set internal dimensions to match video resolution for optimal detection
    canvas.width = videoWidth;
    canvas.height = videoHeight;

    // Store display dimensions for calculations in filter overlay
    setDisplayDimensions({ width: displayWidth, height: displayHeight });

  }, [isMobileDevice, orientation]);

  const cropFace = (landmarks) => {
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
    const cropWidth = Math.min(videoRef.current.videoWidth - cropX, maxX - minX + 2 * XPadding);
    const cropHeight = Math.min(videoRef.current.videoHeight - cropY, maxY - minY + 2 * YPadding);

    // Create temp canvas for cropping
    const tempCanvas = document.createElement('canvas');
    tempCanvas.width = cropWidth;
    tempCanvas.height = cropHeight;
    const tempCtx = tempCanvas.getContext('2d');

    // Get image directly from video
    tempCtx.drawImage(
        videoRef.current,
        cropX, cropY, cropWidth, cropHeight,
        0, 0, cropWidth, cropHeight
    );

    return tempCanvas.toDataURL('image/png');
  };

  const base64ToImageData = (base64) => {
    return new Promise((resolve, reject) => {
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement('canvas');
        canvas.width = img.width;
        canvas.height = img.height;
        const ctx = canvas.getContext('2d');
        if (!ctx) {
          reject(new Error('Failed to get canvas context'));
          return;
        }
        ctx.drawImage(img, 0, 0);
        const imageData = ctx.getImageData(0, 0, img.width, img.height);
        resolve(imageData);
      };
      img.onerror = () => reject(new Error('Failed to load image'));
      img.src = base64;
    });
  };

  const lastCaptureTime = useRef(0);
  const captureDelay = 2000; // 2 seconds delay

  const predictWebcam = useCallback(async () => {
    if (!videoRef.current || !canvasRef.current || !faceLandmarker || !isStreaming) return;

    const video = videoRef.current;
    if (video.videoWidth === 0 || video.videoHeight === 0) return;

    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    updateCanvasDimensions();

    const startTimeMs = performance.now();

    try {
      const results = faceLandmarker.detectForVideo(video, startTimeMs);

      // Clear canvas
      ctx.clearRect(0, 0, canvas.width, canvas.height);

      // Calculate center and radius based on orientation and video dimensions
      let centerX, centerY, radius;

      // Calculate detection area and overlay dimensions
      const smallerDimension = Math.min(canvas.width, canvas.height);
      const largerDimension = Math.max(canvas.width, canvas.height);

      // Adjust radius and center based on orientation
      if (canvas.width > canvas.height) {
        // Landscape orientation
        radius = smallerDimension * 0.35;
        centerX = canvas.width / 2;
        centerY = canvas.height / 2;
      } else {
        // Portrait orientation
        radius = smallerDimension * 0.35;
        centerX = canvas.width / 2;
        centerY = canvas.height / 2;
      }

      // Create detection area (boxSize is used to check if face is within target area)
      const boxSize = radius * 2;
      const boxX = centerX - radius;
      const boxY = centerY - radius;

      // Draw dim overlay
      ctx.fillStyle = 'rgba(128, 128, 128, 0.6)';
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      // Create transparent circle
      ctx.globalCompositeOperation = 'destination-out';
      ctx.beginPath();
      ctx.arc(centerX, centerY, radius, 0, Math.PI * 2);
      ctx.fill();
      ctx.globalCompositeOperation = 'source-over';

      // Draw circle border
      ctx.strokeStyle = '#00FF00';
      ctx.lineWidth = Math.max(2, Math.min(canvas.width, canvas.height) / 200); // Responsive line width
      ctx.beginPath();
      ctx.arc(centerX, centerY, radius, 0, Math.PI * 2);
      ctx.stroke();

      // Add guide text
      const fontSize = Math.max(16, Math.min(canvas.width, canvas.height) * 0.02);
      ctx.font = `${fontSize}px Arial`;
      ctx.fillStyle = '#FFFFFF';
      ctx.textAlign = 'center';
      ctx.fillText("Position your face in the circle", centerX, centerY + radius + fontSize * 1.5);

      if (results.faceLandmarks) {
        for (const landmarks of results.faceLandmarks) {
          const facePoints = landmarks.map(point => ({
            x: point.x * canvas.width,
            y: point.y * canvas.height,
          }));

          // Check if face is within detection area
          const isFaceInBox = facePoints.every(point =>
              Math.sqrt(Math.pow(point.x - centerX, 2) + Math.pow(point.y - centerY, 2)) <= radius
          );

          if (isFaceInBox) {
            const noseTip = landmarks[1];
            const leftEye = landmarks[33];
            const rightEye = landmarks[263];
            const chin = landmarks[152];
            const forehead = landmarks[10];

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
              const faceImage = cropFace(landmarks);
              let imageData = await base64ToImageData(faceImage);

              const embResult = await imageEmbedder.embed(imageData);
              if (!embResult || !embResult.embeddings || embResult.embeddings.length === 0) {
                console.error('Failed to generate embedding:', embResult);
                continue;
              }
              const emb = embResult.embeddings[0];

              if (!emb || !emb.floatEmbedding) {
                console.warn('Invalid embedding, skipping:', emb);
                continue;
              }

              if (embs.length === 0) {
                setEmbs([emb]);
                setImages((prev) => ({
                  ...prev,
                  [directionKey]: [...prev[directionKey], faceImage].slice(0, limit),
                }));
              } else {
                const similarities = embs.map((existingEmb) =>
                    ImageEmbedder.cosineSimilarity(emb, existingEmb)
                );
                const currentTime = performance.now();
                const rate = Math.max(...similarities);
                if (currentTime - lastCaptureTime.current >= captureDelay) {
                  if ((rate <= 0.85 && embs.length === 1) || (0.5 < rate && rate <= 0.85)) {
                    setEmbs((prev) => [...prev, emb]);
                    setImages((prev) => ({
                      ...prev,
                      [directionKey]: [...prev[directionKey], faceImage].slice(0, limit),
                    }));
                  }
                  lastCaptureTime.current = currentTime;
                }
              }
            }

            // Display face direction in an appropriate location based on orientation
            const directionFontSize = Math.max(16, Math.min(canvas.width, canvas.height) * 0.025);
            const textPadding = Math.min(canvas.width, canvas.height) * 0.02;

            ctx.fillStyle = 'rgba(0, 0, 0, 0.5)';
            const textWidth = ctx.measureText(`Face: ${faceDirection}`).width;

            // Position text based on orientation
            let textX, textY;
            if (canvas.width > canvas.height) {
              // Landscape orientation
              textX = textPadding;
              textY = textPadding + directionFontSize;
            } else {
              // Portrait orientation
              textX = textPadding;
              textY = textPadding + directionFontSize;
            }

            // Create background for text
            ctx.fillRect(textX - 5, textY - directionFontSize, textWidth + 10, directionFontSize * 1.3);

            // Draw text
            ctx.fillStyle = '#FFFFFF';
            ctx.font = `${directionFontSize}px Arial`;
            ctx.textAlign = 'left';
            ctx.fillText(`Face: ${faceDirection}`, textX, textY);
          }
        }
      }
    } catch (err) {
      console.error('Face detection error:', err);
      setError('Face detection failed. Try restarting the camera.');
    }

    setTimeout(predictWebcam, 1000);
  }, [
    faceLandmarker,
    totalImages,
    images,
    isStreaming,
    setImages,
    updateCanvasDimensions,
    embs,
    setEmbs,
    imageEmbedder,
  ]);

  // Update canvas when window resizes
  useEffect(() => {
    const handleResize = () => {
      updateCanvasDimensions();
      updateOrientation();
    };

    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, [updateCanvasDimensions]);

  // Listen for orientation changes specifically on mobile
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

  // Update video dimensions when metadata is loaded
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

  // Cleanup on component unmount
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
              // style={{ maxHeight: 'calc(100vh - 200px)' }}
          >
            <video
                ref={videoRef}
                autoPlay
                playsInline
                muted
                className="w-full h-full object-cover"
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

          {isStreaming && videoDimensions.width > 0 && (
              <div className="mt-2 text-xs text-gray-500 text-center">
                Video: {videoDimensions.width}×{videoDimensions.height} |
                Display: {Math.round(displayDimensions.width)}×{Math.round(displayDimensions.height)} |
                Mode: {orientation}
              </div>
          )}
        </div>
      </div>
  );
};

export default WebStream;