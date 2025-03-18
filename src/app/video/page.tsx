"use client";
import React, { useEffect, useState, useRef } from "react";
import { io, Socket } from "socket.io-client";
import Peer from "peerjs";
import { MdMic, MdMicOff, MdVideocam, MdVideocamOff, MdCallEnd } from "react-icons/md";

const ROOM_ID = 10; // Room ID for testing

const VideoCall: React.FC = () => {
  const [peers, setPeers] = useState<Record<string, MediaStream>>({});
  const videoRefs = useRef<Record<string, HTMLVideoElement | null>>({});
  const socket = useRef<Socket>(io("https://meta-videoserver.onrender.com"));
  const peer = useRef<Peer>(
    new Peer({
      config: {
        iceServers: [
          { urls: "stun:stun.l.google.com:19302" },
          { urls: "stun:stun1.l.google.com:19302" },
          {
            urls: "turn:numb.viagenie.ca",
            username: "webrtc@live.com",
            credential: "muazkh",
          },
          {
            urls: "turn:openrelay.metered.ca:80",
            username: "openrelayproject",
            credential: "openrelayproject",
          },
        ],
      },
      debug: 3,
    })
  );

  // Local stream state
  const localStream = useRef<MediaStream | null>(null);
  const [isMicOn, setIsMicOn] = useState(true);
  const [isCameraOn, setIsCameraOn] = useState(true);

  useEffect(() => {
    const currentPeer = peer.current;
    const currentSocket = socket.current;

    navigator.mediaDevices
      .getUserMedia({ video: true, audio: true })
      .then((stream) => {
        localStream.current = stream;
        if (videoRefs.current["self"]) {
          videoRefs.current["self"].srcObject = stream;
        }
      })
      .catch((error) => console.error("Error accessing media devices:", error));

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
    if (!localStream.current) return;

    const call = peer.current.call(newPeerId, localStream.current);
    call.on("stream", (remoteStream) => {
      setPeers((prevPeers) => ({ ...prevPeers, [newPeerId]: remoteStream }));
    });
  };

  useEffect(() => {
    Object.entries(peers).forEach(([id, stream]) => {
      if (videoRefs.current[id]) {
        videoRefs.current[id]!.srcObject = stream;
      }
    });
  }, [peers]);

  // Toggle Mic
  const toggleMic = () => {
    if (localStream.current) {
      localStream.current.getAudioTracks().forEach((track) => {
        track.enabled = !track.enabled;
      });
      setIsMicOn((prev) => !prev);
    }
  };

  // Toggle Camera
  const toggleCamera = () => {
    if (localStream.current) {
      localStream.current.getVideoTracks().forEach((track) => {
        track.enabled = !track.enabled;
      });
      setIsCameraOn((prev) => !prev);
    }
  };

  return (
    <div className="h-screen flex flex-col items-center justify-center bg-gray-900 text-white">
      <h2 className="text-lg font-bold mb-4">Room: {ROOM_ID}</h2>
      
      <div className="flex flex-wrap justify-center gap-4">
        {/* Self Video */}
        <video
          autoPlay
          playsInline
          muted
          ref={(ref) => {
            if (ref) videoRefs.current["self"] = ref;
          }}
          className="w-64 h-40 border-2 border-white rounded-lg"
        ></video>

        {/* Other Peers */}
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
            className="w-64 h-40 border-2 border-white rounded-lg"
          ></video>
        ))}
      </div>

      {/* Control Buttons */}
      <div className="fixed bottom-4 left-1/2 transform -translate-x-1/2 flex gap-4 bg-gray-800 p-3 rounded-lg">
        {/* Mic Button */}
        <button onClick={toggleMic} className="p-2 bg-gray-700 rounded-full">
          {isMicOn ? <MdMic size={24} color="white" /> : <MdMicOff size={24} color="red" />}
        </button>

        {/* Camera Button */}
        <button onClick={toggleCamera} className="p-2 bg-gray-700 rounded-full">
          {isCameraOn ? <MdVideocam size={24} color="white" /> : <MdVideocamOff size={24} color="red" />}
        </button>

        {/* End Call Button */}
        <button className="p-2 bg-red-600 rounded-full">
          <MdCallEnd size={24} color="white" />
        </button>
      </div>
    </div>
  );
};

export default VideoCall;
