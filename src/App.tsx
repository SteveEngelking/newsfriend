import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { AppLayout } from "@/components/AppLayout";
import { LanguageProvider } from "@/lib/i18n/LanguageContext";
import Home from "./pages/Home";
import Admin from "./pages/Admin";
import Impressum from "./pages/Impressum";
import CmsPage from "./pages/CmsPage";
import SupportUs from "./pages/SupportUs";
import DonationThankYou from "./pages/DonationThankYou";
import Register from "./pages/Register";
import Login from "./pages/Login";
import Account from "./pages/Account";
import Unsubscribe from "./pages/Unsubscribe";
import Comments from "./pages/Comments";
import NotFound from "./pages/NotFound";
import { CookieConsent } from "@/components/CookieConsent";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <LanguageProvider>
      <TooltipProvider>
        <Toaster />
        <Sonner />
        <BrowserRouter>
          <CookieConsent />
          <Routes>
            <Route element={<AppLayout />}>
              <Route path="/" element={<Home />} />
              <Route path="/admin" element={<Admin />} />
              <Route path="/impressum" element={<Impressum />} />
              <Route path="/support" element={<SupportUs />} />
              <Route path="/donation-thank-you" element={<DonationThankYou />} />
              <Route path="/register" element={<Register />} />
              <Route path="/login" element={<Login />} />
              <Route path="/account" element={<Account />} />
              <Route path="/unsubscribe" element={<Unsubscribe />} />
              <Route path="/comments" element={<Comments />} />
              <Route path="/page/:slug" element={<CmsPage />} />
            </Route>
            <Route path="*" element={<NotFound />} />
          </Routes>
        </BrowserRouter>
      </TooltipProvider>
    </LanguageProvider>
  </QueryClientProvider>
);

export default App;
