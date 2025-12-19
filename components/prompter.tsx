import { PropsWithChildren, useRef } from "react";

export default function Prompter({ children, currentLine, fontSize }: PropsWithChildren<{
    isEditing: boolean,
    currentLine: number,
    fontSize: number,
}>) {
    const currentLineRef = useRef<HTMLDivElement>(null);
    return <>
        <div
            className="p-2 h-screen overflow-y-auto whitespace-pre-wrap border"
            style={{ fontSize }}
        >
            {children?.toString().split('\n').map((m, i) => {
                const isCurrentLine = i === currentLine
                return <div
                    className={`${isCurrentLine ? "text-white" : "text-gray-500"}`}
                    key={`line_${i}`} ref={isCurrentLine ? currentLineRef : null}>
                    {m}
                </div>
            })}
        </div>
    </>
}