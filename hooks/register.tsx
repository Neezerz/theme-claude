import type { EngineInterface, Register, ThemeMessageRule, ThemeSetArgs } from 'claude-code'

import { makeColors } from './make-colors.js'
import { SCENE_CYAN, SCENE_VIOLET } from './scene'

type Variant = 'violet' | 'cyan'

type Hex = NonNullable<ThemeMessageRule['color']>
type Anchors = { 'surface-0': string; 'text-primary': string } & Partial<
  Record<'surface-1' | 'surface-2' | 'surface-3' | 'text-secondary' | 'text-muted', string>
>

type Palette = {
  label: string
  roles: { accent: string; danger: string; success: string; warning: string; pro: string }
  anchors: Anchors
  glass: string
  heading: Hex
  bubble: Hex
  bubbleBorder: Hex
  halo: Hex
  tool: { color: Hex; bg: Hex; border: Hex }
}

const PALETTES: Record<Variant, Palette> = {
  // Nuit bleu-acier, circuits et lueurs cyan.
  cyan: {
    label: 'Circuit Noir',
    roles: { accent: '#3fd0e8', danger: '#ff5f7a', success: '#4fe0a8', warning: '#f2b84b', pro: '#9b8cff' },
    anchors: {
      'surface-0': '#080e12', 'surface-1': '#0e171d', 'surface-2': '#132028', 'surface-3': '#18262f',
      'text-primary': '#e3f1f6', 'text-secondary': '#a9c3cd', 'text-muted': '#7f9ba6',
    },
    glass: '#0a1318',
    heading: '#7fe6f5',
    bubble: '#0f2129',
    bubbleBorder: '#2a7f95',
    halo: '#3fd0e833',
    tool: { color: '#a9c3cd', bg: '#0c161bee', border: '#1d4b5c' },
  },
  // Brun profond, pistes cuivrées et impulsions violettes.
  violet: {
    label: 'Circuit Violet',
    roles: { accent: '#b48cff', danger: '#ff6b6b', success: '#7fd49a', warning: '#e0a050', pro: '#d08a4a' },
    anchors: {
      'surface-0': '#100b0c', 'surface-1': '#181112', 'surface-2': '#1f1617', 'surface-3': '#251a1b',
      'text-primary': '#f1e8ea', 'text-secondary': '#c9b8b4', 'text-muted': '#a3918c',
    },
    glass: '#140e0e',
    heading: '#cdb0ff',
    bubble: '#21162a',
    bubbleBorder: '#8a62c8',
    halo: '#b48cff33',
    tool: { color: '#c9b8b4', bg: '#1a1210ee', border: '#6a4430' },
  },
}

const SCENES: Record<Variant, string> = { cyan: SCENE_CYAN, violet: SCENE_VIOLET }

function build(variant: Variant): { look: ThemeSetArgs; base: ThemeSetArgs; unpainted?: string } {
  const p = PALETTES[variant]
  const { theme, problems } = makeColors({
    label: p.label,
    only: 'dark',
    roles: p.roles,
    dark: { gray: { anchors: p.anchors } },
    codeTheme: { dark: 'nord' },
  })
  const base: ThemeSetArgs = {
    colors: theme,
    overrideColorScheme: 'dark',
    backdrop: { scene: variant, glass: { blur: 18, tint: p.glass, opacity: 0.62 } },
  }
  const look: ThemeSetArgs = {
    ...base,
    style: {
      Heading: { color: p.heading, letterSpacing: 0.5 },
      UserMessage: {
        backgroundColor: p.bubble,
        borderColor: p.bubbleBorder,
        borderWidth: 1,
        radius: [12, 12, 2, 12],
        shadow: { x: 0, y: 0, blur: 14, color: p.halo },
      },
      ToolUse: { color: p.tool.color, fontFamily: ['mono'], backgroundColor: p.tool.bg, borderColor: p.tool.border, borderWidth: 1, radius: 4, paddingX: 8 },
    },
    sound: {
      ambience: { layers: [{ wave: 'brown', drone: true, gain: 0.12, filter: { type: 'lowpass', hz: 220, to: 420 } }] },
    },
  }
  return { look, base, unpainted: problems.find(line => line.startsWith("Desktop won't paint")) }
}

const isVariant = (v: unknown): v is Variant => v === 'violet' || v === 'cyan'

async function apply($: EngineInterface, variant: Variant) {
  const { look, base, unpainted } = build(variant)
  if (unpainted !== undefined) {
    $.ui.toast(unpainted)
  }
  let set
  try {
    set = await $.theme.set(look)
  } catch (error) {
    $.ui.log(String(error))
    set = await $.theme.set(base)
  }
  if (!set.isDrawn) {
    $.ui.status(set.reason)
  }
}

export const register: Register = on => {
  on('session.start', async ($, e, next) => {
    await $.command.register({
      name: 'circuit',
      description: 'Choisir la version du thème Circuit : violet (violet et marron) ou cyan',
    })
    const saved = await $.store.get('variant')
    await apply($, isVariant(saved) ? saved : 'violet')
    return next(e)
  })

  on('command.run', { command: 'circuit' }, async ($, e) => {
    const asked = e.args.trim().toLowerCase()
    if (!isVariant(asked)) {
      return { text: 'Utilisation : /circuit violet  ou  /circuit cyan' }
    }
    await $.store.set('variant', asked)
    await apply($, asked)
    return { text: `Thème Circuit : version ${asked} appliquée.` }
  })

  on('ui.render', { component: 'Backdrop' }, ($, e, next) => {
    if (e.surface !== 'desktop' && e.surface !== 'mobile') {
      return next(e)
    }
    const { Svg } = $.ui.resolve(e)
    const scene = isVariant(e.props.scene) ? e.props.scene : 'violet'
    return <Svg source={SCENES[scene]} alt="Grille texturée et circuits où passent de lentes impulsions lumineuses" />
  })
}
