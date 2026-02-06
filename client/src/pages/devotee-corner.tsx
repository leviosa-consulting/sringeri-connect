import { useEffect, useState } from "react";
import { DEVOTEE_ACTIVITIES } from "@/lib/constants";
import ServiceCard from "@/components/service-card";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Trophy, Star, Medal } from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";

interface ArticleOfTheDay {
  id: string;
  title: string;
  description: string;
  link: string;
  url: string;
}

export default function DevoteeCorner() {
  const [article, setArticle] = useState<ArticleOfTheDay | null>(null);

  useEffect(() => {
    const fetchArticle = async () => {
      try {
        const response = await fetch('/api/article-of-the-day');
        if (response.ok) {
          const data = await response.json();
          if (data.article) setArticle(data.article);
        }
      } catch (error) {
        console.error("Error fetching article of the day:", error);
      }
    };
    fetchArticle();
  }, []);

  const leaderboard = [
    { rank: 1, name: "Rahul V.", points: 2450 },
    { rank: 2, name: "Priya S.", points: 2100 },
    { rank: 3, name: "Amit K.", points: 1950 },
  ];

  return (
    <div className="px-4 py-8 pb-24 md:pb-8 space-y-8">
      
      {/* Header */}
      <div className="space-y-2 px-2">
        <h1 className="text-3xl font-serif font-bold text-primary">Devotee Corner</h1>
        <p className="text-muted-foreground text-lg">Daily wisdom, quizzes, and community engagement.</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {DEVOTEE_ACTIVITIES.map((activity) => (
          <ServiceCard key={activity.id} {...activity} />
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 mt-8">
        
        {/* Daily Wisdom Section */}
        <div className="lg:col-span-2 space-y-6">
          <Card className="border-l-4 border-l-primary shadow-sm">
            <CardHeader>
              <CardTitle className="font-serif text-xl flex items-center gap-2">
                <span className="text-2xl">🕉️</span> Shloka of the Day
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="p-6 bg-orange-50/50 rounded-xl text-center space-y-4">
                <p className="font-serif text-lg md:text-xl font-medium text-orange-900 leading-relaxed italic">
                  "Gururbrahma Gururvishnu Gururdevo Maheshwarah <br/>
                  Gurursakshat Parabrahma Tasmai Sri Gurave Namah"
                </p>
                <div className="h-px w-20 bg-orange-200 mx-auto" />
                <p className="text-sm text-muted-foreground">
                  The Guru is Brahma, the Guru is Vishnu, the Guru is Maheswara.<br/>
                  The Guru is verily the Para-Brahman (Supreme Brahman); Salutations to that Guru.
                </p>
              </div>
            </CardContent>
          </Card>

          <Card className="border-l-4 border-l-secondary shadow-sm">
            <CardHeader>
              <CardTitle className="font-serif text-xl">Article of the Day</CardTitle>
            </CardHeader>
            <CardContent>
              {article ? (
                <a
                  href={article.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="block group"
                  data-testid="card-article-of-the-day"
                >
                  <div className="flex gap-4 items-start">
                    <div className="h-24 w-24 bg-secondary/10 rounded-lg shrink-0 flex items-center justify-center">
                      <span className="text-3xl">📖</span>
                    </div>
                    <div>
                      <h3 className="font-bold text-lg mb-2 group-hover:text-primary transition-colors">{article.title}</h3>
                      {article.description && (
                        <p className="text-muted-foreground line-clamp-3">{article.description}</p>
                      )}
                      <span className="text-primary font-medium text-sm mt-2 inline-block group-hover:underline">Read Full Article</span>
                    </div>
                  </div>
                </a>
              ) : (
                <div className="flex gap-4 items-start">
                  <div className="h-24 w-24 bg-secondary/10 rounded-lg shrink-0 flex items-center justify-center">
                    <span className="text-3xl">📖</span>
                  </div>
                  <div>
                    <p className="text-muted-foreground">Loading today's article...</p>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Leaderboard Section */}
        <div className="lg:col-span-1">
          <Card className="h-full border-t-4 border-t-yellow-500 shadow-md bg-gradient-to-b from-yellow-50/50 to-transparent">
            <CardHeader className="pb-2">
              <CardTitle className="font-serif flex items-center gap-2">
                <Trophy className="h-5 w-5 text-yellow-600" />
                <span>Leaderboard</span>
              </CardTitle>
              <p className="text-xs text-muted-foreground">Top contributors this week</p>
            </CardHeader>
            <CardContent className="pt-4">
              <div className="space-y-4">
                {leaderboard.map((user, index) => (
                  <div key={index} className="flex items-center gap-3 p-2 rounded-lg hover:bg-white/50 transition-colors">
                    <div className="flex items-center justify-center w-8 h-8 font-bold text-muted-foreground">
                      {index === 0 && <Medal className="h-6 w-6 text-yellow-500" />}
                      {index === 1 && <Medal className="h-6 w-6 text-gray-400" />}
                      {index === 2 && <Medal className="h-6 w-6 text-amber-700" />}
                    </div>
                    <Avatar className="h-10 w-10 border border-border">
                      <AvatarImage src={`https://api.dicebear.com/7.x/initials/svg?seed=${user.name}`} />
                      <AvatarFallback>{user.name[0]}</AvatarFallback>
                    </Avatar>
                    <div className="flex-1">
                      <p className="font-medium text-sm">{user.name}</p>
                      <p className="text-xs text-muted-foreground">Devotee</p>
                    </div>
                    <div className="text-right">
                      <p className="font-bold text-primary">{user.points}</p>
                      <p className="text-[10px] text-muted-foreground">PTS</p>
                    </div>
                  </div>
                ))}
              </div>
              <div className="mt-6 text-center">
                <button className="text-xs text-muted-foreground hover:text-primary transition-colors">View Global Rankings</button>
              </div>
            </CardContent>
          </Card>
        </div>

      </div>
    </div>
  );
}
