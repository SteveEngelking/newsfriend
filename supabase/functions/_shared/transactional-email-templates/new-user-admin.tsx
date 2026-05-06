import * as React from 'npm:react@18.3.1'
import {
  Body, Container, Head, Heading, Html, Preview, Text,
} from 'npm:@react-email/components@0.0.22'
import type { TemplateEntry } from './registry.ts'

const SITE_NAME = 'NewsFriend'

interface Props {
  newUserEmail?: string
  newUserName?: string
  registeredAt?: string
}

const NewUserAdminEmail = ({ newUserEmail, newUserName, registeredAt }: Props) => (
  <Html lang="en" dir="ltr">
    <Head />
    <Preview>New {SITE_NAME} registration: {newUserEmail || 'a new user'}</Preview>
    <Body style={main}>
      <Container style={container}>
        <Heading style={h1}>New user registered</Heading>
        <Text style={text}>
          A new user has just registered on {SITE_NAME}.
        </Text>
        <Text style={text}>
          <strong>Email:</strong> {newUserEmail || 'unknown'}<br />
          {newUserName ? <><strong>Name:</strong> {newUserName}<br /></> : null}
          {registeredAt ? <><strong>Registered at:</strong> {registeredAt}</> : null}
        </Text>
        <Text style={footer}>— The {SITE_NAME} System</Text>
      </Container>
    </Body>
  </Html>
)

export const template = {
  component: NewUserAdminEmail,
  subject: (data: Record<string, any>) => `New ${SITE_NAME} registration: ${data?.newUserEmail || 'a new user'}`,
  displayName: 'New user notification (admin)',
  previewData: { newUserEmail: 'user@example.com', newUserName: 'Jane Doe', registeredAt: '06 May 2026, 10:00 UTC' },
} satisfies TemplateEntry

const main = { backgroundColor: '#ffffff', fontFamily: "'Space Grotesk', Arial, sans-serif" }
const container = { padding: '20px 25px' }
const h1 = { fontSize: '22px', fontWeight: 'bold' as const, color: '#1a365d', margin: '0 0 20px' }
const text = { fontSize: '14px', color: '#55575d', lineHeight: '1.6', margin: '0 0 20px' }
const footer = { fontSize: '12px', color: '#999999', margin: '30px 0 0' }
