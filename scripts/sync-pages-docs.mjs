import { cp, rm } from 'node:fs/promises'

// GitHub Pages can publish /docs directly from the main branch without a
// privileged workflow token. Keep this generated copy identical to dist.
await rm('docs', { recursive: true, force: true })
await cp('dist', 'docs', { recursive: true })
