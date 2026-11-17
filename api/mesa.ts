import { handleTableOrderRequest } from '../server/tableOrderHttp.ts'

export async function GET(request: Request) {
  return handleTableOrderRequest(request)
}

export async function POST(request: Request) {
  return handleTableOrderRequest(request)
}
