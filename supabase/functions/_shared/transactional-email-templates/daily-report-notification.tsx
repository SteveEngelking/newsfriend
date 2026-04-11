/// <reference types="npm:@types/react@18.3.1" />
import * as React from 'npm:react@18.3.1'
import {
  Body, Container, Head, Heading, Html, Preview, Text, Button, Hr, Img, Section,
} from 'npm:@react-email/components@0.0.22'
import type { TemplateEntry } from './registry.ts'

const SITE_NAME = "NewsFriend"
const SITE_URL = "https://newsfriend.lovable.app"
const LOGO_URL = "https://kitduddwitnsaqfwdpxd.supabase.co/storage/v1/object/public/email-assets/logo.jpg"

interface DailyReportProps {
  introduction?: string
  themeHeadlines?: string[]
  language?: string
}

const DailyReportNotificationEmail = ({ introduction, themeHeadlines, language }: DailyReportProps) => {
  const isDE = language === 'de'
  const readNow = isDE ? 'Jetzt lesen' : 'Read Now'
  const previewText = isDE
    ? `📰 Neuer täglicher Nachrichtenbericht auf ${SITE_NAME}`
    : `📰 New Daily News Report on ${SITE_NAME}`
  const heading = isDE ? 'Täglicher Nachrichtenbericht' : 'Daily News Report'
  const subheading = isDE
    ? 'Ihr KI-gestützter Nachrichtenüberblick ist bereit.'
    : 'Your AI-powered news briefing is ready.'
  const todaysTopics = isDE ? "Heutige Themen" : "Today's Headlines"
  const footerText = isDE
    ? `Sie erhalten diese E-Mail, weil Sie tägliche Nachrichtenberichte auf ${SITE_NAME} abonniert haben.`
    : `You're receiving this because you subscribed to daily report notifications on ${SITE_NAME}.`

  return (
    <Html lang={isDE ? 'de' : 'en'} dir="ltr">
      <Head />
      <Preview>{previewText}</Preview>
      <Body style={main}>
        <Container style={container}>
          {/* Header with logo */}
          <Section style={headerSection}>
            <Img src={LOGO_URL} alt={SITE_NAME} width="48" height="48" style={logoStyle} />
            <Text style={brandName}>{SITE_NAME}</Text>
          </Section>

          <Hr style={headerDivider} />

          {/* Badge */}
          <Text style={badge}>📰 {isDE ? 'Täglicher Bericht' : 'Daily Report'}</Text>

          <Heading style={h1}>{heading}</Heading>
          <Text style={subtitle}>{subheading}</Text>

          {/* Introduction / Summary */}
          {introduction && (
            <Section style={summaryBox}>
              <Text style={summaryText}>{introduction}</Text>
            </Section>
          )}

          {/* Theme headlines */}
          {themeHeadlines && themeHeadlines.length > 0 && (
            <Section style={themesSection}>
              <Text style={themesHeading}>{todaysTopics}</Text>
              {themeHeadlines.map((headline, i) => (
                <Text key={i} style={themeItem}>• {headline}</Text>
              ))}
            </Section>
          )}

          {/* CTA */}
          <Section style={ctaSection}>
            <Button href={SITE_URL} style={button}>{readNow}</Button>
          </Section>

          <Hr style={hr} />

          <Text style={footer}>{footerText}</Text>
        </Container>
      </Body>
    </Html>
  )
}

export const template = {
  component: DailyReportNotificationEmail,
  subject: (data: Record<string, any>) =>
    data.language === 'de'
      ? 'NewsFriend — Neuer täglicher Nachrichtenbericht'
      : 'NewsFriend — New Daily News Report',
  displayName: 'Daily report notification',
  previewData: {
    introduction: 'Today\'s news landscape is dominated by major developments in global trade, technology regulation, and climate policy.',
    themeHeadlines: ['Global Trade Tensions Escalate', 'AI Regulation Debate Heats Up', 'Climate Summit Results'],
    language: 'en',
  },
} satisfies TemplateEntry

// Styles
const main = { backgroundColor: '#f4f6f9', fontFamily: "'Space Grotesk', 'Segoe UI', Arial, sans-serif" }
const container = { padding: '0', maxWidth: '600px', margin: '0 auto', backgroundColor: '#ffffff', borderRadius: '12px', overflow: 'hidden' as const, boxShadow: '0 2px 8px rgba(0,0,0,0.06)' }
const headerSection = { padding: '28px 28px 12px', textAlign: 'center' as const }
const logoStyle = { borderRadius: '10px', display: 'inline-block' as const, marginBottom: '4px' }
const brandName = { fontSize: '22px', fontWeight: '700' as const, color: '#1a1a2e', margin: '4px 0 0', letterSpacing: '-0.3px' }
const headerDivider = { borderColor: '#e5e7eb', margin: '0 28px 20px' }
const badge = { fontSize: '11px', color: '#2563b3', fontWeight: '600' as const, textTransform: 'uppercase' as const, letterSpacing: '1px', margin: '0 0 8px', padding: '0 28px' }
const h1 = { fontSize: '24px', fontWeight: 'bold' as const, color: '#1a1a2e', margin: '0 0 8px', lineHeight: '1.3', padding: '0 28px' }
const subtitle = { fontSize: '15px', color: '#666', margin: '0 0 24px', padding: '0 28px' }
const summaryBox = { backgroundColor: '#f0f4ff', borderLeft: '4px solid #2563b3', padding: '16px 20px', margin: '0 28px 24px', borderRadius: '0 8px 8px 0' }
const summaryText = { fontSize: '14px', color: '#333', lineHeight: '1.65', margin: '0' }
const themesSection = { padding: '0 28px 24px' }
const themesHeading = { fontSize: '13px', fontWeight: '600' as const, color: '#2563b3', textTransform: 'uppercase' as const, letterSpacing: '0.5px', margin: '0 0 12px' }
const themeItem = { fontSize: '14px', color: '#333', lineHeight: '1.5', margin: '0 0 6px', paddingLeft: '4px' }
const ctaSection = { padding: '0 28px 28px', textAlign: 'center' as const }
const button = { display: 'inline-block', backgroundColor: '#2563b3', color: '#ffffff', padding: '14px 36px', borderRadius: '8px', textDecoration: 'none', fontWeight: '600' as const, fontSize: '15px' }
const hr = { borderColor: '#e5e7eb', margin: '0 28px 16px' }
const footer = { fontSize: '12px', color: '#999', lineHeight: '1.5', margin: '0', padding: '0 28px 24px' }
