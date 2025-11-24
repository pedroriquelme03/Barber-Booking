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
	if (req.method === 'GET') {
		try {
			const professionalId = (req.query.professional_id as string) || undefined;
			const from = (req.query.from as string) || undefined; // yyyy-mm-dd
			const to = (req.query.to as string) || undefined;     // yyyy-mm-dd
			const serviceId = (req.query.service_id as string) || undefined;
			const clientQuery = (req.query.client as string) || undefined; // name/email/phone ilike
			const time = (req.query.time as string) || undefined; // HH:MM
			const timeFrom = (req.query.time_from as string) || undefined; // HH:MM
			const timeTo = (req.query.time_to as string) || undefined;     // HH:MM
	
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
				if (serviceId) {
					params.push(serviceId);
					where.push(`exists (select 1 from public.booking_services x where x.booking_id = b.id and x.service_id = $${params.length})`);
				}
				if (clientQuery) {
					params.push(`%${clientQuery}%`);
					params.push(`%${clientQuery}%`);
					params.push(`%${clientQuery}%`);
					where.push(`(c.name ilike $${params.length-2} or c.email ilike $${params.length-1} or c.phone ilike $${params.length})`);
				}
				if (time) {
					params.push(`${time}:00`);
					where.push(`b.time = $${params.length}`);
				} else if (timeFrom) {
					params.push(`${timeFrom}:00`);
					where.push(`b.time >= $${params.length}`);
				}
				if (!time && timeTo) {
					params.push(`${timeTo}:00`);
					where.push(`b.time <= $${params.length}`);
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

	if (req.method === 'POST') {
		try {
			// Parse robusto do corpo (Vercel pode entregar string ou objeto)
			const raw = (req.body ?? {}) as unknown;
			const parsed = typeof raw === 'string' ? (() => { try { return JSON.parse(raw); } catch { return {}; } })() : raw;

			const body = (parsed || {}) as {
				date?: string; // yyyy-mm-dd
				time?: string; // HH:MM or HH:MM:SS
				professional_id?: string | null;
				client?: { name?: string; email?: string; phone?: string; notes?: string | null };
				services?: Array<{ id: number; quantity?: number }>;
			};

			const date = body.date;
			const timeRaw = body.time;
			const professionalId = body.professional_id ?? null;
			const clientPayload = body.client || {};
			const services = body.services || [];

			if (!date || !timeRaw) {
				return res.status(400).json({ ok: false, error: 'date e time são obrigatórios' });
			}
			if (!clientPayload.name || !clientPayload.email || !clientPayload.phone) {
				return res.status(400).json({ ok: false, error: 'client.name, client.email e client.phone são obrigatórios' });
			}
			if (!services.length) {
				return res.status(400).json({ ok: false, error: 'services não pode ser vazio' });
			}

			const time = timeRaw.length === 5 ? `${timeRaw}:00` : timeRaw;

			const client = await getClient();
			try {
				await client.query('BEGIN');

				// obter ou criar cliente por email
				const existing = await client.query(
					`select id from public.clients where email = $1 limit 1`,
					[clientPayload.email]
				);
				let clientId: string;
				if (existing.rows[0]?.id) {
					clientId = existing.rows[0].id;
					// opcional: atualizar dados
					await client.query(
						`update public.clients set name = $1, phone = $2, notes = coalesce($3, notes), updated_at = now() where id = $4`,
						[clientPayload.name, clientPayload.phone, clientPayload.notes ?? null, clientId]
					);
				} else {
					const inserted = await client.query(
						`insert into public.clients (name, phone, email, notes)
             values ($1, $2, $3, $4) returning id`,
						[clientPayload.name, clientPayload.phone, clientPayload.email, clientPayload.notes ?? null]
					);
					clientId = inserted.rows[0].id;
				}

				// criar booking
				const bookingIns = await client.query(
					`insert into public.bookings (date, time, professional_id, client_id)
           values ($1, $2, $3, $4)
           returning id`,
					[date, time, professionalId, clientId]
				);
				const bookingId = bookingIns.rows[0].id as string;

				// inserir serviços (quantidade default 1)
				for (const s of services) {
					await client.query(
						`insert into public.booking_services (booking_id, service_id, quantity)
             values ($1, $2, $3)`,
						[bookingId, s.id, s.quantity ?? 1]
					);
				}

				await client.query('COMMIT');
				return res.status(201).json({ ok: true, booking_id: bookingId });
			} catch (e) {
				try { await client.query('ROLLBACK'); } catch {}
				// Logar o erro no server para diagnóstico
				console.error('POST /api/bookings failed:', e);
				throw e;
			} finally {
				try { await client.end(); } catch {}
			}
		} catch (err: any) {
			return res.status(500).json({
				ok: false,
				error: err?.message || 'Erro inesperado',
			});
		}
	}

	res.setHeader('Allow', 'GET, POST');
	return res.status(405).json({ ok: false, error: 'Método não permitido' });
}

