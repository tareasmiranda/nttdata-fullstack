# Instrucciones para el agente

Este archivo define cómo debe trabajar el agente de IA en este repositorio. Es la fuente de dirección persistente: sobrevive a cualquier conversación y aplica a toda sesión nueva.

## Contexto del proyecto

Este repositorio implementa la **Etapa 1 del Desafío Full Stack**: una vitrina de productos de supermercado. Consume un catálogo de ~4.032 productos provisto como `server/catalog.sqlite`.

- La consigna completa está en `docs/SPECIFICATION.md`.
- Las decisiones de arquitectura están en `docs/ARCHITECTURE.md`.
- Las pruebas que deben seguir pasando están en `docs/VERIFICATION.md`.

## Reglas duras

1. **Nunca editar `catalog.sqlite`.** El servidor la abre con `OPEN_READONLY`. Está excluida de Git.
2. **Nunca cargar el catálogo completo en el frontend.** Búsqueda, filtros y paginación se resuelven en el backend.
3. **Nunca inventar valores para campos faltantes.** Si un producto no tiene `imageUrl`, se muestra un placeholder. Si no tiene `description`, se deja vacío. No rellenar.
4. **No agregar dependencias** sin justificar por qué la solución sin ellas no es suficiente. El proyecto usa tres dependencias en el servidor (`express`, `cors`, `sqlite3`) y tres en el cliente (`react`, `react-dom`, `vite`). Mantenerlo así.
5. **No cambiar el esquema de la tabla `products`.** Las columnas son las que están documentadas en el README.
6. **No romper los contratos de la API** documentados en `docs/SPECIFICATION.md §3`. Si un cambio los modifica, actualizar ese archivo en el mismo commit.
7. **No copiar el mockup píxel por píxel.** La consigna lo prohíbe explícitamente. Mantener los comportamientos, no la apariencia literal.

## Flujo de trabajo esperado

Antes de escribir código:

1. Leer `docs/SPECIFICATION.md` y `docs/ARCHITECTURE.md`.
2. Si el pedido no está cubierto por la spec, preguntar antes de asumir.
3. Proponer un plan corto y esperar confirmación antes de tocar más de un archivo a la vez.

Al escribir código:

1. Cambios pequeños y verificables. Un endpoint o un componente por vez.
2. Correr `docs/VERIFICATION.md` tras cada cambio que toque la API.
3. Actualizar la documentación en el mismo commit que el código, si el cambio la afecta.

## Convenciones de código

- **Backend**: CommonJS (`require`), un archivo por responsabilidad. Sin frameworks adicionales.
- **Frontend**: ESM, componentes funcionales, hooks. Sin Redux, sin Zustand, sin router — el estado cabe en `useState`.
- **Nombres de archivos**: `PascalCase.jsx` para componentes, `camelCase.js` para módulos.
- **Idioma**: identificadores en inglés, textos visibles al usuario en español.
- **CSS**: se conserva el de `client/src/styles.css` tal como está. Las adiciones van al final del archivo, no se reescriben las reglas del mockup.

## Lo que el agente NO debe hacer

- Editar archivos fuera de `server/`, `client/`, y `docs/` sin pedir permiso.
- Correr `git push`, `git reset --hard`, o cualquier operación destructiva sobre el repositorio.
- Modificar `package.json` para agregar dependencias sin aprobación explícita.
- Introducir TypeScript, tests automatizados, ESLint, Prettier, o cualquier herramienta de build adicional sin que se le pida.
- Reescribir archivos completos cuando un diff pequeño alcanza.

## Cómo verificar el propio trabajo

Antes de declarar terminada cualquier tarea, correr al menos:

```bash
# Sanity del backend
curl -s http://localhost:3000/api/health

# Paginación
curl -s "http://localhost:3000/api/products?page=1&pageSize=12" | python3 -m json.tool | head -30

# Filtros
curl -s "http://localhost:3000/api/products/filters" | python3 -m json.tool

# Y navegar http://localhost:5173 en el navegador
```

Si se rompió algo de `docs/VERIFICATION.md`, arreglarlo antes de continuar.

## Registro de decisiones

Cuando el agente tome una decisión que no está cubierta por la spec, debe:

1. Anotarla en el mensaje de respuesta.
2. Si cambia el comportamiento visible, agregarla a la sección “Supuestos” de `docs/SPECIFICATION.md`.
3. Si cambia la división de responsabilidades, agregarla a `docs/ARCHITECTURE.md`.