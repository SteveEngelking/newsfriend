import * as React from 'npm:react@18.3.1'
/// <reference types="npm:@types/react@18.3.1" />
import {
  Body, Container, Head, Heading, Html, Preview, Text,
} from 'npm:@react-email/components@0.0.22'
import type { TemplateEntry } from './registry.ts'

const SITE_NAME = 'NewsFriend'

interface WelcomeProps {
  name?: string
}

const WelcomeEmail = ({ name }: WelcomeProps) => (
  <Html lang="en" dir="ltr">
    <Head />
    <Preview>Welcome to {SITE_NAME}</Preview>
    <Body style={main}>
      <Container style={container}>
        <Heading style={h1}>
          {name ? `Welcome, ${name}!` : 'Welcome to NewsFriend!'}
        </Heading>
        <Text style={text}>
          Thank you for registering. You can now manage your notification preferences
          in your account settings to receive daily news reports and announcements.
        </Text>
        <Text style={footer}>Best regards, The {SITE_NAME} Team</Text>
      </Container>
    </Body>
  </Html>
)

export const template = {
  component: WelcomeEmail,
  subject: 'Welcome to NewsFriend',
  displayName: 'Welcome email',
  previewData: { name: 'Jane' },
} satisfies TemplateEntry

const main = { backgroundColor: '#ffffff', fontFamily: "'Space Grotesk', Arial, sans-serif" }
const container = { padding: '20px 25px' }
const h1 = { fontSize: '22px', fontWeight: 'bold' as const, color: 'hsl(220, 25%, 10%)', margin: '0 0 20px' }
const text = { fontSize: '14px', color: 'hsl(220, 10%, 50%)', lineHeight: '1.5', margin: '0 0 25px' }
const footer = { fontSize: '12px', color: '#999999', margin: '30px 0 0' }
