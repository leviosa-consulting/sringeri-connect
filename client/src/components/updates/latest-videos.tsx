import { useEffect, useState } from "react";
import { Play } from "lucide-react";
import { ScrollArea, ScrollBar } from "@/components/ui/scroll-area";

export interface YouTubeVideo {
  videoId: string;
  title: string;
  published: string;
  date: string | null;
  thumbnail: string;
  url: string;
}

export default function LatestVideos() {
  const [videos, setVideos] = useState<YouTubeVideo[]>([]);

  useEffect(() => {
    let cancelled = false;
    const fetchVideos = async () => {
      try {
        const response = await fetch("/api/youtube-videos");
        if (response.ok) {
          const data = await response.json();
          if (!cancelled) setVideos(data.videos || []);
        }
      } catch (error) {
        console.error("Error fetching YouTube videos:", error);
      }
    };
    fetchVideos();
    return () => { cancelled = true; };
  }, []);

  if (videos.length === 0) return null;

  return (
    <section>
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <Play className="w-5 h-5 text-red-600" />
          <h2 className="text-lg font-bold font-serif" data-testid="text-youtube-heading">Latest Videos</h2>
        </div>
        <a href="https://www.youtube.com/@SharadaPeetham" target="_blank" rel="noopener noreferrer" className="text-xs text-primary font-medium" data-testid="link-youtube-channel">View Channel</a>
      </div>

      <div className="lg:hidden">
        <ScrollArea className="w-full whitespace-nowrap">
          <div className="flex gap-3 pb-2">
            {videos.map((video) => (
              <div
                key={video.videoId}
                className="w-[280px] shrink-0 border border-border/50 bg-card overflow-hidden hover:shadow-md transition-shadow flex flex-col"
                data-testid={`card-video-${video.videoId}`}
              >
                <div className="relative cursor-pointer" onClick={() => window.open(video.url, "_blank")}>
                  <img src={video.thumbnail} alt={video.title} className="w-full h-[146px] object-cover" />
                  <div className="absolute inset-0 bg-black/20 flex items-center justify-center">
                    <div className="w-10 h-10 rounded-full bg-red-600/90 flex items-center justify-center">
                      <Play className="w-5 h-5 text-white fill-white" />
                    </div>
                  </div>
                </div>
                <div className="p-3 flex-1">
                  <h3 className="font-serif font-bold text-xs line-clamp-2 whitespace-normal">{video.title}</h3>
                  {video.date && <p className="text-[10px] text-muted-foreground mt-1">{video.date}</p>}
                </div>
                <div className="px-3 pb-3">
                  <button
                    className="text-xs font-bold text-white bg-[#B4A597] hover:bg-[#a39487] px-4 py-1.5 rounded-[3px] transition-colors"
                    onClick={() => window.open(video.url, "_blank")}
                    data-testid={`button-watch-youtube-${video.videoId}`}
                  >WATCH ON YOUTUBE</button>
                </div>
              </div>
            ))}
          </div>
          <ScrollBar orientation="horizontal" className="hidden" />
        </ScrollArea>
      </div>

      <div className="hidden lg:grid lg:grid-cols-3 gap-4">
        {videos.slice(0, 6).map((video) => (
          <div
            key={video.videoId}
            className="border border-border/50 bg-card overflow-hidden hover:shadow-md transition-shadow flex flex-col"
            data-testid={`card-video-desktop-${video.videoId}`}
          >
            <div className="relative cursor-pointer" onClick={() => window.open(video.url, "_blank")}>
              <img src={video.thumbnail} alt={video.title} className="w-full h-[140px] object-cover" />
              <div className="absolute inset-0 bg-black/20 flex items-center justify-center opacity-0 hover:opacity-100 transition-opacity">
                <div className="w-10 h-10 rounded-full bg-red-600/90 flex items-center justify-center">
                  <Play className="w-5 h-5 text-white fill-white" />
                </div>
              </div>
            </div>
            <div className="p-3 flex-1">
              <h3 className="font-serif font-bold text-sm line-clamp-2">{video.title}</h3>
              {video.date && <p className="text-xs text-muted-foreground mt-1">{video.date}</p>}
            </div>
            <div className="px-3 pb-3">
              <button
                className="text-xs font-bold text-white bg-[#B4A597] hover:bg-[#a39487] px-4 py-1.5 rounded-[3px] transition-colors"
                onClick={() => window.open(video.url, "_blank")}
                data-testid={`button-watch-youtube-desktop-${video.videoId}`}
              >WATCH ON YOUTUBE</button>
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}
