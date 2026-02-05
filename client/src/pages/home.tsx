import ServiceCard from "@/components/service-card";
import { ONLINE_SERVICES, RESOURCES, NEWS_EVENTS } from "@/lib/constants";
import { ScrollArea, ScrollBar } from "@/components/ui/scroll-area";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Bell, Search } from "lucide-react";
import { Input } from "@/components/ui/input";
import { useMedia } from "react-use";

export default function Home() {
  const isDesktop = useMedia('(min-width: 768px)', false);

  return (
    <div className="flex flex-col gap-8 pb-24 md:pb-8">
      {/* Header Section */}
      <div className="md:hidden px-6 pt-4 space-y-4">
          <div className="flex justify-between items-center">
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
      </div>

      {/* Desktop Welcome Banner */}
      <div className="hidden md:flex relative h-[300px] w-full rounded-2xl overflow-hidden bg-primary/5 border border-primary/10 items-center px-12 justify-between">
         <div className="space-y-4 z-10 max-w-lg">
           <h1 className="text-5xl font-serif font-bold text-primary">Sri Sringeri Sharada Peetham</h1>
           <p className="text-xl text-muted-foreground">Official Digital Services Portal for Devotees</p>
           <div className="relative max-w-md mt-6">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input 
              placeholder="Search services..." 
              className="pl-9 bg-white shadow-sm border-primary/20 h-12 text-base" 
            />
          </div>
         </div>
         <div className="absolute right-0 top-0 h-full w-2/3 bg-[url('/assets/temple-hero.jpg')] bg-cover bg-center mask-linear-fade opacity-80" style={{maskImage: 'linear-gradient(to right, transparent, black)'}} />
      </div>

      <div className="grid md:grid-cols-12 gap-8 md:px-0">
        
        {/* Main Content Column */}
        <div className="md:col-span-8 space-y-8">
          
          {/* Online Services */}
          <section className="space-y-4 px-6 md:px-0">
            <div className="flex items-center justify-between">
              <h2 className="font-serif font-bold text-xl flex items-center gap-2">
                <span className="w-1 h-6 bg-primary rounded-full block"></span>
                Online Services
              </h2>
            </div>
            {/* Mobile: 4-column Grid Icons, Desktop: Cards */}
            <div className={`grid ${!isDesktop ? 'grid-cols-4 gap-x-2 gap-y-6' : 'grid-cols-1 md:grid-cols-2 gap-4'}`}>
              {ONLINE_SERVICES.map((service) => (
                <ServiceCard 
                  key={service.id}
                  {...service}
                  compact={!isDesktop} // Use minimal icons on mobile
                  onClick={() => console.log(`Clicked ${service.id}`)}
                />
              ))}
            </div>
          </section>

          {/* Resources Section */}
          <section className="space-y-4 px-6 md:px-0">
            <div className="flex items-center justify-between">
              <h2 className="font-serif font-bold text-xl flex items-center gap-2">
                <span className="w-1 h-6 bg-secondary rounded-full block"></span>
                Resources
              </h2>
            </div>
            {/* Mobile: 4-column Grid Icons, Desktop: Cards */}
            <div className={`grid ${!isDesktop ? 'grid-cols-4 gap-x-2 gap-y-6' : 'grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4'}`}>
              {RESOURCES.map((resource) => (
                <ServiceCard 
                  key={resource.id}
                  {...resource}
                  compact={!isDesktop} // Use minimal icons on mobile
                />
              ))}
            </div>
          </section>

        </div>

        {/* Sidebar / Secondary Content */}
        <div className="md:col-span-4 space-y-8">
           
           {/* Happenings / Events */}
           <section className="space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="font-serif font-bold text-xl">Happenings</h2>
              <span className="text-sm text-primary hover:underline cursor-pointer">View All</span>
            </div>
            
            {/* Mobile Horizontal Scroll */}
            <div className="md:hidden">
              <ScrollArea className="w-full whitespace-nowrap">
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
            </div>

            {/* Desktop Vertical List */}
            <div className="hidden md:flex flex-col gap-4">
               {NEWS_EVENTS.map((item) => (
                 <div key={item.id} className="flex gap-4 p-3 rounded-xl border border-border/50 bg-card hover:shadow-md transition-shadow group cursor-pointer">
                    <div className="h-20 w-20 rounded-lg overflow-hidden shrink-0">
                      <img src={item.image} alt={item.title} className="w-full h-full object-cover group-hover:scale-105 transition-transform" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex justify-between items-start">
                         <span className="text-[10px] font-bold uppercase tracking-wider text-primary bg-primary/5 px-2 py-0.5 rounded">{item.type}</span>
                         <span className="text-xs text-muted-foreground">{item.date}</span>
                      </div>
                      <h3 className="font-serif font-bold text-sm mt-1 line-clamp-2">{item.title}</h3>
                    </div>
                 </div>
               ))}
            </div>

          </section>
        </div>

      </div>
    </div>
  );
}
