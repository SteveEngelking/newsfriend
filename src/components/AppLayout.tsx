import { SidebarProvider, SidebarTrigger } from '@/components/ui/sidebar';
import { AppSidebar } from '@/components/AppSidebar';
import { ThemeToggle } from '@/components/ThemeToggle';
import { Shield } from 'lucide-react';
import { Outlet } from 'react-router-dom';

export function AppLayout() {
  return (
    <SidebarProvider>
      <div className="min-h-screen flex w-full">
        <AppSidebar />
        <div className="flex-1 flex flex-col min-w-0">
          <header className="sticky top-0 z-50 border-b border-border/60 bg-background/80 backdrop-blur-lg">
            <div className="flex items-center justify-between h-14 px-4">
              <div className="flex items-center gap-2.5">
                <SidebarTrigger className="mr-2" />
                <Shield className="h-5 w-5 text-primary" />
                <h1 className="text-lg font-bold tracking-tight">NewsFriend</h1>
              </div>
              <ThemeToggle />
            </div>
          </header>
          <main className="flex-1 container max-w-4xl mx-auto px-4 py-8">
            <Outlet />
          </main>
        </div>
      </div>
    </SidebarProvider>
  );
}
