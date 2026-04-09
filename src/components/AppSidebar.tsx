import { useEffect, useState } from 'react';
import { Home, Settings, Shield, Cookie, Building2, Info, Globe, FileText, Heart } from 'lucide-react';
import { NavLink } from '@/components/NavLink';
import { useLanguage } from '@/lib/i18n/LanguageContext';
import { supabase } from '@/integrations/supabase/client';
import { RenderIcon } from '@/components/IconPicker';
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

interface CmsNavPage {
  slug: string;
  title_en: string;
  title_de: string;
  icon: string;
  nav_order: number;
}

const staticItems: { titleKey: TranslationKey; url: string; icon: typeof Home }[] = [
  { titleKey: 'navLatestNews', url: '/', icon: Home },
  { titleKey: 'navAbout', url: '/about', icon: Info },
  { titleKey: 'navMondcivitanHistory', url: '/mondcivitan-history', icon: Globe },
  { titleKey: 'navSupportUs', url: '/support', icon: Heart },
];

const bottomItems: { titleKey: TranslationKey; url: string; icon: typeof Home }[] = [
  { titleKey: 'navAdmin', url: '/admin', icon: Settings },
  { titleKey: 'navPrivacyPolicy', url: '/privacy-policy', icon: Shield },
  { titleKey: 'navCookiePolicy', url: '/cookie-policy', icon: Cookie },
  { titleKey: 'navImpressum', url: '/impressum', icon: Building2 },
];

export function AppSidebar() {
  const { state, isMobile, setOpenMobile } = useSidebar();
  const collapsed = state === 'collapsed';
  const { t, language } = useLanguage();
  const [cmsPages, setCmsPages] = useState<CmsNavPage[]>([]);

  useEffect(() => {
    supabase
      .from('cms_pages')
      .select('slug, title_en, title_de, icon, nav_order')
      .eq('published', true)
      .eq('show_in_nav', true)
      .order('nav_order', { ascending: true })
      .then(({ data }) => {
        if (data) setCmsPages(data as unknown as CmsNavPage[]);
      });
  }, []);

  const handleClick = () => {
    if (isMobile) setOpenMobile(false);
  };

  const renderItem = (url: string, label: string, Icon: typeof Home, end?: boolean) => (
    <SidebarMenuItem key={url}>
      <SidebarMenuButton asChild>
        <NavLink
          to={url}
          end={end}
          className="hover:bg-muted/50"
          activeClassName="bg-muted text-primary font-medium"
          onClick={handleClick}
        >
          <Icon className="mr-2 h-4 w-4" />
          {!collapsed && <span>{label}</span>}
        </NavLink>
      </SidebarMenuButton>
    </SidebarMenuItem>
  );

  const renderEmojiItem = (url: string, label: string, iconValue: string) => (
    <SidebarMenuItem key={url}>
      <SidebarMenuButton asChild>
        <NavLink
          to={url}
          className="hover:bg-muted/50"
          activeClassName="bg-muted text-primary font-medium"
          onClick={handleClick}
        >
          <span className="mr-2"><RenderIcon value={iconValue} className="h-4 w-4" /></span>
          {!collapsed && <span>{label}</span>}
        </NavLink>
      </SidebarMenuButton>
    </SidebarMenuItem>
  );

  return (
    <Sidebar collapsible="icon">
      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupContent>
            <SidebarMenu>
              {staticItems.map((item) =>
                renderItem(item.url, t(item.titleKey), item.icon, item.url === '/')
              )}
              {cmsPages.map((page) => {
                const label = language === 'de' ? (page.title_de || page.title_en) : page.title_en;
                return renderEmojiItem(`/page/${page.slug}`, label, page.icon || '📄');
              })}
              {bottomItems.map((item) =>
                renderItem(item.url, t(item.titleKey), item.icon)
              )}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>
    </Sidebar>
  );
}
