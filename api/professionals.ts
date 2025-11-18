import type { VercelRequest, VercelResponse } from '@vercel/node';
import { Client } from 'pg';

async function getClient() {
	const databaseUrl = process.env.DATABASE_URL;
	if (!databaseUrl) {
		throw new Error('DATABASE_URL não configurada');
	}
	const client = new Client({
		connectionString: databaseUrl,
		ssl: { rejectUnauthorized: false },
	});
	await client.connect();
	return client;
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
	try {
		if (req.method === 'GET') {
			const client = await getClient();
			try {
				const { rows } = await client.query(
					`select id, name, email, phone, is_active, created_at, updated_at
           from public.professionals
           order by name asc`
				);
				return res.status(200).json({ ok: true, professionals: rows });
			} finally {
				await client.end();
			}
		}

		if (req.method === 'POST') {
			const { name, email, phone, is_active } = (req.body || {}) as {
				name?: string;
				email?: string;
				phone?: string;
				is_active?: boolean;
			};

			if (!name || !email || !phone) {
				return res.status(400).json({ ok: false, error: 'name, email e phone são obrigatórios' });
			}

			const client = await getClient();
			try {
				const { rows } = await client.query(
					`insert into public.professionals (name, email, phone, is_active)
           values ($1, $2, $3, coalesce($4, true))
           returning id, name, email, phone, is_active, created_at, updated_at`,
					[name, email, phone, is_active]
				);
				return res.status(201).json({ ok: true, professional: rows[0] });
			} finally {
				await client.end();
			}
		}

		res.setHeader('Allow', 'GET, POST');
		return res.status(405).json({ ok: false, error: 'Método não permitido' });
	} catch (err: any) {
		return res.status(500).json({ ok: false, error: err?.message || 'Erro inesperado' });
	}
}

