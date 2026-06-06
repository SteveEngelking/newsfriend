import * as React from 'npm:react@18.3.1'
import {
  Body, Container, Head, Heading, Html, Preview, Text,
} from 'npm:@react-email/components@0.0.22'
import type { TemplateEntry } from './registry.ts'

const SITE_NAME = 'NewsFriend'

interface Props {
  suppressedEmail?: string
  reason?: string
  reasonMessage?: string
  occurredAt?: string
}

const SuppressionAdminEmail = ({ suppressedEmail, reason, reasonMessage, occurredAt }: Props) => (
  <Html lang="en" dir="ltr">
    <Head />
    <Preview>{SITE_NAME} alert: {suppressedEmail || 'a recipient'} was blocked</Preview>
    <Body style={main}>
      <Container style={container}>
        <Heading style={h1}>Email recipient blocked</Heading>
        <Text style={text}>
          {SITE_NAME} has stopped sending emails to a recipient after a delivery problem.
          They will no longer receive notifications until the address is removed from the
          suppression list.
        </Text>
        <Text style={text}>
          <strong>Email:</strong> {suppressedEmail || 'unknown'}<br />
          <strong>Reason:</strong> {reason || 'unknown'}<br />
          {reasonMessage ? <><strong>Details:</strong> {reasonMessage}<br /></> : null}
          {occurredAt ? <><strong>When:</strong> {occurredAt}</> : null}
        </Text>
        <Text style={text}>
          If this looks like a transient issue, you can clear the address from the
          suppression list in the admin tools.
        </Text>
        <Text style={footer}>— The {SITE_NAME} System</Text>
      </Container>
    </Body>
  </Html>
)

export const template = {
  component: SuppressionAdminEmail,
  subject: (data: Record<string, any>) =>
    `${SITE_NAME} alert: ${data?.suppressedEmail || 'recipient'} blocked (${data?.reason || 'suppression'})`,
  displayName: 'Recipient blocked notification (admin)',
  previewData: {
    suppressedEmail: 'user@example.com',
    reason: 'bounce',
    reasonMessage: 'Permanent bounce — email address is invalid or rejected',
    occurredAt: '06 Jun 2026, 10:00 UTC',
  },
} satisfies TemplateEntry

const main = { backgroundColor: '#ffffff', fontFamily: "'Space Grotesk', Arial, sans-serif" }
const container = { padding: '20px 25px' }
const h1 = { fontSize: '22px', fontWeight: 'bold' as const, color: '#1a365d', margin: '0 0 20px' }
const text = { fontSize: '14px', color: '#55575d', lineHeight: '1.6', margin: '0 0 20px' }
const footer = { fontSize: '12px', color: '#999999', margin: '30px 0 0' }
