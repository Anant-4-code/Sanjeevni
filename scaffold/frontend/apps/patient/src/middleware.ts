import { type NextRequest, NextResponse } from 'next/server'

// BUG-RBAC-04 FIX: Role-based route guards.
// Reads the sanjeevani_session_role cookie written by AuthContext.login().
// Edge middleware cannot access localStorage, so login() mirrors the role into
// a lightweight cookie specifically for this guard to consume.

const ROLE_REQUIRED: Record<string, string[]> = {
  '/doctor':    ['doctor', 'admin'],
  '/reception': ['receptionist', 'admin'],
  '/pharmacy':  ['pharmacist', 'admin'],
  '/lab':       ['lab_tech', 'admin'],
  // Patient-area routes require any authenticated session
  '/dashboard': ['patient', 'doctor', 'receptionist', 'pharmacist', 'lab_tech', 'admin'],
  '/vault':     ['patient', 'doctor', 'receptionist', 'pharmacist', 'lab_tech', 'admin'],
  '/calendar':  ['patient', 'doctor', 'admin'],
  '/reminders': ['patient', 'doctor', 'admin'],
  '/copilot':   ['patient', 'doctor', 'admin'],
  '/scan-otc':  ['patient', 'doctor', 'admin'],
  '/passport':  ['patient', 'doctor', 'admin'],
  '/logs':      ['patient', 'doctor', 'admin'],
  '/settings':  ['patient', 'doctor', 'receptionist', 'pharmacist', 'lab_tech', 'admin'],
}

// Public routes that anyone — including unauthenticated guests — may visit
const PUBLIC_PATHS = ['/', '/login', '/register', '/auth']

function getRequiredRoles(pathname: string): string[] | null {
  // Exact match first
  if (ROLE_REQUIRED[pathname]) return ROLE_REQUIRED[pathname]
  // Prefix match (handles /doctor/patient/... etc.)
  for (const prefix of Object.keys(ROLE_REQUIRED)) {
    if (pathname.startsWith(prefix + '/') || pathname.startsWith(prefix + '?')) {
      return ROLE_REQUIRED[prefix]
    }
  }
  return null // not a protected route
}

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl

  // Always allow public paths and Next.js internals
  if (PUBLIC_PATHS.some((p) => pathname === p || pathname.startsWith(p + '/'))) {
    return NextResponse.next()
  }

  const requiredRoles = getRequiredRoles(pathname)
  if (!requiredRoles) {
    // Path is not in any protected group — pass through
    return NextResponse.next()
  }

  // Read the role cookie written by AuthContext.login()
  const role = request.cookies.get('sanjeevani_session_role')?.value ?? null

  if (!role) {
    // Not authenticated — redirect to /login
    const loginUrl = request.nextUrl.clone()
    loginUrl.pathname = '/login'
    loginUrl.searchParams.set('error', 'unauthenticated')
    loginUrl.searchParams.set('next', pathname)
    return NextResponse.redirect(loginUrl)
  }

  if (!requiredRoles.includes(role)) {
    // Authenticated but wrong role — redirect to their own home
    const homeMap: Record<string, string> = {
      patient:       '/dashboard',
      doctor:        '/doctor',
      receptionist:  '/reception',
      pharmacist:    '/pharmacy',
      lab_tech:      '/lab',
      admin:         '/doctor',
    }
    const homeUrl = request.nextUrl.clone()
    homeUrl.pathname = homeMap[role] ?? '/login'
    homeUrl.searchParams.set('error', 'unauthorized')
    return NextResponse.redirect(homeUrl)
  }

  return NextResponse.next()
}

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico|manifest.json|sw.js|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
}
