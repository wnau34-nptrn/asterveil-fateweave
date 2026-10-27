/* global Response, URL */
// Infrastructure probe only; player accounts and game commands are not enabled.
export default {
  fetch(request) {
    const headers = { 'Cache-Control': 'no-store' };
    if (new URL(request.url).pathname !== '/health') {
      return Response.json({ error: 'not_found' }, { status: 404, headers });
    }
    if (request.method !== 'GET' && request.method !== 'HEAD') {
      return Response.json({ error: 'method_not_allowed' }, {
        status: 405, headers: { ...headers, Allow: 'GET, HEAD' },
      });
    }
    const response = Response.json({ status: 'ok', service: 'asterveil-api', environment: 'dev' }, { headers });
    return request.method === 'HEAD'
      ? new Response(null, { status: response.status, headers: response.headers })
      : response;
  },
};
