import React, { useEffect, useRef, useState } from "react";
import { User, UserCircle } from "lucide-react";

import mqtt from "mqtt";
import PropTypes from "prop-types";

const VideoStream = () => {
  const [connected, setConnected] = useState(false);
  const [persons, setPersons] = useState([]);
  const [noData, setNoData] = useState([]);
  const canvasRef = useRef(null);
  const wsRef = useRef(null);

  useEffect(() => {
    const client = mqtt.connect("ws://localhost:8083/mqtt", {
      username: "face",
      password: "face",
      reconnectPeriod: 1000,
      connectTimeout: 30 * 1000,
      clean: true,
      clientId: "web-client-" + Math.random().toString(16).substr(2, 8),
    });

    wsRef.current = client;

    client.on("connect", () => {
      // console.log("MQTT connected over WSS");
      setConnected(true);
      // Subscribe to the new topics
      client.subscribe("cam/door_in"); // Video feed topic
      client.subscribe("show/door_in"); // Person information topic
    });

    client.on("error", (error) => {
      console.error("MQTT error:", error);
      setConnected(false);
    });

    client.on("close", () => {
      // console.log("MQTT connection closed");
      setConnected(false);
    });

    client.on("message", (topic, message) => {
      try {
        const msgString = message.toString();

        if (topic === "cam/door_in") {
          displayFrame(msgString); // base64 string
        } else if (topic === "show/door_in") {
          const data = JSON.parse(msgString);

          if (Array.isArray(data) && data.length > 0) {
            const transformedPersons = data.map((person) => ({
              id: person.id_nv.split("_")[0],
              name: person.id_nv.split("_")[1] || person.id_nv,
              time: new Date(person.datetime * 1000),
              frame: person.frame,
              image_info: person.image_info,
            }));

            // console.log("transformedPersons: ", transformedPersons);

            setPersons((prev) => {
              const updatedMap = new Map(prev.map((p) => [p.id, p]));

              for (const p of transformedPersons) {
                if (p.id === "No data") continue;
                // Cập nhật hoặc thêm mới vào map
                updatedMap.set(p.id, p);
              }

              // Giữ thứ tự: phần tử mới nhất ở đầu danh sách
              const updated = Array.from(updatedMap.values()).sort(
                (a, b) => new Date(b.time) - new Date(a.time),
              );

              return updated;
            });

            setNoData((prev) => {
              const newPersons = transformedPersons.filter(
                (p) => p.id === "No data",
              );
              const updated = [...newPersons, ...prev];
              return updated;
            });
          }
        }
      } catch (error) {
        console.error("Error processing MQTT message:", error);
      }
    });

    return () => {
      console.log("Cleaning up MQTT connection");
      client.end(true);
    };
  }, []);

  const displayFrame = (frameData) => {
    if (!canvasRef.current) return;

    const canvas = canvasRef.current;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const img = new Image();
    img.crossOrigin = "anonymous";
    img.onload = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      canvas.width = img.width;
      canvas.height = img.height;
      ctx.drawImage(img, 0, 0);
    };
    img.src = `data:image/jpeg;base64,${frameData}`;
  };

  return (
    <div className="flex flex-col m-6 min-h-screen">
      <div className="flex-1 space-y-6">
        {/*<div className="grid grid-cols-1 md:grid-cols-4 gap-6">*/}
        <div className="flex flex-col gap-6 content-center">
          {/* Camera Feed */}
          <div className="md:col-span-3 flex flex-col w-2/3 m-auto">
            <div className="relative overflow-hidden aspect-video w-full">
              <canvas
                ref={canvasRef}
                className="w-full h-full object-contain bg-black"
              />
              {!connected && (
                <div className="absolute inset-0 flex items-center justify-center bg-black/70 text-white">
                  Connecting to camera feed...
                </div>
              )}
            </div>
          </div>
        </div>
        {/* Information Panel */}
        <div className="space-y-6">
          <PersonInformation persons={persons} type={"recognized"} />
          <PersonInformation persons={noData} type={"nodata"} />
        </div>
      </div>
    </div>
  );
};

