import type { VercelRequest, VercelResponse } from '@vercel/node';
import { Client } from 'pg';

async function getClient() {
	const databaseUrl = process.env.DATABASE_URL;
	if (!databaseUrl) throw new Error('DATABASE_URL não configurada');
	const client = new Client({
		connectionString: databaseUrl,
		ssl: { rejectUnauthorized: false },
	});
	await client.connect();
	return client;
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
	if (req.method !== 'GET') {
		res.setHeader('Allow', 'GET');
		return res.status(405).json({ ok: false, error: 'Método não permitido' });
	}
	try {
		const client = await getClient();
		try {
			const { rows } = await client.query(
				`select id, name, price, duration_minutes, description
         from public.services
         order by name asc`
			);
			return res.status(200).json({ ok: true, services: rows });
		} finally {
			await client.end();
		}
	} catch (err: any) {
		return res.status(500).json({ ok: false, error: err?.message || 'Erro inesperado' });
	}
}

