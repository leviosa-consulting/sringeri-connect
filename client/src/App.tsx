import { Switch, Route, Redirect } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider, useQuery } from "@tanstack/react-query";
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
import Seva from "@/pages/seva";
import Fastline from "@/pages/fastline";
import { AuthProvider, useAuth } from "@/contexts/auth-context";
import { FontSizeProvider } from "@/contexts/font-size-context";
import { AnalyticsProvider } from "@/contexts/analytics-context";
import { SubdomainModeProvider } from "@/contexts/subdomain-mode-context";
import Analytics from "@/pages/analytics";
import Knowledge from "@/pages/knowledge";
import AdminQuizzes from "@/pages/admin-quizzes";
import AdminHub from "@/pages/admin";
import AdminQuizAnalytics from "@/pages/admin-quiz-analytics";
import AdminReconciliation from "@/pages/admin-reconciliation";
import AdminLaunch from "@/pages/admin-launch";
import AdminLaunchReset from "@/pages/admin-launch-reset";
import PaymentResult from "@/pages/payment-result";
import ComingSoon from "@/pages/coming-soon";
import Terms from "@/pages/terms";
import Privacy from "@/pages/privacy";
import { PageLoader } from "@/components/rangoli-loader";

function ProtectedRoute({ component: Component }: { component: React.ComponentType }) {
  const { user, loading } = useAuth();

  if (loading) {
    return <PageLoader />;
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
        <Route path="/seva">{() => <ProtectedRoute component={Seva} />}</Route>
        <Route path="/knowledge">{() => <ProtectedRoute component={Knowledge} />}</Route>
        <Route path="/knowledge/:id">{() => <ProtectedRoute component={Knowledge} />}</Route>
        <Route path="/fastline" component={Fastline} />
        <Route path="/payment-result" component={PaymentResult} />
        <Route path="/analytics" component={Analytics} />
        <Route path="/admin" component={AdminHub} />
        <Route path="/admin/quizzes">{() => <ProtectedRoute component={AdminQuizzes} />}</Route>
        <Route path="/admin/quiz-analytics" component={AdminQuizAnalytics} />
        <Route path="/admin/reconciliation" component={AdminReconciliation} />
        <Route path="/admin/launch" component={AdminLaunch} />
        <Route path="/admin/launch/reset" component={AdminLaunchReset} />
        <Route path="/terms" component={Terms} />
        <Route path="/privacy" component={Privacy} />
        <Route component={NotFound} />
      </Switch>
    </Layout>
  );
}

function LaunchGate() {
  const { data, isLoading } = useQuery({
    queryKey: ["/api/launch-status"],
    queryFn: async () => {
      const res = await fetch("/api/launch-status");
      return res.json() as Promise<{ isLaunched: boolean }>;
    },
    staleTime: 30000,
    refetchInterval: 60000,
  });

  if (isLoading) {
    return <PageLoader bg="bg-[#F7F2EC]" />;
  }

  if (data?.isLaunched) {
    return <Router />;
  }

  return (
    <Switch>
      <Route path="/admin/launch" component={AdminLaunch} />
      <Route path="/admin/launch/reset" component={AdminLaunchReset} />
      <Route path="/fastline" component={Fastline} />
      <Route path="/payment-result" component={PaymentResult} />
      <Route component={ComingSoon} />
    </Switch>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <FontSizeProvider>
        <SubdomainModeProvider>
          <AuthProvider>
            <AnalyticsProvider>
              <Toaster />
              <LaunchGate />
            </AnalyticsProvider>
          </AuthProvider>
        </SubdomainModeProvider>
      </FontSizeProvider>
    </QueryClientProvider>
  );
}

export default App;
