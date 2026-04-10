/// <reference types="npm:@types/react@18.3.1" />
import * as React from 'npm:react@18.3.1'
import {
  Body, Container, Head, Heading, Html, Preview, Text, Button, Hr,
} from 'npm:@react-email/components@0.0.22'
import type { TemplateEntry } from './registry.ts'

const SITE_NAME = "NewsFriend"
const SITE_URL = "https://newsfriend.lovable.app"

interface AnnouncementNotificationProps {
  title?: string
  content?: string
}

const AnnouncementNotificationEmail = ({ title, content }: AnnouncementNotificationProps) => (
  <Html lang="en" dir="ltr">
    <Head />
    <Preview>📢 {title || 'New Announcement from NewsFriend'}</Preview>
    <Body style={main}>
      <Container style={container}>
        <Text style={badge}>📢 Announcement</Text>
        <Heading style={h1}>{title || 'New Announcement'}</Heading>
        {content && <Text style={text}>{content}</Text>}
        <Button href={SITE_URL} style={button}>Visit {SITE_NAME}</Button>
        <Hr style={hr} />
        <Text style={footer}>
          You're receiving this because you subscribed to announcement notifications on {SITE_NAME}.
          Update your preferences in your account settings.
        </Text>
      </Container>
    </Body>
  </Html>
)

export const template = {
  component: AnnouncementNotificationEmail,
  subject: (data: Record<string, any>) => `NewsFriend — ${data.title || 'New Announcement'}`,
  displayName: 'Announcement notification',
  previewData: { title: 'Important Update', content: 'We have exciting news to share with the NewsFriend community.' },
} satisfies TemplateEntry

const main = { backgroundColor: '#ffffff', fontFamily: "'Space Grotesk', Arial, sans-serif" }
const container = { padding: '24px 28px', maxWidth: '600px', margin: '0 auto' }
const badge = { fontSize: '12px', color: '#2563b3', fontWeight: '600' as const, textTransform: 'uppercase' as const, letterSpacing: '0.5px', margin: '0 0 8px' }
const h1 = { fontSize: '22px', fontWeight: 'bold' as const, color: '#1a1a2e', margin: '0 0 16px', lineHeight: '1.3' }
const text = { fontSize: '15px', color: '#444', lineHeight: '1.6', margin: '0 0 24px' }
const button = { display: 'inline-block', backgroundColor: '#2563b3', color: '#ffffff', padding: '12px 28px', borderRadius: '8px', textDecoration: 'none', fontWeight: '600' as const, fontSize: '14px' }
const hr = { borderColor: '#e5e7eb', margin: '28px 0 16px' }
const footer = { fontSize: '12px', color: '#999', lineHeight: '1.5', margin: '0' }