const PersonInformation = ({ persons, type }) => {
  const extractName = (idString) => {
    if (!idString) return "";
    const str = String(idString);
    const parts = str.split("_");
    return parts.length > 1 ? parts.slice(1).join(" ") : idString;
  };
  console.log(persons);
  return (
    <div className="md:col-span-1">
      <div className="h-full bg-white border-gray-200 shadow-md overflow-hidden">
        <div
          className={`p-4 bg-gradient-to-r ${
            type === "recognized"
              ? "from-blue-50 to-white border-b border-blue-200"
              : "from-red-50 to-white border-b border-red-200"
          }`}
        >
          <div className="flex items-center">
            <UserCircle
              className={`mr-2 h-5 w-5 ${type === "recognized" ? "text-blue-500" : "text-red-500"}`}
            />
            <h2 className="text-lg font-medium">
              {type === "recognized" ? "Nhận diện" : "Người lạ"}{" "}
              {/*{type === "recognized" ? persons.length : ""}*/}
            </h2>
          </div>
        </div>

        <div className="p-4 w-full overflow-x-auto">
          <div className="flex flex-nowrap space-x-4 min-w-max">
            {persons.length > 0 ? (
              persons.map((person, index) => (
                <div
                  key={person.id + index}
                  className={`rounded-lg transition-all duration-200 ${
                    index === 0
                      ? type === "recognized"
                        ? "bg-gradient-to-r from-blue-50 to-white border border-blue-200"
                        : "bg-gradient-to-r from-red-50 to-white border border-red-200"
                      : "bg-gray-50 border border-gray-200"
                  } hover:border-blue-300 p-4 shadow-sm`}
                >
                  {/* Image section */}
                  <div className="flex flex-row gap-2 mb-4">
                    <div className="flex items-center justify-center">
                      {person.frame ? (
                        <div className="relative group h-16 w-16 flex items-center justify-center">
                          <img
                            src={`data:image/jpeg;base64,${person.frame}`}
                            alt="Person thumbnail"
                            className="h-full w-full rounded-md object-cover border border-gray-200"
                          />
                          <div className="absolute inset-0 bg-gradient-to-t from-black/50 to-transparent opacity-0 group-hover:opacity-100 transition-opacity flex items-end justify-center p-1 rounded-md">
                            <span className="text-xs text-white">Live</span>
                          </div>
                        </div>
                      ) : (
                        <div className="h-16 w-16 rounded-md bg-gray-100 flex items-center justify-center border border-gray-200">
                          <User className="h-8 w-8 text-gray-300" />
                        </div>
                      )}
                    </div>

                    <div className="flex items-center justify-center">
                      {person.image_info ? (
                        <div className="relative group h-16 w-16 flex items-center justify-center">
                          <img
                            src={`data:image/jpeg;base64,${person.image_info}`}
                            alt="Profile image"
                            className="h-full w-full rounded-md object-cover border border-gray-200"
                          />
                          <div className="absolute inset-0 bg-gradient-to-t from-black/50 to-transparent opacity-0 group-hover:opacity-100 transition-opacity flex items-end justify-center p-1 rounded-md">
                            <span className="text-xs text-white">Database</span>
                          </div>
                        </div>
                      ) : (
                        <div className="h-16 w-16 rounded-md bg-gray-100 flex items-center justify-center border border-gray-200">
                          <UserCircle className="h-8 w-8 text-gray-300" />
                        </div>
                      )}
                    </div>

                    {/* Info section */}
                    <div className="space-y-0 justify-center content-center">
                      <div className="flex items-center space-x-2 p-1 pt-0">
                        <p className="text-xs text-gray-500">ID</p>
                        <p className="text-sm font-medium truncate">
                          {person.id}
                        </p>
                      </div>

                      <div className="flex items-center space-x-2 p-1 pt-0">
                        <p className="text-xs text-gray-500">Name</p>
                        <p className="text-sm font-medium truncate">
                          {extractName(person.name)}
                        </p>
                      </div>

                      <div className="flex items-center space-x-2 p-1 pt-0">
                        <p className="text-xs text-gray-500">Time</p>
                        <p className="text-sm font-medium truncate">
                          {person.time.toLocaleString("vi-VN")}
                        </p>
                      </div>
                    </div>
                  </div>

                  {/* Status indicator */}
                  <div className="mt-3 flex items-center justify-between">
                    <div className="flex items-center">
                      <span
                        className={`h-2 w-2 rounded-full ${person.id === "No data" ? "bg-red-500" : "bg-green-500"}  mr-2`}
                      ></span>
                      <span className="text-xs text-gray-500">
                        {person.id !== "No data"
                          ? index === 0
                            ? "Just detected"
                            : "Previously detected"
                          : "Stranger"}
                      </span>
                    </div>
                    {/*<ChevronRight className="h-4 w-4 text-gray-400" />*/}
                  </div>
                </div>
              ))
            ) : (
              <div className="flex flex-col items-center justify-center h-[300px] text-center text-gray-400">
                <div className="w-16 h-16 rounded-full bg-gray-100 flex items-center justify-center mb-4">
                  <User className="h-8 w-8 text-gray-300" />
                </div>
                <p>Không có người được phát hiện</p>
                {/*<p className="text-xs mt-2 max-w-[200px]">*/}
                {/*  Waiting for detection events from the camera feed*/}
                {/*</p>*/}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

PersonInformation.propTypes = {
  persons: PropTypes.array.isRequired,
  type: PropTypes.string.isRequired,
};
export default VideoStream;
