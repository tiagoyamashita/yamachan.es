import { handleReservationsRequest } from '../server/reservationsHttp.ts'

export async function GET(request: Request) {
  return handleReservationsRequest(request)
}

export async function POST(request: Request) {
  return handleReservationsRequest(request)
}
