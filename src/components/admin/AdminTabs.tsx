import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { NewsSource } from '@/lib/types';
import { SourceManager } from '@/components/SourceManager';
import { ScheduleManager } from '@/components/ScheduleManager';
import { ImpressumEditor } from '@/components/ImpressumEditor';
import { AdminUsersManager } from '@/components/admin/AdminUsersManager';
import { EthicalPerspectivesManager } from '@/components/admin/EthicalPerspectivesManager';
import { CmsPageManager } from '@/components/admin/CmsPageManager';
import { Users, Newspaper, CalendarClock, Scale, FileText, Layout } from 'lucide-react';
import { useLanguage } from '@/lib/i18n/LanguageContext';

interface Props {
  sources: NewsSource[];
  onSourcesChange: (sources: NewsSource[]) => void;
}

export function AdminTabs({ sources, onSourcesChange }: Props) {
  const { t } = useLanguage();

  return (
    <Tabs defaultValue="users" className="space-y-4">
      <TabsList className="grid w-full grid-cols-6">
        <TabsTrigger value="users" className="gap-1.5 text-xs sm:text-sm">
          <Users className="h-3.5 w-3.5" />
          <span className="hidden sm:inline">{t('adminTabUsers')}</span>
        </TabsTrigger>
        <TabsTrigger value="pages" className="gap-1.5 text-xs sm:text-sm">
          <Layout className="h-3.5 w-3.5" />
          <span className="hidden sm:inline">{t('adminTabPages')}</span>
        </TabsTrigger>
        <TabsTrigger value="sources" className="gap-1.5 text-xs sm:text-sm">
          <Newspaper className="h-3.5 w-3.5" />
          <span className="hidden sm:inline">{t('adminTabSources')}</span>
        </TabsTrigger>
        <TabsTrigger value="schedule" className="gap-1.5 text-xs sm:text-sm">
          <CalendarClock className="h-3.5 w-3.5" />
          <span className="hidden sm:inline">{t('adminTabSchedule')}</span>
        </TabsTrigger>
        <TabsTrigger value="ethics" className="gap-1.5 text-xs sm:text-sm">
          <Scale className="h-3.5 w-3.5" />
          <span className="hidden sm:inline">{t('adminTabEthics')}</span>
        </TabsTrigger>
        <TabsTrigger value="impressum" className="gap-1.5 text-xs sm:text-sm">
          <FileText className="h-3.5 w-3.5" />
          <span className="hidden sm:inline">{t('adminTabImpressum')}</span>
        </TabsTrigger>
      </TabsList>

      <TabsContent value="users">
        <AdminUsersManager />
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

      <TabsContent value="ethics">
        <EthicalPerspectivesManager />
      </TabsContent>

      <TabsContent value="impressum">
        <ImpressumEditor />
      </TabsContent>
    </Tabs>
  );
}
