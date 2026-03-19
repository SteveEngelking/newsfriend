import { Cookie } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

export default function CookiePolicy() {
  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <Cookie className="h-6 w-6 text-primary" />
        <h1 className="text-2xl font-bold tracking-tight">Cookie Policy</h1>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-lg">What Are Cookies?</CardTitle>
        </CardHeader>
        <CardContent className="text-sm text-muted-foreground space-y-3">
          <p>Cookies are small text files stored on your device when you visit a website. They help the site remember your preferences and improve your browsing experience.</p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Cookies We Use</CardTitle>
        </CardHeader>
        <CardContent className="text-sm text-muted-foreground space-y-3">
          <div className="rounded-md border border-border overflow-hidden">
            <table className="w-full text-left text-xs">
              <thead className="bg-muted/50">
                <tr>
                  <th className="px-3 py-2 font-medium">Cookie</th>
                  <th className="px-3 py-2 font-medium">Type</th>
                  <th className="px-3 py-2 font-medium">Purpose</th>
                  <th className="px-3 py-2 font-medium">Duration</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                <tr>
                  <td className="px-3 py-2 font-mono">theme</td>
                  <td className="px-3 py-2">Essential</td>
                  <td className="px-3 py-2">Stores your light/dark theme preference</td>
                  <td className="px-3 py-2">Persistent</td>
                </tr>
                <tr>
                  <td className="px-3 py-2 font-mono">cookie-consent</td>
                  <td className="px-3 py-2">Essential</td>
                  <td className="px-3 py-2">Records your cookie acceptance choice</td>
                  <td className="px-3 py-2">1 year</td>
                </tr>
                <tr>
                  <td className="px-3 py-2 font-mono">sb-*</td>
                  <td className="px-3 py-2">Functional</td>
                  <td className="px-3 py-2">Authentication and session management</td>
                  <td className="px-3 py-2">Session</td>
                </tr>
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Strictly Necessary Cookies</CardTitle>
        </CardHeader>
        <CardContent className="text-sm text-muted-foreground space-y-3">
          <p>These cookies are essential for the website to function properly. They cannot be disabled as the service would not work without them.</p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Managing Cookies</CardTitle>
        </CardHeader>
        <CardContent className="text-sm text-muted-foreground space-y-3">
          <p>You can control and delete cookies through your browser settings. Please note that disabling cookies may affect the functionality of the service.</p>
          <p>You can withdraw your cookie consent at any time by clearing your browser's local storage for this site.</p>
        </CardContent>
      </Card>

      <p className="text-xs text-muted-foreground">Last updated: 19 March 2026</p>
    </div>
  );
}
