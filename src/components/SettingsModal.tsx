import React, { useEffect, useState } from 'react';
import { X, Camera, Mic, Sparkles, Check, Settings2 } from 'lucide-react';
import { MediaDeviceOptions, VideoFilterType } from '../types';
import { getMediaDevices } from '../utils/media';

interface SettingsModalProps {
  isOpen: boolean;
  deviceOptions: MediaDeviceOptions;
  activeFilter: VideoFilterType;
  onClose: () => void;
  onSaveOptions: (options: MediaDeviceOptions, filter: VideoFilterType) => void;
}

export const SettingsModal: React.FC<SettingsModalProps> = ({
  isOpen,
  deviceOptions,
  activeFilter,
  onClose,
  onSaveOptions,
}) => {
  const [audioInputs, setAudioInputs] = useState<MediaDeviceInfo[]>([]);
  const [videoInputs, setVideoInputs] = useState<MediaDeviceInfo[]>([]);

  const [selectedAudio, setSelectedAudio] = useState(deviceOptions.audioInputId);
  const [selectedVideo, setSelectedVideo] = useState(deviceOptions.videoInputId);
  const [selectedFilter, setSelectedFilter] = useState<VideoFilterType>(activeFilter);

  useEffect(() => {
    if (isOpen) {
      getMediaDevices().then(({ audioInputs, videoInputs }) => {
        setAudioInputs(audioInputs);
        setVideoInputs(videoInputs);
      });
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const handleSave = () => {
    onSaveOptions(
      {
        audioInputId: selectedAudio,
        videoInputId: selectedVideo,
        audioOutputId: '',
      },
      selectedFilter
    );
    onClose();
  };

  const FILTERS: { id: VideoFilterType; name: string; desc: string }[] = [
    { id: 'none', name: 'Original', desc: 'Standard video feed' },
    { id: 'blur', name: 'Background Focus', desc: 'Soft focal blur' },
    { id: 'warm', name: 'Warm Tone', desc: 'Golden warm lighting' },
    { id: 'cool', name: 'Cool Studio', desc: 'Crisp cool blue' },
    { id: 'grayscale', name: 'Monochrome', desc: 'Black & white' },
    { id: 'cyber', name: 'Cyberpunk', desc: 'Vibrant neon hue' },
  ];

  return (
    <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="w-full max-w-lg bg-white border border-gray-200 rounded-xl shadow-xl overflow-hidden animate-in fade-in zoom-in-95 duration-150">
        {/* Header */}
        <div className="p-5 border-b border-gray-200 flex items-center justify-between bg-white">
          <div className="flex items-center gap-2">
            <Settings2 className="w-5 h-5 text-indigo-600" />
            <h2 className="font-bold text-gray-900 text-base">Audio & Video Settings</h2>
          </div>
          <button
            onClick={onClose}
            id="close-settings-modal-btn"
            className="p-1.5 rounded-lg hover:bg-gray-100 text-gray-400 hover:text-gray-600 transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 space-y-6">
          {/* Camera Selection */}
          <div>
            <label className="text-xs font-semibold text-gray-700 mb-2 flex items-center gap-2">
              <Camera className="w-4 h-4 text-indigo-600" /> Camera Source
            </label>
            <select
              id="camera-select"
              value={selectedVideo}
              onChange={(e) => setSelectedVideo(e.target.value)}
              className="w-full bg-gray-50 border border-gray-200 rounded-lg px-4 py-2.5 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-indigo-500 font-medium"
            >
              <option value="">Default Camera</option>
              {videoInputs.map((device, idx) => (
                <option key={device.deviceId || idx} value={device.deviceId}>
                  {device.label || `Camera ${idx + 1}`}
                </option>
              ))}
            </select>
          </div>

          {/* Microphone Selection */}
          <div>
            <label className="text-xs font-semibold text-gray-700 mb-2 flex items-center gap-2">
              <Mic className="w-4 h-4 text-indigo-600" /> Microphone Source
            </label>
            <select
              id="microphone-select"
              value={selectedAudio}
              onChange={(e) => setSelectedAudio(e.target.value)}
              className="w-full bg-gray-50 border border-gray-200 rounded-lg px-4 py-2.5 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-indigo-500 font-medium"
            >
              <option value="">Default Microphone</option>
              {audioInputs.map((device, idx) => (
                <option key={device.deviceId || idx} value={device.deviceId}>
                  {device.label || `Microphone ${idx + 1}`}
                </option>
              ))}
            </select>
          </div>

          {/* Video Filter Selectors */}
          <div>
            <label className="text-xs font-semibold text-gray-700 mb-3 flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-indigo-600" /> Video Filter & Atmosphere
            </label>
            <div className="grid grid-cols-2 gap-3">
              {FILTERS.map((f) => (
                <button
                  key={f.id}
                  type="button"
                  onClick={() => setSelectedFilter(f.id)}
                  className={`p-3 rounded-lg border text-left transition-all flex items-center justify-between ${
                    selectedFilter === f.id
                      ? 'bg-indigo-50 border-indigo-500 text-indigo-900 font-semibold'
                      : 'bg-gray-50 border-gray-200 text-gray-700 hover:border-gray-300'
                  }`}
                >
                  <div>
                    <span className="block text-xs font-semibold">{f.name}</span>
                    <span className="block text-[10px] text-gray-500 mt-0.5">{f.desc}</span>
                  </div>
                  {selectedFilter === f.id && <Check className="w-4 h-4 text-indigo-600 shrink-0" />}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-gray-200 bg-gray-50 flex items-center justify-end gap-3">
          <button
            onClick={onClose}
            className="px-4 py-2 rounded-lg bg-white border border-gray-200 hover:bg-gray-100 text-gray-700 text-xs font-semibold transition-colors shadow-sm"
          >
            Cancel
          </button>
          <button
            onClick={handleSave}
            id="save-settings-btn"
            className="px-5 py-2 rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-semibold transition-all shadow-sm"
          >
            Save Changes
          </button>
        </div>
      </div>
    </div>
  );
};
