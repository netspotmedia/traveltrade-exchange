import { RequestForm } from './request-form'

export default async function NewRequestPage({
  searchParams,
}: {
  searchParams: Promise<{ service?: string }>
}) {
  const params = await searchParams
  return (
    <main className="min-h-screen bg-background px-6 py-10">
      <RequestForm serviceId={params.service ?? ''} />
    </main>
  )
}
