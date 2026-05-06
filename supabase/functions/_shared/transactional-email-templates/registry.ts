/// <reference types="npm:@types/react@18.3.1" />
import * as React from 'npm:react@18.3.1'

export interface TemplateEntry {
  component: React.ComponentType<any>
  subject: string | ((data: Record<string, any>) => string)
  to?: string
  displayName?: string
  previewData?: Record<string, any>
}

import { template as welcomeEmail } from './welcome.tsx'
import { template as newCommentAdmin } from './new-comment-admin.tsx'
import { template as adminReply } from './admin-reply.tsx'
import { template as announcementNotification } from './announcement-notification.tsx'
import { template as dailyReportNotification } from './daily-report-notification.tsx'
import { template as specialEditionNotification } from './special-edition-notification.tsx'
import { template as newUserAdmin } from './new-user-admin.tsx'

export const TEMPLATES: Record<string, TemplateEntry> = {
  'welcome': welcomeEmail,
  'new-comment-admin': newCommentAdmin,
  'new-user-admin': newUserAdmin,
  'admin-reply': adminReply,
  'announcement-notification': announcementNotification,
  'daily-report-notification': dailyReportNotification,
  'special-edition-notification': specialEditionNotification,
}
