/// <reference types="npm:@types/react@18.3.1" />
import * as React from 'npm:react@18.3.1'
import {
  Body, Container, Head, Heading, Html, Preview, Text, Button, Hr, Img, Section,
} from 'npm:@react-email/components@0.0.22'
import type { TemplateEntry } from './registry.ts'

const SITE_NAME = "NewsFriend"
const SITE_URL = "https://newsfriend.lovable.app"
const LOGO_URL = "https://kitduddwitnsaqfwdpxd.supabase.co/storage/v1/object/public/email-assets/logo.jpg"

interface AnnouncementNotificationProps {
  title?: string
  content?: string
}

const AnnouncementNotificationEmail = ({ title, content }: AnnouncementNotificationProps) => (
  <Html lang="en" dir="ltr">
    <Head />
    <Preview>📢 {title || `New Announcement from ${SITE_NAME}`}</Preview>
    <Body style={main}>
      <Container style={container}>
        <Section style={headerSection}>
          <Img src={LOGO_URL} alt={SITE_NAME} width="48" height="48" style={logoStyle} />
          <Text style={brandNameStyle}>{SITE_NAME}</Text>
        </Section>
        <Hr style={headerDivider} />
        <Text style={badge}>📢 Announcement</Text>
        <Heading style={h1}>{title || 'New Announcement'}</Heading>
        {content && <Text style={text}>{content}</Text>}
        <Section style={ctaSection}>
          <Button href={SITE_URL} style={button}>Visit {SITE_NAME}</Button>
        </Section>
        <Hr style={hr} />
        <Text style={footer}>
          You're receiving this because you subscribed to announcement notifications on {SITE_NAME}.
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

const main = { backgroundColor: '#f4f6f9', fontFamily: "'Space Grotesk', 'Segoe UI', Arial, sans-serif" }
const container = { padding: '0', maxWidth: '600px', margin: '0 auto', backgroundColor: '#ffffff', borderRadius: '12px', overflow: 'hidden' as const, boxShadow: '0 2px 8px rgba(0,0,0,0.06)' }
const headerSection = { padding: '28px 28px 12px', textAlign: 'center' as const }
const logoStyle = { borderRadius: '10px', display: 'block' as const, margin: '0 auto 4px', maxWidth: '48px' }
const brandNameStyle = { fontSize: '22px', fontWeight: '700' as const, color: '#1a1a2e', margin: '4px 0 0', letterSpacing: '-0.3px', textAlign: 'center' as const }
const headerDivider = { borderColor: '#e5e7eb', margin: '0 28px 20px' }
const badge = { fontSize: '11px', color: '#2563b3', fontWeight: '600' as const, textTransform: 'uppercase' as const, letterSpacing: '1px', margin: '0 0 8px', padding: '0 28px' }
const h1 = { fontSize: '24px', fontWeight: 'bold' as const, color: '#1a1a2e', margin: '0 0 16px', lineHeight: '1.3', padding: '0 28px' }
const text = { fontSize: '15px', color: '#444', lineHeight: '1.6', margin: '0 0 24px', padding: '0 28px' }
const ctaSection = { padding: '0 28px 28px', textAlign: 'center' as const }
const button = { display: 'inline-block', backgroundColor: '#2563b3', color: '#ffffff', padding: '14px 36px', borderRadius: '8px', textDecoration: 'none', fontWeight: '600' as const, fontSize: '15px' }
const hr = { borderColor: '#e5e7eb', margin: '0 28px 16px' }
const footer = { fontSize: '12px', color: '#999', lineHeight: '1.5', margin: '0', padding: '0 28px 24px' }
