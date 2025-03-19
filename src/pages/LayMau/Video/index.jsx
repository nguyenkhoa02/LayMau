// import React, { useCallback, useEffect, useRef, useState } from 'react';
// import vision from 'https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.3';
// import { AlertCircle, Camera, CameraOff, RotateCcw } from 'lucide-react';
// import { ImageEmbedder } from '@mediapipe/tasks-vision';
// import * as THREE from 'three'; // Thêm Three.js
// import { base64ToImageData } from '../../../helper/utils/ImageBase64';
//
// const { FaceLandmarker, FilesetResolver } = vision;
//
// const WebStream = ({ images, setImages, totalImages }) => {
//     const videoRef = useRef(null);
//     const canvasRef = useRef(null);
//     const threeContainerRef = useRef(null); // Ref cho container của Three.js
//     const streamRef = useRef(null);
//     const containerRef = useRef(null);
//     const [faceLandmarker, setFaceLandmarker] = useState(null);
//     const [isStreaming, setIsStreaming] = useState(false);
//     const [error, setError] = useState(null);
//     const [imageEmbedder, setImageEmbedder] = useState(null);
//     const [embs, setEmbs] = useState([]);
//     const [isMobileDevice, setIsMobileDevice] = useState(false);
//     const [orientation, setOrientation] = useState('landscape');
//     const [progress, setProgress] = useState(0);
//     const lastCaptureTime = useRef(0);
//     const captureDelay = 1500;
//     const [text, setText] = useState('Position your face in the circle');
//     const rendererRef = useRef(null); // Ref cho renderer của Three.js
//     const sceneRef = useRef(null);
//     const cameraRef = useRef(null);
//     const progressCircleRef = useRef(null); // Ref cho vòng tròn tiến trình
//
//     // Tính toán progress dựa trên số lượng ảnh
//     useEffect(() => {
//         const imageCollected = Object.values(images).reduce((acc, arr) => acc + arr.length, 0);
//         const newProgress = totalImages > 0 ? (imageCollected / totalImages) * 100 : 0;
//         setProgress(newProgress);
//     }, [images, totalImages]);
//
//     // Kiểm tra thiết bị di động và orientation
//     useEffect(() => {
//         const checkMobileDevice = () => {
//             const isMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
//             setIsMobileDevice(isMobile);
//             updateOrientation();
//         };
//         checkMobileDevice();
//         window.addEventListener('resize', updateOrientation);
//         return () => window.removeEventListener('resize', updateOrientation);
//     }, []);
//
//     // Tải FaceLandmarker
//     useEffect(() => {
//         const loadFaceLandmarker = async () => {
//             try {
//                 const filesetResolver = await FilesetResolver.forVisionTasks(
//                     'https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.3/wasm'
//                 );
//                 const landmarker = await FaceLandmarker.createFromOptions(filesetResolver, {
//                     baseOptions: {
//                         modelAssetPath:
//                             'https://storage.googleapis.com/mediapipe-models/face_landmarker/face_landmarker/float16/1/face_landmarker.task',
//                         delegate: 'GPU',
//                     },
//                     outputFaceBlendshapes: true,
//                     runningMode: 'VIDEO',
//                     numFaces: 1,
//                     minDetectionConfidence: 0.8,
//                     minTrackingConfidence: 0.8,
//                 });
//                 setFaceLandmarker(landmarker);
//             } catch (err) {
//                 console.error('Error loading FaceLandmarker:', err);
//                 setError('Failed to load face detection model.');
//             }
//         };
//         loadFaceLandmarker();
//     }, []);
//
//     // Tải ImageEmbedder
//     useEffect(() => {
//         const loadImageEmbedder = async () => {
//             try {
//                 const vision = await FilesetResolver.forVisionTasks(
//                     'https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.3/wasm'
//                 );
//                 const embedder = await ImageEmbedder.createFromOptions(vision, {
//                     baseOptions: {
//                         modelAssetPath:
//                             'https://storage.googleapis.com/mediapipe-models/image_embedder/mobilenet_v3_small/float32/1/mobilenet_v3_small.tflite',
//                         delegate: 'GPU',
//                     },
//                 });
//                 setImageEmbedder(embedder);
//             } catch (e) {
//                 console.error('Error loading ImageEmbedder:', e);
//                 setError('Failed to load embedding model.');
//             }
//         };
//         loadImageEmbedder();
//     }, []);
//
//     // Cập nhật orientation
//     const updateOrientation = () => {
//         const isPortrait = window.innerHeight > window.innerWidth;
//         setOrientation(isPortrait ? 'portrait' : 'landscape');
//     };
//
//     // Khởi tạo Three.js
//     // Trong WebStream component
//
//     const initThreeJS = useCallback(() => {
//         if (!threeContainerRef.current) return;
//
//         const container = threeContainerRef.current;
//         const { width, height } = container.getBoundingClientRect();
//
//         // Tạo scene
//         const scene = new THREE.Scene();
//         sceneRef.current = scene;
//
//         // Tạo camera
//         const camera = new THREE.OrthographicCamera(-width / 2, width / 2, height / 2, -height / 2, 1, 1000);
//         camera.position.z = 10;
//         cameraRef.current = camera;
//
//         // Tạo renderer
//         const renderer = new THREE.WebGLRenderer({ alpha: true });
//         renderer.setSize(width, height);
//         rendererRef.current = renderer;
//         container.appendChild(renderer.domElement);
//
//         // Tạo vòng tròn tiến trình
//         const radius = Math.min(width, height) * (isMobileDevice ? 0.4 : 0.35);
//         const geometry = new THREE.RingGeometry(radius - 5, radius, 64, 1, 0, 0);
//         const material = new THREE.MeshBasicMaterial({ color: 0x000000, side: THREE.DoubleSide });
//         const progressCircle = new THREE.Mesh(geometry, material);
//         scene.add(progressCircle);
//         progressCircleRef.current = progressCircle;
//
//         // Animation loop
//         let animationFrameId;
//         const animate = () => {
//             animationFrameId = requestAnimationFrame(animate);
//             const theta = (progress / 100) * Math.PI * 2;
//             progressCircle.geometry.dispose();
//             progressCircle.geometry = new THREE.RingGeometry(radius - 5, radius, 64, 1, 0, theta);
//             renderer.render(scene, camera);
//         };
//         animate();
//
//         // Xử lý resize
//         const handleResize = () => {
//             const { width: newWidth, height: newHeight } = container.getBoundingClientRect();
//             renderer.setSize(newWidth, newHeight);
//             camera.left = -newWidth / 2;
//             camera.right = newWidth / 2;
//             camera.top = newHeight / 2;
//             camera.bottom = -newHeight / 2;
//             camera.updateProjectionMatrix();
//             const newRadius = Math.min(newWidth, newHeight) * (isMobileDevice ? 0.4 : 0.35);
//             progressCircle.geometry.dispose();
//             progressCircle.geometry = new THREE.RingGeometry(newRadius - 5, newRadius, 64, 1, 0, (progress / 100) * Math.PI * 2);
//         };
//         window.addEventListener('resize', handleResize);
//
//         // Trả về cleanup function
//         return () => {
//             window.removeEventListener('resize', handleResize);
//             if (animationFrameId) cancelAnimationFrame(animationFrameId);
//             if (rendererRef.current && threeContainerRef.current) {
//                 threeContainerRef.current.removeChild(renderer.domElement);
//                 renderer.dispose();
//             }
//         };
//     }, [progress, isMobileDevice]);
//
//     useEffect(() => {
//         const cleanup = initThreeJS();
//         return () => {
//             if (typeof cleanup === 'function') cleanup();
//         };
//     }, [initThreeJS]);
//
//     // Khởi động webcam
//     const startStream = async () => {
//         try {
//             if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
//                 setError('Browser does not support camera');
//                 return;
//             }
//             const stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'user' } });
//             if (videoRef.current) {
//                 videoRef.current.srcObject = stream;
//                 streamRef.current = stream;
//                 setIsStreaming(true);
//                 setError(null);
//             }
//         } catch (err) {
//             setError(err instanceof Error ? err.message : 'Failed to access webcam');
//             setIsStreaming(false);
//         }
//     };
//
//     const stopStream = () => {
//         if (streamRef.current) {
//             streamRef.current.getTracks().forEach(track => track.stop());
//             if (videoRef.current) videoRef.current.srcObject = null;
//             streamRef.current = null;
//             setIsStreaming(false);
//         }
//     };
//
//     const restartStream = () => {
//         if (isStreaming) {
//             stopStream();
//             setTimeout(() => startStream(), 500);
//         }
//     };
//
//     const updateCanvasDimensions = useCallback(() => {
//         if (!videoRef.current || !canvasRef.current || !containerRef.current) return;
//         const video = videoRef.current;
//         const canvas = canvasRef.current;
//         const container = containerRef.current;
//         const { width, height } = container.getBoundingClientRect();
//         canvas.style.width = `${width}px`;
//         canvas.style.height = `${height}px`;
//         canvas.width = width;
//         canvas.height = height;
//     }, []);
//
//     const cropFace = (landmarks) => {
//         if (!videoRef.current) return null;
//         let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
//         landmarks.forEach(point => {
//             minX = Math.min(minX, point.x * videoRef.current.videoWidth);
//             minY = Math.min(minY, point.y * videoRef.current.videoHeight);
//             maxX = Math.max(maxX, point.x * videoRef.current.videoWidth);
//             maxY = Math.max(maxY, point.y * videoRef.current.videoHeight);
//         });
//         const XPadding = 20;
//         const YPadding = 20;
//         const cropX = Math.max(0, minX - XPadding);
//         const cropY = Math.max(0, minY - YPadding);
//         const cropWidth = Math.min(videoRef.current.videoWidth - cropX, maxX - cropX + 2 * XPadding);
//         const cropHeight = Math.min(videoRef.current.videoHeight - cropY, maxY - cropY + 2 * YPadding);
//         const tempCanvas = document.createElement('canvas');
//         tempCanvas.width = cropWidth;
//         tempCanvas.height = cropHeight;
//         const tempCtx = tempCanvas.getContext('2d');
//         tempCtx.drawImage(videoRef.current, cropX, cropY, cropWidth, cropHeight, 0, 0, cropWidth, cropHeight);
//         return tempCanvas.toDataURL('image/png');
//     };
//
//     const predictWebcam = useCallback(async () => {
//         if (!videoRef.current || !canvasRef.current || !faceLandmarker || !isStreaming) return;
//         const video = videoRef.current;
//         if (video.videoWidth === 0 || video.videoHeight === 0) return;
//         const canvas = canvasRef.current;
//         const ctx = canvas.getContext('2d');
//         updateCanvasDimensions();
//         const startTimeMs = performance.now();
//
//         try {
//             const results = faceLandmarker.detectForVideo(video, startTimeMs);
//             const videoWidth = canvas.width;
//             const videoHeight = canvas.height;
//             const smallerDimension = Math.min(videoWidth, videoHeight);
//             const centerX = videoWidth / 2;
//             const centerY = videoHeight / 2;
//             const radius = smallerDimension * (isMobileDevice ? 0.4 : 0.35);
//
//             ctx.clearRect(0, 0, canvas.width, canvas.height);
//             ctx.fillStyle = 'rgba(128, 128, 128, 0.6)';
//             ctx.fillRect(0, 0, canvas.width, canvas.height);
//             ctx.globalCompositeOperation = 'destination-out';
//             ctx.beginPath();
//             ctx.arc(centerX, centerY, radius, 0, Math.PI * 2);
//             ctx.fill();
//             ctx.globalCompositeOperation = 'source-over';
//             ctx.strokeStyle = '#bfdbfe';
//             ctx.lineWidth = 2;
//             ctx.beginPath();
//             ctx.arc(centerX, centerY, radius, 0, Math.PI * 2);
//             ctx.stroke();
//
//             if (results.faceLandmarks && results.faceLandmarks.length > 0) {
//                 for (const landmarks of results.faceLandmarks) {
//                     const facePoints = landmarks.map(point => ({
//                         x: point.x * canvas.width,
//                         y: point.y * canvas.height,
//                     }));
//                     const isFaceInCircle = facePoints.every(point =>
//                         Math.sqrt(Math.pow(point.x - centerX, 2) + Math.pow(point.y - centerY, 2)) <= radius
//                     );
//
//                     if (isFaceInCircle) {
//                         setText('');
//                         const noseTip = landmarks[1];
//                         const leftEye = landmarks[33];
//                         const rightEye = landmarks[263];
//                         const chin = landmarks[152];
//                         const forehead = landmarks[10];
//                         const eyeDistance = Math.sqrt(
//                             Math.pow(rightEye.x - leftEye.x, 2) + Math.pow(rightEye.y - leftEye.y, 2)
//                         );
//                         const faceHeight = Math.sqrt(
//                             Math.pow(chin.x - forehead.x, 2) + Math.pow(chin.y - forehead.y, 2)
//                         );
//                         const horizontalThreshold = eyeDistance * 0.1;
//                         const verticalThreshold = faceHeight * 0.05;
//                         const noseCenterX = (leftEye.x + rightEye.x) / 2;
//                         let horizontalDirection = 'Center';
//                         if (noseTip.x < noseCenterX - horizontalThreshold) horizontalDirection = 'Right';
//                         else if (noseTip.x > noseCenterX + horizontalThreshold) horizontalDirection = 'Left';
//                         const faceCenterY = (forehead.y + chin.y) / 2;
//                         let verticalDirection = 'Center';
//                         if (noseTip.y < faceCenterY - verticalThreshold) verticalDirection = 'Up';
//                         else if (noseTip.y > faceCenterY + verticalThreshold) verticalDirection = 'Down';
//                         let faceDirection = '';
//                         if (horizontalDirection === 'Center' && verticalDirection === 'Center') {
//                             faceDirection = 'Front';
//                         } else {
//                             faceDirection = `${verticalDirection !== 'Center' ? verticalDirection : ''} ${
//                                 horizontalDirection !== 'Center' ? horizontalDirection : ''
//                             }`.trim();
//                             if (!faceDirection) faceDirection = 'Center';
//                         }
//                         const directionKey =
//                             faceDirection === 'Front'
//                                 ? 'front'
//                                 : faceDirection === 'Left'
//                                     ? 'left'
//                                     : faceDirection === 'Right'
//                                         ? 'right'
//                                         : faceDirection === 'Up'
//                                             ? 'up'
//                                             : 'down';
//                         const limit = totalImages / 5;
//                         if (directionKey && images[directionKey] && images[directionKey].length < limit) {
//                             const currentTime = performance.now();
//                             if (currentTime - lastCaptureTime.current >= captureDelay) {
//                                 const faceImage = cropFace(landmarks);
//                                 if (faceImage) {
//                                     const imageData = await base64ToImageData(faceImage);
//                                     if (imageEmbedder) {
//                                         const embResult = await imageEmbedder.embed(imageData);
//                                         if (embResult && embResult.embeddings && embResult.embeddings.length > 0) {
//                                             const emb = embResult.embeddings[0];
//                                             if (emb && emb.floatEmbedding) {
//                                                 if (embs.length === 0) {
//                                                     setEmbs([emb]);
//                                                     setImages(prev => ({
//                                                         ...prev,
//                                                         [directionKey]: [...prev[directionKey], faceImage].slice(0, limit),
//                                                     }));
//                                                     lastCaptureTime.current = currentTime;
//                                                 } else {
//                                                     const similarities = embs.map(existingEmb =>
//                                                         ImageEmbedder.cosineSimilarity(emb, existingEmb)
//                                                     );
//                                                     const rate = Math.max(...similarities);
//                                                     if ((rate <= 0.85 && embs.length === 1) || (0.5 < rate && rate <= 0.6)) {
//                                                         setEmbs(prev => [...prev, emb]);
//                                                         setImages(prev => ({
//                                                             ...prev,
//                                                             [directionKey]: [...prev[directionKey], faceImage].slice(0, limit),
//                                                         }));
//                                                     }
//                                                     lastCaptureTime.current = currentTime;
//                                                 }
//                                             }
//                                         }
//                                     }
//                                 }
//                             }
//                         }
//                         ctx.fillStyle = '#FF0000';
//                         ctx.font = '18px Arial';
//                         ctx.fillText(`Face: ${faceDirection}`, 10, 30);
//                     } else {
//                         setText('Position your face in the circle');
//                     }
//                 }
//                 const fontSize = Math.max(16, Math.min(canvas.width, canvas.height) * 0.02);
//                 ctx.font = `${fontSize}px Arial`;
//                 ctx.fillStyle = '#FFFFFF';
//                 ctx.textAlign = 'center';
//                 ctx.fillText(text, centerX, centerY + radius + fontSize * 1.5);
//             }
//         } catch (err) {
//             console.error('Face detection error:', err);
//             setError('Face detection failed. Try restarting the camera.');
//         }
//         setTimeout(predictWebcam, captureDelay);
//     }, [
//         faceLandmarker,
//         totalImages,
//         images,
//         isStreaming,
//         setImages,
//         updateCanvasDimensions,
//         embs,
//         imageEmbedder,
//     ]);
//
//     useEffect(() => {
//         const handleResize = () => {
//             updateCanvasDimensions();
//             updateOrientation();
//         };
//         window.addEventListener('resize', handleResize);
//         return () => window.removeEventListener('resize', handleResize);
//     }, [updateCanvasDimensions]);
//
//     useEffect(() => {
//         const handleOrientationChange = () => {
//             setTimeout(() => {
//                 updateOrientation();
//                 if (isStreaming) restartStream();
//             }, 300);
//         };
//         if (isMobileDevice) {
//             window.addEventListener('orientationchange', handleOrientationChange);
//             return () => window.removeEventListener('orientationchange', handleOrientationChange);
//         }
//     }, [isStreaming, isMobileDevice]);
//
//     useEffect(() => {
//         const handleVideoMetadata = () => {
//             updateCanvasDimensions();
//             if (isStreaming && faceLandmarker) predictWebcam();
//         };
//         const videoElement = videoRef.current;
//         if (videoElement) {
//             videoElement.addEventListener('loadedmetadata', handleVideoMetadata);
//             return () => videoElement.removeEventListener('loadedmetadata', handleVideoMetadata);
//         }
//     }, [isStreaming, faceLandmarker, predictWebcam, updateCanvasDimensions]);
//
//     useEffect(() => {
//         return () => stopStream();
//     }, []);
//
//     return (
//         <div className="w-full max-w-3xl mx-auto p-2 md:p-4">
//             {error && (
//                 <div className="mb-4 p-3 bg-red-50 rounded-lg flex items-center text-red-700 text-sm">
//                     <AlertCircle className="h-4 w-4 mr-2 flex-shrink-0" />
//                     <span>{error}</span>
//                 </div>
//             )}
//             <div className="relative">
//                 <div
//                     ref={containerRef}
//                     className={`relative bg-gray-900 rounded-lg overflow-hidden ${
//                         isMobileDevice && orientation === 'portrait' ? 'aspect-[9/16] md:aspect-[3/4]' : 'aspect-video'
//                     }`}
//                 >
//                     <video
//                         ref={videoRef}
//                         autoPlay
//                         playsInline
//                         muted
//                         className="w-full h-full object-cover"
//                         style={{ transform: 'scaleX(-1)' }}
//                     />
//                     <canvas ref={canvasRef} className="absolute top-0 left-0" />
//                     <div ref={threeContainerRef} className="absolute top-0 left-0 w-full h-full pointer-events-none" />
//                     {!isStreaming && !error && (
//                         <div className="absolute inset-0 flex items-center justify-center bg-gray-800 text-white">
//                             <p className="text-center text-sm md:text-base px-4">Click the start button to enable webcam</p>
//                         </div>
//                     )}
//                 </div>
//                 <div className="mt-3 flex justify-center gap-2">
//                     <button
//                         onClick={isStreaming ? stopStream : startStream}
//                         className={`px-4 py-2 rounded-lg flex items-center text-sm md:text-base ${
//                             isStreaming ? 'bg-red-600 hover:bg-red-700 text-white' : 'bg-blue-600 hover:bg-blue-700 text-white'
//                         }`}
//                     >
//                         {isStreaming ? (
//                             <>
//                                 <CameraOff className="h-4 w-4 mr-1 md:h-5 md:w-5 md:mr-2" />
//                                 <span className="hidden xs:inline">Stop</span> Camera
//                             </>
//                         ) : (
//                             <>
//                                 <Camera className="h-4 w-4 mr-1 md:h-5 md:w-5 md:mr-2" />
//                                 <span className="hidden xs:inline">Start</span> Camera
//                             </>
//                         )}
//                     </button>
//                     {isStreaming && (
//                         <button
//                             onClick={restartStream}
//                             className="px-4 py-2 rounded-lg flex items-center bg-gray-600 hover:bg-gray-700 text-white text-sm md:text-base"
//                         >
//                             <RotateCcw className="h-4 w-4 mr-1 md:h-5 md:w-5 md:mr-2" />
//                             <span className="hidden xs:inline">Restart</span> Camera
//                         </button>
//                     )}
//                 </div>
//             </div>
//         </div>
//     );
// };
//
// export default WebStream;
