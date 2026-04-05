import { UserPreferences } from './menujs/MenuConfig.js';
import {
    getCustomWakeWords,
    sanitizeWakeTokensFromTextarea,
    persistCustomWakeWords,
} from '../utils/voiceWakePrefs.js';

/**
 * Palabras de activación personalizadas (sesgo del reconocedor en Chrome/Edge + misma lista en el detector).
 */
export async function openVoiceRefinementModal() {
    const t = window.txt?.menu || {};
    const initial = getCustomWakeWords().join('\n');
    const SwalRef = typeof Swal !== 'undefined' ? Swal : window.Swal;

    if (!SwalRef || typeof SwalRef.fire !== 'function') {
        const lines = window.prompt(t.voice_train_title || 'Voz', initial);
        if (lines == null) return;
        const clean = sanitizeWakeTokensFromTextarea(lines);
        persistCustomWakeWords(clean);
        await UserPreferences.saveBackend({ voiceWakeAliases: JSON.stringify(clean) });
        window.GeckoVoice?.restartAfterWakePrefsChanged?.();
        return;
    }

    const result = await SwalRef.fire({
        title: t.voice_train_title || '',
        html: `<p class="text-start small text-muted mb-2">${t.voice_train_intro || ''}</p>`,
        input: 'textarea',
        inputValue: initial,
        inputPlaceholder: t.voice_train_placeholder || '',
        footer: `<span class="small text-muted">${t.voice_train_hint || ''}</span>`,
        showCancelButton: true,
        confirmButtonText: t.voice_train_confirm || 'OK',
        cancelButtonText: t.voice_train_cancel || 'Cancel',
        preConfirm: (value) => sanitizeWakeTokensFromTextarea(value),
    });

    if (!result.isConfirmed || !Array.isArray(result.value)) return;
    const clean = result.value;
    persistCustomWakeWords(clean);
    await UserPreferences.saveBackend({ voiceWakeAliases: JSON.stringify(clean) });
    await SwalRef.fire({
        icon: 'success',
        title: t.voice_train_saved || '',
        timer: 2200,
        showConfirmButton: false,
    });
    window.GeckoVoice?.restartAfterWakePrefsChanged?.();
}
