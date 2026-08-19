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

  // Warm up the backend container on app load.
  // SnapDeploy's free-tier container returns 503 (without CORS headers)
  // while it's waking up from sleep, which makes a single ping fail.
  // Retry every 8s for up to ~100s so the container is awake by the
  // time the user actually sends a question.
  useEffect(() => {
    let attempts = 0
    const maxAttempts = 12 // ~100 seconds total (12 x 8s)
    let timeoutId = null

    const tryWakeUp = () => {
      fetch(API_URL)
        .then(() => {
          // Success — container is awake, stop retrying
        })
        .catch(() => {
          attempts++
          if (attempts < maxAttempts) {
            timeoutId = setTimeout(tryWakeUp, 8000)
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

    setMessages(prev => [...prev, { role: 'user', content: question }])
    setIsAsking(true)
    setMessages(prev => [...prev, { role: 'assistant', content: '' }])

    const conversationId = await ensureConversation(question)
    saveMessageToDb(conversationId, 'user', question, [])

    try {
      const response = await fetch(`${API_URL}/query/stream`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          query: question,
          n_results: 5,
          file_filter: null,
          history: conversationHistory
        })
      })

      if (!response.ok) {
        const errData = await response.json().catch(() => null)
        throw new Error(errData?.detail || `Request failed (${response.status})`)
      }

      const reader = response.body.getReader()
      const decoder = new TextDecoder()
      let fullText = ''
      let sources = []
      let displayedLength = 0
      let typingTimer = null

      const revealText = (rawCleanText) => {
        const cleanText = sanitizeAnswer(rawCleanText)
        if (typingTimer) return
        typingTimer = setInterval(() => {
          displayedLength = Math.min(displayedLength + 3, cleanText.length)
          setMessages(prev => {
            const updated = [...prev]
            updated[updated.length - 1] = {
              ...updated[updated.length - 1],
              role: 'assistant',
              content: cleanText.slice(0, displayedLength)
            }
            return updated
          })
          if (displayedLength >= cleanText.length) {
            clearInterval(typingTimer)
            typingTimer = null
          }
        }, 15)
      }

      let finalAnswerText = ''

      while (true) {
        const { done, value } = await reader.read()
        if (done) break

        fullText += decoder.decode(value, { stream: true })

        const scoresMarkerIndex = fullText.indexOf('__SCORES__')
        let textBeforeScores = fullText
        if (scoresMarkerIndex !== -1) {
          textBeforeScores = fullText.slice(0, scoresMarkerIndex)
        }

        const markerIndex = textBeforeScores.indexOf('__SOURCES__')
        let cleanText = textBeforeScores
        if (markerIndex !== -1) {
          cleanText = textBeforeScores.slice(0, markerIndex).trimEnd()
          try {
            const meta = JSON.parse(textBeforeScores.slice(markerIndex + '__SOURCES__'.length))
            sources = meta.sources || []
          } catch {}
        }

        finalAnswerText = sanitizeAnswer(cleanText)
        revealText(cleanText)
      }

      await new Promise(resolve => {
        const check = setInterval(() => {
          if (!typingTimer) {
            clearInterval(check)
            resolve()
          }
        }, 50)
      })

      saveMessageToDb(conversationId, 'assistant', finalAnswerText, sources)
    } catch (err) {
      setMessages(prev => {
        const updated = [...prev]
        updated[updated.length - 1] = { role: 'assistant', content: `Something went wrong: ${err.message}` }
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

  const hasMessages = !isLoadingConvo && messages.length > 0
  const lastMsg = messages[messages.length - 1]
  const showTypingIndicator = isAsking && lastMsg?.role === 'assistant' && lastMsg?.content === ''

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

            {/* ─── WRITE TAB ─── */}
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

                {recentEntries.length > 0 && (
                  <div className="mt-6 pt-5 border-t border-paperLine">
                    <p className="text-[12px] text-inkSoft/60 mb-3">Saved this session</p>
                    <div className="flex flex-wrap gap-2">
                      {recentEntries.map((e, i) => {
                        const moodColor = MOODS.find(m => m.label === e.mood)?.color || '#9A9690'
                        return (
                          <span
                            key={i}
                            className="flex items-center gap-1.5 text-[11px] px-2.5 py-1.5 rounded-full"
                            style={{ backgroundColor: `${moodColor}14`, color: moodColor }}
                          >
                            <span className="w-1.5 h-1.5 rounded-full shrink-0" style={{ backgroundColor: moodColor }} />
                            {e.label.replace('Entry — ', '')}
                          </span>
                        )
                      })}
                    </div>
                  </div>
                )}

                <p className="text-[11px] text-inkSoft/40 text-center mt-6">
                  MindLog offers reflection, not therapy — please reach out to a professional if you need support
                </p>
              </div>
            )}

            {/* ─── REFLECT TAB ─── */}
            {activeTab === 'reflect' && (
              <div className="bg-white/70 border border-paperLine rounded-xl shadow-[0_1px_2px_rgba(35,40,33,0.04)] flex flex-col">

                <div className={hasMessages
                  ? 'max-h-[58vh] overflow-y-auto px-5 pt-6 pb-5 space-y-4'
                  : 'h-[360px] flex items-center justify-center px-6'
                }>
                  {isLoadingConvo && (
                    <p className="text-xs text-inkSoft">Loading reflection…</p>
                  )}

                  {!isLoadingConvo && messages.length === 0 && (
                    <div className="flex flex-col items-center text-center">
                      <div className="w-12 h-12 rounded-full bg-accent flex items-center justify-center mb-5">
                        <IconCompass className="w-5 h-5 text-white" />
                      </div>
                      <p className="text-[13px] text-accent/70 mb-3">Ask me anything about your journal</p>
                      <p className="font-display text-2xl text-ink mb-2">Ask your journal anything</p>
                      <p className="text-sm text-inkSoft max-w-sm leading-relaxed">
                        Try "How have I been feeling this week?" or tap the mic and just ask.
                      </p>
                    </div>
                  )}

                  {hasMessages && messages.map((msg, i) => (
                    <div key={i} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start gap-2.5'}`}>
                      {msg.role === 'system' ? (
                        <div className="text-[11px] text-inkSoft italic px-1">{msg.content}</div>
                      ) : msg.role === 'user' ? (
                        <div className="max-w-[75%] bg-ink text-paper rounded-2xl rounded-br-md px-4 py-2.5">
                          <p className="whitespace-pre-wrap leading-relaxed text-sm">{msg.content}</p>
                        </div>
                      ) : (
                        msg.content !== '' && (
                          <>
                            <div className="w-7 h-7 rounded-full bg-accent flex items-center justify-center shrink-0 mt-0.5">
                              <IconCompass className="w-3.5 h-3.5 text-white" />
                            </div>
                            <div className="max-w-[75%] bg-accent/10 border border-accent/15 rounded-2xl rounded-bl-md px-4 py-3">
                              <p className="whitespace-pre-wrap leading-relaxed text-[15px] text-ink">
                                {msg.content}
                              </p>
                            </div>
                          </>
                        )
                      )}
                    </div>
                  ))}

                  {showTypingIndicator && (
                    <div className="flex justify-start gap-2.5">
                      <div className="w-7 h-7 rounded-full bg-accent flex items-center justify-center shrink-0">
                        <IconCompass className="w-3.5 h-3.5 text-white" />
                      </div>
                      <div className="flex items-center gap-1.5 bg-accent/10 border border-accent/15 rounded-2xl rounded-bl-md px-4 py-3">
                        <span className="w-1.5 h-1.5 rounded-full bg-accent animate-pulse" />
                        <span className="w-1.5 h-1.5 rounded-full bg-accent animate-pulse [animation-delay:150ms]" />
                        <span className="w-1.5 h-1.5 rounded-full bg-accent animate-pulse [animation-delay:300ms]" />
                      </div>
                    </div>
                  )}
                  <div ref={chatEndRef} />
                </div>

                <div className="border-t border-paperLine p-4 bg-paper/40 rounded-b-xl">
                  <div className="flex items-end gap-1 bg-white border border-paperLine rounded-2xl px-2 py-2 shadow-sm focus-within:border-accent/60 focus-within:ring-2 focus-within:ring-accent/15 transition-shadow">
                    <textarea
                      ref={textareaRef}
                      value={input}
                      onChange={(e) => setInput(e.target.value)}
                      onKeyDown={handleKeyDown}
                      placeholder="Ask a question about your journal…"
                      rows={1}
                      className="flex-1 resize-none bg-transparent px-2 py-2 text-sm text-ink placeholder:text-inkSoft/50 focus:outline-none max-h-[160px] leading-relaxed"
                    />
                    <MicButton
                      isListening={questionVoice.isListening}
                      isSupported={questionVoice.isSupported}
                      onClick={() => questionVoice.toggle(input)}
                    />
                    <button
                      onClick={handleAsk}
                      disabled={isAsking || !input.trim()}
                      className="shrink-0 bg-ink text-paper p-2.5 rounded-full disabled:opacity-25 hover:bg-accent transition-colors"
                      title="Ask"
                    >
                      <IconArrowUp className="w-4 h-4" />
                    </button>
                  </div>
                  {questionVoice.isListening && (
                    <p className="text-[12px] text-alert mt-2 flex items-center gap-1.5">
                      <span className="w-1.5 h-1.5 rounded-full bg-alert animate-pulse" />
                      Listening…
                    </p>
                  )}
                  <p className="text-[11px] text-inkSoft/40 text-center mt-2.5">
                    Answers are grounded strictly in your own journal entries
                  </p>
                </div>
              </div>
            )}

          </div>
        </div>
      </div>
    </div>
  )
}

export default App