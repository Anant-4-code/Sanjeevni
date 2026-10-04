import { NextResponse, type NextRequest } from 'next/server'

// BUG-RBAC-04 FIX: Reads the session cookie written by login() and returns the
// parsed role. In production this would verify a Supabase JWT; here we read the
// same localStorage-mirrored cookie so the Edge middleware can gate routes.
export async function updateSession(request: NextRequest) {
  // Middleware cannot read localStorage (Edge runtime). We read the cookie
  // sanjeevani_session_role that login() sets alongside the localStorage entry.
  const roleCookie = request.cookies.get('sanjeevani_session_role')?.value ?? null
  return { role: roleCookie, response: NextResponse.next() }
}
