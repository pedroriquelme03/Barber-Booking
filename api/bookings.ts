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
	if (req.method !== 'GET') {
		res.setHeader('Allow', 'GET');
		return res.status(405).json({ ok: false, error: 'Método não permitido' });
	}

	try {
		const professionalId = (req.query.professional_id as string) || undefined;
		const from = (req.query.from as string) || undefined; // yyyy-mm-dd
		const to = (req.query.to as string) || undefined;     // yyyy-mm-dd

		const client = await getClient();
		try {
			const params: any[] = [];
			const where: string[] = [];

			if (professionalId) {
				params.push(professionalId);
				where.push(`b.professional_id = $${params.length}`);
			}
			if (from) {
				params.push(from);
				where.push(`b.date >= $${params.length}`);
			}
			if (to) {
				params.push(to);
				where.push(`b.date <= $${params.length}`);
			}

			const whereSql = where.length ? `where ${where.join(' and ')}` : '';

			const sql = `
        select
          b.id as booking_id,
          b.date,
          b.time,
          b.professional_id,
          c.id as client_id,
          c.name as client_name,
          c.phone as client_phone,
          c.email as client_email,
          coalesce(sum(s.price * bs.quantity), 0)::numeric(10,2) as total_price,
          coalesce(sum(s.duration_minutes * bs.quantity), 0)::int as total_duration_minutes,
          json_agg(
            json_build_object(
              'id', s.id,
              'name', s.name,
              'price', s.price,
              'duration_minutes', s.duration_minutes,
              'quantity', bs.quantity
            )
            order by s.name
          ) filter (where s.id is not null) as services
        from public.bookings b
        join public.clients c on c.id = b.client_id
        left join public.booking_services bs on bs.booking_id = b.id
        left join public.services s on s.id = bs.service_id
        ${whereSql}
        group by b.id, c.id
        order by b.date asc, b.time asc
      `;

			const { rows } = await client.query(sql, params);
			return res.status(200).json({ ok: true, bookings: rows });
		} finally {
			await client.end();
		}
	} catch (err: any) {
		return res.status(500).json({ ok: false, error: err?.message || 'Erro inesperado' });
	}
}

