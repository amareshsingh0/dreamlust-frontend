import { useState, useEffect } from "react";
import { Helmet } from "react-helmet-async";
import { Link } from "react-router-dom";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Layout } from "@/components/layout/Layout";
import { Settings as SettingsIcon, User, Bell, Shield, CreditCard, Globe, Loader2, Lock, ShieldCheck, ShieldOff, MapPin, PlaySquare } from "lucide-react";
import { LanguageSelector } from "@/components/localization/LanguageSelector";
import { CurrencySelector } from "@/components/preferences/CurrencySelector";
import { countries } from "@/data/countries";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import { api } from "@/lib/api";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import { useAuth } from "@/contexts/AuthContext";

// Profile Validation Schema
const profileSchema = z.object({
  displayName: z
    .string()
    .min(2, "Display name must be at least 2 characters")
    .max(50, "Display name must be at most 50 characters")
    .regex(/^[a-zA-Z0-9\s_-]+$/, "Display name can only contain letters, numbers, spaces, underscores, and hyphens"),
  username: z
    .string()
    .min(3, "Username must be at least 3 characters")
    .max(30, "Username must be at most 30 characters")
    .regex(/^[a-zA-Z0-9_]+$/, "Username can only contain letters, numbers, and underscores"),
  bio: z
    .string()
    .max(500, "Bio must be at most 500 characters")
    .optional(),
});

type ProfileFormData = z.infer<typeof profileSchema>;

