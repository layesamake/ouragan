import type { Where } from 'payload'

/**
 * Articles visibles par le public : publiés ET dont la date de publication est passée.
 * Une date future = article programmé, qui apparaît tout seul à l'heure prévue.
 */
export const publicArticlesWhere = (): Where => ({
  and: [
    { _status: { equals: 'published' } },
    {
      or: [
        { publishedAt: { less_than_equal: new Date().toISOString() } },
        { publishedAt: { exists: false } },
      ],
    },
  ],
})
