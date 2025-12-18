'use client'
import { useEffect, useRef, useState } from "react"
import SimplePeer from 'simple-peer'

export default function PeerTest() {
    const [incoming, setIncoming] = useState('');
    const [outgoing, setOutgoing] = useState('');

    const p = useRef(new SimplePeer({
        initiator: true,
        trickle: false
    }))

    useEffect(() => {
        p.current.on('error', err => console.log('error', err))

        p.current.on('signal', data => {
            console.log('SIGNAL', JSON.stringify(data))
            setOutgoing(JSON.stringify(data))
        })

        p.current.on('connect', () => {
            console.log('CONNECT')
            p.current.send('whatever' + Math.random())
        })

        p.current.on('data', data => {
            console.log('data: ' + data)
        })
    }, [])

    function onSubmit(ev: React.FormEvent<HTMLFormElement>) {
        ev.preventDefault()
        p.current.signal(JSON.parse(incoming))
    }

    return (
        <div>
            <h1>Test</h1>
            <form onSubmit={onSubmit}>
                <textarea id="incoming" value={incoming} onChange={(e) => setIncoming(e.currentTarget.value)}></textarea>
                <button type="submit">submit</button>
            </form>
            <pre className="w-150 wrap-break-word whitespace-normal">{outgoing}</pre>
        </div>
    )
}