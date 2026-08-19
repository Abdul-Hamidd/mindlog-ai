import { useState, useRef, useEffect } from 'react'
import axios from 'axios'

const API_URL = 'https://mindlog-ai-71ada.containers.snapdeploy.app'

function getUserId() {
  let userId = localStorage.getItem('mindlog_user_id')
  if (!userId) {
    userId = crypto.randomUUID()
    localStorage.setItem('mindlog_user_id', userId)
  }
  return userId
}

function timeAgo(dateStr) {
  const diff = Date.now() - new Date(dateStr).getTime()
  const mins = Math.floor(diff / 60000)
  if (mins < 1) return 'just now'
  if (mins < 60) return `${mins}m ago`
  const hrs = Math.floor(mins / 60)
  if (hrs < 24) return `${hrs}h ago`
  const days = Math.floor(hrs / 24)
  return `${days}d ago`
}

function sanitizeAnswer(text) {
  if (!text) return text
  let cleaned = text
  cleaned = cleaned.replace(/\n*based on entries:[\s\S]*$/i, '')
  cleaned = cleaned.replace(/\(?\s*Entry\s*—[^)]*\)?/gi, '')
  return cleaned.trim()
}

const MOODS = [
  { label: 'Calm', color: '#6B84A0' },
  { label: 'Content', color: '#5B7A63' },
  { label: 'Happy', color: '#4A8B7C' },
  { label: 'Grateful', color: '#B58900' },
  { label: 'Excited', color: '#C2703D' },
  { label: 'Stressed', color: '#B4704A' },
  { label: 'Anxious', color: '#9A6B9E' },
  { label: 'Sad', color: '#7D8A99' },
]

// ─── Icons ────────────────────────────────
const IconMenu = (props) => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" {...props}>
    <path d="M3 6h18M3 12h18M3 18h18" strokeLinecap="round" />
  </svg>
)
const IconPlus = (props) => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" {...props}>
    <path d="M12 5v14M5 12h14" strokeLinecap="round" />
  </svg>
)
const IconTrash = (props) => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" {...props}>
    <path d="M4 7h16M9 7V5a1 1 0 011-1h4a1 1 0 011 1v2m2 0v13a1 1 0 01-1 1H8a1 1 0 01-1-1V7h10z" strokeLinecap="round" strokeLinejoin="round" />
  </svg>
)
const IconArrowUp = (props) => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" {...props}>
    <path d="M12 19V5M5 12l7-7 7 7" strokeLinecap="round" strokeLinejoin="round" />
  </svg>
)
const IconBook = (props) => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" {...props}>
    <path d="M4 19.5A2.5 2.5 0 016.5 17H20" strokeLinecap="round" strokeLinejoin="round" />
    <path d="M6.5 2H20v20H6.5A2.5 2.5 0 014 19.5v-15A2.5 2.5 0 016.5 2z" strokeLinecap="round" strokeLinejoin="round" />
  </svg>
)
const IconPen = (props) => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" {...props}>
    <path d="M12 20h9" strokeLinecap="round" />
    <path d="M16.5 3.5a2.12 2.12 0 013 3L7 19l-4 1 1-4L16.5 3.5z" strokeLinecap="round" strokeLinejoin="round" />
  </svg>
)
const IconCompass = (props) => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" {...props}>
    <circle cx="12" cy="12" r="9" />
    <path d="M15 9l-3 6-3-6 3 1.5L15 9z" strokeLinecap="round" strokeLinejoin="round" />
  </svg>
)
const IconCheck = (props) => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" {...props}>
    <path d="M20 6L9 17l-5-5" strokeLinecap="round" strokeLinejoin="round" />
  </svg>
)
const IconMic = (props) => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" {...props}>
    <path d="M12 15a3 3 0 003-3V6a3 3 0 10-6 0v6a3 3 0 003 3z" strokeLinecap="round" strokeLinejoin="round" />
    <path d="M19 11a7 7 0 01-14 0M12 18v3" strokeLinecap="round" strokeLinejoin="round" />
  </svg>
)

