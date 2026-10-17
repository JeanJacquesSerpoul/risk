import { Fragment, type ReactNode, useEffect, useMemo } from 'react'
import type { ContinentId } from '../game/mapData'
import { useGame } from '../game/store'
import { contName, detectLang, type Lang, makeT, type Msg, renderMsg, type T, terrName } from '.'

export const langOf = (s: { settings: { lang?: Lang } }): Lang => s.settings.lang ?? detectLang()

export interface Translator {
  t: T
  lang: Lang
  /** Territory name in the interface language. */
  terr: (id: string) => string
  cont: (c: ContinentId) => string
  m: (msg: Msg) => string
}

/** Interface translator, in the language chosen in the settings (or the browser's). */
export function useT(): Translator {
  const lang = useGame(langOf)
  return useMemo(
    () => ({
      t: makeT(lang),
      lang,
      terr: (id: string) => terrName(id, lang),
      cont: (c: ContinentId) => contName(c, lang),
      m: (msg: Msg) => renderMsg(msg, lang),
    }),
    [lang],
  )
}

/** Keeps <html lang> and the page title in sync with the language. */
export function useApplyLang() {
  const { t, lang } = useT()
  useEffect(() => {
    document.documentElement.lang = lang
    document.title = t('brand.full')
  }, [lang, t])
}

/** Translator outside React (one-off messages). */
export const currentT = () => makeT(langOf(useGame.getState()))

/** Replaces `{name}` placeholders in a translated string with React nodes. */
export function rich(text: string, nodes: Record<string, ReactNode>): ReactNode {
  return text.split(/(\{\w+\})/).map((part, i) => {
    const m = /^\{(\w+)\}$/.exec(part)
    return <Fragment key={i}>{m && m[1] in nodes ? nodes[m[1]] : part}</Fragment>
  })
}
