// client/src/App.tsx
import { RouterProvider } from "react-router-dom";
import { router } from "./AppRouter";
import { QueryClientProvider } from "@tanstack/react-query";
import { queryClient } from "./lib/queryClient";
// The Toaster component and its import are removed as Radix UI toast components were temporarily removed.

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <RouterProvider router={router} />
    </QueryClientProvider>
  );
}

export default App;