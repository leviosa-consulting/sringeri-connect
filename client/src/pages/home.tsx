import ServiceCard from "@/components/service-card";
import { SERVICES, NEWS_EVENTS } from "@/lib/constants";
import { ScrollArea, ScrollBar } from "@/components/ui/scroll-area";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Bell, Search } from "lucide-react";
import { Input } from "@/components/ui/input";

export default function Home() {
  return (
    <div className="flex flex-col gap-6 pb-24">
      {/* Header */}
      <header className="px-6 pt-12 pb-6 bg-gradient-to-br from-primary/10 via-primary/5 to-transparent rounded-b-[2rem]">
        <div className="flex justify-between items-center mb-6">
          <div className="space-y-1">
            <h2 className="text-sm font-medium text-muted-foreground">Namaste,</h2>
            <h1 className="text-2xl font-serif font-bold text-foreground">Aditya Sharma</h1>
          </div>
          <div className="flex gap-3">
            <button className="p-2 rounded-full bg-white/80 border border-primary/10 shadow-sm hover:bg-white transition-colors">
              <Bell className="h-5 w-5 text-primary" />
            </button>
            <Avatar className="h-10 w-10 border-2 border-white shadow-sm">
              <AvatarImage src="https://github.com/shadcn.png" />
              <AvatarFallback>AS</AvatarFallback>
            </Avatar>
          </div>
        </div>
        
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input 
            placeholder="Search for sevas, books, etc..." 
            className="pl-9 bg-white/80 border-primary/10 shadow-sm focus:bg-white transition-all rounded-xl" 
          />
        </div>
      </header>

      {/* Quick Services Grid */}
      <section className="px-6 space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="font-serif font-bold text-lg">Services</h2>
          <span className="text-xs font-medium text-primary cursor-pointer hover:underline">View All</span>
        </div>
        <div className="grid grid-cols-1 gap-4">
          {SERVICES.map((service) => (
            <ServiceCard 
              key={service.id}
              {...service}
              onClick={() => console.log(`Clicked ${service.id}`)}
            />
          ))}
        </div>
      </section>

      {/* Featured Events/News */}
      <section className="space-y-4">
        <div className="px-6 flex items-center justify-between">
          <h2 className="font-serif font-bold text-lg">Happenings</h2>
        </div>
        <ScrollArea className="w-full whitespace-nowrap px-6">
          <div className="flex w-max space-x-4 pb-4">
            {NEWS_EVENTS.map((item) => (
              <div key={item.id} className="w-[280px] shrink-0 rounded-xl overflow-hidden border border-border/50 shadow-sm group">
                <div className="h-32 overflow-hidden relative">
                  <img 
                    src={item.image} 
                    alt={item.title} 
                    className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105" 
                  />
                  <div className="absolute top-2 left-2 bg-black/60 backdrop-blur-md px-2 py-1 rounded-md text-[10px] text-white font-medium uppercase tracking-wider">
                    {item.type}
                  </div>
                </div>
                <div className="p-4 bg-card space-y-2">
                  <div className="text-xs text-primary font-medium">{item.date}</div>
                  <h3 className="font-serif font-bold text-base truncate pr-2">{item.title}</h3>
                  <p className="text-xs text-muted-foreground line-clamp-2 whitespace-normal leading-relaxed">
                    {item.description}
                  </p>
                </div>
              </div>
            ))}
          </div>
          <ScrollBar orientation="horizontal" className="hidden" />
        </ScrollArea>
      </section>
    </div>
  );
}
