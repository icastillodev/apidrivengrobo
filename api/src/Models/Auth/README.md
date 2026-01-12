# Módulo de Autenticación Contextual (Auth)

## Descripción
Gestiona el acceso multi-institución permitiendo el login cruzado basado en la columna `DependenciaInstitucion`.

## Tablas Utilizadas
- `usuarioe`: Credenciales y vinculación.
- `institucion`: Verificación de slugs y grupos de dependencia.
- `tienetipor`: Roles de acceso.

## Endpoints
- `POST /login`: Recibe `{username, password, instSlug}`.
- `POST /register`: Solo permite creación de perfiles con rol 'Usuario'.

## Lógica de Permisos
1. Si `User.IdInstitucion == Request.IdInstitucion` -> **Acceso Permitido**.
2. Si `User.Dependencia == Request.Dependencia` -> **Acceso Permitido (Mismo Grupo)**.
3. De lo contrario -> **Acceso Denegado**.