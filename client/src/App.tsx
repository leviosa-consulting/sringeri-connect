import { Switch, Route } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import NotFound from "@/pages/not-found";
import Layout from "@/components/layout";
import Login from "@/pages/login";
import Home from "@/pages/home";
import EventsNews from "@/pages/events-news";
import DevoteeCorner from "@/pages/devotee-corner";
import Profile from "@/pages/profile";

function Router() {
  return (
    <Layout>
      <Switch>
        <Route path="/" component={Login} />
        <Route path="/home" component={Home} />
        <Route path="/events" component={EventsNews} />
        <Route path="/devotee" component={DevoteeCorner} />
        <Route path="/profile" component={Profile} />
        <Route component={NotFound} />
      </Switch>
    </Layout>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <Toaster />
      <Router />
    </QueryClientProvider>
  );
}

export default App;
