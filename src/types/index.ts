export interface Creator {
  id: string;
  userId?: string;
  name: string;
  displayName?: string;
  username: string;
  avatar: string;
  banner?: string;
  bio: string;
  followers: number;
  views: number;
  contentCount: number;
  isVerified: boolean;
  socialLinks?: {
    twitter?: string;
    instagram?: string;
    facebook?: string;
    pinterest?: string;
    website?: string;
  };
}

export interface Content {
  id: string;
  title: string;
  thumbnail: string;
  duration: string | number;
  views: number;
  viewCount?: number;
  likes: number;
  createdAt: string;
  publishedAt?: string;
  creator: Creator;
  type: 'video' | 'photo' | 'gallery' | 'vr' | 'live';
  quality: string[];
  tags: string[];
  category: string;
  categories?: { id: string; name: string; slug: string }[];
  description?: string;
  isLive?: boolean;
  isPremium?: boolean;
  isPublic?: boolean;
  status?: string;
}

export interface Category {
  id: string;
  name: string;
  slug: string;
  icon: string;
  count: number;
  thumbnail?: string;
}

export interface UserProfile {
  id: string;
  username: string;
  email: string;
  avatar?: string;
  playlists: Playlist[];
  watchHistory: Content[];
  likedContent: Content[];
  following: Creator[];
  preferences: UserPreferences;
}

export interface UserPreferences {
  darkMode: boolean;
  hideHistory: boolean;
  notifications: {
    newUploads: boolean;
    creatorUpdates: boolean;
    recommendations: boolean;
  };
  contentQuality: 'auto' | '720p' | '1080p' | '4k';
}

export interface Playlist {
  id: string;
  name: string;
  description?: string;
  thumbnail?: string;
  isPublic: boolean;
  items: Content[];
  createdAt: string;
  updatedAt: string;
}

export interface SearchFilters {
  categories: string[];
  contentType: string[];
  duration: string;
  releaseDate: string;
  creators: string[];
  language: string;
  tags: string[];
  quality: string[];
}

export interface SortOption {
  label: string;
  value: 'trending' | 'recent' | 'views' | 'rating';
}

export interface CommentUser {
  id: string;
  username: string;
  displayName: string | null;
  avatar: string | null;
}

export interface Comment {
  id: string;
  contentId: string;
  userId: string;
  text: string;
  parentId: string | null;
  likes: number;
  dislikes: number;
  isPinned: boolean;
  isEdited: boolean;
  deletedAt: string | null;
  createdAt: string;
  updatedAt: string;
  user: CommentUser;
  replies?: Comment[];
  userLiked?: boolean;
  userDisliked?: boolean;
  depth?: number;
}

export interface CommentResponse {
  comments: Comment[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}
