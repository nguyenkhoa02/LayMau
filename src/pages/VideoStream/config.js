"use client";
import React, { useEffect } from "react";
import { useRef, useState } from "react";
import { Menu, X, Zap, Video } from "lucide-react";
import CamStream from "../VideoStream/components/CamStream";
import mqtt from "mqtt";
export default function VideoStream() {
  // const [connected, setConnected] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [cameras, setCameras] = useState([
    {
      id: "cam1",
      name: "Main Entrance",
      location: "Front Door",
      topic: "cam/door_in",
      isActive: true,
    },
    {
      id: "cam2",
      name: "Back Door",
      location: "Rear Entrance",
      topic: "cam/back_door",
      isActive: false,
    },
  ]);
  const [activeCameraTopic, setActiveCameraTopic] = useState("cam/door_in");

  const clientRef = useRef(null);

  const handleCameraChange = (cameraId) => {
    const updatedCameras = cameras.map((camera) => ({
      ...camera,
      isActive: camera.id === cameraId,
    }));

    setCameras(updatedCameras);

    const selectedCamera = updatedCameras.find(
      (camera) => camera.id === cameraId,
    );
    if (selectedCamera) {
      setActiveCameraTopic(selectedCamera.topic);
    }

    if (window.innerWidth < 768) {
      setSidebarOpen(false);
    }
  };

  useEffect(() => {
    clientRef.current = mqtt.connect("ws://localhost:8083/mqtt", {
      username: "face",
      password: "face",
      reconnectPeriod: 1000,
      connectTimeout: 30 * 1000,
      clean: true,
      clientId: "web-client-" + Math.random().toString(16).substr(2, 8),
    });
  });

  // const activeCamera = cameras.find((cam) => cam.isActive)

  return (
    <div className="flex flex-col min-h-screen bg-white text-gray-800">
      <header className="border-b border-gray-200">
        <div className="container flex h-14 items-center">
          <button
            className="mr-2 md:hidden"
            onClick={() => setSidebarOpen(!sidebarOpen)}
          >
            {sidebarOpen ? (
              <X className="h-5 w-5" />
            ) : (
              <Menu className="h-5 w-5" />
            )}
          </button>
          <h1 className="text-lg font-semibold flex items-center">
            <Zap className="mr-2 h-5 w-5 text-blue-500" />
            Real-time Person Detection
          </h1>
          <div className="ml-auto flex items-center gap-2">
            <span className="inline-flex items-center rounded-md bg-blue-50 px-2 py-1 text-xs font-medium text-blue-700 ring-1 ring-blue-700/10 ring-inset">
              Connected
            </span>
          </div>
        </div>
      </header>

      <div className="flex flex-1 overflow-hidden">
        <div
          className={`
            ${sidebarOpen ? "translate-x-0" : "-translate-x-full md:translate-x-0"} 
            fixed md:static top-14 bottom-0 left-0 w-64 bg-white border-r border-gray-200 
            transition-transform duration-300 ease-in-out z-30
          `}
        >
          <div className="p-4 border-b border-gray-200">
            <h2 className="text-lg font-medium flex items-center">
              <Video className="mr-2 h-5 w-5 text-blue-500" />
              Cameras
            </h2>
          </div>
          <div className="p-2">
            {cameras.map((camera) => (
              <button
                key={camera.id}
                className={`w-full text-left p-3 rounded-lg mb-1 flex items-center justify-between ${
                  camera.isActive
                    ? "bg-blue-50 text-blue-700 border border-blue-200"
                    : "hover:bg-gray-100"
                }`}
                onClick={() => handleCameraChange(camera.id)}
              >
                <div>
                  <div className="font-medium">{camera.name}</div>
                  <div className="text-xs text-gray-500">{camera.location}</div>
                </div>
                {camera.isActive && (
                  <spans className="bg-blue-500">Active</spans>
                )}
              </button>
            ))}
          </div>
        </div>

        <CamStream
          client={clientRef.current}
          videoSubscribe={activeCameraTopic}
          personSubscribe="show/door_in"
        />
      </div>

      {sidebarOpen && (
        <div
          className="fixed inset-0 bg-black/20 z-20 md:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}
    </div>
  );
}
