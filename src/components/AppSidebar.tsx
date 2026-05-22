import { useEffect, useState } from 'react';
import { Home, Settings, Building2, Heart, UserPlus, LogIn, User, MessageSquare } from 'lucide-react';
import { QRCodeSVG } from 'qrcode.react';
import { NavLink } from '@/components/NavLink';
import { useLanguage } from '@/lib/i18n/LanguageContext';
import { supabase } from '@/integrations/supabase/client';
import { RenderIcon } from '@/components/IconPicker';
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
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
}

interface NavOrderItem {
  item_key: string;
  sort_order: number;
  visible: boolean;
}

const STATIC_CONFIG: Record<string, { titleKey: TranslationKey; url: string; icon: typeof Home; end?: boolean }> = {
  home: { titleKey: 'navLatestNews', url: '/', icon: Home, end: true },
  support: { titleKey: 'navSupportUs', url: '/support', icon: Heart },
  comments: { titleKey: 'navComments', url: '/comments', icon: MessageSquare },
  admin: { titleKey: 'navAdmin', url: '/admin', icon: Settings },
  impressum: { titleKey: 'navImpressum', url: '/impressum', icon: Building2 },
};

export function AppSidebar() {
  const { state, isMobile, setOpenMobile } = useSidebar();
  const collapsed = state === 'collapsed';
  const { t, language } = useLanguage();
  const [cmsPages, setCmsPages] = useState<Record<string, CmsNavPage>>({});
  const [navOrder, setNavOrder] = useState<NavOrderItem[]>([]);
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [displayName, setDisplayName] = useState<string | null>(null);
  const [shareUrl, setShareUrl] = useState(() => (typeof window !== 'undefined' ? window.location.href : ''));

  useEffect(() => {
    const handle = () => setShareUrl(window.location.href);
    window.addEventListener('popstate', handle);
    const interval = setInterval(() => {
      setShareUrl(prev => {
        const curr = window.location.href;
        return prev !== curr ? curr : prev;
      });
    }, 1000);
    return () => {
      window.removeEventListener('popstate', handle);
      clearInterval(interval);
    };
  }, []);

  useEffect(() => {
    Promise.all([
      supabase.from('nav_menu_order').select('item_key, sort_order, visible').order('sort_order'),
      supabase.from('cms_pages').select('slug, title_en, title_de, icon').eq('published', true).eq('show_in_nav', true),
    ]).then(([navRes, cmsRes]) => {
      if (navRes.data) setNavOrder(navRes.data as unknown as NavOrderItem[]);
      const map: Record<string, CmsNavPage> = {};
      (cmsRes.data ?? []).forEach((p: any) => { map[`cms:${p.slug}`] = p; });
      setCmsPages(map);
    });
  }, []);

  useEffect(() => {
    const fetchProfile = async (userId: string) => {
      const { data } = await supabase.from('profiles').select('display_name').eq('user_id', userId).maybeSingle();
      setDisplayName(data?.display_name || null);
    };
    supabase.auth.getSession().then(({ data: { session } }) => {
      setIsLoggedIn(!!session);
      if (session?.user?.id) fetchProfile(session.user.id);
    });
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setIsLoggedIn(!!session);
      if (session?.user?.id) fetchProfile(session.user.id);
      else setDisplayName(null);
    });
    return () => subscription.unsubscribe();
  }, []);

  const handleClick = () => {
    if (isMobile) setOpenMobile(false);
  };

  const renderItem = (url: string, label: string, Icon: typeof Home, end?: boolean) => (
    <SidebarMenuItem key={url}>
      <SidebarMenuButton asChild>
        <NavLink to={url} end={end} className="hover:bg-muted/50" activeClassName="bg-muted text-primary font-medium" onClick={handleClick}>
          <Icon className="mr-2 h-4 w-4" />
          {!collapsed && <span>{label}</span>}
        </NavLink>
      </SidebarMenuButton>
    </SidebarMenuItem>
  );

  const renderEmojiItem = (url: string, label: string, iconValue: string) => (
    <SidebarMenuItem key={url}>
      <SidebarMenuButton asChild>
        <NavLink to={url} className="hover:bg-muted/50" activeClassName="bg-muted text-primary font-medium" onClick={handleClick}>
          <span className="mr-2"><RenderIcon value={iconValue} className="h-4 w-4" /></span>
          {!collapsed && <span>{label}</span>}
        </NavLink>
      </SidebarMenuButton>
    </SidebarMenuItem>
  );

  const renderNavItem = (item: NavOrderItem) => {
    if (!item.visible) return null;

    // Account item - special handling for login state
    if (item.item_key === 'account') {
      if (isLoggedIn) {
        return renderItem('/account', displayName || t('navAccount'), User);
      } else {
        return (
          <>
            {renderItem('/register', t('navRegister'), UserPlus)}
            {renderItem('/login', t('navLogin'), LogIn)}
          </>
        );
      }
    }

    // Static items
    const config = STATIC_CONFIG[item.item_key];
    if (config) {
      return renderItem(config.url, t(config.titleKey), config.icon, config.end);
    }

    // CMS pages
    const page = cmsPages[item.item_key];
    if (page) {
      const label = language === 'de' ? (page.title_de || page.title_en) : page.title_en;
      return renderEmojiItem(`/page/${page.slug}`, label, page.icon || '📄');
    }

    return null;
  };

  // Fallback if nav_menu_order is empty (first load before seeding)
  const hasOrder = navOrder.length > 0;

  return (
    <Sidebar collapsible="icon">
      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupContent>
            <SidebarMenu>
              {hasOrder
                ? navOrder.map((item) => <span key={item.item_key}>{renderNavItem(item)}</span>)
                : (
                  <>
                    {renderItem('/', t('navLatestNews'), Home, true)}
                    {renderItem('/support', t('navSupportUs'), Heart)}
                    {renderItem('/comments', t('navComments'), MessageSquare)}
                    {isLoggedIn
                      ? renderItem('/account', displayName || t('navAccount'), User)
                      : <>{renderItem('/register', t('navRegister'), UserPlus)}{renderItem('/login', t('navLogin'), LogIn)}</>
                    }
                    {renderItem('/admin', t('navAdmin'), Settings)}
                    {renderItem('/impressum', t('navImpressum'), Building2)}
                  </>
                )
              }
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>
    </Sidebar>
  );
}
