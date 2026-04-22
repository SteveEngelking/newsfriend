import { SidebarProvider, SidebarTrigger } from '@/components/ui/sidebar';
import { AppSidebar } from '@/components/AppSidebar';
import { ThemeToggle } from '@/components/ThemeToggle';
import { LanguageSwitcher } from '@/components/LanguageSwitcher';
import logo from '@/assets/logo.jpg';
import { Outlet } from 'react-router-dom';
import { useIsMobile } from '@/hooks/use-mobile';

export function AppLayout() {
  const isMobile = useIsMobile();

  return (
    <SidebarProvider defaultOpen={!isMobile}>
      <div className="min-h-screen flex w-full">
        <AppSidebar />
        <div className="flex-1 flex flex-col min-w-0">
          <header className="sticky top-0 z-50 border-b border-border/60 bg-background/80 backdrop-blur-lg">
            <div className="flex items-center justify-between h-14 px-4">
              <div className="flex items-center gap-2.5">
                <SidebarTrigger className="mr-2" />
                <img src={logo} alt="NewsFriend logo" width={24} height={24} className="h-6 w-6 rounded" />
                <a href="/" className="text-lg font-bold tracking-tight" aria-label="NewsFriend home">NewsFriend</a>
              </div>
              <nav aria-label="Site controls" className="flex items-center gap-1">
                <LanguageSwitcher />
                <ThemeToggle />
              </nav>
            </div>
          </header>
          <main className="flex-1 container max-w-4xl mx-auto px-2 sm:px-4 py-6 sm:py-8">
            <Outlet />
          </main>
        </div>
      </div>
    </SidebarProvider>
  );
}
