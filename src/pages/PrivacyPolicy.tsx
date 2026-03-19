import { Shield } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

export default function PrivacyPolicy() {
  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <Shield className="h-6 w-6 text-primary" />
        <h1 className="text-2xl font-bold tracking-tight">Privacy Policy</h1>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-lg">1. Introduction</CardTitle>
        </CardHeader>
        <CardContent className="prose prose-sm dark:prose-invert max-w-none text-muted-foreground space-y-3">
          <p>NewsFriend ("we", "our", "us") is committed to protecting your personal data in accordance with the General Data Protection Regulation (GDPR) (EU) 2016/679 and applicable data protection laws.</p>
          <p>This Privacy Policy explains how we collect, use, store, and protect your information when you use our service.</p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-lg">2. Data We Collect</CardTitle>
        </CardHeader>
        <CardContent className="text-sm text-muted-foreground space-y-3">
          <p>We may collect the following categories of data:</p>
          <ul className="list-disc pl-5 space-y-1">
            <li><strong>Usage data:</strong> Pages visited, features used, timestamps, and interaction patterns.</li>
            <li><strong>Technical data:</strong> Browser type, device information, IP address, and operating system.</li>
            <li><strong>Preference data:</strong> Theme settings, selected news sources, and schedule configurations stored locally or in our database.</li>
          </ul>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-lg">3. Legal Basis for Processing</CardTitle>
        </CardHeader>
        <CardContent className="text-sm text-muted-foreground space-y-3">
          <p>We process your data under the following legal bases:</p>
          <ul className="list-disc pl-5 space-y-1">
            <li><strong>Consent:</strong> Where you have given explicit consent (e.g., cookie acceptance).</li>
            <li><strong>Legitimate interest:</strong> To improve our service, ensure security, and provide relevant content.</li>
            <li><strong>Contractual necessity:</strong> To deliver the service you have requested.</li>
          </ul>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-lg">4. How We Use Your Data</CardTitle>
        </CardHeader>
        <CardContent className="text-sm text-muted-foreground space-y-3">
          <ul className="list-disc pl-5 space-y-1">
            <li>To provide and maintain our news aggregation and fact-checking service.</li>
            <li>To remember your preferences and settings.</li>
            <li>To generate scheduled news reports based on your configuration.</li>
            <li>To improve, personalise, and optimise our service.</li>
          </ul>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-lg">5. Data Retention</CardTitle>
        </CardHeader>
        <CardContent className="text-sm text-muted-foreground space-y-3">
          <p>We retain your data only for as long as necessary to fulfil the purposes outlined in this policy. You may request deletion of your data at any time by contacting us.</p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-lg">6. Your Rights</CardTitle>
        </CardHeader>
        <CardContent className="text-sm text-muted-foreground space-y-3">
          <p>Under the GDPR, you have the right to:</p>
          <ul className="list-disc pl-5 space-y-1">
            <li>Access the personal data we hold about you.</li>
            <li>Rectify inaccurate or incomplete data.</li>
            <li>Request erasure of your data ("right to be forgotten").</li>
            <li>Restrict or object to processing.</li>
            <li>Data portability.</li>
            <li>Withdraw consent at any time.</li>
          </ul>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-lg">7. Third-Party Services</CardTitle>
        </CardHeader>
        <CardContent className="text-sm text-muted-foreground space-y-3">
          <p>We may use third-party services for hosting, analytics, and AI-powered analysis. These providers process data on our behalf under appropriate data processing agreements.</p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-lg">8. Contact</CardTitle>
        </CardHeader>
        <CardContent className="text-sm text-muted-foreground space-y-3">
          <p>For any questions or requests regarding your personal data, please contact us through the application.</p>
        </CardContent>
      </Card>

      <p className="text-xs text-muted-foreground">Last updated: 19 March 2026</p>
    </div>
  );
}
