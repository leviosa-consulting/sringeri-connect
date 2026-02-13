import { useEffect, useState, useCallback } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { RefreshCw, Landmark, BookOpen, Mic, Trophy, Medal, Star } from "lucide-react";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { useInAppBrowser } from "@/contexts/in-app-browser-context";

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
  const { openUrl } = useInAppBrowser();
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
        <CardHeader className="pb-3">
          <CardTitle className="font-serif text-xl flex items-center gap-2">
            <Landmark className="h-5 w-5 text-primary shrink-0" />
            Know About Peetham
          </CardTitle>
        </CardHeader>
        <CardContent className="pb-0">
          {article ? (
            <div onClick={() => openUrl(article.url)} className="block group cursor-pointer" data-testid="link-peetham-article">
              <h3 className="font-bold text-lg mb-2 group-hover:text-primary transition-colors" data-testid="text-article-title">{article.title}</h3>
              {article.description && (
                <p className="text-muted-foreground line-clamp-3 mb-3" data-testid="text-article-description">{article.description}...</p>
              )}
              <span className="text-primary font-medium text-sm group-hover:underline">Read on sringeri.net &rarr;</span>
            </div>
          ) : articleLoading ? (
            <div className="py-4 text-center text-muted-foreground">Loading...</div>
          ) : (
            <div className="py-4 text-center text-muted-foreground">No article available.</div>
          )}
        </CardContent>
        <div className="border-t mt-3 px-6 py-2 flex justify-end">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => fetchArticle(true, article?.id)}
            disabled={articleLoading}
            className="text-muted-foreground hover:text-primary text-xs"
            data-testid="button-show-another-article"
          >
            <RefreshCw className={`h-3.5 w-3.5 mr-1.5 ${articleLoading ? "animate-spin" : ""}`} />
            Show Another
          </Button>
        </div>
      </Card>

      {/* Stotra of the Day */}
      <Card className="border-l-4 border-l-orange-500 shadow-sm" data-testid="card-stotra-of-the-day">
        <CardHeader className="pb-3">
          <CardTitle className="font-serif text-xl flex items-center gap-2">
            <BookOpen className="h-5 w-5 text-orange-500 shrink-0" />
            Stotra of the Day
          </CardTitle>
        </CardHeader>
        <CardContent className="pb-0">
          {stotra ? (
            <div onClick={() => openUrl(stotra.url)} className="block group cursor-pointer" data-testid="link-stotra">
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
            </div>
          ) : stotraLoading ? (
            <div className="py-4 text-center text-muted-foreground">Loading...</div>
          ) : (
            <div className="py-4 text-center text-muted-foreground">No stotra available.</div>
          )}
        </CardContent>
        <div className="border-t mt-3 px-6 py-2 flex justify-end">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => fetchStotra(true, stotra?.id)}
            disabled={stotraLoading}
            className="text-muted-foreground hover:text-primary text-xs"
            data-testid="button-show-another-stotra"
          >
            <RefreshCw className={`h-3.5 w-3.5 mr-1.5 ${stotraLoading ? "animate-spin" : ""}`} />
            Show Another
          </Button>
        </div>
      </Card>

      {/* Jagadguru Anugraha */}
      <Card className="border-l-4 border-l-amber-600 shadow-sm" data-testid="card-jagadguru-anugraha">
        <CardHeader className="pb-3">
          <CardTitle className="font-serif text-xl flex items-center gap-2">
            <Mic className="h-5 w-5 text-amber-600 shrink-0" />
            Jagadguru Anugraha
          </CardTitle>
        </CardHeader>
        <CardContent className="pb-0">
          {discourse ? (
            <div role="link" tabIndex={0} onClick={() => openUrl(discourse.url)} onKeyDown={(e) => { if (e.key === "Enter") openUrl(discourse.url); }} className="block group cursor-pointer" data-testid="link-discourse">
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
            </div>
          ) : discourseLoading ? (
            <div className="py-4 text-center text-muted-foreground">Loading...</div>
          ) : (
            <div className="py-4 text-center text-muted-foreground">No discourse available.</div>
          )}
        </CardContent>
        <div className="border-t mt-3 px-6 py-2 flex justify-end">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => fetchDiscourse(true, discourse?.id)}
            disabled={discourseLoading}
            className="text-muted-foreground hover:text-primary text-xs"
            data-testid="button-show-another-discourse"
          >
            <RefreshCw className={`h-3.5 w-3.5 mr-1.5 ${discourseLoading ? "animate-spin" : ""}`} />
            Show Another
          </Button>
        </div>
      </Card>

      {/* Your Score & Leaderboard */}
      <Card className="border-l-4 border-l-yellow-500 shadow-sm" data-testid="card-score-leaderboard">
        <CardHeader className="pb-3">
          <CardTitle className="font-serif text-xl flex items-center gap-2">
            <Trophy className="h-5 w-5 text-yellow-500 shrink-0" />
            Your Score
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="flex items-center justify-between p-4 bg-gradient-to-r from-yellow-50 to-amber-50 rounded-lg border border-yellow-100">
            <div>
              <p className="text-sm text-muted-foreground">Total Points</p>
              <p className="text-3xl font-bold text-yellow-600" data-testid="text-your-score">0</p>
            </div>
            <div className="text-right">
              <p className="text-sm text-muted-foreground">Rank</p>
              <p className="text-xl font-semibold text-amber-600" data-testid="text-your-rank">--</p>
            </div>
            <div className="h-14 w-14 rounded-full bg-yellow-100 flex items-center justify-center">
              <Star className="h-7 w-7 text-yellow-500" />
            </div>
          </div>

          <div className="text-xs text-muted-foreground text-center italic">
            Earn points by exploring articles, stotras, and discourses above.
          </div>

          <div>
            <h4 className="font-serif font-semibold text-base mb-3 flex items-center gap-2">
              <Medal className="h-4 w-4 text-yellow-500" />
              Leaderboard
            </h4>
            <div className="space-y-2">
              {[
                { rank: 1, name: "Devotee A.", points: 1250, color: "text-yellow-500" },
                { rank: 2, name: "Devotee B.", points: 980, color: "text-gray-400" },
                { rank: 3, name: "Devotee C.", points: 870, color: "text-amber-700" },
                { rank: 4, name: "Devotee D.", points: 650, color: "text-muted-foreground" },
                { rank: 5, name: "Devotee E.", points: 520, color: "text-muted-foreground" },
              ].map((user) => (
                <div key={user.rank} className="flex items-center gap-3 p-2.5 rounded-lg hover:bg-yellow-50/50 transition-colors" data-testid={`row-leaderboard-${user.rank}`}>
                  <div className="flex items-center justify-center w-7 h-7">
                    {user.rank <= 3 ? (
                      <Medal className={`h-5 w-5 ${user.color}`} />
                    ) : (
                      <span className="text-sm font-medium text-muted-foreground">{user.rank}</span>
                    )}
                  </div>
                  <Avatar className="h-8 w-8 border border-border">
                    <AvatarFallback className="text-xs bg-yellow-50 text-yellow-700">{user.name[0]}</AvatarFallback>
                  </Avatar>
                  <div className="flex-1">
                    <p className="font-medium text-sm">{user.name}</p>
                  </div>
                  <div className="text-right">
                    <p className="font-bold text-sm text-yellow-600">{user.points}</p>
                    <p className="text-[10px] text-muted-foreground">pts</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </CardContent>
      </Card>

    </div>
  );
}
