import { describe, it, expect, vi, beforeEach } from 'vitest'
import { POST as contactPost } from '@/app/api/contact/route'

vi.mock('resend', () => ({
	Resend: vi.fn().mockImplementation(() => ({
		emails: { send: vi.fn().mockResolvedValue({ data: { id: '123' } }) },
	})),
}))

const basePayload = { name: 'Tester', email: 'tester@example.com', message: 'Hello there' }

describe('contact route', () => {
	beforeEach(() => {
		vi.unstubAllEnvs()
	})

	it('returns 400 on validation failure', async () => {
		const res = await contactPost(
			new Request('http://test/api/contact', {
				method: 'POST',
				body: JSON.stringify({ bad: true }),
			}),
		)
		expect(res.status).toBe(400)
	})

	it('falls back (503) when env not configured', async () => {
		const res = await contactPost(
			new Request('http://test/api/contact', { method: 'POST', body: JSON.stringify(basePayload) }),
		)
		expect(res.status).toBe(503)
		const json = await res.json()
		expect(json.result.accepted).toBe(false)
	})

	it('accepts and 202 when env configured', async () => {
		vi.stubEnv('CONTACT_PROVIDER_API_KEY', 'key')
		vi.stubEnv('CONTACT_FROM_ADDRESS', 'from@example.com')
		vi.stubEnv('CONTACT_TO_ADDRESS', 'to@example.com')
		const res = await contactPost(
			new Request('http://test/api/contact', { method: 'POST', body: JSON.stringify(basePayload) }),
		)
		expect(res.status).toBe(202)
		const json = await res.json()
		expect(json.result.accepted).toBe(true)
	})
})
