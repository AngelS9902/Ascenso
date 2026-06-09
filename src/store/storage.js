import { createJSONStorage } from 'zustand/middleware'

// ─────────────────────────────────────────────────────────────────────────────
// CAPA DE PERSISTENCIA
//
// Hoy: localStorage (todo vive en el navegador, sin cuentas, 100% local).
// Mañana: Supabase. Esta es la ÚNICA pieza que habrá que cambiar para sincronizar
// entre dispositivos. La idea es reemplazar `() => localStorage` por un objeto
// con la misma forma (getItem/setItem/removeItem) que lea/escriba en Supabase:
//
//   import { createClient } from '@supabase/supabase-js'
//   const supabase = createClient(URL, ANON_KEY)
//   const supabaseStorage = {
//     getItem: async (k) => (await supabase.from('estado').select('data')
//                              .eq('user_id', uid).single()).data?.data ?? null,
//     setItem: async (k, v) => { await supabase.from('estado')
//                              .upsert({ user_id: uid, data: v }) },
//     removeItem: async (k) => { await supabase.from('estado').delete().eq('user_id', uid) },
//   }
//
// Como el store ya guarda todo el estado como un único JSON, migrar será directo.
// ─────────────────────────────────────────────────────────────────────────────

export const STORAGE_KEY = 'ascenso-estado'

export const persistStorage = createJSONStorage(() => localStorage)
