import { visit } from 'unist-util-visit'
// path import might not be needed if using alias
import autolinkHeadings from 'rehype-autolink-headings'
import slugPlugin from 'rehype-slug'

import relativeImages from 'mdsvex-relative-images'
import remarkExternalLinks from 'remark-external-links';
import readingTime from 'remark-reading-time';

export default {
  extensions: ['.svx', '.md'],
  smartypants: {
    dashes: 'oldschool'
  },
  layout: {
    // Using SvelteKit alias $lib which should resolve to dashboard/src/lib
    _: 'dashboard/src/lib/components/ui/markdown-layouts/default.svelte',
    // If the above doesn't work, try an absolute path from project root if mdsvex resolves from there
    // _: '/dashboard/src/lib/components/ui/markdown-layouts/default.svelte',
  },
  remarkPlugins: [
    videos,
    relativeImages,
    readingTime,
    [remarkExternalLinks, { target: '_blank', rel: 'noopener' }],
  ],
  rehypePlugins: [
    slugPlugin,
    [
      autolinkHeadings, { behavior: 'wrap' }
    ]
  ]
}

/**
 * Adds support to video files in markdown image links
 */
function videos() {
  const extensions = ['mp4', 'webm']
  return function transformer(tree) {
    visit(tree, 'image', (node) => {
      if (extensions.some((ext) => node.url.endsWith(ext))) {
        node.type = 'html'
        node.value = `
            <video
              src="${node.url}"
              autoplay
              muted
              playsinline
              loop
              title="${node.alt}"
            />
          `
      }
    })
  }
}
