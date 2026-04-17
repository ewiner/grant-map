import { Switch, Route, Redirect } from "wouter";
import { QueryClientProvider } from "@tanstack/react-query";
import { Analytics } from "@vercel/analytics/react";
import { queryClient } from "./lib/queryClient";
import { Toaster } from "@/components/ui/toaster";
import MapPage from "./pages/MapPage";
import NotFound from "./pages/not-found";

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <Switch>
        <Route path="/chapter/:num">{(params) => <MapPage chapterNum={Number(params.num)} />}</Route>
        <Route path="/"><Redirect to="/chapter/1" /></Route>
        <Route component={NotFound} />
      </Switch>
      <Toaster />
      <Analytics />
    </QueryClientProvider>
  );
}

export default App;