// ─── Voice input hook ──────────────────────
function useVoiceInput(onResult) {
  const [isListening, setIsListening] = useState(false)
  const [isSupported] = useState(
    () => typeof window !== 'undefined' && (window.SpeechRecognition || window.webkitSpeechRecognition)
  )
  const recognitionRef = useRef(null)
  const baseTextRef = useRef('')

  const start = (currentText) => {
    if (!isSupported) return
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition
    const recognition = new SpeechRecognition()
    recognition.continuous = true
    recognition.interimResults = true
    recognition.lang = 'en-US'

    baseTextRef.current = currentText ? currentText.trim() + ' ' : ''

    recognition.onresult = (event) => {
      let transcript = ''
      for (let i = 0; i < event.results.length; i++) {
        transcript += event.results[i][0].transcript
      }
      onResult(baseTextRef.current + transcript)
    }

    recognition.onerror = () => {
      setIsListening(false)
    }

    recognition.onend = () => {
      setIsListening(false)
    }

    recognitionRef.current = recognition
    recognition.start()
    setIsListening(true)
  }

  const stop = () => {
    recognitionRef.current?.stop()
    setIsListening(false)
  }

  const toggle = (currentText) => {
    if (isListening) {
      stop()
    } else {
      start(currentText)
    }
  }

  return { isListening, isSupported, toggle }
}

function MicButton({ isListening, isSupported, onClick, className = '' }) {
  if (!isSupported) return null
  return (
    <button
      type="button"
      onClick={onClick}
      title={isListening ? 'Stop recording' : 'Speak instead of typing'}
      className={`shrink-0 p-2.5 rounded-full transition-colors ${
        isListening
          ? 'bg-alert/10 text-alert'
          : 'text-inkSoft hover:text-ink hover:bg-paperLine/50'
      } ${className}`}
    >
      <span className="relative flex items-center justify-center">
        {isListening && (
          <span className="absolute w-6 h-6 rounded-full bg-alert/20 animate-ping" />
        )}
        <IconMic className="w-[18px] h-[18px] relative" />
      </span>
    </button>
  )
}

