import { useState, useRef, useEffect } from 'react'
import { Send, Bot, User, Loader2, ChevronDown, ChevronUp } from 'lucide-react'
import { api } from '../../utils/api'
import clsx from 'clsx'

const STARTER_QUESTIONS = [
  'Am I too concentrated in any single stock?',
  'How does my sector allocation compare to the S&P 500?',
  'What are the biggest risks in my portfolio?',
  'Which ETFs could help me diversify?',
  'How diversified is my portfolio overall?',
]

export default function ChatPanel({ sessionId }) {
  const [open, setOpen] = useState(true)
  const [input, setInput] = useState('')
  const [messages, setMessages] = useState([])
  const [streaming, setStreaming] = useState(false)
  const bottomRef = useRef()
  const inputRef = useRef()

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages, streaming])

  async function sendMessage(text) {
    const userMsg = text || input.trim()
    if (!userMsg || streaming) return
    setInput('')

    const userEntry = { role: 'user', content: userMsg }
    // Filter out messages with empty content (e.g. from a previous failed stream)
    // and ensure strict user/assistant alternation so the API never sees consecutive roles
    const rawHistory = messages
      .filter((m) => m.content && m.content.trim())
      .map((m) => ({ role: m.role, content: m.content }))
    // Drop trailing assistant message so we always end on a user turn
    const history = rawHistory[rawHistory.length - 1]?.role === 'assistant'
      ? rawHistory.slice(0, -1)
      : rawHistory
    setMessages((prev) => [...prev, userEntry, { role: 'assistant', content: '', streaming: true }])
    setStreaming(true)

    let accumulated = ''
    try {
      await api.streamChat(sessionId, userMsg, history, (token) => {
        accumulated += token
        setMessages((prev) => {
          const updated = [...prev]
          updated[updated.length - 1] = { role: 'assistant', content: accumulated, streaming: true }
          return updated
        })
      })
    } catch (err) {
      accumulated = `Error: ${err.message}`
    } finally {
      setMessages((prev) => {
        const updated = [...prev]
        updated[updated.length - 1] = { role: 'assistant', content: accumulated, streaming: false }
        return updated
      })
      setStreaming(false)
      inputRef.current?.focus()
    }
  }

  return (
    <div className="card">
      <div className="flex items-center justify-between mb-0">
        <div className="flex items-center gap-2">
          <div className="bg-blue-500/10 rounded-lg p-2">
            <Bot className="w-4 h-4 text-blue-400" />
          </div>
          <div>
            <p className="font-semibold text-slate-200 text-sm">Portfolio AI Assistant</p>
            <p className="text-slate-500 text-xs">Answers questions about your specific holdings</p>
          </div>
        </div>
        <button onClick={() => setOpen((o) => !o)} className="text-slate-500 hover:text-slate-300 transition-colors">
          {open ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
        </button>
      </div>

      {open && (
        <div className="mt-4">
          {/* Starter questions */}
          {messages.length === 0 && (
            <div className="mb-4">
              <p className="text-slate-500 text-xs mb-2">Suggested questions:</p>
              <div className="flex flex-wrap gap-2">
                {STARTER_QUESTIONS.map((q) => (
                  <button
                    key={q}
                    onClick={() => sendMessage(q)}
                    className="text-xs bg-slate-800 hover:bg-slate-700 border border-slate-700 hover:border-slate-500 text-slate-300 px-3 py-1.5 rounded-lg transition-colors"
                  >
                    {q}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Message history */}
          {messages.length > 0 && (
            <div className="space-y-4 mb-4 max-h-96 overflow-y-auto pr-1">
              {messages.map((msg, i) => (
                <div key={i} className={clsx('flex gap-3', msg.role === 'user' ? 'justify-end' : 'justify-start')}>
                  {msg.role === 'assistant' && (
                    <div className="bg-blue-500/10 rounded-full p-1.5 h-fit shrink-0 mt-0.5">
                      <Bot className="w-3 h-3 text-blue-400" />
                    </div>
                  )}
                  <div className={clsx(
                    'max-w-[80%] rounded-xl px-4 py-3 text-sm leading-relaxed',
                    msg.role === 'user'
                      ? 'bg-blue-600 text-white rounded-tr-sm'
                      : 'bg-slate-800 text-slate-200 rounded-tl-sm'
                  )}>
                    {msg.content || (msg.streaming && (
                      <span className="flex items-center gap-2 text-slate-400">
                        <Loader2 className="w-3 h-3 animate-spin" /> Thinking…
                      </span>
                    ))}
                  </div>
                  {msg.role === 'user' && (
                    <div className="bg-slate-700 rounded-full p-1.5 h-fit shrink-0 mt-0.5">
                      <User className="w-3 h-3 text-slate-300" />
                    </div>
                  )}
                </div>
              ))}
              <div ref={bottomRef} />
            </div>
          )}

          {/* Input bar */}
          <div className="flex gap-2">
            <input
              ref={inputRef}
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && !e.shiftKey && sendMessage()}
              placeholder="Ask about your portfolio…"
              disabled={streaming}
              className="input flex-1"
            />
            <button
              onClick={() => sendMessage()}
              disabled={!input.trim() || streaming}
              className="btn-primary px-4 py-2 flex items-center gap-1.5 shrink-0"
            >
              {streaming ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
            </button>
          </div>
          <p className="text-slate-600 text-xs mt-2">
            The assistant only has access to your portfolio data and will not give specific investment advice.
          </p>
        </div>
      )}
    </div>
  )
}
