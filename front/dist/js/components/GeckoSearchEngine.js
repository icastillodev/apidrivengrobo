export class GeckoSearchEngine {
    static analyze(input) {
        let cleanInput = input.trim();
        
        // Comandos (QR, PDF)
        const cmdMatch = cleanInput.match(/^(qr|pdf|go)\s+:?\s*(\d+)$/i);
        if (cmdMatch) {
            return { type: 'command', action: cmdMatch[1].toLowerCase(), value: cmdMatch[2] };
        }

        let scope = 'global';
        let term = cleanInput;

        // Si escribes "caja 1", limpia el término a "1" y fija el scope
        const patterns = [
            { key: 'alojamiento', words: ['alojamiento', 'aloj', 'caja', 'housing'] },
            { key: 'protocolo', words: ['protocolo', 'prot', 'expediente'] },
            { key: 'pedido', words: ['pedido', 'form', 'formulario', 'solicitud', 'orden'] },
            { key: 'usuario', words: ['usuario', 'user', 'inv', 'investigador'] }
        ];

        for (const p of patterns) {
            const regex = new RegExp(`^(${p.words.join('|')})\\s+(.*)`, 'i');
            const match = cleanInput.match(regex);
            if (match) {
                scope = p.key;
                term = match[2];
                break;
            }
        }

        return { type: 'search', scope: scope, term: term.trim() };
    }
}