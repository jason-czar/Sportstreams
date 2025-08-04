import { Switch, Route } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import NotFound from "@/pages/not-found";
import CreateEvent from "@/pages/create-event";
import JoinCamera from "@/pages/join-camera";
import DirectorDashboard from "@/pages/director-dashboard";
import Viewer from "@/pages/viewer";
import { useEffect } from "react";

function Router() {
  return (
    <Switch>
      <Route path="/" component={CreateEvent} />
      <Route path="/create" component={CreateEvent} />
      <Route path="/join" component={JoinCamera} />
      <Route path="/director/:eventId">
        {(params) => <DirectorDashboard eventId={params.eventId} />}
      </Route>
      <Route path="/viewer/:eventId">
        {(params) => <Viewer eventId={params.eventId} />}
      </Route>
      <Route component={NotFound} />
    </Switch>
  );
}

function App() {
  useEffect(() => {
    // Set page title
    document.title = "SportStream - Live Multi-Camera Broadcasting";
  }, []);

  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <div className="min-h-screen bg-gray-900 text-white">
          <Toaster />
          <Router />
        </div>
      </TooltipProvider>
    </QueryClientProvider>
  );
}

export default App;
