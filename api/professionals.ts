// Tipagens relaxadas para evitar dependência local de @vercel/node
import { createClient as createSupabaseClient } from '@supabase/supabase-js';

export default async function handler(req: any, res: any) {
	try {
		const supabaseUrl =
			process.env.SUPABASE_URL ||
			process.env.VITE_SUPABASE_URL;
		const supabaseKey =
			process.env.SUPABASE_SERVICE_ROLE_KEY ||
			process.env.VITE_SUPABASE_ANON_KEY;
		if (!supabaseUrl || !supabaseKey) {
			return res.status(500).json({ ok: false, error: 'SUPABASE_URL/SUPABASE_SERVICE_ROLE_KEY não configurados' });
		}
		const supabase = createSupabaseClient(supabaseUrl, supabaseKey);

		if (req.method === 'GET') {
			const { data, error } = await supabase
				.from('professionals')
				.select('id, name, email, phone, is_active, created_at, updated_at')
				.order('name', { ascending: true });
			if (error) return res.status(500).json({ ok: false, error: error.message });
			return res.status(200).json({ ok: true, professionals: data || [] });
		}

		if (req.method === 'POST') {
			const raw = req.body ?? {};
			const body = typeof raw === 'string' ? (() => { try { return JSON.parse(raw); } catch { return {}; } })() : raw;
			const { name, email, phone, is_active } = (body || {}) as {
				name?: string;
				email?: string;
				phone?: string;
				is_active?: boolean;
			};
			if (!name || !email || !phone) {
				return res.status(400).json({ ok: false, error: 'name, email e phone são obrigatórios' });
			}
			const { data, error } = await supabase
				.from('professionals')
				.insert({
					name, email, phone,
					is_active: typeof is_active === 'boolean' ? is_active : true,
				})
				.select('id, name, email, phone, is_active, created_at, updated_at')
				.single();
			if (error) return res.status(500).json({ ok: false, error: error.message });
			return res.status(201).json({ ok: true, professional: data });
		}

		res.setHeader('Allow', 'GET, POST');
		return res.status(405).json({ ok: false, error: 'Método não permitido' });
	} catch (err: any) {
		return res.status(500).json({ ok: false, error: err?.message || 'Erro inesperado' });
	}
}

