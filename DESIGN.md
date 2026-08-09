# DESIGN.md — chat-general

Dirección producida con el skill `ux-ui-audit` (`E:\Proyectos\agente-ux-ui`),
siguiendo su flujo obligatorio. Este archivo es la fuente de verdad de los
tokens: si un valor no está acá, no se usa en el código.

## 1. Tensión del producto

> Un motor cuyo valor entero es la **maquinaria** —qué tool corrió, con qué
> input, qué devolvió, de qué documento salió la cita— y cuya interfaz por
> defecto la esconde en dos globos grises idénticos a los de cualquier otro
> chat.

No es "un chat con IA". Es un **instrumento** que además conversa. La versión
anterior invertía esa jerarquía: el razonamiento del modelo, los tool calls y
las fuentes del RAG se renderizaban todos dentro de la misma burbuja, y la
maquinaria aparecía como `JSON.stringify(..., null, 2)` dentro de un `<pre>`.

## 2. Referencias reales navegadas en vivo

Inspeccionadas con `getComputedStyle` el 2026-08-09, no de memoria.

| Referencia | Tipo | h1 real | Texto funcional | Radios | Tipografías reales |
|---|---|---|---|---|---|
| [langfuse.com](https://langfuse.com) | Producto shipeado (observabilidad de agentes) | **35px / peso 500** | baja a 10–11px | 2–4px | `f37Analog` (licencia) + `geistMono` + Inter |
| [braintrust.dev](https://braintrust.dev) | Producto shipeado (observabilidad de agentes) | **48px / peso 400** | baja a **9px** | 3–6px | `btSans` (licencia) + `suisseMono` |
| [recent.design](https://recent.design) | Comunidad | — | — | — | galería JS, sin estructura inspeccionable |

**Estructura robada (no la piel):** las dos jerarquizan por **densidad y
superficie**, no por escala ni por negrita. El display va en peso bajo
(400–500), el registro funcional baja a 9–11px, los radios son chicos y el
mono es funcional (datos), nunca decorativo.

**Limitación declarada (regla D5):** `recent.design` renderiza su galería por
JS y no expone enlaces ni estilos inspeccionables, así que la segunda fuente
—la de comunidad— **no** aportó estructura. La dirección se apoya en dos
productos reales shipeados, ambos del mismo rubro. Queda anotado en vez de
improvisar una tercera referencia "de memoria".

## 3. Eje de diferenciación

> **El eje es la DENSIDAD. Todo lo demás es deliberadamente convencional.**

El transcript deja de ser un messenger y pasa a ser un **registro de
ejecución**: una sola columna, sin globos, sin avatares, sin centrado, con una
canaleta izquierda monoespaciada que numera los pasos y la maquinaria como
contenido tipado de primera clase.

Prueba de compromiso (`direccion-creativa.md`):

- **Nombrable** — "el transcript es la traza de ejecución de Langfuse/Braintrust,
  no el hilo de un messenger".
- **Falsable** — esta dirección **prohíbe** burbujas, avatares, `rounded-2xl`,
  columna centrada angosta y el razonamiento como itálica gris. Una dirección
  "chat moderno y limpio" permitiría las cinco.
- **Costosa** — se resigna la calidez de chat de consumo. Esto va a parecer un
  instrumento, no WhatsApp. Es la renuncia deliberada.

Por eso el **color es deliberadamente convencional**: casi monocromo frío. El
color entra solo como **señal funcional** (estado de tool), nunca como
decoración de marca. Empujar también el eje cromático produciría ruido.

## 4. Tipografías

Ninguna está en la lista de quemadas de `registro/usadas.md`.

- **Instrument Sans** — prosa, UI y controles. Grotesca con buen rendimiento a
  tamaño chico, que es donde vive este diseño.
- **IBM Plex Mono** — el **registro de maquinaria**: canaleta, nombres de tool,
  claves, valores, scores, duraciones. Es funcional, no decorativo: no aparece
  en prosa, ni en títulos, ni como eyebrow.

**Limitación declarada:** las dos son Google Fonts gratuitas. La skill señala
(caso Griffin) que una tipografía con licencia es de por sí señal de decisión
humana, porque las herramientas de IA solo alcanzan las gratuitas por defecto.
Acá no hay presupuesto de licencia, así que el eje **no** es el tipográfico —
por eso es la densidad.

Quemadas y evitadas: Fraunces, Public Sans, JetBrains Mono, Hanken Grotesk,
Space Mono, Space Grotesk; Inter/Roboto/Arial como única decisión.

## 5. Escala tipográfica

Ratio **1,25**, 5 pasos (T12: ≤10 pasos con ratio identificable; T13: producto
denso 1,2–1,25).

| Token | px | Uso |
|---|---|---|
| `--t-mono` | 13 | Registro: canaleta, claves, valores, scores |
| `--t-body` | 16 | Prosa del asistente y del usuario (T5: ≥16px) |
| `--t-lg` | 20 | Nombre de la app |
| `--t-xl` | 25 | — reservado |
| `--t-2xl` | 31 | — reservado |

Piso absoluto respetado: **nada por debajo de 13px** (T6 exige ≥12px). No hay
9–11px como en las referencias precisamente porque acá ese registro se lee, no
se escanea.

`line-height` (T7, función de la medida; T9, decrece al crecer el tamaño):

- Prosa a 16px con medida de **64ch** → **1,55**.
- Registro mono a 13px → **1,45**.
- Título a 20px → **1,2**.

## 6. Color

Casi monocromo frío con tinte azul. **Sin `#000` ni `#fff` puros** (C7).
**Sin `rgba()`/opacidad para texto** (C5): todos los secundarios son color
sólido calculado.

### Superficies

| Token | Claro | Oscuro |
|---|---|---|
| `--paper` | `#EEF0F3` | `#14171C` |
| `--raised` | `#E0E4E9` | `#1D222A` |
| `--sunken` | `#D5DAE1` | `#262C36` |

### Texto — ratios verificados contra **las tres** superficies (C6)

Calculado con la fórmula WCAG y **truncado, nunca redondeado** (C4).

| Token | Claro | paper | raised | sunken | Oscuro | paper | raised | sunken |
|---|---|---|---|---|---|---|---|---|
| `--ink` | `#0E1116` | 16,56 | 14,80 | 13,45 | `#F2F5F8` | 16,41 | 14,60 | 12,82 |
| `--ink-2` | `#414A55` | 7,87 | 7,04 | 6,39 | `#A9B4C0` | 8,53 | 7,58 | 6,66 |
| `--ink-3` | `#505A65` | 6,14 | 5,49 | **4,99** | `#8E9AA7` | 6,27 | 5,57 | 4,90 |
| `--ok` | `#186A3F` | 5,79 | 5,18 | 4,71 | `#5FD79A` | 9,98 | 8,88 | 7,80 |
| `--warn` | `#8A4B08` | 5,95 | 5,32 | 4,83 | `#F0AE5E` | 9,34 | 8,30 | 7,30 |

Todos ≥4,5:1 en todas las superficies donde se usan.

> **Corregido durante el diseño:** el primer valor de `--ink-3` claro era
> `#5A646F` y daba **4,28:1** sobre `sunken` — falla AA. Es exactamente la
> trampa que el skill documenta: el ratio depende del fondo compuesto y no se
> nota a ojo. Se oscureció a `#505A65`.

`--ok` y `--warn` son **señal funcional**, no decoración, y nunca son el único
portador de información (C8): siempre van con texto de estado y con una forma
distinta en la canaleta.

Acentos saturados por pantalla: **≤2** (C9), y solo si hay tools con estado.

### Fills sólidos

El turno del usuario se marca con **fill sólido de `--ink`** (texto invertido,
17,28:1), no con una burbuja de color. Es la única inversión del sistema.

## 7. Spacing

Escala 4pt: 4 / 8 / 12 / 16 / 24 / 32 / 48.
Canaleta izquierda fija: **72px** (numeración + regla vertical).

## 8. Radios

- **0px** en las filas de maquinaria y en la traza — es un instrumento, no una tarjeta.
- **3px** en controles (input, botones), tomado del rango real de las referencias (2–6px).

Dos valores deliberados. No hay radio uniforme de 16px en ningún lado.

## 9. Motion

Cuatro vocabularios distintos en la misma pantalla, ninguno es `fade+slide-up`
(anti-patrón explícito):

1. **Trazo de regla** — la fila nueva entra dibujando su tick de canaleta (`scaleY` desde 0).
2. **Barrido de progreso** — la tool en ejecución barre una banda horizontal en su fila.
3. **Cursor de bloque** — el streaming muestra un bloque mono que parpadea a **1 Hz** (E5: <3 flashes/s).
4. **Count-up** — la duración de la tool cuenta hasta su valor final.

Easing: `cubic-bezier(.2,.8,.3,1)` para entradas; `cubic-bezier(.65,0,.35,1)`
para micro-interacciones. Nunca bounce ni elástico.

**`prefers-reduced-motion: reduce` anula los cuatro** (E4).

## 10. Accesibilidad — decisiones deliberadas

- `<html lang="es">` — estaba en `"en"` con contenido en español (H1).
- El campo de mensaje lleva **label visible** en la canaleta, no solo
  placeholder (H6/E6). Encaja con la estética de instrumento en vez de pelearse
  con ella.
- Foco visible en todo interactivo: anillo de 2px de `--ink` con offset (E2).
- Targets ≥24×24px (E3).
- Los estados de tool no dependen solo del color (C8).
