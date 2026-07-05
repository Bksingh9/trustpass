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
        "cache-control": "no-store",
        "x-request-id": requestId,
      },
    },
  );
}
