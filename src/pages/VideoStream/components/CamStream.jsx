import React, { useEffect, useRef, useState } from "react";
import PropTypes from "prop-types";
import PersonInformation from "../components/PersonInformation";

const CamStream = ({ client, videoSubscribe, personSubscribe }) => {
  const [connected, setConnected] = useState(false);
  const [persons, setPersons] = useState([]);
  const [noData, setNoData] = useState([]);
  const canvasRef = useRef(null);
  const activeSubscriptionsRef = useRef({ video: null, person: null });

  useEffect(() => {
    // Skip if client isn't provided
    if (!client) {
      console.log("No MQTT client provided to CamStream yet");
      return;
    }

    console.log(
      "CamStream received MQTT client:",
      client ? "Valid client" : "No client",
    );

    // Update connection status based on client state
    setConnected(client.connected);

    const onConnect = () => {
      console.log("MQTT client connection detected in CamStream");
      setConnected(true);

      // Subscribe to topics
      subscribeToTopics();
    };

    const onMessage = (topic, message) => {
      try {
        // console.log(`Received message on topic: ${topic}`);
        const msgString = message.toString();

        if (topic === videoSubscribe) {
          displayFrame(msgString); // base64 string
        } else if (topic === personSubscribe) {
          const data = JSON.parse(msgString);

          if (Array.isArray(data) && data.length > 0) {
            const transformedPersons = data.map((person) => ({
              id: person.id_nv.split("_")[0],
              name: person.id_nv,
              time: new Date(person.datetime * 1000),
              frame: person.frame,
              image_info: person.image_info,
            }));

            // Handle recognized persons
            setPersons((prev) => {
              const updatedMap = new Map(prev.map((p) => [p.id, p]));

              for (const p of transformedPersons) {
                if (p.id === "No data") continue;
                // Update or add new persons to map
                updatedMap.set(p.id, p);
              }

              // Keep order: newest elements at the top of the list
              const updated = Array.from(updatedMap.values()).sort(
                (a, b) => new Date(b.time) - new Date(a.time),
              );

              return updated;
            });

            // Handle unrecognized persons
            setNoData((prev) => {
              const newPersons = transformedPersons.filter(
                (p) => p.id === "No data",
              );
              // Limit to 10 entries to prevent excessive memory usage
              const updated = [...newPersons, ...prev].slice(0, 10);
              return updated;
            });
          }
        }
      } catch (error) {
        console.error(`Error processing MQTT message from ${topic}:`, error);
      }
    };

    const onError = (error) => {
      console.error("MQTT error in CamStream:", error);
      setConnected(false);
    };

    const onClose = () => {
      console.log("MQTT connection closed in CamStream");
      setConnected(false);
    };

    const onReconnect = () => {
      console.log("MQTT client reconnecting in CamStream...");
    };

    const subscribeToTopics = () => {
      try {
        // Unsubscribe from previous topics if they're different
        if (
          activeSubscriptionsRef.current.video &&
          activeSubscriptionsRef.current.video !== videoSubscribe
        ) {
          console.log(
            `Unsubscribing from previous video topic: ${activeSubscriptionsRef.current.video}`,
          );
          client.unsubscribe(activeSubscriptionsRef.current.video);
        }

        if (
          activeSubscriptionsRef.current.person &&
          activeSubscriptionsRef.current.person !== personSubscribe
        ) {
          console.log(
            `Unsubscribing from previous person topic: ${activeSubscriptionsRef.current.person}`,
          );
          client.unsubscribe(activeSubscriptionsRef.current.person);
        }

        // Subscribe to new topics with options
        console.log(`Subscribing to video topic: ${videoSubscribe}`);
        client.subscribe(videoSubscribe, { qos: 0 }, (err) => {
          if (err) {
            console.error(`Error subscribing to video topic: ${err.message}`);
          } else {
            console.log(
              `Successfully subscribed to video topic: ${videoSubscribe}`,
            );
          }
        });

        console.log(`Subscribing to person topic: ${personSubscribe}`);
        client.subscribe(personSubscribe, { qos: 0 }, (err) => {
          if (err) {
            console.error(`Error subscribing to person topic: ${err.message}`);
          } else {
            console.log(
              `Successfully subscribed to person topic: ${personSubscribe}`,
            );
          }
        });

        // Update active subscriptions
        activeSubscriptionsRef.current = {
          video: videoSubscribe,
          person: personSubscribe,
        };
      } catch (error) {
        console.error("Error subscribing to topics:", error);
      }
    };

    // Add event listeners
    client.on("connect", onConnect);
    client.on("message", onMessage);
    client.on("error", onError);
    client.on("close", onClose);
    client.on("reconnect", onReconnect);

    // If client is already connected, subscribe to topics
    if (client.connected) {
      console.log(
        "Client already connected, subscribing to topics immediately",
      );
      subscribeToTopics();
    } else {
      console.log("Client not connected yet, will subscribe on connect event");
    }

    // Clean up event listeners
    return () => {
      if (client) {
        console.log("Cleaning up event listeners in CamStream");
        client.off("connect", onConnect);
        client.off("message", onMessage);
        client.off("error", onError);
        client.off("close", onClose);
        client.off("reconnect", onReconnect);

        // Unsubscribe from topics
        if (activeSubscriptionsRef.current.video) {
          client.unsubscribe(activeSubscriptionsRef.current.video);
        }
        if (activeSubscriptionsRef.current.person) {
          client.unsubscribe(activeSubscriptionsRef.current.person);
        }
      }
    };
  }, [client, videoSubscribe, personSubscribe]);

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
    <div className="flex flex-col m-6 min-h-screen w-full">
      <div className="flex-1 space-y-6">
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

CamStream.propTypes = {
  client: PropTypes.object,
  videoSubscribe: PropTypes.string.isRequired,
  personSubscribe: PropTypes.string.isRequired,
};

export default CamStream;
