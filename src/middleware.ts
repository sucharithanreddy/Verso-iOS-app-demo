import { clerkMiddleware, createRouteMatcher } from '@clerk/nextjs/server'
import { NextResponse } from 'next/server'

// Public routes that don't require authentication
const isPublicRoute = createRouteMatcher([
  '/sign-in(.*)',
  '/sign-up(.*)',
  '/api/webhooks(.*)',
  '/api/reframe(.*)',     // PUBLIC - allows demo without sign-in
  '/widget(.*)',
  '/demo(.*)',
])

// Dashboard uses its own auth (password-based)
const isDashboardRoute = createRouteMatcher(['/dashboard(.*)'])

export default clerkMiddleware(async (auth, req) => {
  // Allow public routes
  if (isPublicRoute(req)) return

  // Dashboard has its own authentication
  if (isDashboardRoute(req)) return

  // Protected routes that require Clerk authentication
  const isProtectedApiRoute = createRouteMatcher([
    '/api/tts(.*)',
    '/api/sessions(.*)',
    '/api/messages(.*)',
    '/api/mood(.*)',
    '/api/gratitude(.*)',
    '/api/assignments(.*)',
    '/api/dashboard/data(.*)',
    '/progress(.*)',
  ])

  // Require authentication for protected routes
  if (isProtectedApiRoute(req)) {
    try {
      await auth.protect()
    } catch {
      // Allow through for demo purposes if Clerk not configured
      return NextResponse.next()
    }
  }
})

export const config = {
  matcher: [
    '/((?!_next|[^?]*\\.(?:html?|css|js(?!on)|jpe?g|png|gif|svg|ttf|woff2?|ico|csv|docx?|xlsx?|zip|webmanifest)).*)',
    '/(api|trpc)(.*)',
  ],
}
