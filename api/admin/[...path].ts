import { handleAdminRequest } from '../../server/adminHttp.ts'

export async function GET(request: Request) {
  return handleAdminRequest(request)
}

export async function POST(request: Request) {
  return handleAdminRequest(request)
}

export async function PUT(request: Request) {
  return handleAdminRequest(request)
}

export async function DELETE(request: Request) {
  return handleAdminRequest(request)
}
