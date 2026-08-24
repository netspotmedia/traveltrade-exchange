// Public URL for a service image stored in the public 'service-images' bucket.
export function publicImageUrl(path: string | null | undefined): string | null {
  if (!path) return null
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  if (!url) return null
  return `${url}/storage/v1/object/public/service-images/${path.replace(/^\/+/, '')}`
}