import { Helmet } from "react-helmet-async";
import { Link } from "react-router-dom";
import { Layout } from "@/components/layout/Layout";
import { Heart } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ContentCard } from "@/components/content/ContentCard";
import { mockContent } from "@/data/mockData";

const Liked = () => {
  // Mock liked content (in real app, fetch from Supabase)
  const likedContent = mockContent.slice(0, 12);

  return (
    <>
      <Helmet>
        <title>Liked Content - Dreamlust</title>
        <meta name="description" content="Your liked content" />
      </Helmet>
      
      <Layout>
        <div className="container mx-auto px-4 py-8">
          <div className="mb-8">
            <div className="flex items-center gap-3 mb-2">
              <Heart className="h-8 w-8 text-primary fill-primary" />
              <h1 className="text-4xl font-display font-bold">Liked Content</h1>
            </div>
            <p className="text-muted-foreground">
              Content you've liked and saved
            </p>
          </div>

          {likedContent.length === 0 ? (
            <Card>
              <CardContent className="py-12 text-center">
                <Heart className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                <h3 className="text-xl font-semibold mb-2">No Liked Content</h3>
                <p className="text-muted-foreground mb-4">
                  Start liking content to build your collection
                </p>
                <Button asChild>
                  <Link to="/explore">Explore Content</Link>
                </Button>
              </CardContent>
            </Card>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
              {likedContent.map((content) => (
                <ContentCard key={content.id} content={content} />
              ))}
            </div>
          )}
        </div>
      </Layout>
    </>
  );
};

export default Liked;

