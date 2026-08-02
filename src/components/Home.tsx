import React, { useState, useEffect } from 'react';
import { Video, Plus, ArrowRight, ShieldCheck, Zap, MessageSquare, Users, Sparkles, History, Trash2, User as UserIcon, LogOut } from 'lucide-react';
import { generateRoomId } from '../utils/media';
import { useAuth } from '../context/AuthContext';

interface HomeProps {
  onEnterRoom: (roomId: string) => void;
  onOpenAuth?: (mode?: 'login' | 'register') => void;
  onOpenAccount?: (tab?: 'profile' | 'friends') => void;
}

export const Home: React.FC<HomeProps> = ({ onEnterRoom, onOpenAuth, onOpenAccount }) => {
  const [joinInput, setJoinInput] = useState('');
  const [recentRooms, setRecentRooms] = useState<string[]>([]);
  const { currentUser, logout } = useAuth();

  useEffect(() => {
    try {
      const stored = localStorage.getItem('recent_rooms');
      if (stored) {
        setRecentRooms(JSON.parse(stored));
      }
    } catch (e) {
      console.warn('Failed to load recent rooms:', e);
    }
  }, []);

  const handleCreateRoom = () => {
    if (!currentUser) {
      if (onOpenAuth) {
        onOpenAuth('register');
      }
      return;
    }
    const newRoomId = generateRoomId();
    saveRecentRoom(newRoomId);
    onEnterRoom(newRoomId);
  };

  const handleJoinSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const cleaned = joinInput.trim().toLowerCase().replace(/[^a-z0-9-]/g, '');
    if (cleaned) {
      saveRecentRoom(cleaned);
      onEnterRoom(cleaned);
    }
  };

  const saveRecentRoom = (id: string) => {
    try {
      const filtered = recentRooms.filter((r) => r !== id);
      const updated = [id, ...filtered].slice(0, 5);
      setRecentRooms(updated);
      localStorage.setItem('recent_rooms', JSON.stringify(updated));
    } catch (e) {
      console.warn('Failed to save recent room:', e);
    }
  };

  const clearRecent = () => {
    setRecentRooms([]);
    localStorage.removeItem('recent_rooms');
  };

  return (
    <div className="min-h-screen bg-gray-100 text-gray-900 flex flex-col justify-between p-4 md:p-8 relative overflow-hidden">
      {/* Top Navbar Header */}
      <header className="max-w-7xl w-full mx-auto flex items-center justify-between py-4 border-b border-gray-200 z-10">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg bg-indigo-600 flex items-center justify-center text-white shadow-sm font-bold tracking-tight">
            WM
          </div>
          <div>
            <span className="font-bold text-lg text-gray-900 tracking-tight block leading-none">
              WeMeet
            </span>
            <span className="text-xs text-gray-500">Live Video & Chat Sync</span>
          </div>
        </div>

        <div className="flex items-center gap-2 md:gap-3">
          <button
            onClick={() => onOpenAccount?.('friends')}
            className="px-3 py-1.5 rounded-xl bg-indigo-50 hover:bg-indigo-100 text-indigo-700 border border-indigo-200 text-xs font-bold transition-all shadow-sm flex items-center gap-1.5"
            title="Friends & Add Friends"
          >
            <Users className="w-3.5 h-3.5 text-indigo-600" />
            <span>Friends</span>
          </button>

          {currentUser ? (
            <div className="flex items-center gap-2">
              <button
                onClick={() => onOpenAccount?.('profile')}
                className="flex items-center gap-2 bg-white hover:bg-gray-50 px-3 py-1.5 rounded-xl border border-gray-200 shadow-sm transition-all text-left"
                title="Edit Account Profile"
              >
                {currentUser.photoURL ? (
                  <img
                    src={currentUser.photoURL}
                    alt={currentUser.displayName || currentUser.email || 'Profile'}
                    referrerPolicy="no-referrer"
                    className="w-8 h-8 rounded-full object-cover border border-indigo-400 shrink-0"
                  />
                ) : (
                  <div className="w-8 h-8 rounded-full bg-indigo-600 text-white flex items-center justify-center text-xs font-bold shrink-0">
                    {(currentUser.displayName || currentUser.email || 'U').charAt(0).toUpperCase()}
                  </div>
                )}
                <div className="flex flex-col text-left">
                  <span className="text-xs font-bold text-gray-900 leading-tight">
                    {currentUser.displayName || 'User'}
                  </span>
                  <span className="text-[10px] text-indigo-600 font-medium leading-tight">
                    Edit Profile
                  </span>
                </div>
              </button>
              <button
                onClick={logout}
                className="p-2 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                title="Sign Out"
              >
                <LogOut className="w-4 h-4" />
              </button>
            </div>
          ) : (
            <div className="flex items-center gap-2">
              <button
                onClick={onOpenAccount}
                className="px-3 py-1.5 rounded-lg bg-gray-100 hover:bg-gray-200 text-gray-700 text-xs font-semibold transition-colors flex items-center gap-1.5"
              >
                <UserIcon className="w-3.5 h-3.5 text-indigo-600" />
                <span>Profile</span>
              </button>
              <button
                onClick={() => onOpenAuth?.('login')}
                className="px-3.5 py-1.5 rounded-lg bg-white border border-gray-200 hover:bg-gray-50 text-gray-700 text-xs font-semibold shadow-sm transition-colors"
              >
                Sign In
              </button>
              <button
                onClick={() => onOpenAuth?.('register')}
                className="px-3.5 py-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-semibold shadow-sm transition-colors"
              >
                Register
              </button>
            </div>
          )}
        </div>
      </header>

      {/* Hero Content */}
      <main className="max-w-5xl w-full mx-auto my-auto py-12 z-10 grid grid-cols-1 lg:grid-cols-12 gap-12 items-center">
        {/* Left Column */}
        <div className="lg:col-span-7 space-y-6 text-center lg:text-left">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-indigo-50 border border-indigo-200 text-indigo-700 text-xs font-semibold">
            <Sparkles className="w-3.5 h-3.5" /> Multi-User Video & Room Chat
          </div>

          <h1 className="text-4xl md:text-5xl font-extrabold text-gray-900 tracking-tight leading-tight">
            Connect & Meet Instantly <br />
            <span className="text-indigo-600">
              With WeMeet
            </span>
          </h1>

          <p className="text-base text-gray-600 max-w-xl mx-auto lg:mx-0 leading-relaxed">
            Create a WeMeet room with one click. Share the room code with anyone to jump on high-definition video calls and real-time text chat.
          </p>

          {/* Call to Action Buttons */}
          <div className="flex flex-col sm:flex-row items-center gap-4 pt-2 justify-center lg:justify-start">
            <button
              onClick={handleCreateRoom}
              id="home-create-room-btn"
              className="w-full sm:w-auto bg-indigo-600 hover:bg-indigo-700 text-white font-semibold py-3 px-6 rounded-lg shadow-sm flex items-center justify-center gap-2 transition-colors text-sm"
            >
              <Plus className="w-4 h-4" />
              <span>Create New Room</span>
            </button>

            <span className="text-xs text-gray-400 font-semibold uppercase tracking-wider">or</span>

            {/* Join Room Form */}
            <form onSubmit={handleJoinSubmit} className="w-full sm:w-auto flex items-center gap-2 bg-white p-1 rounded-lg border border-gray-200 shadow-sm focus-within:border-indigo-500 transition-colors">
              <input
                type="text"
                id="home-join-code-input"
                value={joinInput}
                onChange={(e) => setJoinInput(e.target.value)}
                placeholder="Enter room code..."
                className="bg-transparent px-3 py-1.5 text-sm text-gray-900 placeholder-gray-400 focus:outline-none w-48 font-mono"
              />
              <button
                type="submit"
                id="home-join-room-submit-btn"
                disabled={!joinInput.trim()}
                className="bg-indigo-600 hover:bg-indigo-700 text-white disabled:opacity-40 p-2 rounded-md transition-colors shrink-0"
                title="Join Room"
              >
                <ArrowRight className="w-4 h-4" />
              </button>
            </form>
          </div>

          {/* Recent Rooms List */}
          {recentRooms.length > 0 && (
            <div className="pt-6 border-t border-gray-200">
              <div className="flex items-center justify-between mb-3">
                <span className="text-xs font-semibold text-gray-500 flex items-center gap-1.5">
                  <History className="w-3.5 h-3.5 text-indigo-600" /> Recent Rooms
                </span>
                <button onClick={clearRecent} className="text-[11px] text-gray-400 hover:text-gray-600 flex items-center gap-1">
                  <Trash2 className="w-3 h-3" /> Clear
                </button>
              </div>
              <div className="flex flex-wrap gap-2 justify-center lg:justify-start">
                {recentRooms.map((id) => (
                  <button
                    key={id}
                    onClick={() => onEnterRoom(id)}
                    className="px-3 py-1.5 rounded-lg bg-white hover:bg-gray-50 border border-gray-200 text-xs font-mono text-gray-700 hover:text-indigo-600 transition-all flex items-center gap-1.5 shadow-sm"
                  >
                    <span>{id}</span>
                    <ArrowRight className="w-3 h-3 text-gray-400" />
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Right Feature Card Grid */}
        <div className="lg:col-span-5 grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="p-5 rounded-xl bg-white border border-gray-200 shadow-sm hover:border-indigo-300 transition-colors">
            <div className="w-10 h-10 rounded-lg bg-indigo-50 text-indigo-600 flex items-center justify-center mb-3">
              <Zap className="w-5 h-5" />
            </div>
            <h3 className="font-bold text-gray-900 text-sm">Instant Room Links</h3>
            <p className="text-xs text-gray-500 mt-1 leading-relaxed">
              Join instantly or create an account with Firebase authentication.
            </p>
          </div>

          <div className="p-5 rounded-xl bg-white border border-gray-200 shadow-sm hover:border-indigo-300 transition-colors">
            <div className="w-10 h-10 rounded-lg bg-indigo-50 text-indigo-600 flex items-center justify-center mb-3">
              <Users className="w-5 h-5" />
            </div>
            <h3 className="font-bold text-gray-900 text-sm">WebRTC Multi-User</h3>
            <p className="text-xs text-gray-500 mt-1 leading-relaxed">
              HD video and audio mesh streams with mute, video, and screen share controls.
            </p>
          </div>

          <div className="p-5 rounded-xl bg-white border border-gray-200 shadow-sm hover:border-indigo-300 transition-colors">
            <div className="w-10 h-10 rounded-lg bg-indigo-50 text-indigo-600 flex items-center justify-center mb-3">
              <MessageSquare className="w-5 h-5" />
            </div>
            <h3 className="font-bold text-gray-900 text-sm">Real-time Room Chat</h3>
            <p className="text-xs text-gray-500 mt-1 leading-relaxed">
              Live text messaging, emoji reactions, typing status, and file sharing.
            </p>
          </div>

          <div className="p-5 rounded-xl bg-white border border-gray-200 shadow-sm hover:border-indigo-300 transition-colors">
            <div className="w-10 h-10 rounded-lg bg-indigo-50 text-indigo-600 flex items-center justify-center mb-3">
              <Sparkles className="w-5 h-5" />
            </div>
            <h3 className="font-bold text-gray-900 text-sm">Firebase Integrated</h3>
            <p className="text-xs text-gray-500 mt-1 leading-relaxed">
              Secure authentication, profile sync, and real-time room messaging.
            </p>
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="max-w-7xl w-full mx-auto pt-6 border-t border-gray-200 flex items-center justify-between text-xs text-gray-500 z-10">
        <span className="font-semibold text-gray-700">WeMeet</span>
        <span>Powered by React + WebRTC + Firebase</span>
      </footer>
    </div>
  );
};

