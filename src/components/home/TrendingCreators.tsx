import { Link } from 'react-router-dom';
import { Zap, Users } from 'lucide-react';
import { mockCreators } from '@/data/mockData';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

export function TrendingCreators() {
  return (
    <section className="py-8">
      <div className="flex items-center justify-between mb-4">
        <h2 className="font-display text-xl font-bold">Trending Creators</h2>
        <Button variant="ghost" size="sm" asChild>
          <Link to="/creators">View All</Link>
        </Button>
      </div>
      
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {mockCreators.map((creator, index) => (
          <Link
            key={creator.id}
            to={`/creator/${creator.username}`}
            className={cn(
              "group p-4 rounded-xl bg-card/50 border border-border/50 hover:border-primary/50",
              "hover:shadow-lg hover:shadow-primary/10 transition-all duration-300",
              "animate-fadeIn"
            )}
            style={{ animationDelay: `${index * 100}ms` }}
          >
            <div className="flex items-center gap-4">
              <div className="relative">
                <Avatar className="h-14 w-14 border-2 border-primary/50 group-hover:border-primary transition-colors">
                  <AvatarImage src={creator.avatar} />
                  <AvatarFallback>{creator.name[0]}</AvatarFallback>
                </Avatar>
                {creator.isVerified && (
                  <div className="absolute -bottom-1 -right-1 w-5 h-5 rounded-full bg-primary flex items-center justify-center">
                    <Zap className="h-3 w-3 text-primary-foreground" />
                  </div>
                )}
              </div>
              
              <div className="flex-1 min-w-0">
                <h3 className="font-medium truncate group-hover:text-primary transition-colors">
                  {creator.name}
                </h3>
                <p className="text-sm text-muted-foreground truncate">
                  @{creator.username}
                </p>
                <div className="flex items-center gap-1 mt-1 text-xs text-muted-foreground">
                  <Users className="h-3 w-3" />
                  <span>{(creator.followers / 1000).toFixed(1)}K followers</span>
                </div>
              </div>
            </div>
          </Link>
        ))}
      </div>
    </section>
  );
}
