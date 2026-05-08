import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { NewsSource } from '@/lib/types';
import { SourceManager } from '@/components/SourceManager';
import { ScheduleManager } from '@/components/ScheduleManager';
import { ImpressumEditor } from '@/components/ImpressumEditor';
import { AdminUsersManager } from '@/components/admin/AdminUsersManager';
import { EthicalPerspectivesManager } from '@/components/admin/EthicalPerspectivesManager';
import { CmsPageManager } from '@/components/admin/CmsPageManager';
import { AnnouncementsManager } from '@/components/admin/AnnouncementsManager';
import { RegisteredUsersManager } from '@/components/admin/RegisteredUsersManager';
import { CommentsManager } from '@/components/admin/CommentsManager';
import { NavOrderManager } from '@/components/admin/NavOrderManager';
import { SpecialEditionsManager } from '@/components/admin/SpecialEditionsManager';
import { GlossaryManager } from '@/components/admin/GlossaryManager';
import { RegenerateTranslationPanel } from '@/components/admin/RegenerateTranslationPanel';
import { Users, Newspaper, CalendarClock, Scale, FileText, Layout, Megaphone, UserCheck, MessageSquare, Menu, Sparkles, Languages } from 'lucide-react';
import { useLanguage } from '@/lib/i18n/LanguageContext';

interface Props {
  sources: NewsSource[];
  onSourcesChange: (sources: NewsSource[]) => void;
}

export function AdminTabs({ sources, onSourcesChange }: Props) {
  const { t } = useLanguage();

  return (
    <Tabs defaultValue="users" className="space-y-4">
      <TabsList className="flex flex-wrap h-auto gap-1 p-1">
        <TabsTrigger value="users" className="gap-1.5 text-xs sm:text-sm px-2.5 py-1.5">
          <Users className="h-3.5 w-3.5" />
          <span className="hidden sm:inline">{t('adminTabUsers')}</span>
        </TabsTrigger>
        <TabsTrigger value="registered" className="gap-1.5 text-xs sm:text-sm px-2.5 py-1.5">
          <UserCheck className="h-3.5 w-3.5" />
          <span className="hidden sm:inline">{t('adminTabRegistered')}</span>
        </TabsTrigger>
        <TabsTrigger value="navigation" className="gap-1.5 text-xs sm:text-sm px-2.5 py-1.5">
          <Menu className="h-3.5 w-3.5" />
          <span className="hidden sm:inline">{t('adminTabNavigation') || 'Menu'}</span>
        </TabsTrigger>
        <TabsTrigger value="pages" className="gap-1.5 text-xs sm:text-sm px-2.5 py-1.5">
          <Layout className="h-3.5 w-3.5" />
          <span className="hidden sm:inline">{t('adminTabPages')}</span>
        </TabsTrigger>
        <TabsTrigger value="sources" className="gap-1.5 text-xs sm:text-sm px-2.5 py-1.5">
          <Newspaper className="h-3.5 w-3.5" />
          <span className="hidden sm:inline">{t('adminTabSources')}</span>
        </TabsTrigger>
        <TabsTrigger value="schedule" className="gap-1.5 text-xs sm:text-sm px-2.5 py-1.5">
          <CalendarClock className="h-3.5 w-3.5" />
          <span className="hidden sm:inline">{t('adminTabSchedule')}</span>
        </TabsTrigger>
        <TabsTrigger value="special" className="gap-1.5 text-xs sm:text-sm px-2.5 py-1.5">
          <Sparkles className="h-3.5 w-3.5" />
          <span className="hidden sm:inline">{t('adminTabSpecialEditions')}</span>
        </TabsTrigger>
        <TabsTrigger value="ethics" className="gap-1.5 text-xs sm:text-sm px-2.5 py-1.5">
          <Scale className="h-3.5 w-3.5" />
          <span className="hidden sm:inline">{t('adminTabEthics')}</span>
        </TabsTrigger>
        <TabsTrigger value="announcements" className="gap-1.5 text-xs sm:text-sm px-2.5 py-1.5">
          <Megaphone className="h-3.5 w-3.5" />
          <span className="hidden sm:inline">{t('adminTabAnnouncements')}</span>
        </TabsTrigger>
        <TabsTrigger value="comments" className="gap-1.5 text-xs sm:text-sm px-2.5 py-1.5">
          <MessageSquare className="h-3.5 w-3.5" />
          <span className="hidden sm:inline">{t('adminTabComments')}</span>
        </TabsTrigger>
        <TabsTrigger value="glossary" className="gap-1.5 text-xs sm:text-sm px-2.5 py-1.5">
          <Languages className="h-3.5 w-3.5" />
          <span className="hidden sm:inline">Glossary</span>
        </TabsTrigger>
        <TabsTrigger value="impressum" className="gap-1.5 text-xs sm:text-sm px-2.5 py-1.5">
          <FileText className="h-3.5 w-3.5" />
          <span className="hidden sm:inline">{t('adminTabImpressum')}</span>
        </TabsTrigger>
      </TabsList>

      <TabsContent value="users">
        <AdminUsersManager />
      </TabsContent>

      <TabsContent value="registered">
        <RegisteredUsersManager />
      </TabsContent>

      <TabsContent value="navigation">
        <NavOrderManager />
      </TabsContent>

      <TabsContent value="pages">
        <CmsPageManager />
      </TabsContent>

      <TabsContent value="sources">
        <SourceManager sources={sources} onChange={onSourcesChange} allowEdit />
      </TabsContent>

      <TabsContent value="schedule">
        <ScheduleManager sources={sources} />
      </TabsContent>

      <TabsContent value="special">
        <SpecialEditionsManager />
      </TabsContent>

      <TabsContent value="ethics">
        <EthicalPerspectivesManager />
      </TabsContent>

      <TabsContent value="announcements">
        <AnnouncementsManager />
      </TabsContent>

      <TabsContent value="comments">
        <CommentsManager />
      </TabsContent>

      <TabsContent value="glossary">
        <GlossaryManager />
      </TabsContent>

      <TabsContent value="impressum">
        <ImpressumEditor />
      </TabsContent>
    </Tabs>
  );
}