import { Helmet } from "react-helmet-async";
import { Layout } from "@/components/layout/Layout";
import { CreatorCard } from "@/components/creator/CreatorCard";
import { CreatorCardSkeleton } from "@/components/creator/CreatorCardSkeleton";
import { mockCreators } from "@/data/mockData";
import { useState } from "react";

const Creators = () => {
  const [isLoading] = useState(false);
  const [following, setFollowing] = useState<Set<string>>(new Set());

  const handleFollow = (creatorId: string) => {
    setFollowing(prev => {
      const next = new Set(prev);
      if (next.has(creatorId)) {
        next.delete(creatorId);
      } else {
        next.add(creatorId);
      }
      return next;
    });
  };

  return (
    <>
      <Helmet>
        <title>Creators - Dreamlust</title>
        <meta name="description" content="Discover talented creators on Dreamlust. Follow your favorites and explore their content." />
      </Helmet>

      <Layout>
        <div className="container mx-auto px-4 sm:px-6 lg:px-8 py-8 lg:py-12">
          {/* Header */}
          <div className="mb-10 lg:mb-12 text-center">
            <h1 className="text-4xl sm:text-5xl lg:text-6xl font-display font-bold mb-3 text-foreground">
              Discover Creators
            </h1>
            <p className="text-base sm:text-lg text-muted-foreground mx-auto max-w-2xl">
              Follow your favorite creators and never miss their latest content.
            </p>
          </div>

          {/* Creators Grid */}
          {isLoading ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6 lg:gap-8">
              <CreatorCardSkeleton count={8} />
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6 lg:gap-8">
              {mockCreators.map((creator, index) => (
                <div
                  key={creator.id}
                  className="animate-fadeIn"
                  style={{ animationDelay: `${index * 100}ms` }}
                >
                  <CreatorCard
                    creator={creator}
                    showFollowButton={false}
                    isFollowing={following.has(creator.id)}
                    onFollow={handleFollow}
                  />
                </div>
              ))}
            </div>
          )}
        </div>
      </Layout>
    </>
  );
};

export default Creators;
