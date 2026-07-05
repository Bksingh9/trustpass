export async function GET(request: Request) {
  const requestId = request.headers.get("x-request-id") ?? crypto.randomUUID();

  return Response.json(
    {
      status: "ok",
      service: "trustpass-live",
      runtime: "sites-worker-d1",
      demo_data_enabled: false,
      request_id: requestId,
    },
    {
      headers: {
        "access-control-allow-headers": "content-type,x-request-id",
        "access-control-allow-methods": "GET,OPTIONS",
        "access-control-allow-origin": "*",
        "cache-control": "no-store",
        "x-request-id": requestId,
      },
    },
  );
}

export async function OPTIONS(request: Request) {
  const requestId = request.headers.get("x-request-id") ?? crypto.randomUUID();

  return new Response(null, {
    status: 204,
    headers: {
      "access-control-allow-headers": "content-type,x-request-id",
      "access-control-allow-methods": "GET,OPTIONS",
      "access-control-allow-origin": "*",
      "cache-control": "no-store",
      "x-request-id": requestId,
    },
  });
}
