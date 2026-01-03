import { useState, useRef } from 'react';
import { Camera, Edit2, Twitter, Instagram, Globe, UserPlus, Check, Upload, Loader2, Facebook } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Link } from 'react-router-dom';
import { api } from '@/lib/api';
import { toast } from 'sonner';
import { useAuth } from '@/contexts/AuthContext';

interface ProfileHeaderProps {
  isOwnProfile?: boolean;
  isCreator?: boolean;
  username: string;
  displayName: string;
  avatar?: string;
  banner?: string;
  bio?: string;
  socialLinks?: {
    twitter?: string;
    instagram?: string;
    facebook?: string;
    pinterest?: string;
    website?: string;
  };
  stats?: {
    followers?: number;
    following?: number;
    uploads?: number;
    watched?: number;
    playlists?: number;
  };
  memberSince?: string;
  isFollowing?: boolean;
  onFollow?: () => void;
  onEdit?: () => void;
}

export function ProfileHeader({
  isOwnProfile = false,
  isCreator = false,
  username,
  displayName,
  avatar,
  banner,
  bio,
  socialLinks,
  stats,
  memberSince,
  isFollowing = false,
  onFollow,
  onEdit,
}: ProfileHeaderProps) {
  const { refreshUser } = useAuth();
  const [isEditingBanner, setIsEditingBanner] = useState(false);
  const [isEditingAvatar, setIsEditingAvatar] = useState(false);
  const [isUploadingAvatar, setIsUploadingAvatar] = useState(false);
  const [isUploadingBanner, setIsUploadingBanner] = useState(false);
  const [avatarPreview, setAvatarPreview] = useState<string | null>(null);
  const [bannerPreview, setBannerPreview] = useState<string | null>(null);
  const avatarInputRef = useRef<HTMLInputElement>(null);
  const bannerInputRef = useRef<HTMLInputElement>(null);

  const handleAvatarSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.size > 5 * 1024 * 1024) {
        toast.error("Image must be less than 5MB");
        return;
      }
      const reader = new FileReader();
      reader.onloadend = () => {
        setAvatarPreview(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleBannerSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.size > 10 * 1024 * 1024) {
        toast.error("Image must be less than 10MB");
        return;
      }
      const reader = new FileReader();
      reader.onloadend = () => {
        setBannerPreview(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleAvatarUpload = async () => {
    if (!avatarPreview) return;

    setIsUploadingAvatar(true);
    try {
      const response = await api.auth.updateAvatar<{ user: any }>(avatarPreview);
      if (response.success) {
        await refreshUser();
        toast.success("Avatar updated successfully!");
        setIsEditingAvatar(false);
        setAvatarPreview(null);
      } else {
        toast.error(response.error?.message || "Failed to update avatar");
      }
    } catch (error: any) {
      toast.error(error.message || "Failed to update avatar");
    } finally {
      setIsUploadingAvatar(false);
    }
  };

  const handleBannerUpload = async () => {
    if (!bannerPreview) return;

    setIsUploadingBanner(true);
    try {
      const response = await api.auth.updateBanner<{ user: any }>(bannerPreview);
      if (response.success) {
        await refreshUser();
        toast.success("Banner updated successfully!");
        setIsEditingBanner(false);
        setBannerPreview(null);
      } else {
        toast.error(response.error?.message || "Failed to update banner");
      }
    } catch (error: any) {
      toast.error(error.message || "Failed to update banner");
    } finally {
      setIsUploadingBanner(false);
    }
  };

  const closeAvatarDialog = () => {
    setIsEditingAvatar(false);
    setAvatarPreview(null);
    if (avatarInputRef.current) {
      avatarInputRef.current.value = '';
    }
  };

  const closeBannerDialog = () => {
    setIsEditingBanner(false);
    setBannerPreview(null);
    if (bannerInputRef.current) {
      bannerInputRef.current.value = '';
    }
  };

  return (
    <div className="relative mb-8">
      {/* Banner */}
      <div className="relative h-48 md:h-64 bg-gradient-to-r from-primary/20 via-accent/20 to-primary/20 rounded-lg">
        <div className="absolute inset-0 overflow-hidden rounded-lg">
          {banner ? (
            <img
              src={banner}
              alt={`${displayName}'s banner`}
              className="w-full h-full object-cover"
            />
          ) : (
            <div className="w-full h-full bg-gradient-to-br from-primary/30 to-accent/30" />
          )}
        </div>

        {isOwnProfile && (
          <Button
            variant="secondary"
            size="sm"
            className="absolute top-4 right-4 gap-2 z-10"
            onClick={() => setIsEditingBanner(true)}
          >
            <Camera className="h-4 w-4" />
            <span className="hidden sm:inline">Edit Banner</span>
          </Button>
        )}

        {/* Avatar Overlay - positioned at bottom of banner, extending below */}
        <div className="absolute -bottom-12 left-6 md:left-8 z-10">
          <div className="relative group">
            <div className="h-24 w-24 md:h-32 md:w-32 rounded-full overflow-hidden border-4 border-background shadow-xl ring-2 ring-primary/20 bg-background">
              <Avatar className="h-full w-full">
                <AvatarImage src={avatar} alt={displayName} className="h-full w-full object-cover" />
                <AvatarFallback className="h-full w-full text-2xl md:text-3xl bg-gradient-to-br from-primary to-accent text-primary-foreground font-bold flex items-center justify-center">
                  {displayName[0]}
                </AvatarFallback>
              </Avatar>
            </div>
            {isOwnProfile && (
              <Button
                variant="default"
                size="icon"
                className="absolute bottom-0 right-0 h-9 w-9 rounded-full border-2 border-background shadow-lg hover:scale-110 transition-transform"
                onClick={() => setIsEditingAvatar(true)}
                title="Edit Avatar"
              >
                <Edit2 className="h-4 w-4" />
              </Button>
            )}
          </div>
        </div>
      </div>

      {/* Profile Info */}
      <div className="mt-16 md:mt-20 px-6 md:px-8">
        <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-4">
          <div className="flex-1">
            <div className="flex items-center gap-3 mb-2">
              <h1 className="font-display text-3xl md:text-4xl font-bold">{displayName}</h1>
              {isCreator && (
                <Badge variant="default" className="gap-1.5 px-3 py-1 bg-gradient-to-r from-primary to-accent border-0">
                  <Check className="h-3.5 w-3.5" />
                  <span className="font-semibold">Creator</span>
                </Badge>
              )}
            </div>
            
            <p className="text-muted-foreground mb-2">
              @{username}
              {memberSince && ` • Member since ${memberSince}`}
            </p>

            {bio && (
              <p className="text-sm md:text-base text-foreground/80 mb-4 max-w-2xl">
                {bio}
              </p>
            )}

            {/* Social Links */}
            {socialLinks && (socialLinks.twitter || socialLinks.instagram || socialLinks.facebook || socialLinks.pinterest || socialLinks.website) && (
              <div className="flex items-center gap-3 mb-4">
                {socialLinks.twitter && (
                  <a
                    href={socialLinks.twitter}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-muted-foreground hover:text-primary transition-colors"
                    title="Twitter/X"
                  >
                    <Twitter className="h-5 w-5" />
                  </a>
                )}
                {socialLinks.instagram && (
                  <a
                    href={socialLinks.instagram}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-muted-foreground hover:text-primary transition-colors"
                    title="Instagram"
                  >
                    <Instagram className="h-5 w-5" />
                  </a>
                )}
                {socialLinks.facebook && (
                  <a
                    href={socialLinks.facebook}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-muted-foreground hover:text-primary transition-colors"
                    title="Facebook"
                  >
                    <Facebook className="h-5 w-5" />
                  </a>
                )}
                {socialLinks.pinterest && (
                  <a
                    href={socialLinks.pinterest}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-muted-foreground hover:text-primary transition-colors"
                    title="Pinterest"
                  >
                    <svg className="h-5 w-5" viewBox="0 0 24 24" fill="currentColor">
                      <path d="M12 0a12 12 0 0 0-4.37 23.17c-.1-.94-.2-2.4.04-3.43l1.4-5.91s-.35-.71-.35-1.77c0-1.66.96-2.9 2.16-2.9 1.02 0 1.51.77 1.51 1.69 0 1.02-.65 2.56-.99 3.98-.28 1.19.6 2.16 1.77 2.16 2.13 0 3.77-2.25 3.77-5.5 0-2.88-2.07-4.9-5.02-4.9-3.42 0-5.43 2.57-5.43 5.22 0 1.03.4 2.14.9 2.74.1.12.11.22.08.34l-.34 1.36c-.05.22-.17.27-.4.16-1.5-.69-2.42-2.87-2.42-4.62 0-3.76 2.73-7.21 7.88-7.21 4.14 0 7.36 2.95 7.36 6.89 0 4.11-2.59 7.42-6.19 7.42-1.21 0-2.35-.63-2.74-1.37l-.74 2.84c-.27 1.04-1 2.35-1.49 3.14A12 12 0 1 0 12 0z"/>
                    </svg>
                  </a>
                )}
                {socialLinks.website && (
                  <a
                    href={socialLinks.website}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-muted-foreground hover:text-primary transition-colors"
                    title="Website"
                  >
                    <Globe className="h-5 w-5" />
                  </a>
                )}
              </div>
            )}

            {/* Stats */}
            {stats && (
              <div className="flex flex-wrap gap-6 md:gap-8 mt-4">
                {stats.followers !== undefined && (
                  <div className="flex flex-col">
                    <span className="font-bold text-2xl text-foreground">{stats.followers.toLocaleString()}</span>
                    <span className="text-sm text-muted-foreground">Followers</span>
                  </div>
                )}
                {stats.following !== undefined && (
                  <div className="flex flex-col">
                    <span className="font-bold text-2xl text-foreground">{stats.following.toLocaleString()}</span>
                    <span className="text-sm text-muted-foreground">Following</span>
                  </div>
                )}
                {stats.uploads !== undefined && (
                  <div className="flex flex-col">
                    <span className="font-bold text-2xl text-foreground">{stats.uploads.toLocaleString()}</span>
                    <span className="text-sm text-muted-foreground">Uploads</span>
                  </div>
                )}
                {stats.watched !== undefined && (
                  <div className="flex flex-col">
                    <span className="font-bold text-2xl text-foreground">{stats.watched.toLocaleString()}</span>
                    <span className="text-sm text-muted-foreground">Watched</span>
                  </div>
                )}
                {stats.playlists !== undefined && (
                  <div className="flex flex-col">
                    <span className="font-bold text-2xl text-foreground">{stats.playlists.toLocaleString()}</span>
                    <span className="text-sm text-muted-foreground">Playlists</span>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Action Buttons */}
          <div className="flex items-center gap-2">
            {isOwnProfile ? (
              <>
                <Button asChild variant="default" className="gap-2">
                  <Link to="/upload">
                    <Upload className="h-4 w-4" />
                    <span className="hidden sm:inline">Upload</span>
                  </Link>
                </Button>
                <Button onClick={onEdit} variant="secondary" className="gap-2">
                  <Edit2 className="h-4 w-4" />
                  <span className="hidden sm:inline">Edit Profile</span>
                </Button>
              </>
            ) : (
              <Button
                variant={isFollowing ? 'secondary' : 'default'}
                onClick={onFollow}
                className="gap-2"
              >
                {isFollowing ? (
                  <>
                    <Check className="h-4 w-4" />
                    <span>Following</span>
                  </>
                ) : (
                  <>
                    <UserPlus className="h-4 w-4" />
                    <span>Follow</span>
                  </>
                )}
              </Button>
            )}
          </div>
        </div>
      </div>

      {/* Avatar Upload Dialog */}
      <Dialog open={isEditingAvatar} onOpenChange={(open) => !open && closeAvatarDialog()}>
        <DialogContent className="sm:max-w-md max-h-[90vh] overflow-y-auto scrollbar-hide">
          <DialogHeader>
            <DialogTitle>Update Avatar</DialogTitle>
            <DialogDescription>
              Choose a new profile picture. Max file size: 5MB.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="flex justify-center">
              <div className="relative h-32 w-32 rounded-full overflow-hidden border-4 border-primary/20">
                {avatarPreview ? (
                  <img src={avatarPreview} alt="Preview" className="h-full w-full object-cover" />
                ) : avatar ? (
                  <img src={avatar} alt="Current avatar" className="h-full w-full object-cover" />
                ) : (
                  <div className="h-full w-full bg-gradient-to-br from-primary to-accent flex items-center justify-center text-4xl font-bold text-primary-foreground">
                    {displayName[0]}
                  </div>
                )}
              </div>
            </div>
            <input
              ref={avatarInputRef}
              type="file"
              accept="image/*"
              onChange={handleAvatarSelect}
              className="hidden"
              id="avatar-upload"
            />
            <div className="flex gap-2">
              <Button
                variant="outline"
                className="flex-1"
                onClick={() => avatarInputRef.current?.click()}
              >
                <Camera className="h-4 w-4 mr-2" />
                Choose Image
              </Button>
              {avatarPreview && (
                <Button
                  variant="default"
                  className="flex-1"
                  onClick={handleAvatarUpload}
                  disabled={isUploadingAvatar}
                >
                  {isUploadingAvatar ? (
                    <>
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      Uploading...
                    </>
                  ) : (
                    <>
                      <Upload className="h-4 w-4 mr-2" />
                      Save
                    </>
                  )}
                </Button>
              )}
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Banner Upload Dialog */}
      <Dialog open={isEditingBanner} onOpenChange={(open) => !open && closeBannerDialog()}>
        <DialogContent className="sm:max-w-2xl max-h-[90vh] overflow-y-auto scrollbar-hide">
          <DialogHeader>
            <DialogTitle>Update Banner</DialogTitle>
            <DialogDescription>
              Choose a new banner image. Recommended size: 1500x500. Max file size: 10MB.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="relative w-full h-40 rounded-lg overflow-hidden border-2 border-primary/20">
              {bannerPreview ? (
                <img src={bannerPreview} alt="Preview" className="w-full h-full object-cover" />
              ) : banner ? (
                <img src={banner} alt="Current banner" className="w-full h-full object-cover" />
              ) : (
                <div className="w-full h-full bg-gradient-to-br from-primary/30 to-accent/30" />
              )}
            </div>
            <input
              ref={bannerInputRef}
              type="file"
              accept="image/*"
              onChange={handleBannerSelect}
              className="hidden"
              id="banner-upload"
            />
            <div className="flex gap-2">
              <Button
                variant="outline"
                className="flex-1"
                onClick={() => bannerInputRef.current?.click()}
              >
                <Camera className="h-4 w-4 mr-2" />
                Choose Image
              </Button>
              {bannerPreview && (
                <Button
                  variant="default"
                  className="flex-1"
                  onClick={handleBannerUpload}
                  disabled={isUploadingBanner}
                >
                  {isUploadingBanner ? (
                    <>
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      Uploading...
                    </>
                  ) : (
                    <>
                      <Upload className="h-4 w-4 mr-2" />
                      Save
                    </>
                  )}
                </Button>
              )}
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}