const Settings = () => {
  const { user, refreshUser } = useAuth();
  const [isSavingProfile, setIsSavingProfile] = useState(false);

  // Region state
  const [region, setRegion] = useState<string>(() => {
    return localStorage.getItem('region') || 'US';
  });

  // Notification settings state
  const [notificationSettings, setNotificationSettings] = useState({
    email: true,
    push: true,
    inApp: true,
    newUploads: true,
    creatorUpdates: true,
    recommendations: false,
  });

  // Privacy settings state
  const [privacySettings, setPrivacySettings] = useState({
    publicProfile: false,
    showWatchHistory: false,
    dataCollection: true,
    hideHistory: false,
    anonymousMode: false,
    privatePlaylists: false,
  });

  // Playback settings state
  const [playbackSettings, setPlaybackSettings] = useState({
    defaultQuality: 'auto',
    autoplay: true,
  });

  // Load preferences from backend
  useEffect(() => {
    const loadPreferences = async () => {
      try {
        const response = await api.preferences.get<{
          region?: string;
          notifications?: any;
          hideHistory?: boolean;
          anonymousMode?: boolean;
          defaultQuality?: string;
          autoplay?: boolean;
        }>();
        if (response.success && response.data) {
          if (response.data.region) {
            setRegion(response.data.region);
            localStorage.setItem('region', response.data.region);
          }
          if (response.data.hideHistory !== undefined) {
            setPrivacySettings(prev => ({ ...prev, hideHistory: response.data!.hideHistory || false }));
          }
          if (response.data.anonymousMode !== undefined) {
            setPrivacySettings(prev => ({ ...prev, anonymousMode: response.data!.anonymousMode || false }));
          }
          if (response.data.defaultQuality) {
            setPlaybackSettings(prev => ({ ...prev, defaultQuality: response.data!.defaultQuality! }));
          }
          if (response.data.autoplay !== undefined) {
            setPlaybackSettings(prev => ({ ...prev, autoplay: response.data!.autoplay || false }));
          }
        }
      } catch (error) {
        console.error('Failed to load preferences:', error);
      }
    };
    loadPreferences();
  }, []);

  // Save region preference
  const handleRegionChange = async (newRegion: string) => {
    setRegion(newRegion);
    localStorage.setItem('region', newRegion);
    try {
      await api.preferences.update({ region: newRegion });
    } catch (error) {
      console.error('Failed to save region preference:', error);
    }
  };

  // Save playback preferences
  const handlePlaybackChange = async (key: string, value: any) => {
    setPlaybackSettings(prev => ({ ...prev, [key]: value }));
    try {
      await api.preferences.update({ [key]: value });
    } catch (error) {
      console.error('Failed to save playback preference:', error);
    }
  };

  // Save privacy preferences
  const handlePrivacyChange = async (key: string, value: boolean) => {
    setPrivacySettings(prev => ({ ...prev, [key]: value }));
    try {
      await api.preferences.update({ [key]: value });
    } catch (error) {
      console.error('Failed to save privacy preference:', error);
    }
  };

  // 2FA State
  const [is2FAEnabled, setIs2FAEnabled] = useState(false);
  const [isGenerating2FA, setIsGenerating2FA] = useState(false);
  const [isEnabling2FA, setIsEnabling2FA] = useState(false);
  const [isDisabling2FA, setIsDisabling2FA] = useState(false);
  const [twoFactorSecret, setTwoFactorSecret] = useState<string | null>(null);
  const [twoFactorQRCode, setTwoFactorQRCode] = useState<string | null>(null);
  const [twoFactorToken, setTwoFactorToken] = useState("");
  const [showDisable2FA, setShowDisable2FA] = useState(false);
  const [disableToken, setDisableToken] = useState("");

  // Check if user is admin (2FA is only for admins)
  const isAdmin = user?.role === 'ADMIN';

  const {
    register: registerProfile,
    handleSubmit: handleProfileSubmit,
    formState: { errors: profileErrors },
    reset: resetProfileForm,
  } = useForm<ProfileFormData>({
    resolver: zodResolver(profileSchema),
    defaultValues: {
      displayName: "",
      username: "",
      bio: "",
    },
  });

  // Load current user data into the form
  useEffect(() => {
    if (user) {
      resetProfileForm({
        displayName: user.displayName || user.display_name || "",
        username: user.username || "",
        bio: user.bio || "",
      });
    }
  }, [user, resetProfileForm]);

  const onProfileSubmit = async (data: ProfileFormData) => {
    setIsSavingProfile(true);
    try {
      const response = await api.auth.updateProfile<{ user: any }>({
        displayName: data.displayName,
        username: data.username,
        bio: data.bio || "",
      });

      if (response.success) {
        // Refresh user data from the server
        await refreshUser();
        toast.success("Profile updated successfully!");
      } else {
        toast.error(response.error?.message || "Failed to update profile");
      }
    } catch (error: any) {
      toast.error(error.message || "Failed to update profile. Please try again.");
    } finally {
      setIsSavingProfile(false);
    }
  };

  // Generate 2FA QR Code
  const handleGenerate2FA = async () => {
    setIsGenerating2FA(true);
    try {
      const response = await api.auth.generate2FA<{ secret: string; qrCodeUrl: string }>();
      if (response.success && response.data) {
        setTwoFactorSecret(response.data.secret);
        setTwoFactorQRCode(response.data.qrCodeUrl);
      } else {
        toast.error(response.error?.message || "Failed to generate 2FA secret");
      }
    } catch (error) {
      toast.error("Failed to generate 2FA secret");
    } finally {
      setIsGenerating2FA(false);
    }
  };

  // Enable 2FA
  const handleEnable2FA = async () => {
    if (!twoFactorSecret || !twoFactorToken) {
      toast.error("Please enter the 6-digit code from your authenticator app");
      return;
    }

    setIsEnabling2FA(true);
    try {
      const response = await api.auth.enable2FA<{ message: string }>({
        token: twoFactorToken,
        secret: twoFactorSecret,
      });

      if (response.success) {
        setIs2FAEnabled(true);
        setTwoFactorSecret(null);
        setTwoFactorQRCode(null);
        setTwoFactorToken("");
        toast.success("Two-factor authentication enabled successfully!");
      } else {
        toast.error(response.error?.message || "Failed to enable 2FA");
      }
    } catch (error) {
      toast.error("Failed to enable 2FA");
    } finally {
      setIsEnabling2FA(false);
    }
  };

  // Disable 2FA
  const handleDisable2FA = async () => {
    if (!disableToken) {
      toast.error("Please enter the 6-digit code from your authenticator app");
      return;
    }

    setIsDisabling2FA(true);
    try {
      const response = await api.auth.disable2FA<{ message: string }>({
        token: disableToken,
      });

      if (response.success) {
        setIs2FAEnabled(false);
        setShowDisable2FA(false);
        setDisableToken("");
        toast.success("Two-factor authentication disabled");
      } else {
        toast.error(response.error?.message || "Failed to disable 2FA");
      }
    } catch (error) {
      toast.error("Failed to disable 2FA");
    } finally {
      setIsDisabling2FA(false);
    }
  };
  return (
    <>
      <Helmet>
        <title>Settings - PassionFantasia</title>
        <meta name="description" content="Account settings and preferences" />
      </Helmet>
      
      <Layout>
        <div className="container mx-auto px-4 py-6 sm:py-8 max-w-4xl">
          <div className="mb-6 sm:mb-8">
            <div className="flex items-center gap-2 sm:gap-3 mb-2">
              <SettingsIcon className="h-6 w-6 sm:h-8 sm:w-8 text-primary" />
              <h1 className="text-2xl sm:text-3xl md:text-4xl font-display font-bold">Settings</h1>
            </div>
            <p className="text-muted-foreground">
              Manage your account settings and preferences
            </p>
          </div>

          <Tabs defaultValue="profile" className="space-y-6">
            <TabsList className="grid w-full grid-cols-2 sm:grid-cols-3 md:grid-cols-6 h-auto gap-1">
              <TabsTrigger value="profile" className="text-xs sm:text-sm py-2">
                <User className="h-4 w-4 mr-1 sm:mr-2" />
                <span className="hidden xs:inline">Profile</span>
              </TabsTrigger>
              <TabsTrigger value="security" className="text-xs sm:text-sm py-2">
                <Lock className="h-4 w-4 mr-1 sm:mr-2" />
                <span className="hidden xs:inline">Security</span>
              </TabsTrigger>
              <TabsTrigger value="notifications" className="text-xs sm:text-sm py-2">
                <Bell className="h-4 w-4 mr-1 sm:mr-2" />
                <span className="hidden xs:inline">Alerts</span>
              </TabsTrigger>
              <TabsTrigger value="privacy" className="text-xs sm:text-sm py-2">
                <Shield className="h-4 w-4 mr-1 sm:mr-2" />
                <span className="hidden xs:inline">Privacy</span>
              </TabsTrigger>
              <TabsTrigger value="billing" className="text-xs sm:text-sm py-2">
                <CreditCard className="h-4 w-4 mr-1 sm:mr-2" />
                <span className="hidden xs:inline">Billing</span>
              </TabsTrigger>
              <TabsTrigger value="preferences" className="text-xs sm:text-sm py-2">
                <Globe className="h-4 w-4 mr-1 sm:mr-2" />
                <span className="hidden xs:inline">Prefs</span>
              </TabsTrigger>
            </TabsList>

            <TabsContent value="profile" className="space-y-4">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <User className="h-5 w-5" />
                    Profile Information
                  </CardTitle>
                  <CardDescription>Update your profile details</CardDescription>
                </CardHeader>
                <CardContent>
                  <form onSubmit={handleProfileSubmit(onProfileSubmit)} className="space-y-4">
                    <div className="space-y-2">
                      <Label htmlFor="email">Email</Label>
                      <Input
                        id="email"
                        type="email"
                        value={user?.email || ''}
                        disabled
                        className="bg-muted cursor-not-allowed"
                      />
                      <p className="text-xs text-muted-foreground">Email cannot be changed</p>
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="displayName">Display Name</Label>
                      <Input
                        id="displayName"
                        placeholder="Your display name"
                        {...registerProfile("displayName")}
                        className={profileErrors.displayName ? "border-destructive" : ""}
                      />
                      {profileErrors.displayName && (
                        <p className="text-sm text-destructive">{profileErrors.displayName.message}</p>
                      )}
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="username">Username</Label>
                      <Input
                        id="username"
                        placeholder="username"
                        {...registerProfile("username")}
                        className={profileErrors.username ? "border-destructive" : ""}
                      />
                      {profileErrors.username && (
                        <p className="text-sm text-destructive">{profileErrors.username.message}</p>
                      )}
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="bio">Bio</Label>
                      <Textarea
                        id="bio"
                        placeholder="Tell us about yourself"
                        rows={3}
                        maxLength={500}
                        {...registerProfile("bio")}
                        className={profileErrors.bio ? "border-destructive" : ""}
                      />
                      {profileErrors.bio && (
                        <p className="text-sm text-destructive">{profileErrors.bio.message}</p>
                      )}
                      <p className="text-xs text-muted-foreground">Max 500 characters</p>
                    </div>
                    <Button type="submit" disabled={isSavingProfile}>
                      {isSavingProfile ? (
                        <>
                          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                          Saving...
                        </>
                      ) : (
                        "Save Changes"
                      )}
                    </Button>
                  </form>
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="security" className="space-y-4">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Lock className="h-5 w-5" />
                    Two-Factor Authentication (2FA)
                  </CardTitle>
                  <CardDescription>
                    Add an extra layer of security to your account
                    {!isAdmin && " (Available for admin accounts only)"}
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  {!isAdmin ? (
                    <div className="text-center py-8 text-muted-foreground">
                      <ShieldOff className="h-12 w-12 mx-auto mb-4 opacity-50" />
                      <p>Two-factor authentication is only available for admin accounts.</p>
                    </div>
                  ) : is2FAEnabled ? (
                    // 2FA is enabled - show disable option
                    <div className="space-y-4">
                      <div className="flex items-center gap-3 p-4 bg-green-50 dark:bg-green-900/20 rounded-lg border border-green-200 dark:border-green-800">
                        <ShieldCheck className="h-6 w-6 text-green-600 dark:text-green-400" />
                        <div>
                          <p className="font-medium text-green-700 dark:text-green-300">2FA is enabled</p>
                          <p className="text-sm text-green-600 dark:text-green-400">Your account is protected with two-factor authentication</p>
                        </div>
                      </div>

                      {showDisable2FA ? (
                        <div className="space-y-4 p-4 border rounded-lg">
                          <p className="text-sm text-muted-foreground">
                            Enter your 6-digit code from your authenticator app to disable 2FA:
                          </p>
                          <Input
                            type="text"
                            placeholder="000000"
                            maxLength={6}
                            value={disableToken}
                            onChange={(e) => setDisableToken(e.target.value.replace(/\D/g, ""))}
                            className="text-center text-2xl tracking-widest"
                          />
                          <div className="flex gap-2">
                            <Button
                              variant="destructive"
                              onClick={handleDisable2FA}
                              disabled={isDisabling2FA || disableToken.length !== 6}
                            >
                              {isDisabling2FA ? (
                                <>
                                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                  Disabling...
                                </>
                              ) : (
                                "Disable 2FA"
                              )}
                            </Button>
                            <Button variant="outline" onClick={() => { setShowDisable2FA(false); setDisableToken(""); }}>
                              Cancel
                            </Button>
                          </div>
                        </div>
                      ) : (
                        <Button variant="outline" onClick={() => setShowDisable2FA(true)}>
                          Disable Two-Factor Authentication
                        </Button>
                      )}
                    </div>
                  ) : twoFactorQRCode ? (
                    // Show QR code setup
                    <div className="space-y-4">
                      <div className="text-center">
                        <p className="text-sm text-muted-foreground mb-4">
                          Scan this QR code with your authenticator app (Google Authenticator, Authy, etc.)
                        </p>
                        <div className="inline-block p-4 bg-white rounded-lg">
                          <img src={twoFactorQRCode} alt="2FA QR Code" className="w-48 h-48" />
                        </div>
                        <p className="text-xs text-muted-foreground mt-2">
                          Or enter this secret manually: <code className="bg-muted px-2 py-1 rounded">{twoFactorSecret}</code>
                        </p>
                      </div>

                      <div className="space-y-2">
                        <Label>Enter the 6-digit code from your app:</Label>
                        <Input
                          type="text"
                          placeholder="000000"
                          maxLength={6}
                          value={twoFactorToken}
                          onChange={(e) => setTwoFactorToken(e.target.value.replace(/\D/g, ""))}
                          className="text-center text-2xl tracking-widest"
                        />
                      </div>

                      <div className="flex gap-2">
                        <Button
                          onClick={handleEnable2FA}
                          disabled={isEnabling2FA || twoFactorToken.length !== 6}
                        >
                          {isEnabling2FA ? (
                            <>
                              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                              Enabling...
                            </>
                          ) : (
                            "Enable 2FA"
                          )}
                        </Button>
                        <Button variant="outline" onClick={() => { setTwoFactorQRCode(null); setTwoFactorSecret(null); setTwoFactorToken(""); }}>
                          Cancel
                        </Button>
                      </div>
                    </div>
                  ) : (
                    // Initial state - show setup button
                    <div className="space-y-4">
                      <p className="text-sm text-muted-foreground">
                        Two-factor authentication adds an extra layer of security by requiring a code from your mobile device when signing in.
                      </p>
                      <Button onClick={handleGenerate2FA} disabled={isGenerating2FA}>
                        {isGenerating2FA ? (
                          <>
                            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                            Generating...
                          </>
                        ) : (
                          <>
                            <ShieldCheck className="mr-2 h-4 w-4" />
                            Set Up Two-Factor Authentication
                          </>
                        )}
                      </Button>
                    </div>
                  )}
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Lock className="h-5 w-5" />
                    Password
                  </CardTitle>
                  <CardDescription>Update your password</CardDescription>
                </CardHeader>
                <CardContent>
                  <Link to="/forgot-password">
                    <Button variant="outline">Change Password</Button>
                  </Link>
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="notifications" className="space-y-4">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Bell className="h-5 w-5" />
                    Notification Settings
                  </CardTitle>
                  <CardDescription>Control how you receive notifications</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="flex items-center justify-between">
                    <div className="space-y-0.5">
                      <Label>Email Notifications</Label>
                      <p className="text-sm text-muted-foreground">Receive notifications via email</p>
                    </div>
                    <Switch
                      checked={notificationSettings.email}
                      onCheckedChange={(checked) => setNotificationSettings(prev => ({ ...prev, email: checked }))}
                    />
                  </div>
                  <Separator />
                  <div className="flex items-center justify-between">
                    <div className="space-y-0.5">
                      <Label>Push Notifications</Label>
                      <p className="text-sm text-muted-foreground">Receive push notifications</p>
                    </div>
                    <Switch
                      checked={notificationSettings.push}
                      onCheckedChange={(checked) => setNotificationSettings(prev => ({ ...prev, push: checked }))}
                    />
                  </div>
                  <Separator />
                  <div className="flex items-center justify-between">
                    <div className="space-y-0.5">
                      <Label>In-App Notifications</Label>
                      <p className="text-sm text-muted-foreground">Show notifications in the app</p>
                    </div>
                    <Switch
                      checked={notificationSettings.inApp}
                      onCheckedChange={(checked) => setNotificationSettings(prev => ({ ...prev, inApp: checked }))}
                    />
                  </div>
                  <Separator />
                  <div className="flex items-center justify-between">
                    <div className="space-y-0.5">
                      <Label>New Uploads</Label>
                      <p className="text-sm text-muted-foreground">Get notified about new content from followed creators</p>
                    </div>
                    <Switch
                      checked={notificationSettings.newUploads}
                      onCheckedChange={(checked) => setNotificationSettings(prev => ({ ...prev, newUploads: checked }))}
                    />
                  </div>
                  <Separator />
                  <div className="flex items-center justify-between">
                    <div className="space-y-0.5">
                      <Label>Creator Updates</Label>
                      <p className="text-sm text-muted-foreground">Receive updates and announcements from creators</p>
                    </div>
                    <Switch
                      checked={notificationSettings.creatorUpdates}
                      onCheckedChange={(checked) => setNotificationSettings(prev => ({ ...prev, creatorUpdates: checked }))}
                    />
                  </div>
                  <Separator />
                  <div className="flex items-center justify-between">
                    <div className="space-y-0.5">
                      <Label>Recommendations</Label>
                      <p className="text-sm text-muted-foreground">Get personalized content recommendations</p>
                    </div>
                    <Switch
                      checked={notificationSettings.recommendations}
                      onCheckedChange={(checked) => setNotificationSettings(prev => ({ ...prev, recommendations: checked }))}
                    />
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="privacy" className="space-y-4">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Shield className="h-5 w-5" />
                    Privacy Settings
                  </CardTitle>
                  <CardDescription>Manage your privacy preferences</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="flex items-center justify-between">
                    <div className="space-y-0.5">
                      <Label>Public Profile</Label>
                      <p className="text-sm text-muted-foreground">Make your profile visible to everyone</p>
                    </div>
                    <Switch
                      checked={privacySettings.publicProfile}
                      onCheckedChange={(checked) => handlePrivacyChange('publicProfile', checked)}
                    />
                  </div>
                  <Separator />
                  <div className="flex items-center justify-between">
                    <div className="space-y-0.5">
                      <Label>Show Watch History</Label>
                      <p className="text-sm text-muted-foreground">Allow others to see your watch history</p>
                    </div>
                    <Switch
                      checked={privacySettings.showWatchHistory}
                      onCheckedChange={(checked) => handlePrivacyChange('showWatchHistory', checked)}
                    />
                  </div>
                  <Separator />
                  <div className="flex items-center justify-between">
                    <div className="space-y-0.5">
                      <Label>Hide Watch History</Label>
                      <p className="text-sm text-muted-foreground">Don't track your watch history</p>
                    </div>
                    <Switch
                      checked={privacySettings.hideHistory}
                      onCheckedChange={(checked) => handlePrivacyChange('hideHistory', checked)}
                    />
                  </div>
                  <Separator />
                  <div className="flex items-center justify-between">
                    <div className="space-y-0.5">
                      <Label>Anonymous Mode</Label>
                      <p className="text-sm text-muted-foreground">Browse content without leaving traces</p>
                    </div>
                    <Switch
                      checked={privacySettings.anonymousMode}
                      onCheckedChange={(checked) => handlePrivacyChange('anonymousMode', checked)}
                    />
                  </div>
                  <Separator />
                  <div className="flex items-center justify-between">
                    <div className="space-y-0.5">
                      <Label>Private Playlists</Label>
                      <p className="text-sm text-muted-foreground">Make your playlists private by default</p>
                    </div>
                    <Switch
                      checked={privacySettings.privatePlaylists}
                      onCheckedChange={(checked) => handlePrivacyChange('privatePlaylists', checked)}
                    />
                  </div>
                  <Separator />
                  <div className="flex items-center justify-between">
                    <div className="space-y-0.5">
                      <Label>Data Collection</Label>
                      <p className="text-sm text-muted-foreground">Allow data collection for personalized experience</p>
                    </div>
                    <Switch
                      checked={privacySettings.dataCollection}
                      onCheckedChange={(checked) => handlePrivacyChange('dataCollection', checked)}
                    />
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="billing" className="space-y-4">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <CreditCard className="h-5 w-5" />
                    Billing & Subscription
                  </CardTitle>
                  <CardDescription>Manage your subscription and payment methods</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="space-y-2">
                    <Label>Current Plan</Label>
                    <div className="p-4 bg-muted rounded-lg">
                      <p className="font-semibold">Free Plan</p>
                      <p className="text-sm text-muted-foreground">Upgrade to Premium for more features</p>
                    </div>
                  </div>
                  <Button asChild>
                    <Link to="/premium">Upgrade to Premium</Link>
                  </Button>
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="preferences" className="space-y-4">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Globe className="h-5 w-5" />
                    Language & Region
                  </CardTitle>
                  <CardDescription>Set your language and regional preferences</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div>
                    <Label className="mb-2 block">Language</Label>
                    <LanguageSelector />
                  </div>
                  <Separator />
                  <div>
                    <Label className="mb-2 block">Currency</Label>
                    <CurrencySelector />
                  </div>
                  <Separator />
                  <div>
                    <Label className="mb-2 block">Region</Label>
                    <div className="flex items-center gap-2">
                      <MapPin className="h-4 w-4 text-muted-foreground" />
                      <Select value={region} onValueChange={handleRegionChange}>
                        <SelectTrigger className="w-[200px]">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent className="max-h-[300px]">
                          {countries.map((country) => (
                            <SelectItem key={country.code} value={country.code}>
                              {country.name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <PlaySquare className="h-5 w-5" />
                    Playback
                  </CardTitle>
                  <CardDescription>Configure video playback settings</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="flex items-center justify-between">
                    <div className="space-y-0.5">
                      <Label>Auto-play Next</Label>
                      <p className="text-sm text-muted-foreground">Automatically play the next video</p>
                    </div>
                    <Switch
                      checked={playbackSettings.autoplay}
                      onCheckedChange={(checked) => handlePlaybackChange('autoplay', checked)}
                    />
                  </div>
                  <Separator />
                  <div>
                    <Label className="mb-2 block">Default Quality</Label>
                    <Select
                      value={playbackSettings.defaultQuality}
                      onValueChange={(value) => handlePlaybackChange('defaultQuality', value)}
                    >
                      <SelectTrigger className="w-[200px]">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="auto">Auto</SelectItem>
                        <SelectItem value="4k">4K</SelectItem>
                        <SelectItem value="1080p">1080p (HD)</SelectItem>
                        <SelectItem value="720p">720p</SelectItem>
                        <SelectItem value="480p">480p</SelectItem>
                        <SelectItem value="360p">360p</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        </div>
      </Layout>
    </>
  );
};

export default Settings;

