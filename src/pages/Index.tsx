import { useState, useEffect } from "react";
import { Helmet } from "react-helmet-async";
import { Layout } from "@/components/layout/Layout";
import { HeroSection } from "@/components/home/HeroSection";
import { CategorySection } from "@/components/home/CategorySection";
import { TrendingCreators } from "@/components/home/TrendingCreators";
import { ContentCarousel } from "@/components/content/ContentCarousel";
import { mockContent } from "@/data/mockData";
import { api } from "@/lib/api";
import type { Content } from "@/types";

const Index = () => {
  // State for all recommendation sections
  const [forYouContent, setForYouContent] = useState<Content[]>([]);
  const [trendingNowContent, setTrendingNowContent] = useState<Content[]>([]);
  const [followedCreatorsContent, setFollowedCreatorsContent] = useState<Content[]>([]);
  const [continueWatchingContent, setContinueWatchingContent] = useState<Content[]>([]);
  const [lastWatchedSimilar, setLastWatchedSimilar] = useState<Content[]>([]);
  const [lastWatchedTitle, setLastWatchedTitle] = useState<string | null>(null);
  const [regionalContent, setRegionalContent] = useState<Content[]>([]);
  
  // Loading states
  const [loadingForYou, setLoadingForYou] = useState(false);
  const [loadingTrendingNow, setLoadingTrendingNow] = useState(false);
  const [loadingFollowedCreators, setLoadingFollowedCreators] = useState(false);
  const [loadingContinueWatching, setLoadingContinueWatching] = useState(false);
  const [loadingLastWatched, setLoadingLastWatched] = useState(false);
  const [loadingRegional, setLoadingRegional] = useState(false);

  // Fallback content
  const fallbackTrending = mockContent.filter(c => c.views > 1000000);
  const fallbackNew = mockContent.slice(0, 4);

  // Fetch "For You" recommendations (mix of collaborative + content-based)
  useEffect(() => {
    const fetchForYou = async () => {
      setLoadingForYou(true);
      try {
        const response = await api.recommendations.getForYou<Content[]>(8);
        if (response.success && response.data && response.data.length > 0) {
          setForYouContent(response.data);
        } else {
          setForYouContent(mockContent.slice(2, 10));
        }
      } catch (error) {
        console.error('Failed to fetch For You recommendations:', error);
        setForYouContent(mockContent.slice(2, 10));
      } finally {
        setLoadingForYou(false);
      }
    };

    fetchForYou();
  }, []);

  // Fetch "Trending Now" (trending today)
  useEffect(() => {
    const fetchTrendingNow = async () => {
      setLoadingTrendingNow(true);
      try {
        const response = await api.recommendations.getTrendingNow<Content[]>(8);
        if (response.success && response.data && response.data.length > 0) {
          setTrendingNowContent(response.data);
        } else {
          setTrendingNowContent(fallbackTrending);
        }
      } catch (error) {
        console.error('Failed to fetch Trending Now:', error);
        setTrendingNowContent(fallbackTrending);
      } finally {
        setLoadingTrendingNow(false);
      }
    };

    fetchTrendingNow();
  }, []);

  // Fetch "From Creators You Follow" (new releases)
  useEffect(() => {
    const fetchFollowedCreators = async () => {
      setLoadingFollowedCreators(true);
      try {
        const response = await api.recommendations.getFollowedCreators<Content[]>(8);
        if (response.success && response.data) {
          setFollowedCreatorsContent(response.data);
        } else {
          setFollowedCreatorsContent([]);
        }
      } catch (error) {
        console.error('Failed to fetch Followed Creators content:', error);
        setFollowedCreatorsContent([]);
      } finally {
        setLoadingFollowedCreators(false);
      }
    };

    fetchFollowedCreators();
  }, []);

  // Fetch "Continue Watching"
  useEffect(() => {
    const fetchContinueWatching = async () => {
      setLoadingContinueWatching(true);
      try {
        const response = await api.recommendations.getContinueWatching<Content[]>(8);
        if (response.success && response.data) {
          setContinueWatchingContent(response.data);
        } else {
          setContinueWatchingContent([]);
        }
      } catch (error) {
        console.error('Failed to fetch Continue Watching:', error);
        setContinueWatchingContent([]);
      } finally {
        setLoadingContinueWatching(false);
      }
    };

    fetchContinueWatching();
  }, []);

  // Fetch "Because You Watched..."
  useEffect(() => {
    const fetchLastWatchedSimilar = async () => {
      setLoadingLastWatched(true);
      try {
        const response = await api.recommendations.getLastWatchedSimilar<{ data: Content[]; lastWatchedTitle: string | null }>(8);
        if (response.success && response.data) {
          const result = response.data as { data: Content[]; lastWatchedTitle: string | null };
          setLastWatchedSimilar(result.data || []);
          setLastWatchedTitle(result.lastWatchedTitle || null);
        } else {
          setLastWatchedSimilar([]);
          setLastWatchedTitle(null);
        }
      } catch (error) {
        console.error('Failed to fetch Last Watched Similar:', error);
        setLastWatchedSimilar([]);
        setLastWatchedTitle(null);
      } finally {
        setLoadingLastWatched(false);
      }
    };

    fetchLastWatchedSimilar();
  }, []);

  // Fetch "Popular in {region}"
  useEffect(() => {
    const fetchRegional = async () => {
      setLoadingRegional(true);
      try {
        const response = await api.recommendations.getRegional<Content[]>(8);
        if (response.success && response.data && response.data.length > 0) {
          setRegionalContent(response.data);
        } else {
          setRegionalContent([]);
        }
      } catch (error) {
        console.error('Failed to fetch Regional content:', error);
        setRegionalContent([]);
      } finally {
        setLoadingRegional(false);
      }
    };

    fetchRegional();
  }, []);

  return (
    <>
      <Helmet>
        <title>Dreamlust - Premium Streaming Platform</title>
        <meta name="description" content="Discover trending content, follow your favorite creators, and enjoy premium streaming on Dreamlust." />
      </Helmet>
      
      <Layout>
        <div className="space-y-8 pb-12">
          <HeroSection />
          
          <div className="px-4 lg:px-8 space-y-10">
            {/* For You - Mix of collaborative + content-based */}
            {forYouContent.length > 0 && (
              <ContentCarousel 
                title="For You" 
                description="Based on your interests"
                content={forYouContent}
                viewAllPath="/explore?sort=recommended"
                loading={loadingForYou}
              />
            )}

            {/* Trending Now - Trending today */}
            <ContentCarousel 
              title="Trending Now" 
              content={trendingNowContent}
              viewAllPath="/trending"
              loading={loadingTrendingNow}
            />
            
            {/* Browse Categories */}
            <CategorySection />
            
            {/* From Creators You Follow - New Releases */}
            {followedCreatorsContent.length > 0 && (
              <ContentCarousel 
                title="From Creators You Follow" 
                description="New Releases"
                content={followedCreatorsContent}
                viewAllPath="/explore?sort=newest"
                loading={loadingFollowedCreators}
              />
            )}

            {/* Continue Watching */}
            {continueWatchingContent.length > 0 && (
              <ContentCarousel 
                title="Continue Watching" 
                content={continueWatchingContent}
                viewAllPath="/history"
                loading={loadingContinueWatching}
              />
            )}

            {/* Trending Creators */}
            <TrendingCreators />
            
            {/* Because You Watched */}
            {lastWatchedSimilar.length > 0 && lastWatchedTitle && (
              <ContentCarousel 
                title={`Because You Watched '${lastWatchedTitle}'`}
                content={lastWatchedSimilar}
                viewAllPath="/explore?sort=recommended"
                loading={loadingLastWatched}
              />
            )}

            {/* Popular in {region} */}
            {regionalContent.length > 0 && (
              <ContentCarousel 
                title="Popular in Your Region" 
                content={regionalContent}
                viewAllPath="/trending"
                loading={loadingRegional}
              />
            )}
          </div>
        </div>
      </Layout>
    </>
  );
};

export default Index;
