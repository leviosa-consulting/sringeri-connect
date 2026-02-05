import { USER_MOCK } from "@/lib/constants";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { LogOut, Settings, History, User as UserIcon } from "lucide-react";
import { useLocation } from "wouter";

export default function Profile() {
  const [_, setLocation] = useLocation();

  const handleLogout = () => {
    setLocation("/");
  };

  return (
    <div className="pb-24">
      {/* Profile Header */}
      <div className="bg-primary pt-12 pb-20 px-6 text-primary-foreground relative overflow-hidden">
        <div className="absolute inset-0 bg-black/10" />
        <div className="relative z-10 flex items-center gap-4">
          <Avatar className="h-20 w-20 border-4 border-white/20 shadow-xl">
            <AvatarImage src="https://github.com/shadcn.png" />
            <AvatarFallback>AS</AvatarFallback>
          </Avatar>
          <div>
            <h1 className="text-2xl font-serif font-bold">{USER_MOCK.name}</h1>
            <p className="opacity-90 text-sm">{USER_MOCK.email}</p>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="px-4 -mt-10 relative z-20 space-y-4">
        <Card className="shadow-lg border-none">
          <CardHeader>
            <CardTitle className="text-base font-serif">Personal Details</CardTitle>
          </CardHeader>
          <CardContent className="grid gap-4 text-sm">
            <div className="grid grid-cols-3 border-b pb-2">
              <span className="text-muted-foreground">Phone</span>
              <span className="col-span-2 font-medium text-right">{USER_MOCK.phone}</span>
            </div>
            <div className="grid grid-cols-3 border-b pb-2">
              <span className="text-muted-foreground">Nakshatra</span>
              <span className="col-span-2 font-medium text-right">{USER_MOCK.nakshatra}</span>
            </div>
            <div className="grid grid-cols-3 border-b pb-2">
              <span className="text-muted-foreground">Gothra</span>
              <span className="col-span-2 font-medium text-right">{USER_MOCK.gothra}</span>
            </div>
          </CardContent>
        </Card>

        <Card className="shadow-sm">
           <CardContent className="p-2">
             <Button variant="ghost" className="w-full justify-start h-12 text-muted-foreground hover:text-foreground">
               <History className="mr-2 h-4 w-4" />
               Seva History
             </Button>
             <Button variant="ghost" className="w-full justify-start h-12 text-muted-foreground hover:text-foreground">
               <Settings className="mr-2 h-4 w-4" />
               Settings
             </Button>
             <Button 
                variant="ghost" 
                className="w-full justify-start h-12 text-destructive hover:text-destructive hover:bg-destructive/5"
                onClick={handleLogout}
             >
               <LogOut className="mr-2 h-4 w-4" />
               Sign Out
             </Button>
           </CardContent>
        </Card>
      </div>
    </div>
  );
}
