import { Home, Settings, Shield, Cookie, Building2 } from 'lucide-react';
import { NavLink } from '@/components/NavLink';
import { useLanguage } from '@/lib/i18n/LanguageContext';
import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  useSidebar,
} from '@/components/ui/sidebar';
import type { TranslationKey } from '@/lib/i18n/translations';

const items: { titleKey: TranslationKey; url: string; icon: typeof Home }[] = [
  { titleKey: 'navLatestNews', url: '/', icon: Home },
  { titleKey: 'navAdmin', url: '/admin', icon: Settings },
  { titleKey: 'navPrivacyPolicy', url: '/privacy-policy', icon: Shield },
  { titleKey: 'navCookiePolicy', url: '/cookie-policy', icon: Cookie },
  { titleKey: 'navImpressum', url: '/impressum', icon: Building2 },
];

export function AppSidebar() {
  const { state, isMobile, setOpenMobile } = useSidebar();
  const collapsed = state === 'collapsed';
  const { t } = useLanguage();

  const handleClick = () => {
    if (isMobile) {
      setOpenMobile(false);
    }
  };

  return (
    <Sidebar collapsible="icon">
      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupContent>
            <SidebarMenu>
              {items.map((item) => (
                <SidebarMenuItem key={item.titleKey}>
                  <SidebarMenuButton asChild>
                    <NavLink
                      to={item.url}
                      end={item.url === '/'}
                      className="hover:bg-muted/50"
                      activeClassName="bg-muted text-primary font-medium"
                      onClick={handleClick}
                    >
                      <item.icon className="mr-2 h-4 w-4" />
                      {!collapsed && <span>{t(item.titleKey)}</span>}
                    </NavLink>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>
    </Sidebar>
  );
}
