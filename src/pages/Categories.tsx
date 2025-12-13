import { Helmet } from "react-helmet-async";
import { Layout } from "@/components/layout/Layout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Link } from "react-router-dom";
import { mockCategories } from "@/data/mockData";

const Categories = () => {
  return (
    <>
      <Helmet>
        <title>Categories - Dreamlust</title>
        <meta name="description" content="Browse content by category" />
      </Helmet>
      
      <Layout>
        <div className="container mx-auto px-4 py-8">
          <div className="mb-8">
            <h1 className="text-4xl font-display font-bold mb-2">Categories</h1>
            <p className="text-muted-foreground">
              Explore content by category
            </p>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
            {mockCategories.map((category) => (
              <Link key={category.id} to={`/category/${category.slug}`}>
                <Card className="hover:shadow-lg transition-all hover:scale-105 cursor-pointer h-full">
                  <CardHeader className="text-center">
                    <div className="text-4xl mb-2">{category.icon}</div>
                    <CardTitle className="text-lg">{category.name}</CardTitle>
                    <CardDescription>{category.count} items</CardDescription>
                  </CardHeader>
                </Card>
              </Link>
            ))}
          </div>
        </div>
      </Layout>
    </>
  );
};

export default Categories;