function App() {
  const [userId] = useState(getUserId)
  const [activeTab, setActiveTab] = useState('write')
  const [conversations, setConversations] = useState([])
  const [currentConversationId, setCurrentConversationId] = useState(null)
  const [messages, setMessages] = useState([])
  const [input, setInput] = useState('')
  const [isAsking, setIsAsking] = useState(false)
  const [isLoadingConvo, setIsLoadingConvo] = useState(false)
  const [sidebarOpen, setSidebarOpen] = useState(() => {
    const saved = localStorage.getItem('mindlog_sidebar_open')
    return saved === null ? true : saved === 'true'
  })

  const [entryText, setEntryText] = useState('')
  const [selectedMood, setSelectedMood] = useState(null)
  const [isSavingEntry, setIsSavingEntry] = useState(false)
  const [saveConfirmation, setSaveConfirmation] = useState(null)
  const [recentEntries, setRecentEntries] = useState([])
  const [entryCount, setEntryCount] = useState(0)

  const chatEndRef = useRef(null)
  const textareaRef = useRef(null)
  const entryTextareaRef = useRef(null)
  const isAskingRef = useRef(false)

  const entryVoice = useVoiceInput(setEntryText)
  const questionVoice = useVoiceInput(setInput)

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  // Warmup Ping on App Load targeted to /health
  useEffect(() => {
    let attempts = 0
    const maxAttempts = 10
    let timeoutId = null

    const tryWakeUp = () => {
      fetch(`${API_URL}/health`)
        .then(() => {})
        .catch(() => {
          attempts++
          if (attempts < maxAttempts) {
            timeoutId = setTimeout(tryWakeUp, 5000)
          }
        })
    }

    tryWakeUp()

    return () => {
      if (timeoutId) clearTimeout(timeoutId)
    }
  }, [])

  useEffect(() => {
    refreshConversations()
  }, [])

  useEffect(() => {
    localStorage.setItem('mindlog_sidebar_open', sidebarOpen)
  }, [sidebarOpen])

  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto'
      textareaRef.current.style.height = Math.min(textareaRef.current.scrollHeight, 160) + 'px'
    }
  }, [input])

  useEffect(() => {
    if (entryTextareaRef.current) {
      entryTextareaRef.current.style.height = 'auto'
      entryTextareaRef.current.style.height = Math.min(entryTextareaRef.current.scrollHeight, 320) + 'px'
    }
  }, [entryText])

  const refreshConversations = async () => {
    try {
      const res = await axios.get(`${API_URL}/conversations/${userId}`)
      setConversations(res.data)
    } catch (err) {
      console.error('Failed to load conversations', err)
    }
  }

  const startNewReflection = async () => {
    setMessages([])
    setCurrentConversationId(null)
  }

  const openConversation = async (conversationId) => {
    setIsLoadingConvo(true)
    setCurrentConversationId(conversationId)
    setActiveTab('reflect')
    try {
      const res = await axios.get(`${API_URL}/conversations/${conversationId}/messages`)
      const loaded = res.data
        .filter(m => m.content && m.content.trim() !== '')
        .map(m => ({
          role: m.role,
          content: m.role === 'assistant' ? sanitizeAnswer(m.content) : m.content
        }))
      setMessages(loaded)
    } catch (err) {
      console.error('Failed to load conversation messages', err)
    } finally {
      setIsLoadingConvo(false)
    }
  }

  const deleteConversation = async (conversationId, e) => {
    e.stopPropagation()
    try {
      await axios.delete(`${API_URL}/conversations/${conversationId}`)
      if (conversationId === currentConversationId) {
        startNewReflection()
      }
      refreshConversations()
    } catch (err) {
      console.error('Failed to delete conversation', err)
    }
  }

  const ensureConversation = async (firstMessageText) => {
    if (currentConversationId) return currentConversationId
    const title = firstMessageText.length > 40
      ? firstMessageText.slice(0, 40) + '...'
      : firstMessageText
    const res = await axios.post(`${API_URL}/conversations`, { user_id: userId, title })
    setCurrentConversationId(res.data.id)
    refreshConversations()
    return res.data.id
  }

  const saveMessageToDb = async (conversationId, role, content, sources) => {
    try {
      await axios.post(`${API_URL}/messages`, {
        conversation_id: conversationId,
        role,
        content,
        sources: sources || []
      })
    } catch (err) {
      console.error('Failed to save message', err)
    }
  }

  const handleSaveEntry = async () => {
    if (!entryText.trim()) return
    if (entryVoice.isListening) entryVoice.toggle(entryText)

    setIsSavingEntry(true)
    try {
      const res = await axios.post(`${API_URL}/entries`, {
        content: entryText,
        mood: selectedMood
      })
      setRecentEntries(prev => [{ label: res.data.filename, mood: selectedMood }, ...prev].slice(0, 5))
      setEntryCount(prev => prev + 1)
      setSaveConfirmation(`Saved — ${new Date().toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}`)
      setEntryText('')
      setSelectedMood(null)
      setTimeout(() => setSaveConfirmation(null), 3500)
    } catch (err) {
      setSaveConfirmation(`Couldn't save: ${err.response?.data?.detail || err.message}`)
    } finally {
      setIsSavingEntry(false)
    }
  }

  const handleAsk = async () => {
    if (isAskingRef.current) return
    if (!input.trim()) return
    if (questionVoice.isListening) questionVoice.toggle(input)

    isAskingRef.current = true
    const question = input
    setInput('')

    const conversationHistory = messages
      .filter(m => m.role === 'user' || m.role === 'assistant')
      .map(m => ({ role: m.role, content: m.content }))

    setMessages(prev => [
      ...prev,
      { role: 'user', content: question },
      { role: 'assistant', content: '' }
    ])
    setIsAsking(true)

    try {
      const conversationId = await ensureConversation(question)
      saveMessageToDb(conversationId, 'user', question, []).catch(console.error)

      const controller = new AbortController()
      const timeoutId = setTimeout(() => controller.abort(), 45000)

      const response = await fetch(`${API_URL}/query/stream`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        signal: controller.signal,
        body: JSON.stringify({
          query: question,
          n_results: 5,
          file_filter: null,
          history: conversationHistory
        })
      })

      clearTimeout(timeoutId)

      if (!response.ok) {
        const errData = await response.json().catch(() => null)
        throw new Error(errData?.detail || `Server status ${response.status}. Please try sending again in a few seconds.`)
      }

      const reader = response.body.getReader()
      const decoder = new TextDecoder()
      let fullText = ''
      let sources = []

      while (true) {
        const { done, value } = await reader.read()
        if (done) break

        fullText += decoder.decode(value, { stream: true })

        const markerIndex = fullText.indexOf('__SOURCES__')
        let cleanText = fullText
        if (markerIndex !== -1) {
          cleanText = fullText.slice(0, markerIndex).trimEnd()
          try {
            const meta = JSON.parse(fullText.slice(markerIndex + '__SOURCES__'.length))
            sources = meta.sources || []
          } catch {}
        }

        const sanitized = sanitizeAnswer(cleanText)
        setMessages(prev => {
          const updated = [...prev]
          updated[updated.length - 1] = {
            role: 'assistant',
            content: sanitized
          }
          return updated
        })
      }

      const finalSanitized = sanitizeAnswer(fullText.split('__SOURCES__')[0])
      saveMessageToDb(conversationId, 'assistant', finalSanitized, sources).catch(console.error)

    } catch (err) {
      console.error('Ask Error:', err)
      setMessages(prev => {
        const updated = [...prev]
        const errorText = err.name === 'AbortError'
          ? 'Server cold start timeout. The container is waking up, please click send again!'
          : `Error: ${err.message}`

        updated[updated.length - 1] = {
          role: 'assistant',
          content: errorText
        }
        return updated
      })
    } finally {
      setIsAsking(false)
      isAskingRef.current = false
    }
  }

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleAsk()
    }
  }

  return (
    <div className="min-h-screen bg-paper flex font-sans overflow-hidden">
      {/* Sidebar */}
      <div
        className={`bg-ink flex flex-col h-screen sticky top-0 shrink-0 transition-all duration-300 ease-in-out overflow-hidden ${
          sidebarOpen ? 'w-80' : 'w-0'
        }`}
      >
        <div className="w-80 h-full flex flex-col">
          <div className="px-6 pt-8 pb-6">
            <h1 className="font-display text-[26px] text-paper tracking-tight leading-none">MindLog</h1>
            <p className="text-xs text-paper/45 mt-2">Your journaling companion</p>
          </div>

          <div className="px-5 pb-5">
            <button
              onClick={startNewReflection}
              className="w-full flex items-center justify-center gap-2 border border-paper/25 text-paper/90 rounded-lg py-2.5 text-sm font-medium hover:bg-paper/10 hover:border-paper/40 transition-colors"
            >
              <IconPlus className="w-3.5 h-3.5" />
              New reflection
            </button>
          </div>

          <div className="px-6 pb-3">
            <p className="text-xs text-paper/35">
              Reflections · {conversations.length}
            </p>
          </div>

          <div className="flex-1 overflow-y-auto px-4 pb-4 space-y-1">
            {conversations.length === 0 && (
              <p className="text-[12px] text-paper/30 text-center mt-10 px-2 leading-relaxed">No reflections yet</p>
            )}
            {conversations.map((conv) => {
              const isActive = conv.id === currentConversationId
              return (
                <div
                  key={conv.id}
                  onClick={() => openConversation(conv.id)}
                  className={`group relative flex items-start justify-between pl-4 pr-3 py-3 rounded-lg cursor-pointer transition-colors ${
                    isActive ? 'bg-paper/10' : 'hover:bg-paper/[0.06]'
                  }`}
                >
                  {isActive && (
                    <span className="absolute left-0 top-2 bottom-2 w-[3px] rounded-full bg-accent" />
                  )}
                  <div className="min-w-0 flex-1">
                    <p className={`text-[13px] truncate leading-snug ${isActive ? 'text-paper' : 'text-paper/85'}`}>
                      {conv.title}
                    </p>
                    <p className="text-[11px] text-paper/35 mt-1">{timeAgo(conv.created_at)}</p>
                  </div>
                  <button
                    onClick={(e) => deleteConversation(conv.id, e)}
                    className="opacity-0 group-hover:opacity-100 text-paper/30 hover:text-alert ml-2 mt-0.5 transition-opacity shrink-0"
                  >
                    <IconTrash className="w-3.5 h-3.5" />
                  </button>
                </div>
              )
            })}
          </div>

          <div className="px-6 py-5 border-t border-paper/10 flex items-center gap-2">
            <span className="w-1.5 h-1.5 rounded-full bg-accent shrink-0" />
            <p className="text-[11px] text-paper/40 leading-tight">Reflections stay grounded in your own words</p>
          </div>
        </div>
      </div>

      {/* Main content */}
      <div className="flex-1 flex flex-col h-screen min-w-0">
        {/* Top bar */}
        <div className="flex items-center justify-between gap-3 px-8 py-4 border-b border-paperLine shrink-0 bg-white/40">
          <div className="flex items-center gap-4 min-w-0">
            <button
              onClick={() => setSidebarOpen(v => !v)}
              className="text-inkSoft hover:text-ink transition-colors p-2 -ml-2 rounded-lg hover:bg-paperLine/60 shrink-0"
              title={sidebarOpen ? 'Collapse sidebar' : 'Expand sidebar'}
            >
              <IconMenu className="w-5 h-5" />
            </button>
            <div className="w-px h-6 bg-paperLine shrink-0" />

            <div className="flex items-center bg-paperLine/40 rounded-full p-1">
              <button
                onClick={() => setActiveTab('write')}
                className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-full text-xs font-medium transition-colors ${
                  activeTab === 'write' ? 'bg-white text-ink shadow-sm' : 'text-inkSoft hover:text-ink'
                }`}
              >
                <IconPen className="w-3.5 h-3.5" />
                Write
              </button>
              <button
                onClick={() => setActiveTab('reflect')}
                className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-full text-xs font-medium transition-colors ${
                  activeTab === 'reflect' ? 'bg-white text-ink shadow-sm' : 'text-inkSoft hover:text-ink'
                }`}
              >
                <IconCompass className="w-3.5 h-3.5" />
                Reflect
              </button>
            </div>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            <div className="flex items-center gap-1.5 text-[12px] text-inkSoft bg-paperLine/40 px-3 py-1.5 rounded-full">
              <IconBook className="w-3 h-3" />
              {entryCount} {entryCount === 1 ? 'entry' : 'entries'} this session
            </div>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto flex flex-col items-center px-6 py-10">
          <div className="w-full max-w-2xl">
            {/* WRITE TAB */}
            {activeTab === 'write' && (
              <div className="bg-white/70 border border-paperLine rounded-xl shadow-[0_1px_2px_rgba(35,40,33,0.04)] p-7">
                <div className="flex items-start gap-2.5 mb-6">
                  <div className="w-8 h-8 rounded-full bg-accent flex items-center justify-center shrink-0">
                    <IconCompass className="w-4 h-4 text-white" />
                  </div>
                  <div className="bg-accent/10 border border-accent/15 rounded-2xl rounded-tl-md px-4 py-3 max-w-[85%]">
                    <p className="text-[15px] text-ink leading-relaxed">
                      Hey! How are you feeling today? Pick a mood, then type or tap the mic to speak your entry 🙂
                    </p>
                  </div>
                </div>

                <div className="flex flex-wrap gap-2 mb-6 pl-[42px]">
                  {MOODS.map((m) => {
                    const isSelected = selectedMood === m.label
                    return (
                      <button
                        key={m.label}
                        onClick={() => setSelectedMood(isSelected ? null : m.label)}
                        className="flex items-center gap-2 px-3.5 py-2 rounded-full text-sm border border-transparent transition-all"
                        style={
                          isSelected
                            ? { backgroundColor: m.color, color: '#fff' }
                            : { backgroundColor: `${m.color}14`, color: m.color }
                        }
                      >
                        <span
                          className="w-2 h-2 rounded-full shrink-0"
                          style={{ backgroundColor: isSelected ? 'rgba(255,255,255,0.9)' : m.color }}
                        />
                        {m.label}
                      </button>
                    )
                  })}
                </div>

                <div className="relative">
                  <textarea
                    ref={entryTextareaRef}
                    value={entryText}
                    onChange={(e) => setEntryText(e.target.value)}
                    placeholder="Type your thoughts here... no one else reads this except you, through your own reflections."
                    rows={6}
                    className="w-full resize-none bg-paper border border-paperLine rounded-2xl pl-4 pr-14 py-3.5 text-[15px] text-ink placeholder:text-inkSoft/50 focus:outline-none focus:border-accent/60 focus:ring-2 focus:ring-accent/15 transition-shadow leading-relaxed min-h-[160px] max-h-[320px]"
                  />
                  <MicButton
                    isListening={entryVoice.isListening}
                    isSupported={entryVoice.isSupported}
                    onClick={() => entryVoice.toggle(entryText)}
                    className="absolute right-2.5 bottom-2.5"
                  />
                </div>

                {entryVoice.isListening && (
                  <p className="text-[12px] text-alert mt-2 flex items-center gap-1.5">
                    <span className="w-1.5 h-1.5 rounded-full bg-alert animate-pulse" />
                    Listening — tap the mic again when you're done
                  </p>
                )}

                <div className="flex items-center justify-between mt-4">
                  <div className="text-[12px] text-inkSoft/70 h-5 flex items-center gap-1.5">
                    {saveConfirmation && (
                      <>
                        <IconCheck className="w-3.5 h-3.5 text-accent" />
                        <span className="text-accent">{saveConfirmation}</span>
                      </>
                    )}
                  </div>
                  <button
                    onClick={handleSaveEntry}
                    disabled={isSavingEntry || !entryText.trim()}
                    className="flex items-center gap-2 bg-accent text-white px-5 py-2.5 rounded-full text-sm font-medium disabled:opacity-30 hover:bg-accent/90 transition-colors shadow-sm"
                  >
                    {isSavingEntry ? (
                      <span className="block w-[14px] h-[14px] border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    ) : (
                      <IconArrowUp className="w-[14px] h-[14px]" />
                    )}
                    Save entry
                  </button>
                </div>
              </div>
            )}

            {/* REFLECT TAB */}
            {activeTab === 'reflect' && (
              <div className="flex flex-col h-[calc(100vh-140px)]">
                <div className="flex-1 overflow-y-auto space-y-4 pb-6 pr-2">
                  {messages.map((m, idx) => {
                    const isUser = m.role === 'user'
                    return (
                      <div
                        key={idx}
                        className={`flex gap-3 ${isUser ? 'justify-end' : 'justify-start'}`}
                      >
                        {!isUser && (
                          <div className="w-7 h-7 rounded-full bg-accent flex items-center justify-center shrink-0 mt-1">
                            <IconCompass className="w-3.5 h-3.5 text-white" />
                          </div>
                        )}
                        <div
                          className={`max-w-[80%] rounded-2xl px-4 py-3 text-[14px] leading-relaxed ${
                            isUser
                              ? 'bg-ink text-paper rounded-tr-sm'
                              : 'bg-white border border-paperLine text-ink rounded-tl-sm'
                          }`}
                        >
                          {m.content === '' && !isUser ? (
                            <div className="flex items-center gap-1 py-1 px-2">
                              <span className="w-1.5 h-1.5 bg-inkSoft/40 rounded-full animate-bounce" />
                              <span className="w-1.5 h-1.5 bg-inkSoft/40 rounded-full animate-bounce [animation-delay:0.2s]" />
                              <span className="w-1.5 h-1.5 bg-inkSoft/40 rounded-full animate-bounce [animation-delay:0.4s]" />
                            </div>
                          ) : (
                            <p className="whitespace-pre-wrap">{m.content}</p>
                          )}
                        </div>
                      </div>
                    )
                  })}
                  <div ref={chatEndRef} />
                </div>

                <div className="bg-white border border-paperLine rounded-2xl p-2.5 flex items-center gap-2 shadow-sm shrink-0">
                  <textarea
                    ref={textareaRef}
                    value={input}
                    onChange={(e) => setInput(e.target.value)}
                    onKeyDown={handleKeyDown}
                    placeholder="Ask a question about your journal..."
                    rows={1}
                    className="flex-1 resize-none bg-transparent border-none focus:outline-none px-3 text-sm text-ink placeholder:text-inkSoft/50 max-h-32"
                  />
                  <MicButton
                    isListening={questionVoice.isListening}
                    isSupported={questionVoice.isSupported}
                    onClick={() => questionVoice.toggle(input)}
                  />
                  <button
                    onClick={handleAsk}
                    disabled={isAsking || !input.trim()}
                    className="p-2.5 rounded-full bg-ink text-paper disabled:opacity-20 hover:bg-ink/90 transition-colors shrink-0"
                  >
                    <IconArrowUp className="w-4 h-4" />
                  </button>
                </div>
                <p className="text-[11px] text-center text-inkSoft/50 mt-2">
                  Answers are grounded strictly in your own journal entries
                </p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}

export default App