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

interface HomepageSection {
  type: string;
  title: string;
  description?: string;
  items: Content[];
}

interface LastWatchedResponse {
  data?: Content[];
  lastWatchedTitle?: string | null;
}

const Index = () => {
  // Smart Homepage sections
  const [homepageSections, setHomepageSections] = useState<HomepageSection[]>([]);
  const [useSmartHomepage, setUseSmartHomepage] = useState(true);

  // Legacy state for all recommendation sections (fallback)
  const [forYouContent, setForYouContent] = useState<Content[]>([]);
  const [trendingNowContent, setTrendingNowContent] = useState<Content[]>([]);
  const [followedCreatorsContent, setFollowedCreatorsContent] = useState<Content[]>([]);
  const [continueWatchingContent, setContinueWatchingContent] = useState<Content[]>([]);
  const [lastWatchedSimilar, setLastWatchedSimilar] = useState<Content[]>([]);
  const [lastWatchedTitle, setLastWatchedTitle] = useState<string | null>(null);
  const [regionalContent] = useState<Content[]>([]);

  // Single loading state for all content
  const [loading, setLoading] = useState(true);

  // Fallback content
  const fallbackTrending = mockContent.filter(c => c.views > 1000000);

  // Consolidated data fetching - runs once on mount
  useEffect(() => {
    let isMounted = true;

    const fetchAllContent = async () => {
      setLoading(true);

      try {
        // First try Smart Homepage (single API call)
        const smartResponse = await api.recommendations.getSmartHomepage<HomepageSection[]>();

        if (isMounted && smartResponse.success && Array.isArray(smartResponse.data) && smartResponse.data.length > 0) {
          setHomepageSections(smartResponse.data);
          setUseSmartHomepage(true);
          setLoading(false);
          return; // Smart homepage loaded successfully, no need for legacy calls
        }
      } catch (error) {
        if (import.meta.env.DEV) {
          console.error('Smart Homepage unavailable, using legacy:', error);
        }
      }

      // Fallback to legacy - fetch all content in parallel
      if (!isMounted) return;
      setUseSmartHomepage(false);

      try {
        // Make all API calls in parallel for better performance
        const [
          forYouRes,
          trendingRes,
          followedRes,
          continueRes,
          lastWatchedRes,
        ] = await Promise.allSettled([
          api.recommendations.getForYou<Content[]>(8),
          api.recommendations.getTrendingNow<Content[]>(8),
          api.recommendations.getFollowedCreators<Content[]>(8),
          api.recommendations.getContinueWatching<Content[]>(8),
          api.recommendations.getLastWatchedSimilar<LastWatchedResponse>(8),
        ]);

        if (!isMounted) return;

        // Process For You
        if (forYouRes.status === 'fulfilled' && forYouRes.value.success && Array.isArray(forYouRes.value.data)) {
          setForYouContent(forYouRes.value.data.length > 0 ? forYouRes.value.data : mockContent.slice(2, 10));
        } else {
          setForYouContent(mockContent.slice(2, 10));
        }

        // Process Trending Now
        if (trendingRes.status === 'fulfilled' && trendingRes.value.success && Array.isArray(trendingRes.value.data)) {
          setTrendingNowContent(trendingRes.value.data.length > 0 ? trendingRes.value.data : fallbackTrending);
        } else {
          setTrendingNowContent(fallbackTrending);
        }

        // Process Followed Creators
        if (followedRes.status === 'fulfilled' && followedRes.value.success && Array.isArray(followedRes.value.data)) {
          setFollowedCreatorsContent(followedRes.value.data);
        }

        // Process Continue Watching
        if (continueRes.status === 'fulfilled' && continueRes.value.success && Array.isArray(continueRes.value.data)) {
          setContinueWatchingContent(continueRes.value.data);
        }

        // Process Last Watched Similar
        if (lastWatchedRes.status === 'fulfilled' && lastWatchedRes.value.success && lastWatchedRes.value.data) {
          const result = lastWatchedRes.value.data;
          setLastWatchedSimilar(Array.isArray(result.data) ? result.data : []);
          setLastWatchedTitle(typeof result.lastWatchedTitle === 'string' ? result.lastWatchedTitle : null);
        }

      } catch (error) {
        if (import.meta.env.DEV) {
          console.error('Failed to fetch homepage content:', error);
        }
        // Use fallback content
        setForYouContent(mockContent.slice(2, 10));
        setTrendingNowContent(fallbackTrending);
      } finally {
        if (isMounted) {
          setLoading(false);
        }
      }
    };

    fetchAllContent();

    return () => {
      isMounted = false;
    };
  }, []);

  return (
    <>
      <Helmet>
        <title>PassionFantasia - Premium Streaming Platform</title>
        <meta name="description" content="Discover trending content, follow your favorite creators, and enjoy premium streaming on PassionFantasia." />
      </Helmet>

      <Layout>
        <div className="space-y-6 sm:space-y-8 pb-8 sm:pb-12">
          <HeroSection />

          <div className="px-3 sm:px-4 lg:px-8 space-y-6 sm:space-y-8 md:space-y-10">
            {useSmartHomepage && homepageSections.length > 0 ? (
              // Smart Homepage - Dynamic sections based on user type
              <>
                {homepageSections.map((section, index) => (
                  section.items.length > 0 && (
                    <ContentCarousel
                      key={`${section.type}-${index}`}
                      title={section.title}
                      description={section.description}
                      content={section.items}
                      viewAllPath={
                        section.type === 'continue_watching' ? '/history' :
                        section.type === 'trending_global' || section.type === 'popular_overall' ? '/trending' :
                        section.type === 'new_from_following' ? '/explore?sort=newest' :
                        '/explore?sort=recommended'
                      }
                      loading={loading && index === 0}
                    />
                  )
                ))}
                {/* Always show categories and trending creators */}
                <CategorySection />
                <TrendingCreators />
              </>
            ) : (
              // Legacy Homepage - Static sections
              <>
                {/* For You - Mix of collaborative + content-based */}
                {forYouContent.length > 0 && (
                  <ContentCarousel
                    title="For You"
                    description="Based on your interests"
                    content={forYouContent}
                    viewAllPath="/explore?sort=recommended"
                    loading={loading}
                  />
                )}

                {/* Trending Now - Trending today */}
                <ContentCarousel
                  title="Trending Now"
                  content={trendingNowContent.length > 0 ? trendingNowContent : fallbackTrending}
                  viewAllPath="/trending"
                  loading={loading}
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
                  />
                )}

                {/* Continue Watching */}
                {continueWatchingContent.length > 0 && (
                  <ContentCarousel
                    title="Continue Watching"
                    content={continueWatchingContent}
                    viewAllPath="/history"
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
                  />
                )}

                {/* Popular in {region} */}
                {regionalContent.length > 0 && (
                  <ContentCarousel
                    title="Popular in Your Region"
                    content={regionalContent}
                    viewAllPath="/trending"
                  />
                )}
              </>
            )}
          </div>
        </div>
      </Layout>
    </>
  );
};

export default Index;
