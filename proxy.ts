import { NextResponse } from 'next/server';

export function proxy(request: Request) {
  const requestId = request.headers.get('x-request-id') ?? crypto.randomUUID();
  const headers = new Headers(request.headers);
  headers.set('x-request-id', requestId);

  const response = NextResponse.next({ request: { headers } });
  response.headers.set('x-request-id', requestId);
  response.headers.set('x-content-type-options', 'nosniff');
  response.headers.set('referrer-policy', 'no-referrer');
  return response;
}

export const config = {
  matcher: ['/api/:path*'],
};
