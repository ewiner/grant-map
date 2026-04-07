import { Switch, Route, Router } from "wouter";
import { useHashLocation } from "wouter/use-hash-location";
import { QueryClientProvider } from "@tanstack/react-query";
import { Analytics } from "@vercel/analytics/react";
import { queryClient } from "./lib/queryClient";
import { Toaster } from "@/components/ui/toaster";
import MapPage from "./pages/MapPage";
import NotFound from "./pages/not-found";

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <Router hook={useHashLocation}>
        <Switch>
          <Route path="/" component={MapPage} />
          <Route component={NotFound} />
        </Switch>
      </Router>
      <Toaster />
      <Analytics />
    </QueryClientProvider>
  );
}

export default App;
