import { NEWS_EVENTS } from "@/lib/constants";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Calendar as CalendarIcon, Clock } from "lucide-react";

export default function EventsNews() {
  return (
    <div className="px-4 py-8 pb-24 space-y-6">
      <h1 className="text-2xl font-serif font-bold px-2">Events & News</h1>
      
      <div className="space-y-4">
        {NEWS_EVENTS.map((item) => (
          <Card key={item.id} className="overflow-hidden border-border/50 shadow-sm">
            <div className="h-48 overflow-hidden relative">
              <img src={item.image} alt={item.title} className="w-full h-full object-cover" />
            </div>
            <CardHeader className="pb-2">
              <div className="flex justify-between items-start">
                <Badge variant="secondary" className="bg-primary/10 text-primary hover:bg-primary/20 border-none">
                  {item.type}
                </Badge>
                <div className="flex items-center text-xs text-muted-foreground">
                  <CalendarIcon className="mr-1 h-3 w-3" />
                  {item.date}
                </div>
              </div>
              <CardTitle className="font-serif text-lg leading-tight mt-2">{item.title}</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground leading-relaxed">
                {item.description}
              </p>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
