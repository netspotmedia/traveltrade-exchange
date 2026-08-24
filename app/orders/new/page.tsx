import OrderForm from './order-form'

export default async function NewOrderPage({ searchParams }: { searchParams: Promise<{ service?: string; agency?: string }> }) {
  const params = await searchParams
  return <OrderForm serviceId={params.service ?? null} agencyId={params.agency ?? null} />
}
