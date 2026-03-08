

## News Fact-Checker & Aggregator

### Overview
A single-page app where users search news topics across customizable sources, get AI-powered fact-checking with cross-source comparison, and download the results as a PDF. No login required — sources saved locally in the browser.

### Pages & Layout

**Main Page — Dashboard**
- Clean header with app name/logo
- Topic search bar at the top (user types a keyword/phrase)
- Source manager panel (collapsible sidebar or section)
- Results area below the search

### Features

**1. News Source Manager**
- Pre-loaded suggested sources (e.g. Reuters, AP News, BBC, CNN, Al Jazeera, NPR, The Guardian, Fox News) with name + URL
- Users can add custom sources (name + URL fields)
- Each source has a delete button (including pre-loaded ones)
- Sources stored in localStorage
- Toggle checkboxes to include/exclude sources per search

**2. Topic Search & Scraping**
- User enters a topic/keyword
- App uses Firecrawl to search/scrape selected news sources for relevant articles
- Shows loading state with progress indicators per source
- Displays found articles grouped by source

**3. AI Fact-Check & Analysis**
- Uses Lovable AI (via edge function) to:
  - Analyze key claims found across articles
  - Cross-reference how different sources report the same facts
  - Assign confidence scores to claims (verified/disputed/unverified)
  - Highlight discrepancies between sources
- Results shown as a structured report with claim cards

**4. Comprehensive Report View**
- Amalgamated summary of the topic across all sources
- Fact-check results with confidence indicators (color-coded badges)
- Source comparison table showing how each source covered key claims
- Citations and links to original articles

**5. PDF Download**
- "Download as PDF" button generates a clean, formatted PDF of the full report
- Includes: summary, fact-check results, source comparison, citations
- Uses browser-based PDF generation (html2pdf.js or jsPDF)

### Design
- Clean, professional look with a neutral color palette
- Cards for individual claims/facts with color-coded confidence badges (green=verified, yellow=unverified, red=disputed)
- Responsive layout for desktop and mobile
- Dark/light mode toggle

### Backend (Lovable Cloud)
- **Firecrawl edge function**: Scrapes/searches news sources for articles on the given topic
- **AI analysis edge function**: Sends scraped content to Lovable AI for fact-checking and cross-source comparison
- No database needed — all state is client-side/localStorage

