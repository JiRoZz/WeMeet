import React, { useState, useEffect } from 'react';
import { 
  X, 
  User, 
  Mail, 
  Camera, 
  Check, 
  LogOut, 
  ShieldCheck, 
  Image as ImageIcon, 
  Upload, 
  AtSign, 
  UserPlus, 
  Users, 
  Search, 
  Share2, 
  Trash2, 
  Copy, 
  CheckCircle2, 
  AlertCircle 
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { AVATAR_COLORS } from '../utils/media';
import { User as UserType, Friend } from '../types';
import { 
  formatUsername, 
  generateDefaultUsername, 
  checkUsernameAvailability, 
  searchUsersByUsername, 
  addFriend, 
  removeFriend, 
  getFriendsList 
} from '../services/friendsService';

interface AccountModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentUser: UserType;
  onUpdateUserProfile: (updatedProfile: { name: string; username: string; photoURL: string; avatarColor: string }) => void;
  onOpenAuth?: () => void;
  initialTab?: 'profile' | 'friends';
  activeRoomId?: string | null;
}

const PRESET_AVATARS = [
  'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&auto=format&fit=crop&q=80',
  'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150&auto=format&fit=crop&q=80',
  'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=150&auto=format&fit=crop&q=80',
  'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=150&auto=format&fit=crop&q=80',
  'https://images.unsplash.com/photo-1438761681033-6461ffad8d80?w=150&auto=format&fit=crop&q=80',
  'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=150&auto=format&fit=crop&q=80',
];

