import { createClient } from '@/lib/supabase/server'

export interface CmsSection {
  key: string
  content: Record<string, unknown>
}

export interface CmsPage {
  id: string
  slug: string
  title: string
  description: string | null
  sections: CmsSection[]
  isPublished: boolean
}

export interface SiteAsset {
  id: string
  key: string
  url: string
  alt: string | null
  width: number | null
  height: number | null
}

/**
 * Load a published CMS page by slug, or null if it does not exist / is not
 * published. Callers must provide their own defaults so content always
 * renders even before any row is created.
 */
export async function getCmsPage(slug: string): Promise<CmsPage | null> {
  const supabase = await createClient()
  try {
    const { data } = await supabase
      .from('cms_pages')
      .select('id, slug, title, description, sections, is_published')
      .eq('slug', slug)
      .maybeSingle()

    // If the table does not exist yet (migration not applied) or any read
    // error occurs, data is null so callers fall back to built-in defaults.
    if (!data || !data.is_published) return null

    return {
      id: data.id,
      slug: data.slug,
      title: data.title,
      description: data.description,
      sections: Object.entries((data.sections ?? {}) as Record<string, unknown>).map(([key, content]) => ({
        key,
        content: (content ?? {}) as Record<string, unknown>,
      })),
      isPublished: true,
    }
  } catch {
    return null
  }
}

/** Load a site asset (logo, favicon, og_image) by key, or null. */
export async function getSiteAsset(key: string): Promise<SiteAsset | null> {
  const supabase = await createClient()
  try {
    const { data } = await supabase
      .from('site_assets')
      .select('id, key, url, alt, width, height')
      .eq('key', key)
      .maybeSingle()

    if (!data) return null

    return {
      id: data.id,
      key: data.key,
      url: data.url,
      alt: data.alt,
      width: data.width,
      height: data.height,
    }
  } catch {
    return null
  }
}
