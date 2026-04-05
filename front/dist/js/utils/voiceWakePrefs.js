import { GeckoCommands } from '../components/GeckoCommands.js';

export const VOICE_WAKE_STORAGE_KEY = 'grobo_voice_wake_aliases';

/**
 * Normaliza una frase de activación: minúsculas, sin acentos, solo a-z 0-9, 2–32 chars.
 * @param {string} w
 * @returns {string|null}
 */
export function sanitizeOneWakeToken(w) {
    const norm = String(w || '')
        .trim()
        .toLowerCase()
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '');
    const alnum = norm.replace(/[^a-z0-9]/g, '');
    if (alnum.length < 2 || alnum.length > 32) return null;
    return alnum;
}

/**
 * @param {string} text — líneas o separadas por coma/punto y coma
 * @returns {string[]}
 */
export function sanitizeWakeTokensFromTextarea(text) {
    const lines = String(text || '').split(/[\n,;]+/);
    const out = [];
    for (const line of lines) {
        const t = sanitizeOneWakeToken(line);
        if (t) out.push(t);
        if (out.length >= 15) break;
    }
    return [...new Set(out)];
}

export function getCustomWakeWords() {
    try {
        const raw = localStorage.getItem(VOICE_WAKE_STORAGE_KEY);
        if (!raw) return [];
        const j = JSON.parse(raw);
        return Array.isArray(j) ? j.filter((x) => typeof x === 'string' && x.length >= 2) : [];
    } catch {
        return [];
    }
}

/** @param {string[]} arr */
export function persistCustomWakeWords(arr) {
    const clean = [];
    for (const x of arr) {
        const t = sanitizeOneWakeToken(x);
        if (t) clean.push(t);
        if (clean.length >= 15) break;
    }
    const uniq = [...new Set(clean)];
    localStorage.setItem(VOICE_WAKE_STORAGE_KEY, JSON.stringify(uniq));
    return uniq;
}

export function getEffectiveWakeWords() {
    return [...new Set([...GeckoCommands.wakewords, ...getCustomWakeWords()])];
}

/** Aplica voz_wake_aliases del servidor a localStorage (si existe). */
export function mergeVoiceWakeAliasesFromServer(dbConfig) {
    if (!dbConfig || dbConfig.voice_wake_aliases == null || dbConfig.voice_wake_aliases === '') return;
    try {
        const raw = dbConfig.voice_wake_aliases;
        const j = typeof raw === 'string' ? JSON.parse(raw) : raw;
        if (Array.isArray(j)) {
            localStorage.setItem(VOICE_WAKE_STORAGE_KEY, JSON.stringify(j));
        }
    } catch (e) {
        console.warn('mergeVoiceWakeAliasesFromServer', e);
    }
}

/**
 * Sesgo opcional del reconocedor (Chrome / Edge suelen soportarlo; Firefox no).
 * @param {SpeechRecognition} recognition
 * @param {string[]} effectiveWakeWords
 */
export function applyOptionalSpeechGrammar(recognition, effectiveWakeWords) {
    const Ctor = window.SpeechGrammarList || window.webkitSpeechGrammarList;
    if (!Ctor || !recognition || !effectiveWakeWords?.length) return;
    try {
        const safe = effectiveWakeWords
            .filter((w) => /^[a-z0-9]{2,32}$/.test(String(w)))
            .slice(0, 40);
        if (!safe.length) return;
        const alts = safe.join(' | ');
        const grammar = `#JSGF V1.0; grammar grobowake; public <w> = ${alts} ;`;
        const list = new Ctor();
        list.addFromString(grammar, 1);
        recognition.grammars = list;
    } catch (e) {
        console.warn('SpeechGrammarList omitido:', e);
    }
}