export const AccountModal: React.FC<AccountModalProps> = ({
  isOpen,
  onClose,
  currentUser,
  onUpdateUserProfile,
  onOpenAuth,
  initialTab = 'profile',
  activeRoomId,
}) => {
  const { currentUser: firebaseUser, saveUserProfile, logout } = useAuth();

  const [activeTab, setActiveTab] = useState<'profile' | 'friends'>(initialTab);

  // Profile Form States
  const [displayName, setDisplayName] = useState(currentUser.name);
  const [username, setUsername] = useState(currentUser.username || generateDefaultUsername(currentUser.name, currentUser.id));
  const [photoURL, setPhotoURL] = useState(currentUser.photoURL || '');
  const [avatarColor, setAvatarColor] = useState(currentUser.avatarColor);
  const [isSaving, setIsSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [usernameStatus, setUsernameStatus] = useState<{ isChecking: boolean; isAvailable: boolean | null; error?: string }>({
    isChecking: false,
    isAvailable: true,
  });

  // Friends Tab States
  const [searchQuery, setSearchQuery] = useState('');
  const [isSearching, setIsSearching] = useState(false);
  const [searchResults, setSearchResults] = useState<Friend[]>([]);
  const [hasSearched, setHasSearched] = useState(false);
  const [myFriends, setMyFriends] = useState<Friend[]>([]);
  const [copiedFriendId, setCopiedFriendId] = useState<string | null>(null);
  const [copiedTag, setCopiedTag] = useState(false);

  useEffect(() => {
    if (isOpen) {
      setActiveTab(initialTab);
      const defaultUn = currentUser.username || generateDefaultUsername(currentUser.name || 'user', currentUser.id);
      setDisplayName(firebaseUser?.displayName || currentUser.name || '');
      setUsername(defaultUn);
      setPhotoURL(firebaseUser?.photoURL || currentUser.photoURL || '');
      setAvatarColor(currentUser.avatarColor || AVATAR_COLORS[0]);
      setSaveSuccess(false);

      // Load friends list
      loadFriends();
    }
  }, [isOpen, firebaseUser, currentUser, initialTab]);

  const loadFriends = async () => {
    const list = await getFriendsList(currentUser.id);
    setMyFriends(list);
  };

  if (!isOpen) return null;

  // Handle Username Change & Live Validation
  const handleUsernameChange = async (val: string) => {
    const formatted = formatUsername(val);
    setUsername(formatted);

    if (!formatted || formatted.length < 3) {
      setUsernameStatus({ isChecking: false, isAvailable: false, error: 'Min 3 characters' });
      return;
    }

    setUsernameStatus({ isChecking: true, isAvailable: null });
    const available = await checkUsernameAvailability(formatted, currentUser.id);
    setUsernameStatus({
      isChecking: false,
      isAvailable: available,
      error: available ? undefined : 'Username taken by another user',
    });
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        if (typeof reader.result === 'string') {
          setPhotoURL(reader.result);
        }
      };
      reader.readAsDataURL(file);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!usernameStatus.isAvailable && usernameStatus.error) {
      return;
    }

    setIsSaving(true);
    setSaveSuccess(false);

    const trimmedName = displayName.trim() || 'User';
    const finalUsername = formatUsername(username) || generateDefaultUsername(trimmedName, currentUser.id);

    try {
      if (firebaseUser) {
        await saveUserProfile(firebaseUser.uid, {
          displayName: trimmedName,
          email: firebaseUser.email || '',
          photoURL: photoURL,
          username: finalUsername,
        });
      }

      onUpdateUserProfile({
        name: trimmedName,
        username: finalUsername,
        photoURL,
        avatarColor,
      });

      setSaveSuccess(true);
      setTimeout(() => {
        setSaveSuccess(false);
        onClose();
      }, 1000);
    } catch (err) {
      console.error('Failed to update account profile:', err);
    } finally {
      setIsSaving(false);
    }
  };

  // Search User by Username
  const handleSearchUser = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!searchQuery.trim()) return;

    setIsSearching(true);
    setHasSearched(true);
    const results = await searchUsersByUsername(searchQuery, currentUser.id);
    setSearchResults(results);
    setIsSearching(false);
  };

  // Add User as Friend
  const handleAddFriend = async (friend: Friend) => {
    await addFriend(currentUser.id, friend);
    await loadFriends();
  };

  // Remove Friend
  const handleRemoveFriend = async (friendId: string) => {
    await removeFriend(currentUser.id, friendId);
    await loadFriends();
  };

  // Copy Call Link for Friend
  const handleInviteFriend = (friendId: string) => {
    const inviteUrl = activeRoomId
      ? `${window.location.origin}?room=${activeRoomId}`
      : window.location.href;
    navigator.clipboard.writeText(inviteUrl);
    setCopiedFriendId(friendId);
    setTimeout(() => setCopiedFriendId(null), 2000);
  };

  // Copy Username Tag
  const handleCopyTag = () => {
    navigator.clipboard.writeText(`@${username}`);
    setCopiedTag(true);
    setTimeout(() => setCopiedTag(false), 2000);
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="w-full max-w-lg bg-white border border-gray-200 rounded-2xl shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-150 flex flex-col max-h-[90vh]">
        {/* Modal Header */}
        <div className="p-4 md:p-5 border-b border-gray-100 flex items-center justify-between bg-white shrink-0">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-indigo-600 text-white flex items-center justify-center font-bold text-sm">
              <User className="w-4 h-4" />
            </div>
            <div>
              <h2 className="font-bold text-gray-900 text-base leading-tight">Account & Friends</h2>
              <p className="text-[11px] text-gray-500">Edit profile, username ID, and add friends</p>
            </div>
          </div>
          <button
            onClick={onClose}
            id="close-account-modal-btn"
            className="p-1.5 rounded-lg hover:bg-gray-100 text-gray-400 hover:text-gray-600 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Tab Switcher */}
        <div className="flex border-b border-gray-100 bg-gray-50 px-4 pt-2 gap-2 shrink-0">
          <button
            type="button"
            onClick={() => setActiveTab('profile')}
            className={`flex items-center gap-1.5 px-4 py-2 text-xs font-bold rounded-t-lg transition-all border-b-2 ${
              activeTab === 'profile'
                ? 'bg-white border-indigo-600 text-indigo-600 shadow-sm'
                : 'border-transparent text-gray-500 hover:text-gray-800'
            }`}
          >
            <User className="w-3.5 h-3.5" />
            <span>Profile & Username</span>
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('friends')}
            className={`flex items-center gap-1.5 px-4 py-2 text-xs font-bold rounded-t-lg transition-all border-b-2 relative ${
              activeTab === 'friends'
                ? 'bg-white border-indigo-600 text-indigo-600 shadow-sm'
                : 'border-transparent text-gray-500 hover:text-gray-800'
            }`}
          >
            <Users className="w-3.5 h-3.5" />
            <span>Friends</span>
            {myFriends.length > 0 && (
              <span className="bg-indigo-100 text-indigo-700 text-[10px] font-extrabold px-1.5 py-0.2 rounded-full">
                {myFriends.length}
              </span>
            )}
          </button>
        </div>

        {/* Tab 1: Profile & Username ID Form */}
        {activeTab === 'profile' && (
          <form onSubmit={handleSubmit} className="p-5 md:p-6 space-y-4 overflow-y-auto flex-1">
            {saveSuccess && (
              <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-lg text-emerald-700 text-xs font-semibold flex items-center gap-2">
                <Check className="w-4 h-4 text-emerald-600 shrink-0" />
                <span>Profile updated successfully!</span>
              </div>
            )}

            {/* Profile Picture / Avatar Preview & Upload */}
            <div className="flex flex-col items-center gap-2.5">
              <div className="relative group">
                {photoURL ? (
                  <img
                    src={photoURL}
                    alt={displayName}
                    referrerPolicy="no-referrer"
                    className="w-20 h-20 md:w-24 md:h-24 rounded-full object-cover shadow-lg border-2 border-indigo-500"
                  />
                ) : (
                  <div
                    className="w-20 h-20 md:w-24 md:h-24 rounded-full flex items-center justify-center text-3xl font-bold text-white shadow-lg border-2 border-indigo-500"
                    style={{ backgroundColor: avatarColor }}
                  >
                    {(displayName || 'U').charAt(0).toUpperCase()}
                  </div>
                )}

                {/* Upload Overlay Button */}
                <label
                  htmlFor="account-avatar-upload"
                  className="absolute bottom-0 right-0 bg-indigo-600 hover:bg-indigo-700 text-white p-2 rounded-full cursor-pointer shadow-md border-2 border-white transition-transform hover:scale-105"
                  title="Upload Photo"
                >
                  <Camera className="w-3.5 h-3.5" />
                  <input
                    type="file"
                    id="account-avatar-upload"
                    accept="image/*"
                    onChange={handleFileChange}
                    className="hidden"
                  />
                </label>
              </div>

              {/* Direct Upload Photo Button */}
              <label
                htmlFor="account-avatar-upload-direct"
                className="px-3 py-1.5 rounded-lg bg-indigo-50 hover:bg-indigo-100 text-indigo-700 border border-indigo-200 text-xs font-semibold cursor-pointer transition-colors flex items-center gap-1.5 shadow-sm"
              >
                <Upload className="w-3.5 h-3.5 text-indigo-600" />
                <span>Upload Photo</span>
                <input
                  type="file"
                  id="account-avatar-upload-direct"
                  accept="image/*"
                  onChange={handleFileChange}
                  className="hidden"
                />
              </label>

              <span className="text-[11px] text-gray-500 font-medium text-center">
                Upload your own photo or choose a preset below
              </span>
            </div>

            {/* Preset Avatar Selection */}
            <div>
              <label className="block text-xs font-semibold text-gray-700 mb-1.5 flex items-center gap-1.5">
                <ImageIcon className="w-3.5 h-3.5 text-indigo-600" /> Choose Preset Avatar
              </label>
              <div className="flex items-center gap-2 overflow-x-auto pb-1">
                <button
                  type="button"
                  onClick={() => setPhotoURL('')}
                  className={`w-9 h-9 rounded-full border-2 flex items-center justify-center text-xs font-bold text-white shrink-0 transition-transform ${
                    !photoURL ? 'ring-2 ring-indigo-600 ring-offset-1 scale-105' : 'opacity-80 hover:opacity-100'
                  }`}
                  style={{ backgroundColor: avatarColor }}
                >
                  Initials
                </button>
                {PRESET_AVATARS.map((url, idx) => (
                  <button
                    key={idx}
                    type="button"
                    onClick={() => setPhotoURL(url)}
                    className={`w-9 h-9 rounded-full overflow-hidden border-2 shrink-0 transition-transform ${
                      photoURL === url ? 'ring-2 ring-indigo-600 ring-offset-1 scale-105 border-indigo-600' : 'border-gray-200 opacity-80 hover:opacity-100'
                    }`}
                  >
                    <img src={url} alt={`Avatar ${idx + 1}`} className="w-full h-full object-cover" />
                  </button>
                ))}
              </div>
            </div>

            {/* Username ID Input Field */}
            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="block text-xs font-bold text-gray-800 flex items-center gap-1">
                  <AtSign className="w-3.5 h-3.5 text-indigo-600" /> Unique Username ID
                </label>
                {username && (
                  <button
                    type="button"
                    onClick={handleCopyTag}
                    className="text-[11px] text-indigo-600 hover:text-indigo-800 font-medium flex items-center gap-1"
                  >
                    {copiedTag ? <Check className="w-3 h-3 text-emerald-600" /> : <Copy className="w-3 h-3" />}
                    <span>{copiedTag ? 'Copied Tag' : 'Copy @Tag'}</span>
                  </button>
                )}
              </div>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500 font-bold text-sm select-none">
                  @
                </span>
                <input
                  type="text"
                  required
                  value={username}
                  onChange={(e) => handleUsernameChange(e.target.value)}
                  placeholder="username_id"
                  className={`w-full bg-gray-50 border rounded-lg pl-7 pr-9 py-2 text-sm font-semibold text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 ${
                    usernameStatus.error
                      ? 'border-red-300 focus:ring-red-500 bg-red-50/20'
                      : 'border-gray-200 focus:ring-indigo-500'
                  }`}
                />
                <div className="absolute right-3 top-1/2 -translate-y-1/2 flex items-center">
                  {usernameStatus.isChecking ? (
                    <span className="text-[10px] text-gray-400 font-medium animate-pulse">Checking...</span>
                  ) : usernameStatus.error ? (
                    <AlertCircle className="w-4 h-4 text-red-500" />
                  ) : username ? (
                    <CheckCircle2 className="w-4 h-4 text-emerald-500" />
                  ) : null}
                </div>
              </div>
              {usernameStatus.error ? (
                <p className="text-[11px] text-red-500 mt-1 font-medium">{usernameStatus.error}</p>
              ) : (
                <p className="text-[11px] text-gray-500 mt-1">
                  Friends can search and add you using <span className="font-bold text-indigo-600">@{username || 'your_id'}</span>
                </p>
              )}
            </div>

            {/* Full / Display Name Input */}
            <div>
              <label className="block text-xs font-semibold text-gray-700 mb-1">
                Display Name
              </label>
              <div className="relative">
                <User className="w-4 h-4 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  required
                  value={displayName}
                  onChange={(e) => setDisplayName(e.target.value)}
                  placeholder="Enter your display name..."
                  className="w-full bg-gray-50 border border-gray-200 rounded-lg pl-9 pr-3 py-2 text-sm text-gray-900 font-medium placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>
            </div>

            {/* Avatar Color Picker (Used when photoURL is empty) */}
            {!photoURL && (
              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1.5">Avatar Initial Color</label>
                <div className="flex items-center gap-2 flex-wrap">
                  {AVATAR_COLORS.map((color) => (
                    <button
                      key={color}
                      type="button"
                      onClick={() => setAvatarColor(color)}
                      className={`w-7 h-7 rounded-full transition-all flex items-center justify-center ${
                        avatarColor === color ? 'ring-2 ring-indigo-600 ring-offset-2 scale-110' : 'opacity-80 hover:opacity-100'
                      }`}
                      style={{ backgroundColor: color }}
                    >
                      {avatarColor === color && <Check className="w-3.5 h-3.5 text-white" />}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Account Status Info */}
            <div className="pt-2 border-t border-gray-100">
              {firebaseUser ? (
                <div className="bg-gray-50 p-2.5 rounded-xl border border-gray-200 flex items-center justify-between text-xs">
                  <div className="flex items-center gap-2 min-w-0">
                    <Mail className="w-4 h-4 text-indigo-600 shrink-0" />
                    <div className="min-w-0">
                      <span className="block font-semibold text-gray-800 truncate">
                        {firebaseUser.email}
                      </span>
                      <span className="text-[10px] text-emerald-600 font-medium flex items-center gap-1">
                        <ShieldCheck className="w-3 h-3" /> Signed in with Firebase
                      </span>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={async () => {
                      await logout();
                      onClose();
                    }}
                    className="px-2.5 py-1 text-red-600 hover:bg-red-50 rounded-lg text-xs font-bold transition-colors shrink-0 flex items-center gap-1"
                  >
                    <LogOut className="w-3.5 h-3.5" />
                    <span>Sign Out</span>
                  </button>
                </div>
              ) : (
                <div className="bg-indigo-50/70 p-2.5 rounded-xl border border-indigo-100 flex items-center justify-between text-xs">
                  <div>
                    <span className="block font-bold text-indigo-950">Guest Mode</span>
                    <span className="text-[10px] text-indigo-700">Sign in to save profile permanently</span>
                  </div>
                  {onOpenAuth && (
                    <button
                      type="button"
                      onClick={() => {
                        onClose();
                        onOpenAuth();
                      }}
                      className="px-3 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg font-semibold text-xs transition-colors shadow-sm"
                    >
                      Sign In
                    </button>
                  )}
                </div>
              )}
            </div>

            {/* Modal Save Buttons */}
            <div className="pt-2 flex items-center justify-end gap-3">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 rounded-lg border border-gray-200 hover:bg-gray-50 text-gray-700 text-xs font-semibold transition-colors"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={isSaving || !!usernameStatus.error}
                id="save-account-profile-btn"
                className="px-5 py-2 rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-semibold transition-all shadow-sm disabled:opacity-50"
              >
                {isSaving ? 'Saving...' : 'Save Profile'}
              </button>
            </div>
          </form>
        )}

        {/* Tab 2: Friends & Search by Username */}
        {activeTab === 'friends' && (
          <div className="p-5 md:p-6 space-y-5 overflow-y-auto flex-1">
            {/* Search Input Form */}
            <form onSubmit={handleSearchUser} className="space-y-2">
              <label className="block text-xs font-bold text-gray-800 flex items-center gap-1.5">
                <UserPlus className="w-4 h-4 text-indigo-600" /> Add Friend by Username
              </label>
              <div className="flex gap-2">
                <div className="relative flex-1">
                  <AtSign className="w-4 h-4 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="Enter friend's username ID..."
                    className="w-full bg-gray-50 border border-gray-200 rounded-lg pl-9 pr-3 py-2 text-sm text-gray-900 font-medium placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  />
                </div>
                <button
                  type="submit"
                  disabled={isSearching || !searchQuery.trim()}
                  className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-xs font-bold transition-all disabled:opacity-50 flex items-center gap-1.5 shadow-sm shrink-0"
                >
                  <Search className="w-3.5 h-3.5" />
                  <span>{isSearching ? 'Searching...' : 'Search'}</span>
                </button>
              </div>
            </form>

            {/* Search Results Display */}
            {hasSearched && (
              <div className="space-y-2">
                <h4 className="text-xs font-bold text-gray-500 uppercase tracking-wider">
                  Search Results ({searchResults.length})
                </h4>
                {searchResults.length === 0 ? (
                  <div className="p-4 bg-gray-50 rounded-xl border border-gray-100 text-center text-xs text-gray-500">
                    No user found with username "<span className="font-semibold text-gray-700">@{searchQuery}</span>"
                  </div>
                ) : (
                  <div className="space-y-2">
                    {searchResults.map((user) => {
                      const isAlreadyFriend = myFriends.some(f => f.id === user.id);
                      return (
                        <div
                          key={user.id}
                          className="p-3 bg-gray-50 hover:bg-indigo-50/50 rounded-xl border border-gray-200 flex items-center justify-between transition-colors"
                        >
                          <div className="flex items-center gap-3">
                            {user.photoURL ? (
                              <img
                                src={user.photoURL}
                                alt={user.displayName}
                                referrerPolicy="no-referrer"
                                className="w-10 h-10 rounded-full object-cover border border-indigo-400"
                              />
                            ) : (
                              <div
                                className="w-10 h-10 rounded-full flex items-center justify-center text-sm font-bold text-white shadow-sm"
                                style={{ backgroundColor: user.avatarColor || '#4F46E5' }}
                              >
                                {user.displayName.charAt(0).toUpperCase()}
                              </div>
                            )}
                            <div>
                              <span className="block text-xs font-bold text-gray-900 leading-tight">
                                {user.displayName}
                              </span>
                              <span className="text-[11px] text-indigo-600 font-medium">
                                @{user.username}
                              </span>
                            </div>
                          </div>

                          {isAlreadyFriend ? (
                            <span className="px-3 py-1 bg-emerald-50 text-emerald-700 border border-emerald-200 rounded-lg text-xs font-bold flex items-center gap-1">
                              <Check className="w-3.5 h-3.5" /> Friends
                            </span>
                          ) : (
                            <button
                              type="button"
                              onClick={() => handleAddFriend(user)}
                              className="px-3.5 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-xs font-bold transition-all flex items-center gap-1 shadow-sm"
                            >
                              <UserPlus className="w-3.5 h-3.5" />
                              <span>Add Friend</span>
                            </button>
                          )}
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            )}

            {/* My Friends List */}
            <div className="space-y-3 pt-2 border-t border-gray-100">
              <div className="flex items-center justify-between">
                <h4 className="text-xs font-bold text-gray-800 flex items-center gap-1.5">
                  <Users className="w-4 h-4 text-indigo-600" /> My Friends List ({myFriends.length})
                </h4>
              </div>

              {myFriends.length === 0 ? (
                <div className="p-6 bg-gray-50 rounded-xl border border-gray-100 text-center space-y-2">
                  <Users className="w-8 h-8 text-gray-300 mx-auto" />
                  <p className="text-xs font-semibold text-gray-600">No friends added yet</p>
                  <p className="text-[11px] text-gray-400">Search for friends by their username ID above to add them!</p>
                </div>
              ) : (
                <div className="space-y-2 max-h-[220px] overflow-y-auto pr-1">
                  {myFriends.map((friend) => (
                    <div
                      key={friend.id}
                      className="p-3 bg-white hover:bg-gray-50 rounded-xl border border-gray-200 flex items-center justify-between transition-colors shadow-sm"
                    >
                      <div className="flex items-center gap-3 min-w-0">
                        {friend.photoURL ? (
                          <img
                            src={friend.photoURL}
                            alt={friend.displayName}
                            referrerPolicy="no-referrer"
                            className="w-9 h-9 rounded-full object-cover border border-gray-200 shrink-0"
                          />
                        ) : (
                          <div
                            className="w-9 h-9 rounded-full flex items-center justify-center text-xs font-bold text-white shrink-0 shadow-sm"
                            style={{ backgroundColor: friend.avatarColor || '#4F46E5' }}
                          >
                            {friend.displayName.charAt(0).toUpperCase()}
                          </div>
                        )}
                        <div className="min-w-0">
                          <span className="block text-xs font-bold text-gray-900 truncate leading-tight">
                            {friend.displayName}
                          </span>
                          <span className="text-[11px] text-indigo-600 font-medium truncate block">
                            @{friend.username}
                          </span>
                        </div>
                      </div>

                      <div className="flex items-center gap-1.5 shrink-0">
                        <button
                          type="button"
                          onClick={() => handleInviteFriend(friend.id)}
                          className="px-2.5 py-1.5 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 rounded-lg text-xs font-bold transition-colors flex items-center gap-1 border border-indigo-100"
                          title="Invite to Call"
                        >
                          {copiedFriendId === friend.id ? (
                            <>
                              <Check className="w-3.5 h-3.5 text-emerald-600" />
                              <span className="text-emerald-700">Link Copied</span>
                            </>
                          ) : (
                            <>
                              <Share2 className="w-3.5 h-3.5" />
                              <span>Invite</span>
                            </>
                          )}
                        </button>

                        <button
                          type="button"
                          onClick={() => handleRemoveFriend(friend.id)}
                          className="p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                          title="Remove Friend"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Modal Close Button */}
            <div className="pt-2 flex items-center justify-end">
              <button
                type="button"
                onClick={onClose}
                className="px-5 py-2 rounded-lg bg-gray-100 hover:bg-gray-200 text-gray-800 text-xs font-semibold transition-colors"
              >
                Close
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
