"""
Comprueba que existan archivos críticos del front antes de subir a producción.
Uso: python scripts/verify-front-deploy.py
Salida: OK o lista de rutas faltantes (exit 1).
"""
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1] / "front"

# Si falta alguno en el servidor → 404 o JS desactualizado.
REQUIRED = [
    "paginas/panel/capacitacion.html",
    "dist/js/components/MenuComponent.js",
    "dist/js/utils/capacitacionTourAuto.js",
    "dist/js/components/CapacitacionHelpFab.js",
    "dist/js/components/CapacitacionSetupWizard.js",
    "dist/js/utils/capacitacionPaths.js",
    "dist/js/auth.js",
    "index.html",
]


def main() -> None:
    missing = []
    for rel in REQUIRED:
        p = ROOT / rel
        if not p.is_file():
            missing.append(rel)
    if missing:
        print("Faltan archivos en el repo (revisar antes de desplegar):")
        for m in missing:
            print(f"  - front/{m}")
        raise SystemExit(1)
    print("verify-front-deploy: OK —", len(REQUIRED), "archivos críticos presentes bajo front/")
    print(
        "Recuerda en el servidor: misma estructura (p. ej. paginas/panel/capacitacion.html), "
        "y purgar caché CDN (Cloudflare) si sigue 404 o JS viejo."
    )


if __name__ == "__main__":
    main()
