import { VideoFilterType } from '../types';

export const AVATAR_COLORS = [
  '#3b82f6', // blue
  '#10b981', // emerald
  '#8b5cf6', // violet
  '#f59e0b', // amber
  '#ec4899', // pink
  '#06b6d4', // cyan
  '#f97316', // orange
  '#6366f1', // indigo
];

export function getRandomAvatarColor(): string {
  const index = Math.floor(Math.random() * AVATAR_COLORS.length);
  return AVATAR_COLORS[index];
}

export function generateUserId(): string {
  return 'usr_' + Math.random().toString(36).substring(2, 10);
}

export function generateRoomId(): string {
  const words = ['call', 'meet', 'chat', 'sync', 'lounge', 'huddle', 'room', 'space'];
  const word = words[Math.floor(Math.random() * words.length)];
  const num = Math.floor(100 + Math.random() * 900);
  return `${word}-${num}`;
}

export function getVideoFilterCSS(filter: VideoFilterType): string {
  switch (filter) {
    case 'blur':
      return 'backdrop-blur-md filter contrast-105';
    case 'warm':
      return 'filter sepia(0.25) saturate(1.2) contrast(1.05)';
    case 'cool':
      return 'filter hue-rotate(15deg) saturate(1.1) brightness(1.05)';
    case 'grayscale':
      return 'filter grayscale(1) contrast(1.1)';
    case 'sepia':
      return 'filter sepia(0.8) contrast(1.1)';
    case 'cyber':
      return 'filter hue-rotate(180deg) saturate(1.5) contrast(1.2)';
    case 'none':
    default:
      return '';
  }
}

export async function getMediaDevices(): Promise<{
  audioInputs: MediaDeviceInfo[];
  videoInputs: MediaDeviceInfo[];
  audioOutputs: MediaDeviceInfo[];
}> {
  if (typeof navigator === 'undefined' || !navigator.mediaDevices?.enumerateDevices) {
    return { audioInputs: [], videoInputs: [], audioOutputs: [] };
  }

  try {
    const devices = await navigator.mediaDevices.enumerateDevices();
    return {
      audioInputs: devices.filter((d) => d.kind === 'audioinput'),
      videoInputs: devices.filter((d) => d.kind === 'videoinput'),
      audioOutputs: devices.filter((d) => d.kind === 'audiooutput'),
    };
  } catch (err) {
    console.warn('Failed to enumerate media devices:', err);
    return { audioInputs: [], videoInputs: [], audioOutputs: [] };
  }
}
