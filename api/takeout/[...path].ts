import { handleTakeoutRequest } from '../../server/takeoutHttp.ts'

export async function GET(request: Request) {
  return handleTakeoutRequest(request)
}

export async function POST(request: Request) {
  return handleTakeoutRequest(request)
}
