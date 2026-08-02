import React, { useEffect, useRef, useState } from 'react';
import { Mic, MicOff, Video as VideoIcon, VideoOff, Settings, Sparkles, ArrowRight, ShieldCheck, Check } from 'lucide-react';
import { MediaDeviceOptions, User } from '../types';
import { AVATAR_COLORS } from '../utils/media';
import { useAuth } from '../context/AuthContext';

interface LobbyProps {
  roomId: string;
  currentUser: User;
  deviceOptions: MediaDeviceOptions;
  onUpdateNameAndAvatar: (name: string, color: string) => void;
  onOpenSettings: () => void;
  onJoinRoom: (isMicMuted: boolean, isCameraOff: boolean) => void;
}

export const Lobby: React.FC<LobbyProps> = ({
  roomId,
  currentUser,
  deviceOptions,
  onUpdateNameAndAvatar,
  onOpenSettings,
  onJoinRoom,
}) => {
  const { currentUser: firebaseUser } = useAuth();
  const [nameInput, setNameInput] = useState(
    firebaseUser?.displayName || firebaseUser?.email?.split('@')[0] || currentUser.name
  );
  const [selectedColor, setSelectedColor] = useState(currentUser.avatarColor);
  const [isMicMuted, setIsMicMuted] = useState(false);
  const [isCameraOff, setIsCameraOff] = useState(false);
  const [audioLevel, setAudioLevel] = useState(0);

  useEffect(() => {
    if (firebaseUser?.displayName) {
      setNameInput(firebaseUser.displayName);
    }
  }, [firebaseUser]);

  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);

  // Initialize preview video stream
  useEffect(() => {
    let audioCtx: AudioContext | null = null;
    let animFrame: number | null = null;

    async function startPreview() {
      try {
        if (streamRef.current) {
          streamRef.current.getTracks().forEach((t) => t.stop());
        }

        const constraints: MediaStreamConstraints = {
          audio: deviceOptions.audioInputId ? { deviceId: { exact: deviceOptions.audioInputId } } : true,
          video: deviceOptions.videoInputId ? { deviceId: { exact: deviceOptions.videoInputId } } : true,
        };

        const stream = await navigator.mediaDevices.getUserMedia(constraints);
        streamRef.current = stream;

        if (videoRef.current) {
          videoRef.current.srcObject = stream;
        }

        // Apply state
        stream.getAudioTracks().forEach((t) => (t.enabled = !isMicMuted));
        stream.getVideoTracks().forEach((t) => (t.enabled = !isCameraOff));

        // Audio meter setup
        const AudioContextClass = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
        if (AudioContextClass) {
          audioCtx = new AudioContextClass();
          const source = audioCtx.createMediaStreamSource(stream);
          const analyser = audioCtx.createAnalyser();
          analyser.fftSize = 64;
          source.connect(analyser);

          const dataArray = new Uint8Array(analyser.frequencyBinCount);
          const updateAudioLevel = () => {
            if (isMicMuted) {
              setAudioLevel(0);
            } else {
              analyser.getByteFrequencyData(dataArray);
              let sum = 0;
              for (let i = 0; i < dataArray.length; i++) {
                sum += dataArray[i];
              }
              const avg = sum / dataArray.length;
              setAudioLevel(Math.min(100, Math.round((avg / 128) * 100)));
            }
            animFrame = requestAnimationFrame(updateAudioLevel);
          };
          updateAudioLevel();
        }
      } catch (err) {
        console.warn('Lobby preview stream failed:', err);
        setIsCameraOff(true);
      }
    }

    startPreview();

    return () => {
      if (animFrame) cancelAnimationFrame(animFrame);
      if (audioCtx) audioCtx.close().catch(() => {});
      if (streamRef.current) {
        streamRef.current.getTracks().forEach((t) => t.stop());
      }
    };
  }, [deviceOptions.audioInputId, deviceOptions.videoInputId]);

  const handleToggleMic = () => {
    const nextState = !isMicMuted;
    setIsMicMuted(nextState);
    if (streamRef.current) {
      streamRef.current.getAudioTracks().forEach((t) => (t.enabled = !nextState));
    }
  };

  const handleToggleCam = () => {
    const nextState = !isCameraOff;
    setIsCameraOff(nextState);
    if (streamRef.current) {
      streamRef.current.getVideoTracks().forEach((t) => (t.enabled = !nextState));
    }
  };

  const handleNameChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    setNameInput(val);
    onUpdateNameAndAvatar(val.trim() || 'Guest', selectedColor);
  };

  const handleSelectColor = (color: string) => {
    setSelectedColor(color);
    onUpdateNameAndAvatar(nameInput.trim() || 'Guest', color);
  };

  const handleJoin = (e: React.FormEvent) => {
    e.preventDefault();
    onJoinRoom(isMicMuted, isCameraOff);
  };

  return (
    <div className="min-h-screen bg-gray-100 text-gray-900 flex flex-col justify-center items-center p-4 md:p-8 relative overflow-hidden">
      <div className="w-full max-w-4xl bg-white border border-gray-200 rounded-xl shadow-sm overflow-hidden z-10 grid grid-cols-1 md:grid-cols-12">
        {/* Left Column: Video Preview */}
        <div className="md:col-span-7 bg-gray-50 p-6 flex flex-col justify-between border-b md:border-b-0 md:border-r border-gray-200">
          <div>
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse" />
                <span className="text-xs font-semibold text-gray-600 uppercase tracking-wider">Ready to Join</span>
              </div>
              <button
                onClick={onOpenSettings}
                id="lobby-settings-btn"
                className="p-2 rounded-lg bg-white hover:bg-gray-100 text-gray-700 transition-colors border border-gray-200 flex items-center gap-1.5 text-xs font-medium shadow-sm"
              >
                <Settings className="w-4 h-4 text-indigo-600" />
                <span>Devices</span>
              </button>
            </div>

            {/* Video Box */}
            <div className="relative aspect-video rounded-lg bg-gray-900 border border-gray-800 overflow-hidden flex items-center justify-center shadow-sm group">
              {!isCameraOff ? (
                <video
                  ref={videoRef}
                  autoPlay
                  playsInline
                  muted
                  className="w-full h-full object-cover -scale-x-100"
                />
              ) : (
                <div className="flex flex-col items-center justify-center gap-3">
                  {currentUser.photoURL ? (
                    <img
                      src={currentUser.photoURL}
                      alt={currentUser.name}
                      referrerPolicy="no-referrer"
                      className="w-20 h-20 rounded-full object-cover shadow-md border-2 border-gray-700"
                    />
                  ) : (
                    <div
                      className="w-20 h-20 rounded-full flex items-center justify-center text-3xl font-bold text-white shadow-md ring-2 ring-gray-700"
                      style={{ backgroundColor: selectedColor }}
                    >
                      {nameInput.charAt(0).toUpperCase() || 'G'}
                    </div>
                  )}
                  <span className="text-xs text-gray-400 font-medium">Camera is off</span>
                </div>
              )}

              {/* Controls Overlay */}
              <div className="absolute bottom-3 left-1/2 -translate-x-1/2 flex items-center gap-3 bg-black/60 backdrop-blur-md px-4 py-2 rounded-full border border-white/10 shadow-md">
                <button
                  type="button"
                  onClick={handleToggleMic}
                  id="lobby-mic-toggle-btn"
                  className={`p-2.5 rounded-full transition-all ${
                    isMicMuted
                      ? 'bg-red-500 text-white shadow-md'
                      : 'bg-white/20 hover:bg-white/30 text-white'
                  }`}
                  title={isMicMuted ? 'Unmute microphone' : 'Mute microphone'}
                >
                  {isMicMuted ? <MicOff className="w-4 h-4" /> : <Mic className="w-4 h-4" />}
                </button>

                <button
                  type="button"
                  onClick={handleToggleCam}
                  id="lobby-cam-toggle-btn"
                  className={`p-2.5 rounded-full transition-all ${
                    isCameraOff
                      ? 'bg-red-500 text-white shadow-md'
                      : 'bg-white/20 hover:bg-white/30 text-white'
                  }`}
                  title={isCameraOff ? 'Turn camera on' : 'Turn camera off'}
                >
                  {isCameraOff ? <VideoOff className="w-4 h-4" /> : <VideoIcon className="w-4 h-4" />}
                </button>
              </div>
            </div>
          </div>

          {/* Audio Input Meter */}
          <div className="mt-4 flex items-center gap-3 bg-white p-2.5 rounded-lg border border-gray-200 shadow-sm">
            <Mic className={`w-4 h-4 shrink-0 ${isMicMuted ? 'text-gray-400' : 'text-indigo-600'}`} />
            <div className="flex-1 bg-gray-100 h-2 rounded-full overflow-hidden">
              <div
                className="bg-indigo-600 h-full transition-all duration-75 rounded-full"
                style={{ width: `${audioLevel}%` }}
              />
            </div>
            <span className="text-[10px] text-gray-500 font-mono w-8 text-right">
              {isMicMuted ? 'OFF' : `${audioLevel}%`}
            </span>
          </div>
        </div>

        {/* Right Column: User Profile & Join Form */}
        <div className="md:col-span-5 p-6 md:p-8 flex flex-col justify-between bg-white">
          <div>
            <div className="mb-6">
              <span className="text-xs font-semibold text-indigo-600 tracking-wider uppercase flex items-center gap-1.5">
                <Sparkles className="w-3.5 h-3.5" /> Room Lobby
              </span>
              <h2 className="text-2xl font-bold text-gray-900 mt-1">Join Call Room</h2>
              <p className="text-xs text-gray-500 mt-1">
                Room ID: <span className="font-mono text-indigo-600 font-bold">{roomId}</span>
              </p>
            </div>

            <form onSubmit={handleJoin} className="space-y-5">
              {/* Name Input */}
              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1.5">Your Display Name</label>
                <input
                  type="text"
                  id="display-name-input"
                  value={nameInput}
                  onChange={handleNameChange}
                  placeholder="Enter your name..."
                  className="w-full bg-white border border-gray-200 rounded-lg px-4 py-2.5 text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-indigo-500 text-sm font-medium transition-all"
                  required
                />
              </div>

              {/* Avatar Color Picker */}
              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-2">Avatar Color</label>
                <div className="flex items-center gap-2 flex-wrap">
                  {AVATAR_COLORS.map((color) => (
                    <button
                      key={color}
                      type="button"
                      onClick={() => handleSelectColor(color)}
                      className={`w-7 h-7 rounded-full transition-all flex items-center justify-center ${
                        selectedColor === color ? 'ring-2 ring-indigo-600 ring-offset-2 scale-110' : 'opacity-80 hover:opacity-100'
                      }`}
                      style={{ backgroundColor: color }}
                    >
                      {selectedColor === color && <Check className="w-3.5 h-3.5 text-white" />}
                    </button>
                  ))}
                </div>
              </div>

              {/* Join Action */}
              <button
                type="submit"
                id="join-room-submit-btn"
                className="w-full mt-4 bg-indigo-600 hover:bg-indigo-700 text-white font-medium py-3 px-6 rounded-lg shadow-sm flex items-center justify-center gap-2 transition-colors text-sm"
              >
                <span>Enter Call & Chat</span>
                <ArrowRight className="w-4 h-4" />
              </button>
            </form>
          </div>

          <div className="mt-6 pt-4 border-t border-gray-200 flex items-center justify-between text-xs text-gray-500">
            <span className="flex items-center gap-1">
              <ShieldCheck className="w-3.5 h-3.5 text-gray-400" /> Instant Link Sharing
            </span>
            <span>No Signup Required</span>
          </div>
        </div>
      </div>
    </div>
  );
};
