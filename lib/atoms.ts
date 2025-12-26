import { atom } from 'jotai'

export interface PromptProp {
  fontSize: number
  content: string
  currentLine: number
  scaleX: number
}

const defaultPromptProp: PromptProp = {
  fontSize: 80,
  content: "欢迎使用提词器应用！\n在这里输入你的提词内容...\n可以通过遥控器控制滚动",
  currentLine: 0,
  scaleX: -1
}

// 从 localStorage 读取初始值
const getStoredPromptProp = (): PromptProp => {
  if (typeof window === 'undefined') return defaultPromptProp

  try {
    const stored = localStorage.getItem('promptProp')
    return stored ? JSON.parse(stored) : defaultPromptProp
  } catch {
    return defaultPromptProp
  }
}

export const promptPropAtom = atom<PromptProp>(getStoredPromptProp())

// 持久化到 localStorage 的 atom
export const persistentPromptPropAtom = atom(
  (get) => get(promptPropAtom),
  (get, set, newProp: PromptProp) => {
    set(promptPropAtom, newProp)
    // 保存到 localStorage
    if (typeof window !== 'undefined') {
      localStorage.setItem('promptProp', JSON.stringify(newProp))
    }
  }
)