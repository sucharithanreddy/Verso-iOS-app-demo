
'use client'

import { useEffect, Suspense } from 'react'
import { useSearchParams } from 'next/navigation'

function RedirectContent() {
  const searchParams = useSearchParams()
  
  useEffect(() => {
    const token = searchParams.get('__clerk_session_jwt') || 
                  searchParams.get('token') ||
                  searchParams.get('session_jwt')
    
    const callbackUrl = `verso://auth-callback${token ? `?token=${encodeURIComponent(token)}` : ''}`
    window.location.href = callbackUrl
    
    setTimeout(() => {
      const fallbackEl = document.getElementById('fallback')
      if (fallbackEl) fallbackEl.style.display = 'block'
    }, 2000)
  }, [searchParams])
  
  return (
    <div style={{
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      height: '100vh',
      fontFamily: 'system-ui, sans-serif',
      background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
      color: 'white'
    }}>
      <div style={{ textAlign: 'center' }}>
        <h1 style={{ fontSize: '24px', marginBottom: '16px' }}>Redirecting to Verso...</h1>
        <p style={{ opacity: 0.8 }}>Please wait while we open the app</p>
        <div id="fallback" style={{ display: 'none', marginTop: '20px' }}>
          <p style={{ fontSize: '14px', opacity: 0.7 }}>
            App not opening? <a href="/" style={{ color: 'white' }}>Return to web app</a>
          </p>
        </div>
      </div>
    </div>
  )
}

export default function MobileRedirectPage() {
  return (
    <Suspense fallback={<div style={{
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      height: '100vh',
      background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
      color: 'white'
    }}>Loading...</div>}>
      <RedirectContent />
    </Suspense>
  )
}
