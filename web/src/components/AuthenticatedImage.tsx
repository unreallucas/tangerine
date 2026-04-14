import { useEffect, useState, type ImgHTMLAttributes } from "react"
import { cn } from "@/lib/utils"
import { buildAuthHeaders, emitAuthFailure } from "../lib/auth"

function requiresAuthenticatedFetch(src: string): boolean {
  return src.startsWith("/api/")
}

export function AuthenticatedImage({
  src,
  alt,
  className,
  ...props
}: ImgHTMLAttributes<HTMLImageElement>) {
  const [resolvedSrc, setResolvedSrc] = useState<string | null>(null)

  useEffect(() => {
    if (!src) {
      setResolvedSrc(null)
      return
    }

    if (!requiresAuthenticatedFetch(src)) {
      setResolvedSrc(src)
      return
    }

    let cancelled = false
    let objectUrl: string | null = null
    setResolvedSrc(null)

    fetch(src, { headers: buildAuthHeaders() })
      .then(async (res) => {
        if (!res.ok) {
          if (res.status === 401) emitAuthFailure()
          throw new Error(`Image request failed (${res.status})`)
        }
        const blob = await res.blob()
        objectUrl = URL.createObjectURL(blob)
        if (!cancelled) setResolvedSrc(objectUrl)
      })
      .catch(() => {
        if (!cancelled) setResolvedSrc(null)
      })

    return () => {
      cancelled = true
      if (objectUrl) URL.revokeObjectURL(objectUrl)
    }
  }, [src])

  if (!src) return null

  if (resolvedSrc) {
    return <img {...props} alt={alt} className={className} src={resolvedSrc} />
  }

  if (!requiresAuthenticatedFetch(src)) {
    return <img {...props} alt={alt} className={className} src={src} />
  }

  return <div aria-label={alt} className={cn("bg-muted", className)} />
}
