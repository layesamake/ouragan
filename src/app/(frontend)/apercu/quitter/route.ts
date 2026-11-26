import { draftMode } from 'next/headers'
import { redirect } from 'next/navigation'

/** GET /apercu/quitter — revient au site tel que le voient les visiteurs. */
export async function GET() {
  ;(await draftMode()).disable()
  redirect('/')
}
