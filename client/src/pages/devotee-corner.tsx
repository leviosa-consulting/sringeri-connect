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

interface Stotra {
  id: string;
  title: string;
  titleEn: string;
  deityName: string;
  deityNameEn: string;
  url: string;
  totalShlokas: number;
}

interface Discourse {
  id: string;
  title: string;
  description: string;
  slug: string;
  place: string;
  language: string;
  videoId: string | null;
  url: string;
}

function useFetchItem<T>(apiPath: string, responseKey: string) {
  const [item, setItem] = useState<T | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchItem = useCallback(async (random = false, currentId?: string) => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (random) {
        params.set("random", "true");
        if (currentId) params.set("exclude", currentId);
      }
      const url = `${apiPath}${params.toString() ? `?${params}` : ""}`;
      const response = await fetch(url);
      if (response.ok) {
        const data = await response.json();
        if (data[responseKey]) setItem(data[responseKey]);
      }
    } catch (error) {
      console.error(`Error fetching ${responseKey}:`, error);
    } finally {
      setLoading(false);
    }
  }, [apiPath, responseKey]);

  useEffect(() => {
    fetchItem();
  }, []);

  return { item, loading, fetchItem };
}

export default function DevoteeCorner() {
  const { item: article, loading: articleLoading, fetchItem: fetchArticle } = useFetchItem<Article>("/api/article-of-the-day", "article");
  const { item: stotra, loading: stotraLoading, fetchItem: fetchStotra } = useFetchItem<Stotra>("/api/stotra-of-the-day", "stotra");
  const { item: discourse, loading: discourseLoading, fetchItem: fetchDiscourse } = useFetchItem<Discourse>("/api/jagadguru-anugraha", "discourse");

  return (
    <div className="px-4 py-8 pb-24 md:pb-8 space-y-6">

      <div className="space-y-2 px-2">
        <h1 className="text-3xl font-serif font-bold text-primary" data-testid="text-devotee-corner-title">Devotee Corner</h1>
        <p className="text-muted-foreground text-lg">Explore the rich heritage of Sri Sringeri Sharada Peetham.</p>
      </div>

      {/* Know About Peetham */}
      <Card className="border-l-4 border-l-primary shadow-sm" data-testid="card-know-about-peetham">
        <CardHeader className="flex flex-row items-center justify-between pb-2">
          <CardTitle className="font-serif text-xl flex items-center gap-2">
            <span className="text-2xl">🏛️</span> Know About Peetham
          </CardTitle>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => fetchArticle(true, article?.id)}
            disabled={articleLoading}
            className="text-primary hover:text-primary/80"
            data-testid="button-show-another-article"
          >
            <RefreshCw className={`h-4 w-4 mr-1 ${articleLoading ? "animate-spin" : ""}`} />
            Show Another
          </Button>
        </CardHeader>
        <CardContent>
          {article ? (
            <a href={article.url} target="_blank" rel="noopener noreferrer" className="block group" data-testid="link-peetham-article">
              <h3 className="font-bold text-lg mb-2 group-hover:text-primary transition-colors" data-testid="text-article-title">{article.title}</h3>
              {article.description && (
                <p className="text-muted-foreground line-clamp-3 mb-3" data-testid="text-article-description">{article.description}...</p>
              )}
              <span className="text-primary font-medium text-sm group-hover:underline">Read on sringeri.net &rarr;</span>
            </a>
          ) : articleLoading ? (
            <div className="py-4 text-center text-muted-foreground">Loading...</div>
          ) : (
            <div className="py-4 text-center text-muted-foreground">No article available.</div>
          )}
        </CardContent>
      </Card>

      {/* Stotra of the Day */}
      <Card className="border-l-4 border-l-orange-500 shadow-sm" data-testid="card-stotra-of-the-day">
        <CardHeader className="flex flex-row items-center justify-between pb-2">
          <CardTitle className="font-serif text-xl flex items-center gap-2">
            <span className="text-2xl">🕉️</span> Stotra of the Day
          </CardTitle>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => fetchStotra(true, stotra?.id)}
            disabled={stotraLoading}
            className="text-primary hover:text-primary/80"
            data-testid="button-show-another-stotra"
          >
            <RefreshCw className={`h-4 w-4 mr-1 ${stotraLoading ? "animate-spin" : ""}`} />
            Show Another
          </Button>
        </CardHeader>
        <CardContent>
          {stotra ? (
            <a href={stotra.url} target="_blank" rel="noopener noreferrer" className="block group" data-testid="link-stotra">
              <h3 className="font-bold text-lg mb-1 group-hover:text-primary transition-colors font-serif" data-testid="text-stotra-title">{stotra.title}</h3>
              {stotra.titleEn && stotra.titleEn !== stotra.title && (
                <p className="text-sm text-muted-foreground italic mb-2" data-testid="text-stotra-title-en">{stotra.titleEn}</p>
              )}
              <div className="flex items-center gap-3 text-sm text-muted-foreground mb-3">
                <span data-testid="text-stotra-deity">{stotra.deityName || stotra.deityNameEn}</span>
                {stotra.totalShlokas > 0 && (
                  <>
                    <span>•</span>
                    <span data-testid="text-stotra-shlokas">{stotra.totalShlokas} shlokas</span>
                  </>
                )}
              </div>
              <span className="text-primary font-medium text-sm group-hover:underline">Read on sringeri.net &rarr;</span>
            </a>
          ) : stotraLoading ? (
            <div className="py-4 text-center text-muted-foreground">Loading...</div>
          ) : (
            <div className="py-4 text-center text-muted-foreground">No stotra available.</div>
          )}
        </CardContent>
      </Card>

      {/* Jagadguru Anugraha */}
      <Card className="border-l-4 border-l-amber-600 shadow-sm" data-testid="card-jagadguru-anugraha">
        <CardHeader className="flex flex-row items-center justify-between pb-2">
          <CardTitle className="font-serif text-xl flex items-center gap-2">
            <span className="text-2xl">🙏</span> Jagadguru Anugraha
          </CardTitle>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => fetchDiscourse(true, discourse?.id)}
            disabled={discourseLoading}
            className="text-primary hover:text-primary/80"
            data-testid="button-show-another-discourse"
          >
            <RefreshCw className={`h-4 w-4 mr-1 ${discourseLoading ? "animate-spin" : ""}`} />
            Show Another
          </Button>
        </CardHeader>
        <CardContent>
          {discourse ? (
            <a href={discourse.url} target="_blank" rel="noopener noreferrer" className="block group" data-testid="link-discourse">
              <h3 className="font-bold text-lg mb-2 group-hover:text-primary transition-colors" data-testid="text-discourse-title">{discourse.title}</h3>
              {discourse.description && (
                <p className="text-muted-foreground line-clamp-3 mb-2" data-testid="text-discourse-description">{discourse.description}...</p>
              )}
              <div className="flex items-center gap-3 text-sm text-muted-foreground mb-3">
                {discourse.place && <span data-testid="text-discourse-place">{discourse.place}</span>}
                {discourse.place && discourse.language && <span>•</span>}
                {discourse.language && <span data-testid="text-discourse-language">{discourse.language}</span>}
              </div>
              <span className="text-primary font-medium text-sm group-hover:underline">
                {discourse.videoId ? "Watch on sringeri.net" : "Read on sringeri.net"} &rarr;
              </span>
            </a>
          ) : discourseLoading ? (
            <div className="py-4 text-center text-muted-foreground">Loading...</div>
          ) : (
            <div className="py-4 text-center text-muted-foreground">No discourse available.</div>
          )}
        </CardContent>
      </Card>

    </div>
  );
}
