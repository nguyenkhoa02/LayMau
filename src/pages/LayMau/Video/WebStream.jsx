import React, { useCallback, useEffect, useRef, useState } from 'react';
import vision from 'https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.3';
import { AlertCircle, Camera, CameraOff } from 'lucide-react';
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
          minDetectionConfidence: 0.8, // Tăng lên để chính xác hơn
          minTrackingConfidence: 0.8,  // Giữ track chính xác hơn
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
        console.error('Error loading FaceLandmarker:', e);
        setError('Failed to load embedding model.');
      }
    };
    loadImageEmbedder();
  }, []);

  // Bắt đầu phát video từ webcam
  const startStream = async () => {
    try {
      if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        setError('Trình duyệt không hỗ trợ camera');
      }
      const stream = await navigator.mediaDevices.getUserMedia({
        video: {
          width: { ideal: 1280 },
          height: { ideal: 720 },
          facingMode: 'user',
        },
      });

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

  // Dừng camera
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

  // Cập nhật kích thước canvas khi video thay đổi kích thước
  const updateCanvasDimensions = useCallback(() => {
    if (!videoRef.current || !canvasRef.current || !containerRef.current) return;

    const video = videoRef.current;
    const canvas = canvasRef.current;
    const container = containerRef.current;

    const containerRect = container.getBoundingClientRect();

    const videoWidth = video.videoWidth;
    const videoHeight = video.videoHeight;

    if (videoWidth === 0 || videoHeight === 0) return;

    setVideoDimensions({ width: videoWidth, height: videoHeight });

    const containerRatio = containerRect.width / containerRect.height;
    const videoRatio = videoWidth / videoHeight;

    let newWidth, newHeight;

    if (containerRatio > videoRatio) {
      newHeight = containerRect.height;
      newWidth = newHeight * videoRatio;
    } else {
      newWidth = containerRect.width;
      newHeight = newWidth / videoRatio;
    }

    canvas.style.width = `${newWidth}px`;
    canvas.style.height = `${newHeight}px`;

    canvas.width = videoWidth;
    canvas.height = videoHeight;
  }, []);

  const cropFace = (landmarks) => {
    let minX = Infinity,
      minY = Infinity,
      maxX = -Infinity,
      maxY = -Infinity;
    landmarks.forEach((point) => {
      minX = Math.min(minX, point.x * canvasRef.current.width);
      minY = Math.min(minY, point.y * canvasRef.current.height);
      maxX = Math.max(maxX, point.x * canvasRef.current.width);
      maxY = Math.max(maxY, point.y * canvasRef.current.height);
    });
    const XPadding = 20;
    const YPadding = 20;  
    const cropX = Math.max(0, minX - XPadding);
    const cropY = Math.max(0, minY - YPadding);
    const cropWidth = Math.min(canvasRef.current.width - cropX, maxX - cropX + 2 * XPadding);
    const cropHeight = Math.min(canvasRef.current.height - cropY, maxY - cropY + 2 * YPadding);

    // ctx.drawImage(videoRef.current, cropX, cropY, cropWidth, cropHeight, 0, 0, cropWidth, cropHeight);
    const tempCanvas = document.createElement('canvas');
    tempCanvas.width = cropWidth;
    tempCanvas.height = cropHeight;
    const tempCtx = tempCanvas.getContext('2d');
    tempCtx.drawImage(
      videoRef.current,
      cropX,
      cropY,
      cropWidth,
      cropHeight, // Vùng nguồn từ video
      0,
      0,
      cropWidth,
      cropHeight, // Vùng đích trên canvas tạm
    );
    tempCanvas
      .getContext('2d')
      .drawImage(canvasRef.current, 0, 0, cropWidth, cropHeight, 0, 0, cropWidth, cropHeight);
    return tempCanvas.toDataURL('image/png');

    // const resizedCanvas = document.createElement("canvas");
    // resizedCanvas.width = 112;
    // resizedCanvas.height = 112;
    // const resizedCtx = resizedCanvas.getContext("2d");
    // resizedCtx.imageSmoothingQuality = true
    // resizedCtx.imageSmoothingQuality = "high"
    //
    // resizedCtx.drawImage(tempCanvas, 0, 0, 112, 112);
    //
    // return resizedCanvas.toDataURL("image/png");
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
  const lastCaptureTime = useRef(0); // Lưu thời gian capture gần nhất
  const captureDelay = 2000; // 2 giây delay
  const predictWebcam = useCallback(async () => {
    if (!videoRef.current || !canvasRef.current || !faceLandmarker || !isStreaming) return;
  
    const video = videoRef.current;
    if (video.videoWidth === 0 || video.videoHeight === 0) return;
  
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    updateCanvasDimensions();
  
    const startTimeMs = performance.now();
  
    // Define the bounding box area in the center of the canvas
    const boxSize = 500;
    const boxX = (canvas.width - boxSize) / 2;
    const boxY = (canvas.height - boxSize) / 2;
  
    try {
      const results = faceLandmarker.detectForVideo(video, startTimeMs);
  
      ctx.clearRect(0, 0, canvas.width, canvas.height);
  
      // Draw the fixed bounding box
      ctx.strokeStyle = '#00FF00';
      ctx.lineWidth = 2;
      ctx.strokeRect(boxX, boxY, boxSize, boxSize);
  
      if (results.faceLandmarks) {
        for (const landmarks of results.faceLandmarks) {
          const facePoints = landmarks.map(point => ({
            x: point.x * canvas.width,
            y: point.y * canvas.height,
          }));
  
          // Check if all landmarks are within the bounding box
          const isFaceInBox = facePoints.every(point =>
            point.x >= boxX && point.x <= boxX + boxSize &&
            point.y >= boxY && point.y <= boxY + boxSize
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
  
            ctx.fillStyle = '#FF0000';
            ctx.font = '18px Arial';
            ctx.fillText(`Face: ${faceDirection}`, 10, 30);
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
  

  // Cập nhật canvas khi cửa sổ thay đổi kích thước
  useEffect(() => {
    const handleResize = () => {
      updateCanvasDimensions();
    };

    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, [updateCanvasDimensions]);

  // Kích hoạt vòng lặp nhận diện khi `isStreaming` thay đổi
  // useEffect(() => {
  //   if (isStreaming && faceLandmarker) {
  //     predictWebcam();
  //   }
  // }, [isStreaming, faceLandmarker, predictWebcam]);

  // Thêm sự kiện để cập nhật kích thước khi video đã tải
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

  // Cleanup khi component bị hủy
  useEffect(() => {
    return () => stopStream();
  }, []);

  return (
    <div className="w-full max-w-3xl mx-auto p-4">
      {error && (
        <div className="mb-4 p-4 bg-red-50 rounded-lg flex items-center text-red-700">
          <AlertCircle className="h-5 w-5 mr-2" />
          <span>{error}</span>
        </div>
      )}
      <div className="relative">
        <div
          ref={containerRef}
          className="relative aspect-video bg-gray-900 rounded-lg overflow-hidden"
        >
          <video ref={videoRef} autoPlay playsInline className="w-full h-full object-cover" />
          <canvas ref={canvasRef} className="absolute top-0 left-0" />

          {!isStreaming && !error && (
            <div className="absolute inset-0 flex items-center justify-center bg-gray-800 text-white">
              <p className="text-center">Click the start button to enable webcam</p>
            </div>
          )}
        </div>
        <div className="mt-4 flex justify-center">
          <button
            onClick={isStreaming ? stopStream : startStream}
            className={`px-6 py-2 rounded-lg flex items-center ${
              isStreaming
                ? 'bg-red-600 hover:bg-red-700 text-white'
                : 'bg-blue-600 hover:bg-blue-700 text-white'
            }`}
          >
            {isStreaming ? (
              <>
                <CameraOff className="h-5 w-5 mr-2" />
                Stop Camera
              </>
            ) : (
              <>
                <Camera className="h-5 w-5 mr-2" />
                Start Camera
              </>
            )}
          </button>
        </div>
        {isStreaming && videoDimensions.width > 0 && (
          <div className="mt-2 text-xs text-gray-500 text-center">
            Video resolution: {videoDimensions.width}×{videoDimensions.height}
          </div>
        )}
      </div>
    </div>
  );
};

export default WebStream;