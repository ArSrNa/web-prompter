'use client'

import { useEffect, useMemo } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Textarea } from '@/components/ui/textarea'
import { useAtom } from 'jotai'
import { persistentPromptPropAtom } from '@/lib/atoms'
import Prompter from '@/components/prompter'

export default function Standalone() {
  const [promptProp, setPromptProp] = useAtom(persistentPromptPropAtom)
  const contentLength = useMemo(() => {
    return promptProp.content.split('\n').length
  }, [promptProp.content])

  // 键盘事件监听
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // 如果焦点在输入框或文本域中，不处理快捷键
      const target = e.target as HTMLElement
      if (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.isContentEditable) {
        return
      }

      switch (e.key) {
        case 'ArrowUp':
          e.preventDefault()
          setPromptProp({
            ...promptProp,
            currentLine: Math.max(0, promptProp.currentLine - 1)
          })
          break
        case 'ArrowDown':
          e.preventDefault()
          setPromptProp({
            ...promptProp,
            currentLine: Math.min(contentLength - 1, promptProp.currentLine + 1)
          })
          break
        case '+':
        case '=':
          e.preventDefault()
          setPromptProp({
            ...promptProp,
            fontSize: promptProp.fontSize + 10
          })
          break
        case '-':
        case '_':
          e.preventDefault()
          setPromptProp({
            ...promptProp,
            fontSize: Math.max(20, promptProp.fontSize - 10)
          })
          break
        case 'f':
        case 'F':
          e.preventDefault()
          setPromptProp({
            ...promptProp,
            scaleX: promptProp.scaleX === -1 ? 1 : -1
          })
          break
      }
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => {
      window.removeEventListener('keydown', handleKeyDown)
    }
  }, [promptProp, contentLength, setPromptProp])

  return (
    <div className="h-screen flex flex-col">
      {/* 顶部标题栏 */}
      <div className="border-b bg-background px-4 py-2 flex items-center justify-between shrink-0">
        <h1 className="text-lg font-semibold">提词器 - 单机模式</h1>
        <Button variant="outline" size="sm" onClick={() => window.location.href = '/'}>
          返回首页
        </Button>
      </div>

      {/* 提词器显示区域 - 至少占据 80vh */}
      <div className="flex-1 min-h-[80vh] overflow-hidden">
        <Prompter {...promptProp} fullScreen={false} />
      </div>

      {/* 控制面板 - 固定在底部 */}
      <div className="border-t bg-background p-4">
        <Card>
          <CardHeader>
            <CardTitle>提词器控制</CardTitle>
          </CardHeader>
          <CardContent className="flex flex-col gap-3">
            {/* 文本内容编辑 */}
            <Textarea
              className="resize-none w-auto! h-32"
              value={promptProp.content}
              onChange={(e) => setPromptProp({
                ...promptProp,
                content: e.target.value
              })}
              placeholder="输入提词内容..."
            />

            {/* 状态显示 */}
            <div className="grid grid-cols-2 gap-2">
              <div className="border px-2 py-1 rounded-md flex flex-col items-center">
                <div>当前行</div>
                <span className="text-green-500 font-bold text-2xl">{promptProp.currentLine}</span>
              </div>
              <div className="border px-2 py-1 rounded-md flex flex-col items-center">
                <div>字体大小</div>
                <span className="text-green-500 font-bold text-2xl">{promptProp.fontSize}</span>
              </div>
            </div>

            {/* 字体控制 */}
            <div className="grid grid-cols-2 gap-2">
              <Button onClick={() => {
                setPromptProp({
                  ...promptProp,
                  fontSize: promptProp.fontSize + 10
                })
              }}>字体 +</Button>
              <Button onClick={() => {
                setPromptProp({
                  ...promptProp,
                  fontSize: Math.max(20, promptProp.fontSize - 10)
                })
              }}>字体 -</Button>
            </div>

            {/* 行控制 */}
            <div className="grid grid-cols-2 h-20 gap-2">
              <Button className="h-full" onClick={() => {
                setPromptProp({
                  ...promptProp,
                  currentLine: Math.max(0, promptProp.currentLine - 1)
                })
              }}>▲ 上一行</Button>
              <Button className="h-full" onClick={() => {
                setPromptProp({
                  ...promptProp,
                  currentLine: Math.min(contentLength - 1, promptProp.currentLine + 1)
                })
              }}>▼ 下一行</Button>
            </div>

            {/* 翻转按钮 */}
            <Button onClick={() => {
              setPromptProp({
                ...promptProp,
                scaleX: promptProp.scaleX === -1 ? 1 : -1
              })
            }}>翻转</Button>

            {/* 键盘快捷键提示 */}
            <div className="text-xs text-muted-foreground text-center mt-2">
              键盘快捷键：↑↓ 切换行 | +/- 调整字体 | F 翻转
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
