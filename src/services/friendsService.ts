import { 
  collection, 
  doc, 
  getDoc, 
  getDocs, 
  setDoc, 
  deleteDoc, 
  query, 
  where, 
  limit, 
  serverTimestamp 
} from 'firebase/firestore';
import { db } from '../lib/firebase';
import { Friend } from '../types';

/**
 * Normalizes username string (lowercase, alphanumeric + underscores)
 */
export function formatUsername(raw: string): string {
  let cleaned = raw.trim().toLowerCase().replace(/^@+/, '');
  cleaned = cleaned.replace(/[^a-z0-9_]/g, '');
  return cleaned;
}

/**
 * Generates a default username based on display name or user ID
 */
export function generateDefaultUsername(displayName: string, userId: string): string {
  const base = formatUsername(displayName) || 'user';
  const shortId = userId.slice(-4).toLowerCase();
  return `${base}_${shortId}`;
}

/**
 * Checks if a username is available or taken by another user
 */
export async function checkUsernameAvailability(username: string, currentUserId: string): Promise<boolean> {
  const formatted = formatUsername(username);
  if (!formatted || formatted.length < 3) return false;

  try {
    const q = query(
      collection(db, 'users'),
      where('username', '==', formatted),
      limit(2)
    );
    const snapshot = await getDocs(q);

    if (snapshot.empty) return true;

    // Available if the only match is the current user
    const matchingDoc = snapshot.docs[0];
    return matchingDoc.id === currentUserId || matchingDoc.data().uid === currentUserId;
  } catch (err) {
    console.warn('Firestore username check failed:', err);
    return true; // Fallback to true if Firestore is unreachable
  }
}

/**
 * Searches users by username or display name
 */
export async function searchUsersByUsername(searchQuery: string, currentUserId: string): Promise<Friend[]> {
  const formatted = formatUsername(searchQuery);
  if (!formatted) return [];

  try {
    const usersRef = collection(db, 'users');
    const q = query(
      usersRef,
      where('username', '>=', formatted),
      where('username', '<=', formatted + '\uf8ff'),
      limit(10)
    );

    const snapshot = await getDocs(q);
    const results: Friend[] = [];

    snapshot.forEach((docSnap) => {
      const data = docSnap.data();
      const userId = data.uid || docSnap.id;

      if (userId !== currentUserId) {
        results.push({
          id: userId,
          uid: userId,
          username: data.username || generateDefaultUsername(data.displayName || 'User', userId),
          displayName: data.displayName || 'User',
          photoURL: data.photoURL || '',
          avatarColor: data.avatarColor || '#4F46E5',
          addedAt: Date.now(),
        });
      }
    });

    return results;
  } catch (err) {
    console.warn('Failed searching users by username in Firestore:', err);
    return [];
  }
}

/**
 * Saves or updates a friend to user's friend list (Firestore + LocalStorage)
 */
export async function addFriend(currentUserId: string, friend: Friend): Promise<void> {
  // LocalStorage sync
  try {
    const local = localStorage.getItem(`friends_${currentUserId}`);
    let friends: Friend[] = local ? JSON.parse(local) : [];
    if (!friends.some(f => f.id === friend.id)) {
      friends.push(friend);
      localStorage.setItem(`friends_${currentUserId}`, JSON.stringify(friends));
    }
  } catch (e) {
    console.warn('LocalStorage friend update failed:', e);
  }

  // Firestore sync
  if (currentUserId) {
    try {
      const friendRef = doc(db, 'users', currentUserId, 'friends', friend.id);
      await setDoc(friendRef, {
        id: friend.id,
        uid: friend.id,
        username: friend.username,
        displayName: friend.displayName,
        photoURL: friend.photoURL || '',
        avatarColor: friend.avatarColor || '#4F46E5',
        addedAt: serverTimestamp(),
      });
    } catch (err) {
      console.warn('Firestore addFriend failed:', err);
    }
  }
}

/**
 * Removes a friend from user's friend list
 */
export async function removeFriend(currentUserId: string, friendId: string): Promise<void> {
  // LocalStorage sync
  try {
    const local = localStorage.getItem(`friends_${currentUserId}`);
    if (local) {
      let friends: Friend[] = JSON.parse(local);
      friends = friends.filter(f => f.id !== friendId);
      localStorage.setItem(`friends_${currentUserId}`, JSON.stringify(friends));
    }
  } catch (e) {
    console.warn(e);
  }

  // Firestore sync
  if (currentUserId) {
    try {
      const friendRef = doc(db, 'users', currentUserId, 'friends', friendId);
      await deleteDoc(friendRef);
    } catch (err) {
      console.warn('Firestore removeFriend failed:', err);
    }
  }
}

/**
 * Fetches current user's friend list
 */
export async function getFriendsList(currentUserId: string): Promise<Friend[]> {
  const localFriends: Friend[] = [];
  try {
    const local = localStorage.getItem(`friends_${currentUserId}`);
    if (local) {
      localFriends.push(...JSON.parse(local));
    }
  } catch (e) {
    console.warn(e);
  }

  if (!currentUserId) return localFriends;

  try {
    const friendsRef = collection(db, 'users', currentUserId, 'friends');
    const snapshot = await getDocs(friendsRef);
    const firestoreFriends: Friend[] = [];

    snapshot.forEach((docSnap) => {
      const data = docSnap.data();
      firestoreFriends.push({
        id: docSnap.id,
        uid: docSnap.id,
        username: data.username || 'user',
        displayName: data.displayName || 'User',
        photoURL: data.photoURL || '',
        avatarColor: data.avatarColor || '#4F46E5',
        addedAt: data.addedAt ? (data.addedAt.seconds ? data.addedAt.seconds * 1000 : Date.now()) : Date.now(),
      });
    });

    // Merge without duplicates
    const mergedMap = new Map<string, Friend>();
    localFriends.forEach(f => mergedMap.set(f.id, f));
    firestoreFriends.forEach(f => mergedMap.set(f.id, f));

    const finalFriends = Array.from(mergedMap.values());
    localStorage.setItem(`friends_${currentUserId}`, JSON.stringify(finalFriends));
    return finalFriends;
  } catch (err) {
    console.warn('Failed fetching friends from Firestore:', err);
    return localFriends;
  }
}
