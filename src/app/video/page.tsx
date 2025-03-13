"use client";
import React, { useEffect, useState, useRef } from "react";
import { io, Socket } from "socket.io-client";
import Peer from "peerjs";

const ROOM_ID = 10; // Room ID set to 10 for testing

const VideoCall: React.FC = () => {
  const [peers, setPeers] = useState<Record<string, MediaStream>>({});
  const videoRefs = useRef<Record<string, HTMLVideoElement | null>>({});
  const socket = useRef<Socket>(io("https://meta-videoserver.onrender.com"));
  const peer = useRef<Peer>(new Peer());

  useEffect(() => {
    const currentPeer = peer.current;
    const currentSocket = socket.current;

    currentPeer.on("open", (id: string) => {
      currentSocket.emit("join-room", ROOM_ID, id);
    });

    currentSocket.on("user-connected", (newPeerId: string) => {
      console.log(`New user joined: ${newPeerId}`);
      callNewUser(newPeerId);
    });

    currentSocket.on("user-disconnected", (disconnectedPeerId: string) => {
      console.log(`User disconnected: ${disconnectedPeerId}`);
      setPeers((prevPeers) => {
        const updatedPeers = { ...prevPeers };
        delete updatedPeers[disconnectedPeerId]; // Remove peer's stream
        return updatedPeers;
      });

      delete videoRefs.current[disconnectedPeerId]; // Remove video reference
    });

    currentPeer.on("call", (call) => {
      navigator.mediaDevices
        .getUserMedia({ video: true, audio: true })
        .then((stream) => {
          call.answer(stream);
          call.on("stream", (remoteStream) => {
            setPeers((prevPeers) => ({ ...prevPeers, [call.peer]: remoteStream }));
          });
        })
        .catch((error) => console.error("Error accessing media devices:", error));
    });

    return () => {
      currentPeer.disconnect();
      currentSocket.disconnect();
    };
  }, []);

  const callNewUser = (newPeerId: string) => {
    navigator.mediaDevices
      .getUserMedia({ video: true, audio: true })
      .then((stream) => {
        const call = peer.current.call(newPeerId, stream);
        call.on("stream", (remoteStream) => {
          setPeers((prevPeers) => ({ ...prevPeers, [newPeerId]: remoteStream }));
        });
      })
      .catch((error) => console.error("Error accessing media devices:", error));
  };

  useEffect(() => {
    navigator.mediaDevices
      .getUserMedia({ video: true, audio: true })
      .then((stream) => {
        if (videoRefs.current["self"]) {
          videoRefs.current["self"].srcObject = stream;
        }
      })
      .catch((error) => console.error("Error accessing media devices:", error));
  }, []);

  useEffect(() => {
    Object.entries(peers).forEach(([id, stream]) => {
      if (videoRefs.current[id]) {
        videoRefs.current[id]!.srcObject = stream;
      }
    });
  }, [peers]);

  return (
    <div>
      <h2>Room: {ROOM_ID}</h2>
      <video
        autoPlay
        playsInline
        muted
        ref={(ref) => {
          if (ref) {
            videoRefs.current["self"] = ref;
          }
        }}
        style={{ width: "300px", border: "2px solid #fff", margin: "10px" }}
      ></video>

      {Object.entries(peers).map(([id, stream]) => (
        <video
          key={id}
          autoPlay
          playsInline
          ref={(ref) => {
            if (ref) {
              videoRefs.current[id] = ref;
              ref.srcObject = stream;
            }
          }}
          style={{ width: "300px", border: "2px solid #fff", margin: "10px" }}
        ></video>
      ))}
    </div>
  );
};

export default VideoCall;
