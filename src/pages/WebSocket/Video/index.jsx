// import React, { useEffect, useRef, useState } from 'react';
// import { AlertCircle, Camera, CameraOff, Loader2 } from 'lucide-react';
//
// const Socket = ({ code, fullName, isStaff }) => {
//   const videoRef = useRef(null);
//   const canvasRef = useRef(null);
//   const streamRef = useRef(null);
//   const [isStreaming, setIsStreaming] = useState(false);
//   const [error, setError] = useState(null);
//   const [socket, setSocket] = useState(null);
//   const animationFrameId = useRef(null);
//   const [lastFrameTime, setLastFrameTime] = useState(0);
//   const FPS = 5;
//   const [isLoading, setIsLoading] = useState(false);
//   const [progressPercentage, setProgressPercentage] = useState(0);
//
//   const startSocket = async () => {
//     if (socket && socket.readyState === WebSocket.OPEN) {
//       return socket;
//     }
//
//     setIsLoading(true);
//     const api_ws = process.env.REACT_APP_API_WS;
//
//     const wsUrl = `${api_ws}/faces/ws?code=${encodeURIComponent(code)}&full_name=${encodeURIComponent(fullName)}&is_staff=${isStaff}`;
//     const ws = new WebSocket(wsUrl);
//
//     ws.onopen = () => {
//       console.log('WebSocket connected successfully');
//       setError(null);
//       setSocket(ws);
//       setIsLoading(false);
//     };
//
//     ws.onerror = (error) => {
//       console.error('WebSocket error:', error);
//       setError('Failed to connect to WebSocket server');
//       setIsLoading(false);
//       stopStream();
//     };
//
//     ws.onmessage = (msg) => {
//       try {
//         const data = JSON.parse(msg.data);
//         if (data.faces_detected !== undefined) {
//           // const newProgress = totalImages > 0 ? (data.faces_detected / totalImages) * 100 : 0;
//           setProgressPercentage(data.faces_detected);
//         }
//       } catch (e) {
//         console.error('Error parsing message:', e);
//       }
//     };
//
//     ws.onclose = () => {
//       console.log('WebSocket closed');
//       setIsLoading(false);
//       setSocket(null);
//     };
//
//     return ws;
//   };
//
//   const startStream = async () => {
//     try {
//       const stream = await navigator.mediaDevices.getUserMedia({
//         video: { width: 720, height: 1280, facingMode: 'user' },
//       });
//
//       await startSocket();
//
//       if (videoRef.current) {
//         videoRef.current.srcObject = stream;
//         streamRef.current = stream;
//         setIsStreaming(true);
//         console.log('Stream started');
//         setError(null);
//       }
//     } catch (err) {
//       let errorMessage = 'Failed to access webcam';
//       if (err.name === 'NotAllowedError') {
//         errorMessage = 'Camera access denied by user';
//       } else if (err.name === 'NotFoundError') {
//         errorMessage = 'No camera found on device';
//       }
//       setError(`${errorMessage}: ${err.message}`);
//       setIsStreaming(false);
//     }
//   };
//
//   const stopStream = () => {
//     if (streamRef.current) {
//       streamRef.current.getTracks().forEach((track) => track.stop());
//       if (videoRef.current) {
//         videoRef.current.srcObject = null;
//       }
//       setIsStreaming(false);
//       cancelAnimationFrame(animationFrameId.current);
//
//       if (socket && socket.readyState === WebSocket.OPEN) {
//         socket.close();
//         setSocket(null);
//       }
//     }
//   };
//
//   useEffect(() => {
//     if (!isStreaming || !socket || socket.readyState !== WebSocket.OPEN) {
//       return;
//     }
//
//     console.log('Starting to send frames...');
//     const canvas = canvasRef.current;
//     const video = videoRef.current;
//
//     if (!canvas || !video) {
//       return;
//     }
//
//     const ctx = canvas.getContext('2d');
//     canvas.width = video.videoWidth || 640;
//     canvas.height = video.videoHeight || 720;
//
//     const captureFrame = () => {
//       const now = performance.now();
//       if (now - lastFrameTime < 1000 / FPS) {
//         animationFrameId.current = requestAnimationFrame(captureFrame);
//         return;
//       }
//
//       if (video.readyState === 4) {
//         // HAVE_ENOUGH_DATA
//         ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
//         const dataUrl = canvas.toDataURL('image/jpeg', 0.8);
//         socket.send(JSON.stringify({ frame: dataUrl }));
//         setLastFrameTime(now);
//       }
//
//       animationFrameId.current = requestAnimationFrame(captureFrame);
//     };
//
//     animationFrameId.current = requestAnimationFrame(captureFrame);
//
//     // Cleanup function
//     return () => {
//       cancelAnimationFrame(animationFrameId.current);
//       // window.removeEventListener('resize', updateCanvasSize);
//       console.log('Frame sending stopped');
//     };
//   }, [isStreaming, socket, lastFrameTime]);
//
//   useEffect(() => {
//     return () => {
//       console.log('Component unmounting, cleaning up resources');
//       stopStream();
//     };
//   }, []);
//
//   useEffect(() => {
//     if (progressPercentage > 10) {
//       console.log('Progress percentage stop');
//       stopStream();
//     }
//   }, [progressPercentage, stopStream]);
//
//   return (
//     <div className="w-full max-w-3xl mx-auto p-4">
//       <div className="bg-white rounded-xl shadow-lg overflow-hidden">
//         {/* Header */}
//         <div className="bg-gradient-to-r from-blue-600 to-indigo-700 px-6 py-4">
//           <h2 className="text-xl font-bold text-white">Lấy mẫu webcam</h2>
//           {/*<p className="text-blue-100">Capture and analyze facial data</p>*/}
//         </div>
//         {/* Error message */}
//         {error && (
//           <div className="mx-6 mt-4 p-3 bg-red-50 border border-red-200 rounded-lg flex items-center text-red-700 animate-appear">
//             <AlertCircle className="h-5 w-5 mr-2 flex-shrink-0" />
//             <span className="text-sm">{error}</span>
//           </div>
//         )}
//         {/* Video display */}
//         <div className="p-6">
//           <div className="relative bg-gray-900 rounded-lg overflow-hidden aspect-video shadow-inner w-full h-auto">
//             {isLoading && (
//               <div className="absolute inset-0 flex items-center justify-center bg-black/40 z-10">
//                 <div className="flex flex-col items-center">
//                   <Loader2 className="h-8 w-8 text-white animate-spin" />
//                   <p className="text-white mt-2">Đang kết nối...</p>
//                 </div>
//               </div>
//             )}
//             <video
//               ref={videoRef}
//               autoPlay
//               playsInline
//               className={`w-full h-auto object-contain ${isStreaming ? 'opacity-100' : 'opacity-80'}`}
//             />
//             {!isStreaming && !isLoading && (
//               <div className="absolute inset-0 flex items-center justify-center">
//                 <div className="text-center text-white">
//                   <Camera className="h-12 w-12 mx-auto mb-2 opacity-60" />
//                   <p className="opacity-80">Camera đang tắt</p>
//                 </div>
//               </div>
//             )}
//             <canvas ref={canvasRef} className="hidden" />
//           </div>
//           {/* Camera controls */}
//           <div className="mt-6 flex justify-center">
//             <button
//               onClick={isStreaming ? stopStream : startStream}
//               disabled={isLoading}
//               className={`px-6 py-3 rounded-lg flex items-center justify-center transition-all duration-200 shadow-md ${isStreaming ? 'bg-red-600 hover:bg-red-700 text-white' : 'bg-blue-600 hover:bg-blue-700 text-white'} ${isLoading ? 'opacity-70 cursor-not-allowed' : 'opacity-100'}`}
//               style={{
//                 minWidth: '160px',
//               }}
//             >
//               {isLoading ? (
//                 <Loader2 className="h-5 w-5 animate-spin" />
//               ) : isStreaming ? (
//                 <>
//                   <CameraOff className="h-5 w-5 mr-2" />
//                   Kết thúc
//                 </>
//               ) : (
//                 <>
//                   <Camera className="h-5 w-5 mr-2" />
//                   Bắt đầu
//                 </>
//               )}
//             </button>
//           </div>
//           {/* Info panel */}
//           <div className="mt-6 grid grid-cols-1 md:grid-cols-2 gap-4">
//             <div className="bg-gray-50 p-4 rounded-lg">
//               <h3 className="text-sm font-medium text-gray-500 mb-2">Thông tin</h3>
//               <div className="space-y-2">
//                 <div className="flex justify-between">
//                   <span className="text-gray-600">Mã số:</span>
//                   <span className="font-medium">{code}</span>
//                 </div>
//                 <div className="flex justify-between">
//                   <span className="text-gray-600">Họ tên:</span>
//                   <span className="font-medium">{fullName}</span>
//                 </div>
//                 <div className="flex justify-between">
//                   <span className="text-gray-600">Vai trò:</span>
//                   <span className="font-medium">{isStaff ? 'Nhân viên' : 'Sinh viên'}</span>
//                 </div>
//               </div>
//             </div>
//             <div className="bg-gray-50 p-4 rounded-lg">
//               <h3 className="text-sm font-medium text-gray-500 mb-2">Quá trình thu thập</h3>
//               <div className="mb-2 flex justify-between">
//                 <span className="text-gray-600">Số lượng gương mặt:</span>
//                 <span className="font-medium">{Math.round(progressPercentage)}</span>
//               </div>
//               {/*{totalImages > 0 && (*/}
//               {/*    <div className="w-full bg-gray-200 rounded-full h-2.5">*/}
//               {/*        <div*/}
//               {/*            className="bg-blue-600 h-2.5 rounded-full transition-all duration-300 ease-out"*/}
//               {/*            style={{*/}
//               {/*                width: `${Math.min(progressPercentage, 100)}%`,*/}
//               {/*            }}*/}
//               {/*        ></div>*/}
//               {/*    </div>*/}
//               {/*)}*/}
//             </div>
//           </div>
//         </div>
//       </div>
//     </div>
//   );
// };
//
// export default Socket;
