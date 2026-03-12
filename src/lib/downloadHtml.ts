export function downloadAsHtml(element: HTMLElement, filename: string) {
  // Clone the element to avoid modifying the live DOM
  const clone = element.cloneNode(true) as HTMLElement;

  // Gather all computed styles from stylesheets
  const styles: string[] = [];
  for (const sheet of Array.from(document.styleSheets)) {
    try {
      for (const rule of Array.from(sheet.cssRules)) {
        styles.push(rule.cssText);
      }
    } catch {
      // cross-origin sheets – skip
    }
  }

  const html = `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>${filename}</title>
<style>
${styles.join('\n')}
body { margin: 0; padding: 2rem; background: white; color: black; }
@media print { body { padding: 0; } }
</style>
</head>
<body>
${clone.outerHTML}
</body>
</html>`;

  const blob = new Blob([html], { type: 'text/html;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `${filename}.html`;
  a.click();
  URL.revokeObjectURL(url);
}
