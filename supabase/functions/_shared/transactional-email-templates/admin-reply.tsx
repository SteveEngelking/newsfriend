import * as React from 'npm:react@18.3.1'
import {
  Body, Container, Head, Heading, Html, Preview, Text, Section, Hr,
} from 'npm:@react-email/components@0.0.22'
import type { TemplateEntry } from './registry.ts'

const SITE_NAME = "NewsFriend"

interface Props {
  userName?: string
  originalQuestion?: string
  adminReply?: string
}

const AdminReplyEmail = ({ userName, originalQuestion, adminReply }: Props) => (
  <Html lang="en" dir="ltr">
    <Head />
    <Preview>Reply to your question on {SITE_NAME}</Preview>
    <Body style={main}>
      <Container style={container}>
        <Heading style={h1}>
          {userName ? `Hi ${userName},` : 'Hello,'}
        </Heading>
        <Text style={text}>
          Our team has reviewed your question and sent you a personal reply.
        </Text>
        {originalQuestion && (
          <>
            <Text style={label}>Your question:</Text>
            <Section style={quoteSection}>
              <Text style={quoteText}>"{originalQuestion}"</Text>
            </Section>
          </>
        )}
        <Hr style={hr} />
        <Text style={label}>Our reply:</Text>
        <Text style={replyText}>{adminReply || ''}</Text>
        <Text style={footer}>Best regards, The {SITE_NAME} Team</Text>
      </Container>
    </Body>
  </Html>
)

export const template = {
  component: AdminReplyEmail,
  subject: 'Reply to your question on NewsFriend',
  displayName: 'Admin reply to user comment',
  previewData: {
    userName: 'Jane',
    originalQuestion: 'How does fact-checking work?',
    adminReply: 'Great question! Our fact-checking process involves...',
  },
} satisfies TemplateEntry

const main = { backgroundColor: '#ffffff', fontFamily: "'Space Grotesk', Arial, sans-serif" }
const container = { padding: '20px 25px' }
const h1 = { fontSize: '22px', fontWeight: 'bold' as const, color: '#1a365d', margin: '0 0 20px' }
const text = { fontSize: '14px', color: '#55575d', lineHeight: '1.5', margin: '0 0 20px' }
const label = { fontSize: '12px', color: '#64748b', fontWeight: '600' as const, textTransform: 'uppercase' as const, letterSpacing: '0.05em', margin: '0 0 8px' }
const quoteSection = { backgroundColor: '#f0f4f8', borderLeft: '3px solid #2563eb', padding: '12px 16px', margin: '0 0 20px', borderRadius: '4px' }
const quoteText = { fontSize: '14px', color: '#334155', lineHeight: '1.5', margin: '0', fontStyle: 'italic' as const }
const hr = { borderColor: '#e2e8f0', margin: '20px 0' }
const replyText = { fontSize: '14px', color: '#1e293b', lineHeight: '1.6', margin: '0 0 25px', whiteSpace: 'pre-wrap' as const }
const footer = { fontSize: '12px', color: '#999999', margin: '30px 0 0' }
