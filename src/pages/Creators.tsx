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
        <div className="container mx-auto px-4 py-8">
          {/* Header */}
          <div className="mb-8">
            <h1 className="text-4xl font-display font-bold mb-2">Discover Creators</h1>
            <p className="text-muted-foreground">
              Follow your favorite creators and never miss their latest content.
            </p>
          </div>

          {/* Creators Grid */}
          {isLoading ? (
            <div className="grid sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
              <CreatorCardSkeleton count={8} />
            </div>
          ) : (
            <div className="grid sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
              {mockCreators.map((creator) => (
                <CreatorCard
                  key={creator.id}
                  creator={creator}
                  showFollowButton
                  isFollowing={following.has(creator.id)}
                  onFollow={handleFollow}
                />
              ))}
            </div>
          )}
        </div>
      </Layout>
    </>
  );
};

export default Creators;
