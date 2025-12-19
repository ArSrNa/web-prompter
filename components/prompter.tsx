import { PropsWithChildren, useEffect, useRef } from "react";

export default function Prompter({ content, currentLine, fontSize }: {
    currentLine: number,
    fontSize: number,
    content: string
}) {
    const currentLineRef = useRef<HTMLDivElement>(null);
    useEffect(() => {
        currentLineRef.current?.scrollIntoView({
            behavior: "smooth",
            block: "center",
            inline: "center"
        });
        console.log('cr')
    }, [currentLine])
    return <>
        <div
            className="p-2 h-screen overflow-y-auto whitespace-pre-wrap border"
            style={{ fontSize }}
        >
            {content?.toString().split('\n').map((m, i) => {
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