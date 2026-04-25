/// <reference types="npm:@types/react@18.3.1" />
import * as React from 'npm:react@18.3.1'
import {
  Body, Container, Head, Heading, Html, Preview, Text, Button, Hr, Img, Section,
} from 'npm:@react-email/components@0.0.22'
import type { TemplateEntry } from './registry.ts'

const SITE_NAME = "NewsFriend"
const SITE_URL = "https://www.newsfriend.org"
const LOGO_URL = "https://kitduddwitnsaqfwdpxd.supabase.co/storage/v1/object/public/email-assets/logo.jpg"

interface SpecialEditionProps {
  topic?: string
  headline?: string
  summary?: string
  language?: string
  editionId?: string
  bannerImageUrl?: string
}

const SpecialEditionNotificationEmail = ({ topic, headline, summary, language, editionId, bannerImageUrl }: SpecialEditionProps) => {
  const isDE = language === 'de'
  const readNow = isDE ? 'Sonderausgabe lesen' : 'Read Special Edition'
  const previewText = isDE
    ? `⭐ NewsFriend Sonderausgabe: ${topic || 'Neue Sonderausgabe'}`
    : `⭐ NewsFriend Special Edition: ${topic || 'New special edition'}`
  const heading = isDE ? 'Sonderausgabe' : 'Special Edition'
  const subheading = isDE
    ? 'Eine fokussierte, vertiefende Untersuchung zu einem ausgewählten Thema.'
    : 'A focused, in-depth investigation on a chosen topic.'
  const topicLabel = isDE ? 'Thema' : 'Topic'
  const footerText = isDE
    ? `Sie erhalten diese E-Mail, weil Sie tägliche Nachrichtenberichte auf ${SITE_NAME} abonniert haben.`
    : `You're receiving this because you subscribed to daily report notifications on ${SITE_NAME}.`

  return (
    <Html lang={isDE ? 'de' : 'en'} dir="ltr">
      <Head />
      <Preview>{previewText}</Preview>
      <Body style={main}>
        <Container style={container}>
          <Section style={headerSection}>
            <Img src={LOGO_URL} alt={SITE_NAME} width="48" height="48" style={logoStyle} />
            <Text style={brandName}>{SITE_NAME}</Text>
          </Section>

          <Hr style={headerDivider} />

          {bannerImageUrl && (
            <Img src={bannerImageUrl} alt="" width="600" style={bannerStyle} />
          )}

          <Text style={badge}>⭐ {heading}</Text>

          {topic && <Text style={topicLine}>{topicLabel}: {topic}</Text>}
          {headline && <Heading style={h1}>{headline}</Heading>}
          <Text style={subtitle}>{subheading}</Text>

          {summary && (
            <Section style={summaryBox}>
              <Text style={summaryText}>{summary}</Text>
            </Section>
          )}

          <Section style={ctaSection}>
            <Button href={editionId ? `${SITE_URL}/?se=${editionId}` : SITE_URL} style={button}>{readNow}</Button>
          </Section>

          <Hr style={hr} />

          <Text style={footer}>{footerText}</Text>
        </Container>
      </Body>
    </Html>
  )
}

export const template = {
  component: SpecialEditionNotificationEmail,
  subject: (data: Record<string, any>) => {
    const topic = (data.topic || '').toString().slice(0, 100)
    return data.language === 'de'
      ? `NewsFriend — Sonderausgabe${topic ? ': ' + topic : ''}`
      : `NewsFriend — Special Edition${topic ? ': ' + topic : ''}`
  },
  displayName: 'Special edition notification',
  previewData: {
    topic: 'Climate negotiations 2026',
    headline: 'A fragmented push toward consensus',
    summary: 'A focused multi-source investigation into the latest round of climate negotiations and what the major outlets are emphasising — or leaving out.',
    language: 'en',
  },
} satisfies TemplateEntry

const main = { backgroundColor: '#f4f6f9', fontFamily: "'Space Grotesk', 'Segoe UI', Arial, sans-serif", width: '100%' as const }
const container = { padding: '0', maxWidth: '600px', width: '100%' as const, margin: '0 auto', backgroundColor: '#ffffff', borderRadius: '12px', overflow: 'hidden' as const, boxShadow: '0 2px 8px rgba(0,0,0,0.06)' }
const headerSection = { padding: '28px 28px 12px', textAlign: 'center' as const }
const logoStyle = { borderRadius: '10px', display: 'block' as const, margin: '0 auto 4px', maxWidth: '48px' }
const brandName = { fontSize: '22px', fontWeight: '700' as const, color: '#1a1a2e', margin: '4px 0 0', letterSpacing: '-0.3px', textAlign: 'center' as const }
const headerDivider = { borderColor: '#e5e7eb', margin: '0 28px 20px' }
const badge = { fontSize: '11px', color: '#b45309', fontWeight: '700' as const, textTransform: 'uppercase' as const, letterSpacing: '1px', margin: '0 0 8px', padding: '0 16px' }
const topicLine = { fontSize: '13px', color: '#666', margin: '0 0 6px', padding: '0 16px', fontStyle: 'italic' as const }
const h1 = { fontSize: '24px', fontWeight: 'bold' as const, color: '#1a1a2e', margin: '0 0 8px', lineHeight: '1.3', padding: '0 16px', wordBreak: 'break-word' as const }
const subtitle = { fontSize: '15px', color: '#666', margin: '0 0 24px', padding: '0 16px' }
const summaryBox = { backgroundColor: '#fef9e7', borderLeft: '4px solid #d97706', padding: '16px 20px', margin: '0 16px 24px', borderRadius: '0 8px 8px 0' }
const summaryText = { fontSize: '14px', color: '#333', lineHeight: '1.65', margin: '0' }
const ctaSection = { padding: '0 28px 28px', textAlign: 'center' as const }
const button = { display: 'inline-block', backgroundColor: '#d97706', color: '#ffffff', padding: '14px 36px', borderRadius: '8px', textDecoration: 'none', fontWeight: '600' as const, fontSize: '15px' }
const hr = { borderColor: '#e5e7eb', margin: '0 28px 16px' }
const footer = { fontSize: '12px', color: '#999', lineHeight: '1.5', margin: '0', padding: '0 28px 24px' }
