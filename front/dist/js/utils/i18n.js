// dist/js/utils/i18n.js

export async function loadLanguage(lang = null) {
    // 1. Si no viene idioma, buscamos en localStorage o usamos español
    const selectedLang = lang || localStorage.getItem('lang') || 'es';
    
    console.log(`⏳ Cargando idioma: ${selectedLang}...`);

    try {
        // 2. Importación dinámica (Ojo a la ruta relativa)
        // Esto busca en: dist/js/utils/i18n/es.js
        const module = await import(`./i18n/${selectedLang}.js`);
        
        // 3. Verificamos que el módulo tenga lo que esperamos
        if (!module[selectedLang]) {
            throw new Error(`El archivo ${selectedLang}.js cargó, pero no exporta 'const ${selectedLang}'`);
        }

        // 4. Asignamos a la variable global
        window.txt = module[selectedLang];
        
        console.log(`✅ Idioma cargado correctamente: ${selectedLang}`);
        return true;

    } catch (error) {
        console.error("❌ ERROR CRÍTICO EN loadLanguage:", error);
        
        // Intento de Fallback: Si falló inglés o portugués, intentamos cargar español
        if (selectedLang !== 'es') {
            console.warn("🔄 Reintentando con español (es)...");
            return await loadLanguage('es');
        }
        
        return false;
    }
}
// Agrega esto a tu i18n.js o a un archivo de utilidades central
export const translatePage = () => {
    const elements = document.querySelectorAll('[data-i18n]');

    elements.forEach(el => {
        const path = el.getAttribute('data-i18n');
        const keys = path.split('.');
        
        let text = window.txt;
        keys.forEach(key => { text = text ? text[key] : null; });

        if (text) {
            // USAMOS innerHTML para que respete los <strong> o <br>
            if (el.tagName === 'INPUT') el.placeholder = text;
            else el.innerHTML = text; 
        }
    });
};