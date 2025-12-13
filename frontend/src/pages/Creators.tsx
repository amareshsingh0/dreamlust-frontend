import { Helmet } from "react-helmet-async";
import { Layout } from "@/components/layout/Layout";
import { ContentGrid } from "@/components/content/ContentGrid";
import { mockCreators } from "@/data/mockData";
import { Link } from "react-router-dom";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Users, CheckCircle } from "lucide-react";

const Creators = () => {
  return (
    <>
      <Helmet>
        <title>Creators - Dreamlust</title>
        <meta name="description" content="Discover talented creators on Dreamlust. Follow your favorites and explore their content." />
      </Helmet>

      <Layout>
        <div className="px-4 lg:px-8 py-12">
          {/* Header */}
          <div className="text-center mb-12">
            <h1 className="font-display text-4xl font-bold mb-4">Discover Creators</h1>
            <p className="text-muted-foreground max-w-xl mx-auto">
              Follow your favorite creators and never miss their latest content.
            </p>
          </div>

          {/* Creators Grid */}
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            {mockCreators.map((creator) => (
              <Link
                key={creator.id}
                to={`/creator/${creator.username}`}
                className="group p-6 rounded-xl bg-card border border-border hover:border-primary/50 transition-all"
              >
                <div className="flex flex-col items-center text-center">
                  <div className="relative mb-4">
                    <img
                      src={creator.avatar}
                      alt={creator.name}
                      className="w-20 h-20 rounded-full object-cover ring-2 ring-border group-hover:ring-primary transition-colors"
                    />
                    {creator.isVerified && (
                      <CheckCircle className="absolute -bottom-1 -right-1 h-6 w-6 text-primary bg-background rounded-full" />
                    )}
                  </div>
                  <h3 className="font-display font-semibold mb-1 group-hover:text-primary transition-colors">
                    {creator.name}
                  </h3>
                  <p className="text-sm text-muted-foreground mb-3">@{creator.username}</p>
                  <div className="flex items-center gap-4 text-sm text-muted-foreground mb-4">
                    <span className="flex items-center gap-1">
                      <Users className="h-4 w-4" />
                      {(creator.followers / 1000).toFixed(0)}K
                    </span>
                    <span>{creator.contentCount} videos</span>
                  </div>
                  <Button variant="outline" size="sm" className="w-full">
                    View Profile
                  </Button>
                </div>
              </Link>
            ))}
          </div>
        </div>
      </Layout>
    </>
  );
};

export default Creators;
