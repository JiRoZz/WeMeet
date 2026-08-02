import { useEffect, useRef, useState, useCallback } from 'react';
import { MediaDeviceOptions, User, WebRTCSignalingMessage } from '../types';

interface UseWebRTCCallProps {
  roomId: string | null;
  currentUser: User | null;
  participants: User[];
  sendSignaling: (msg: WebRTCSignalingMessage) => void;
  deviceOptions: MediaDeviceOptions;
}

const ICE_SERVERS: RTCConfiguration = {
  iceServers: [
    { urls: 'stun:stun.l.google.com:19302' },
    { urls: 'stun:stun1.l.google.com:19302' },
    { urls: 'stun:stun2.l.google.com:19302' },
  ],
};

export function useWebRTCCall({
  roomId,
  currentUser,
  participants,
  sendSignaling,
  deviceOptions,
}: UseWebRTCCallProps) {
  const [localStream, setLocalStream] = useState<MediaStream | null>(null);
  const [screenStream, setScreenStream] = useState<MediaStream | null>(null);
  const [remoteStreams, setRemoteStreams] = useState<Map<string, MediaStream>>(new Map());

  const [isMicMuted, setIsMicMuted] = useState<boolean>(false);
  const [isCameraOff, setIsCameraOff] = useState<boolean>(false);
  const [isScreenSharing, setIsScreenSharing] = useState<boolean>(false);
  const [activeSpeakerId, setActiveSpeakerId] = useState<string | null>(null);

  // Store active peer connections: userId -> RTCPeerConnection
  const peerConnectionsRef = useRef<Map<string, RTCPeerConnection>>(new Map());
  const localStreamRef = useRef<MediaStream | null>(null);
  const screenStreamRef = useRef<MediaStream | null>(null);

  // Audio level analysis for active speaker detection
  const audioContextRef = useRef<AudioContext | null>(null);
  const analysersRef = useRef<Map<string, { analyser: AnalyserNode; stream: MediaStream }>>(new Map());

  // Initialize local audio/video media stream
  const initLocalStream = useCallback(async () => {
    try {
      if (localStreamRef.current) {
        localStreamRef.current.getTracks().forEach((track) => track.stop());
      }

      const constraints: MediaStreamConstraints = {
        audio: deviceOptions.audioInputId
          ? { deviceId: { exact: deviceOptions.audioInputId } }
          : true,
        video: deviceOptions.videoInputId
          ? { deviceId: { exact: deviceOptions.videoInputId }, width: { ideal: 1280 }, height: { ideal: 720 } }
          : true,
      };

      const stream = await navigator.mediaDevices.getUserMedia(constraints);
      localStreamRef.current = stream;
      setLocalStream(stream);

      // Apply current mute states
      stream.getAudioTracks().forEach((t) => (t.enabled = !isMicMuted));
      stream.getVideoTracks().forEach((t) => (t.enabled = !isCameraOff));

      // Update tracks in existing peer connections
      peerConnectionsRef.current.forEach((pc) => {
        const senders = pc.getSenders();
        stream.getTracks().forEach((track) => {
          const sender = senders.find((s) => s.track && s.track.kind === track.kind);
          if (sender) {
            sender.replaceTrack(track);
          } else {
            pc.addTrack(track, stream);
          }
        });
      });

      return stream;
    } catch (err) {
      console.warn('Could not get audio/video media devices:', err);
      // Fallback to audio-only if video fails or is denied
      try {
        const audioOnlyStream = await navigator.mediaDevices.getUserMedia({ audio: true });
        localStreamRef.current = audioOnlyStream;
        setLocalStream(audioOnlyStream);
        setIsCameraOff(true);
        return audioOnlyStream;
      } catch (aErr) {
        console.warn('Audio device access also failed:', aErr);
        return null;
      }
    }
  }, [deviceOptions.audioInputId, deviceOptions.videoInputId, isMicMuted, isCameraOff]);

  // Create or retrieve peer connection with a target remote user
  const createPeerConnection = useCallback(
    (targetUserId: string) => {
      if (!currentUser || !roomId) return null;
      if (peerConnectionsRef.current.has(targetUserId)) {
        return peerConnectionsRef.current.get(targetUserId)!;
      }

      const pc = new RTCPeerConnection(ICE_SERVERS);
      peerConnectionsRef.current.set(targetUserId, pc);

      // Add local stream tracks to PC
      const activeStream = screenStreamRef.current || localStreamRef.current;
      if (activeStream) {
        activeStream.getTracks().forEach((track) => {
          pc.addTrack(track, activeStream);
        });
      }

      // Handle ICE Candidates
      pc.onicecandidate = (event) => {
        if (event.candidate) {
          sendSignaling({
            type: 'webrtc_candidate',
            roomId,
            senderUserId: currentUser.id,
            targetUserId,
            candidate: event.candidate.toJSON(),
          });
        }
      };

      // Handle remote track arrival
      pc.ontrack = (event) => {
        if (event.streams && event.streams[0]) {
          const remoteStream = event.streams[0];
          setRemoteStreams((prev) => {
            const next = new Map(prev);
            next.set(targetUserId, remoteStream);
            return next;
          });
        }
      };

      pc.oniceconnectionstatechange = () => {
        if (pc.iceConnectionState === 'disconnected' || pc.iceConnectionState === 'failed' || pc.iceConnectionState === 'closed') {
          // Cleanup on disconnect
          peerConnectionsRef.current.delete(targetUserId);
          setRemoteStreams((prev) => {
            const next = new Map(prev);
            next.delete(targetUserId);
            return next;
          });
        }
      };

      return pc;
    },
    [currentUser, roomId, sendSignaling]
  );

  // Initiate WebRTC offer to new room member
  const initiateCallWithUser = useCallback(
    async (targetUserId: string) => {
      if (!currentUser || !roomId) return;
      const pc = createPeerConnection(targetUserId);
      if (!pc) return;

      try {
        const offer = await pc.createOffer({
          offerToReceiveAudio: true,
          offerToReceiveVideo: true,
        });
        await pc.setLocalDescription(offer);

        sendSignaling({
          type: 'webrtc_offer',
          roomId,
          senderUserId: currentUser.id,
          targetUserId,
          offer,
        });
      } catch (err) {
        console.error('Failed to create WebRTC offer:', err);
      }
    },
    [currentUser, roomId, createPeerConnection, sendSignaling]
  );

  // Process incoming WebRTC signaling message
  const handleSignalingMessage = useCallback(
    async (msg: WebRTCSignalingMessage) => {
      const { type, senderUserId, offer, answer, candidate } = msg;
      if (!senderUserId || !currentUser) return;

      switch (type) {
        case 'webrtc_offer': {
          if (offer) {
            const pc = createPeerConnection(senderUserId);
            if (!pc) return;

            try {
              await pc.setRemoteDescription(new RTCSessionDescription(offer));
              const answerDesc = await pc.createAnswer();
              await pc.setLocalDescription(answerDesc);

              sendSignaling({
                type: 'webrtc_answer',
                roomId: roomId!,
                senderUserId: currentUser.id,
                targetUserId: senderUserId,
                answer: answerDesc,
              });
            } catch (err) {
              console.error('Failed to handle WebRTC offer:', err);
            }
          }
          break;
        }

        case 'webrtc_answer': {
          if (answer) {
            const pc = peerConnectionsRef.current.get(senderUserId);
            if (pc && pc.signalingState !== 'stable') {
              try {
                await pc.setRemoteDescription(new RTCSessionDescription(answer));
              } catch (err) {
                console.error('Failed to set remote description answer:', err);
              }
            }
          }
          break;
        }

        case 'webrtc_candidate': {
          if (candidate) {
            const pc = peerConnectionsRef.current.get(senderUserId);
            if (pc) {
              try {
                await pc.addIceCandidate(new RTCIceCandidate(candidate));
              } catch (err) {
                console.error('Failed to add ICE candidate:', err);
              }
            }
          }
          break;
        }

        default:
          break;
      }
    },
    [currentUser, roomId, createPeerConnection, sendSignaling]
  );

  // Sync peer connections with active participants list
  useEffect(() => {
    if (!currentUser || !roomId) return;

    participants.forEach((p) => {
      if (p.id !== currentUser.id) {
        // If participant ID is lexicographically greater, let them initiate offer to avoid glare
        if (currentUser.id < p.id && !peerConnectionsRef.current.has(p.id)) {
          initiateCallWithUser(p.id);
        }
      }
    });

    // Remove connections for participants who left
    const participantIds = new Set(participants.map((p) => p.id));
    peerConnectionsRef.current.forEach((pc, id) => {
      if (!participantIds.has(id)) {
        pc.close();
        peerConnectionsRef.current.delete(id);
        setRemoteStreams((prev) => {
          const next = new Map(prev);
          next.delete(id);
          return next;
        });
      }
    });
  }, [participants, currentUser, roomId, initiateCallWithUser]);

  // Handle Microphone Toggle
  const toggleMicrophone = useCallback(() => {
    const stream = localStreamRef.current;
    if (stream) {
      const audioTracks = stream.getAudioTracks();
      const newMuted = !isMicMuted;
      audioTracks.forEach((t) => (t.enabled = !newMuted));
      setIsMicMuted(newMuted);
      return newMuted;
    }
    return isMicMuted;
  }, [isMicMuted]);

  // Handle Camera Toggle
  const toggleCamera = useCallback(() => {
    const stream = localStreamRef.current;
    if (stream) {
      const videoTracks = stream.getVideoTracks();
      const newCameraOff = !isCameraOff;
      videoTracks.forEach((t) => (t.enabled = !newCameraOff));
      setIsCameraOff(newCameraOff);
      return newCameraOff;
    }
    return isCameraOff;
  }, [isCameraOff]);

  // Handle Screen Share
  const toggleScreenShare = useCallback(async () => {
    if (isScreenSharing && screenStreamRef.current) {
      // Stop screen share
      screenStreamRef.current.getTracks().forEach((track) => track.stop());
      screenStreamRef.current = null;
      setScreenStream(null);
      setIsScreenSharing(false);

      // Revert peer connections back to camera stream
      if (localStreamRef.current) {
        const videoTrack = localStreamRef.current.getVideoTracks()[0];
        peerConnectionsRef.current.forEach((pc) => {
          const senders = pc.getSenders();
          const videoSender = senders.find((s) => s.track && s.track.kind === 'video');
          if (videoSender && videoTrack) {
            videoSender.replaceTrack(videoTrack);
          }
        });
      }
      return false;
    } else {
      try {
        const stream = await navigator.mediaDevices.getDisplayMedia({
          video: true,
          audio: true,
        });

        screenStreamRef.current = stream;
        setScreenStream(stream);
        setIsScreenSharing(true);

        const screenVideoTrack = stream.getVideoTracks()[0];

        // Replace video sender track in all peer connections
        peerConnectionsRef.current.forEach((pc) => {
          const senders = pc.getSenders();
          const videoSender = senders.find((s) => s.track && s.track.kind === 'video');
          if (videoSender && screenVideoTrack) {
            videoSender.replaceTrack(screenVideoTrack);
          }
        });

        screenVideoTrack.onended = () => {
          toggleScreenShare();
        };

        return true;
      } catch (err) {
        console.warn('Screen share cancelled or failed:', err);
        return false;
      }
    }
  }, [isScreenSharing]);

  // Clean up resources on unmount
  useEffect(() => {
    return () => {
      if (localStreamRef.current) {
        localStreamRef.current.getTracks().forEach((t) => t.stop());
      }
      if (screenStreamRef.current) {
        screenStreamRef.current.getTracks().forEach((t) => t.stop());
      }
      peerConnectionsRef.current.forEach((pc) => pc.close());
      peerConnectionsRef.current.clear();
    };
  }, []);

  // Real-time Audio Level Analyzer for Active Speaker Detection
  useEffect(() => {
    if (!roomId) return;

    let animId: number;
    let audioCtx: AudioContext | null = null;
    const sourcesMap = new Map<string, { analyser: AnalyserNode; source: MediaStreamAudioSourceNode }>();

    try {
      const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
      if (AudioContextClass) {
        audioCtx = new AudioContextClass();
      }
    } catch (e) {
      console.warn('AudioContext creation failed:', e);
    }

    const analyzeAudio = () => {
      let maxVol = 12; // Volume threshold
      let speakerId: string | null = null;

      if (audioCtx && audioCtx.state === 'suspended') {
        audioCtx.resume().catch(() => {});
      }

      // Check Local Stream
      if (localStream && !isMicMuted && currentUser?.id) {
        const audioTracks = localStream.getAudioTracks();
        if (audioTracks.length > 0 && audioTracks[0].enabled) {
          let node = sourcesMap.get(currentUser.id);
          if (!node && audioCtx) {
            try {
              const source = audioCtx.createMediaStreamSource(localStream);
              const analyser = audioCtx.createAnalyser();
              analyser.fftSize = 256;
              analyser.smoothingTimeConstant = 0.5;
              source.connect(analyser);
              node = { analyser, source };
              sourcesMap.set(currentUser.id, node);
            } catch (err) {
              // Ignore stream source creation errors
            }
          }

          if (node) {
            const data = new Uint8Array(node.analyser.frequencyBinCount);
            node.analyser.getByteFrequencyData(data);
            const avgVol = data.reduce((a, b) => a + b, 0) / data.length;
            if (avgVol > maxVol) {
              maxVol = avgVol;
              speakerId = currentUser.id;
            }
          }
        }
      }

      // Check Remote Streams
      remoteStreams.forEach((stream, userId) => {
        const audioTracks = stream.getAudioTracks();
        if (audioTracks.length > 0 && audioTracks[0].enabled) {
          let node = sourcesMap.get(userId);
          if (!node && audioCtx) {
            try {
              const source = audioCtx.createMediaStreamSource(stream);
              const analyser = audioCtx.createAnalyser();
              analyser.fftSize = 256;
              analyser.smoothingTimeConstant = 0.5;
              source.connect(analyser);
              node = { analyser, source };
              sourcesMap.set(userId, node);
            } catch (err) {
              // Ignore
            }
          }

          if (node) {
            const data = new Uint8Array(node.analyser.frequencyBinCount);
            node.analyser.getByteFrequencyData(data);
            const avgVol = data.reduce((a, b) => a + b, 0) / data.length;
            if (avgVol > maxVol) {
              maxVol = avgVol;
              speakerId = userId;
            }
          }
        }
      });

      setActiveSpeakerId(speakerId);
      animId = requestAnimationFrame(analyzeAudio);
    };

    analyzeAudio();

    return () => {
      cancelAnimationFrame(animId);
      sourcesMap.forEach(({ source }) => {
        try { source.disconnect(); } catch (e) {}
      });
      if (audioCtx && audioCtx.state !== 'closed') {
        try { audioCtx.close(); } catch (e) {}
      }
    };
  }, [roomId, localStream, remoteStreams, isMicMuted, currentUser?.id]);

  return {
    localStream,
    screenStream,
    remoteStreams,
    isMicMuted,
    isCameraOff,
    isScreenSharing,
    activeSpeakerId,
    initLocalStream,
    handleSignalingMessage,
    toggleMicrophone,
    toggleCamera,
    toggleScreenShare,
  };
}
