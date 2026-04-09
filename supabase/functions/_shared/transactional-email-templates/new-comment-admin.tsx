import * as React from 'npm:react@18.3.1'
import {
  Body, Container, Head, Heading, Html, Preview, Text, Section,
} from 'npm:@react-email/components@0.0.22'
import type { TemplateEntry } from './registry.ts'

const SITE_NAME = "NewsFriend"

interface Props {
  submitterName?: string
  questionPreview?: string
}

const NewCommentAdminEmail = ({ submitterName, questionPreview }: Props) => (
  <Html lang="en" dir="ltr">
    <Head />
    <Preview>New comment from {submitterName || 'a user'} on {SITE_NAME}</Preview>
    <Body style={main}>
      <Container style={container}>
        <Heading style={h1}>New Comment Received</Heading>
        <Text style={text}>
          <strong>{submitterName || 'A user'}</strong> has submitted a new comment or question on {SITE_NAME}.
        </Text>
        {questionPreview && (
          <Section style={quoteSection}>
            <Text style={quoteText}>"{questionPreview}"</Text>
          </Section>
        )}
        <Text style={text}>
          Please log in to the Admin panel to review, reply, or moderate this comment.
        </Text>
        <Text style={footer}>— The {SITE_NAME} System</Text>
      </Container>
    </Body>
  </Html>
)

export const template = {
  component: NewCommentAdminEmail,
  subject: (data: Record<string, any>) => `New comment from ${data?.submitterName || 'a user'}`,
  displayName: 'New comment notification (admin)',
  previewData: { submitterName: 'Jane Doe', questionPreview: 'How does fact-checking work on your platform?' },
} satisfies TemplateEntry

const main = { backgroundColor: '#ffffff', fontFamily: "'Space Grotesk', Arial, sans-serif" }
const container = { padding: '20px 25px' }
const h1 = { fontSize: '22px', fontWeight: 'bold' as const, color: '#1a365d', margin: '0 0 20px' }
const text = { fontSize: '14px', color: '#55575d', lineHeight: '1.5', margin: '0 0 20px' }
const quoteSection = { backgroundColor: '#f0f4f8', borderLeft: '3px solid #2563eb', padding: '12px 16px', margin: '0 0 20px', borderRadius: '4px' }
const quoteText = { fontSize: '14px', color: '#334155', lineHeight: '1.5', margin: '0', fontStyle: 'italic' as const }
const footer = { fontSize: '12px', color: '#999999', margin: '30px 0 0' }
