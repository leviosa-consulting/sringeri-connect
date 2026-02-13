import { Switch, Route, Redirect } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import NotFound from "@/pages/not-found";
import Layout from "@/components/layout";
import Login from "@/pages/login";
import Home from "@/pages/home";
import Updates from "@/pages/updates";
import DevoteeCorner from "@/pages/devotee-corner";
import Profile from "@/pages/profile";
import Accommodation from "@/pages/accommodation";
import Donation from "@/pages/donation";
import { AuthProvider, useAuth } from "@/contexts/auth-context";
import { FontSizeProvider } from "@/contexts/font-size-context";
import { InAppBrowserProvider } from "@/contexts/in-app-browser-context";
import { Loader2 } from "lucide-react";

function ProtectedRoute({ component: Component }: { component: React.ComponentType }) {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!user) {
    return <Redirect to="/" />;
  }

  return <Component />;
}

function Router() {
  return (
    <Layout>
      <Switch>
        <Route path="/" component={Login} />
        <Route path="/home">{() => <ProtectedRoute component={Home} />}</Route>
        <Route path="/updates">{() => <ProtectedRoute component={Updates} />}</Route>
        <Route path="/devotee">{() => <ProtectedRoute component={DevoteeCorner} />}</Route>
        <Route path="/profile">{() => <ProtectedRoute component={Profile} />}</Route>
        <Route path="/accommodation">{() => <ProtectedRoute component={Accommodation} />}</Route>
        <Route path="/donation">{() => <ProtectedRoute component={Donation} />}</Route>
        <Route component={NotFound} />
      </Switch>
    </Layout>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <FontSizeProvider>
        <InAppBrowserProvider>
          <AuthProvider>
            <Toaster />
            <Router />
          </AuthProvider>
        </InAppBrowserProvider>
      </FontSizeProvider>
    </QueryClientProvider>
  );
}

export default App;
