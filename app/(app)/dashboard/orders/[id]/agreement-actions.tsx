'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { PenLine } from 'lucide-react'
import { Button } from '@/components/ui/button'

export function AgreementActions({
  agreementId,
  isBuyer,
  isSeller,
  signedByBuyer,
  signedBySeller,
  status,
}: {
  agreementId: string
  isBuyer: boolean
  isSeller: boolean
  signedByBuyer: boolean
  signedBySeller: boolean
  status: string
}) {
  const [busy, setBusy] = useState(false)
  const [message, setMessage] = useState('')
  const router = useRouter()

  const mine = isBuyer ? !signedByBuyer : isSeller ? !signedBySeller : false
  const fullySigned = signedByBuyer && signedBySeller

  async function sign() {
    setBusy(true)
    setMessage('')
    try {
      const r = await fetch(`/api/agreements/${agreementId}/sign`, { method: 'POST' })
      const j = await r.json()
      if (r.ok) {
        setMessage(fullySigned ? 'Agreement complete.' : 'You signed the agreement.')
        router.refresh()
      } else {
        setMessage(j.error || 'Unable to sign')
      }
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="flex flex-col gap-3">
      {status === 'pending_signatures' && !fullySigned && (
        <p className="text-sm text-muted-foreground">
          {mine
            ? 'Sign the agreement to confirm you accept the terms. Both parties must sign before escrow can be funded.'
            : isBuyer || isSeller
              ? 'Your partner has signed. Sign to confirm you accept the terms.'
              : 'Waiting for both parties to sign.'}
        </p>
      )}

      {mine && !fullySigned && (
        <Button disabled={busy} onClick={sign} className="w-fit">
          <PenLine className="size-4" aria-hidden="true" /> Sign agreement
        </Button>
      )}

      {fullySigned && status !== 'pending_signatures' && (
        <p className="text-sm text-success-foreground">Agreement signed by both parties. {status === 'active' ? 'Escrow funding is enabled.' : ''}</p>
      )}

      {message && <p className="text-sm text-muted-foreground">{message}</p>}
    </div>
  )
}