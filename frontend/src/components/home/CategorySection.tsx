import { Link } from 'react-router-dom';
import { mockCategories } from '@/data/mockData';
import { cn } from '@/lib/utils';

export function CategorySection() {
  return (
    <section className="py-8">
      <h2 className="font-display text-xl font-bold mb-4">Browse Categories</h2>
      
      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3">
        {mockCategories.map((category, index) => (
          <Link
            key={category.id}
            to={`/category/${category.slug}`}
            className={cn(
              "group relative p-4 rounded-xl bg-gradient-to-br from-muted/50 to-muted/30 border border-border/50",
              "hover:border-primary/50 hover:shadow-lg hover:shadow-primary/10 transition-all duration-300",
              "animate-fadeIn"
            )}
            style={{ animationDelay: `${index * 50}ms` }}
          >
            <div className="flex items-center gap-3">
              <span className="text-2xl">{category.icon}</span>
              <div className="min-w-0">
                <h3 className="font-medium text-sm truncate group-hover:text-primary transition-colors">
                  {category.name}
                </h3>
                <p className="text-xs text-muted-foreground">
                  {category.count.toLocaleString()} items
                </p>
              </div>
            </div>
          </Link>
        ))}
      </div>
    </section>
  );
}
