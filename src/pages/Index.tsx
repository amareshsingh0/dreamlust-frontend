import { Helmet } from "react-helmet-async";
import { Layout } from "@/components/layout/Layout";
import { HeroSection } from "@/components/home/HeroSection";
import { CategorySection } from "@/components/home/CategorySection";
import { TrendingCreators } from "@/components/home/TrendingCreators";
import { ContentCarousel } from "@/components/content/ContentCarousel";
import { mockContent } from "@/data/mockData";

const Index = () => {
  // Split content for different sections
  const trendingContent = mockContent.filter(c => c.views > 1000000);
  const newContent = mockContent.slice(0, 4);
  const recommendedContent = mockContent.slice(2, 8);

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
              title="Recommended For You" 
              content={recommendedContent}
              viewAllPath="/explore?sort=recommended"
            />
          </div>
        </div>
      </Layout>
    </>
  );
};

export default Index;
