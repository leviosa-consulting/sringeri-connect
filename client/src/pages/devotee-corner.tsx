import { useEffect, useState, useCallback } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { RefreshCw } from "lucide-react";

interface Article {
  id: string;
  title: string;
  description: string;
  link: string;
  url: string;
}

export default function DevoteeCorner() {
  const [article, setArticle] = useState<Article | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchArticle = useCallback(async (random = false) => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (random) {
        params.set("random", "true");
        if (article?.id) params.set("exclude", article.id);
      }
      const url = `/api/article-of-the-day${params.toString() ? `?${params}` : ""}`;
      const response = await fetch(url);
      if (response.ok) {
        const data = await response.json();
        if (data.article) setArticle(data.article);
      }
    } catch (error) {
      console.error("Error fetching article:", error);
    } finally {
      setLoading(false);
    }
  }, [article?.id]);

  useEffect(() => {
    fetchArticle();
  }, []);

  return (
    <div className="px-4 py-8 pb-24 md:pb-8 space-y-8">

      <div className="space-y-2 px-2">
        <h1 className="text-3xl font-serif font-bold text-primary" data-testid="text-devotee-corner-title">Devotee Corner</h1>
        <p className="text-muted-foreground text-lg">Explore the rich heritage of Sri Sringeri Sharada Peetham.</p>
      </div>

      <Card className="border-l-4 border-l-primary shadow-sm" data-testid="card-know-about-peetham">
        <CardHeader className="flex flex-row items-center justify-between pb-2">
          <CardTitle className="font-serif text-xl flex items-center gap-2">
            <span className="text-2xl">🏛️</span> Know About Peetham
          </CardTitle>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => fetchArticle(true)}
            disabled={loading}
            className="text-primary hover:text-primary/80"
            data-testid="button-show-another"
          >
            <RefreshCw className={`h-4 w-4 mr-1 ${loading ? "animate-spin" : ""}`} />
            Show Another
          </Button>
        </CardHeader>
        <CardContent>
          {article ? (
            <a
              href={article.url}
              target="_blank"
              rel="noopener noreferrer"
              className="block group"
              data-testid="link-peetham-article"
            >
              <h3 className="font-bold text-lg mb-2 group-hover:text-primary transition-colors" data-testid="text-article-title">{article.title}</h3>
              {article.description && (
                <p className="text-muted-foreground line-clamp-3 mb-3" data-testid="text-article-description">{article.description}...</p>
              )}
              <span className="text-primary font-medium text-sm group-hover:underline">Read on sringeri.net &rarr;</span>
            </a>
          ) : loading ? (
            <div className="py-6 text-center text-muted-foreground">Loading...</div>
          ) : (
            <div className="py-6 text-center text-muted-foreground">No article available.</div>
          )}
        </CardContent>
      </Card>

    </div>
  );
}
