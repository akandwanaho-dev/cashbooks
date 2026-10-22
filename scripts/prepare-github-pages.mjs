import { copyFile, writeFile } from 'node:fs/promises'

// GitHub Pages has no rewrite rules. Serving the SPA shell as 404.html lets
// BrowserRouter restore direct links such as /cashbooks/about.
await copyFile('dist/index.html', 'dist/404.html')
await writeFile('dist/.nojekyll', '')
