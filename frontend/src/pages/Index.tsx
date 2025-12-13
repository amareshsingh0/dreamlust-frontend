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
  const [recommendedContent, setRecommendedContent] = useState<Content[]>([]);
  const [loadingRecommendations, setLoadingRecommendations] = useState(false);

  // Split content for different sections
  const trendingContent = mockContent.filter(c => c.views > 1000000);
  const newContent = mockContent.slice(0, 4);

  // Fetch personalized recommendations
  useEffect(() => {
    const fetchRecommendations = async () => {
      setLoadingRecommendations(true);
      try {
        const response = await api.recommendations.getUserRecommendations<Content[]>(8);
        if (response.success && response.data && response.data.length > 0) {
          setRecommendedContent(response.data);
        } else {
          // Fallback to mock data
          setRecommendedContent(mockContent.slice(2, 8));
        }
      } catch (error) {
        console.error('Failed to fetch recommendations:', error);
        // Fallback to mock data
        setRecommendedContent(mockContent.slice(2, 8));
      } finally {
        setLoadingRecommendations(false);
      }
    };

    fetchRecommendations();
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
            <ContentCarousel 
              title="Trending Now" 
              content={trendingContent} 
              viewAllPath="/trending"
            />
            
            <CategorySection />
            
            <ContentCarousel 
              title="New Releases" 
              content={newContent}
              viewAllPath="/explore?sort=newest"
            />
            
            <TrendingCreators />
            
            <ContentCarousel 
              title={loadingRecommendations ? "Loading Recommendations..." : recommendedContent.length > 0 ? "Because you watched..." : "Recommended For You"}
              content={recommendedContent}
              viewAllPath="/explore?sort=recommended"
              loading={loadingRecommendations}
            />
          </div>
        </div>
      </Layout>
    </>
  );
};

export default Index;
