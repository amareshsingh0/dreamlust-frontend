/**
 * Library Page
 * Shows user's saved content: downloads, playlists, history, liked
 */

import { useState } from 'react';
import { Download, Clock, Heart, PlaySquare } from 'lucide-react';
import { Layout } from '@/components/layout/Layout';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { DownloadManager } from '@/components/downloads/DownloadManager';
import History from '@/pages/History';
import Liked from '@/pages/Liked';
import Playlists from '@/pages/Playlists';
import { Helmet } from 'react-helmet-async';
import { useAuth } from '@/contexts/AuthContext';
import { Navigate } from 'react-router-dom';

export default function Library() {
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState('downloads');

  if (!user) {
    return <Navigate to="/auth" replace />;
  }

  return (
    <Layout>
      <Helmet>
        <title>Library - PassionFantasia</title>
        <meta name="description" content="Your saved content, downloads, and playlists" />
      </Helmet>
      
      <div className="container mx-auto px-4 py-8">
        <div className="mb-6">
          <h1 className="text-3xl font-bold mb-2">Your Library</h1>
          <p className="text-muted-foreground">
            Manage your downloads, playlists, and saved content
          </p>
        </div>

        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="downloads" className="flex items-center gap-2">
              <Download className="h-4 w-4" />
              <span className="hidden sm:inline">Downloads</span>
            </TabsTrigger>
            <TabsTrigger value="history" className="flex items-center gap-2">
              <Clock className="h-4 w-4" />
              <span className="hidden sm:inline">History</span>
            </TabsTrigger>
            <TabsTrigger value="liked" className="flex items-center gap-2">
              <Heart className="h-4 w-4" />
              <span className="hidden sm:inline">Liked</span>
            </TabsTrigger>
            <TabsTrigger value="playlists" className="flex items-center gap-2">
              <PlaySquare className="h-4 w-4" />
              <span className="hidden sm:inline">Playlists</span>
            </TabsTrigger>
          </TabsList>

          <TabsContent value="downloads" className="mt-6">
            <DownloadManager />
          </TabsContent>

          <TabsContent value="history" className="mt-6">
            <History />
          </TabsContent>

          <TabsContent value="liked" className="mt-6">
            <Liked />
          </TabsContent>

          <TabsContent value="playlists" className="mt-6">
            <Playlists />
          </TabsContent>
        </Tabs>
      </div>
    </Layout>
  );
}

