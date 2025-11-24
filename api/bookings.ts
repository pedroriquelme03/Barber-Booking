// Tipos afrouxados para evitar dependência de @vercel/node em build local
import { Client } from 'pg';
import { createClient as createSupabaseClient } from '@supabase/supabase-js';

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

export default async function handler(req: any, res: any) {
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

			// Supabase server client (usa service role se disponível)
			const supabaseUrl =
				process.env.SUPABASE_URL ||
				process.env.VITE_SUPABASE_URL;
			const supabaseKey =
				process.env.SUPABASE_SERVICE_ROLE_KEY || // recomendado para server
				process.env.VITE_SUPABASE_ANON_KEY;

			if (!supabaseUrl || !supabaseKey) {
				return res.status(500).json({
					ok: false,
					code: 'SUPABASE_ENV_MISSING',
					error: 'SUPABASE_URL/SUPABASE_SERVICE_ROLE_KEY não configurados',
				});
			}

			const supabase = createSupabaseClient(supabaseUrl, supabaseKey);

			// validar profissional (se informado)
			if (professionalId) {
				const { data: prof, error: profErr } = await supabase
					.from('professionals')
					.select('id')
					.eq('id', professionalId)
					.limit(1)
					.single();
				if (profErr || !prof) {
					return res.status(400).json({
						ok: false,
						code: 'PROFESSIONAL_NOT_FOUND',
						error: `Profissional não encontrado: ${professionalId}`,
					});
				}
			}

			// validar serviços
			const serviceIds = services.map(s => s.id);
			if (serviceIds.length) {
				const { data: foundServices, error: svcErr } = await supabase
					.from('services')
					.select('id')
					.in('id', serviceIds);
				if (svcErr) {
					return res.status(500).json({ ok: false, error: svcErr.message });
				}
				const foundIds = new Set<number>((foundServices || []).map(r => Number(r.id)));
				const missing = serviceIds.filter(id => !foundIds.has(Number(id)));
				if (missing.length) {
					return res.status(400).json({
						ok: false,
						code: 'SERVICES_NOT_FOUND',
						error: `IDs de serviços inexistentes: ${missing.join(', ')}`,
						details: { sent: serviceIds, found: Array.from(foundIds) }
					});
				}
			}

			// obter ou criar cliente por email
			let clientId: string | null = null;
			const { data: existingClient, error: findClientErr } = await supabase
				.from('clients')
				.select('id')
				.eq('email', clientPayload.email!)
				.limit(1)
				.single();
			if (existingClient?.id) {
				clientId = existingClient.id as unknown as string;
				// atualizar dados básicos
				await supabase
					.from('clients')
					.update({
						name: clientPayload.name,
						phone: clientPayload.phone,
						notes: clientPayload.notes ?? null,
						updated_at: new Date().toISOString(),
					})
					.eq('id', clientId);
			} else {
				const { data: insertedClient, error: insClientErr } = await supabase
					.from('clients')
					.insert({
						name: clientPayload.name,
						phone: clientPayload.phone,
						email: clientPayload.email,
						notes: clientPayload.notes ?? null,
					})
					.select('id')
					.single();
				if (insClientErr) {
					return res.status(500).json({ ok: false, error: insClientErr.message });
				}
				clientId = (insertedClient as any).id as string;
			}

			// criar booking
			const { data: bookingData, error: bookingErr } = await supabase
				.from('bookings')
				.insert({
					date,
					time,
					professional_id: professionalId,
					client_id: clientId,
				})
				.select('id')
				.single();
			if (bookingErr) {
				return res.status(500).json({ ok: false, error: bookingErr.message });
			}
			const bookingId = (bookingData as any).id as string;

			// inserir serviços
			const rows = services.map(s => ({
				booking_id: bookingId,
				service_id: s.id,
				quantity: s.quantity ?? 1,
			}));
			if (rows.length) {
				const { error: bsErr } = await supabase
					.from('booking_services')
					.insert(rows);
				if (bsErr) {
					return res.status(500).json({ ok: false, error: bsErr.message });
				}
			}

			return res.status(201).json({ ok: true, booking_id: bookingId });
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

