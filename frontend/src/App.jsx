import { useState, useRef, useEffect } from 'react'
import axios from 'axios'

const API_URL = 'https://mindlog-backend.fastapicloud.dev'

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
  { label: 'Calm', color: '#5B7FA3', bg: '#EAF3FA' },
  { label: 'Content', color: '#4F8061', bg: '#EAF6EE' },
  { label: 'Happy', color: '#2F8F78', bg: '#E8F7F2' },
  { label: 'Grateful', color: '#B88912', bg: '#FFF5D9' },
  { label: 'Excited', color: '#D16D35', bg: '#FFF0E6' },
  { label: 'Stressed', color: '#B56A4B', bg: '#FCEDE8' },
  { label: 'Anxious', color: '#8B63A0', bg: '#F3EAF8' },
  { label: 'Sad', color: '#64748B', bg: '#EEF2F7' },
]

// ─────────────────────────────────────────────
// Icons
// ─────────────────────────────────────────────

const IconMenu = (props) => (
  <svg
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="1.8"
    {...props}
  >
    <path d="M4 7h16M4 12h16M4 17h16" strokeLinecap="round" />
  </svg>
)

const IconArrowLeft = (props) => (
  <svg
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="1.8"
    {...props}
  >
    <path
      d="M15 18l-6-6 6-6"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
  </svg>
)

const IconPlus = (props) => (
  <svg
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="1.8"
    {...props}
  >
    <path d="M12 5v14M5 12h14" strokeLinecap="round" />
  </svg>
)

const IconTrash = (props) => (
  <svg
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="1.6"
    {...props}
  >
    <path
      d="M4 7h16M9 7V5a1 1 0 011-1h4a1 1 0 011 1v2m2 0v13a1 1 0 01-1 1H8a1 1 0 01-1-1V7h10z"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
  </svg>
)

const IconArrowUp = (props) => (
  <svg
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2.2"
    {...props}
  >
    <path
      d="M12 19V5M5 12l7-7 7 7"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
  </svg>
)

const IconBook = (props) => (
  <svg
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="1.6"
    {...props}
  >
    <path
      d="M4 19.5A2.5 2.5 0 016.5 17H20"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
    <path
      d="M6.5 2H20v20H6.5A2.5 2.5 0 014 19.5v-15A2.5 2.5 0 016.5 2z"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
  </svg>
)

const IconPen = (props) => (
  <svg
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="1.6"
    {...props}
  >
    <path d="M12 20h9" strokeLinecap="round" />
    <path
      d="M16.5 3.5a2.12 2.12 0 013 3L7 19l-4 1 1-4L16.5 3.5z"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
  </svg>
)

const IconCompass = (props) => (
  <svg
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="1.6"
    {...props}
  >
    <circle cx="12" cy="12" r="9" />
    <path
      d="M15 9l-3 6-3-6 3 1.5L15 9z"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
  </svg>
)

const IconCheck = (props) => (
  <svg
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    {...props}
  >
    <path
      d="M20 6L9 17l-5-5"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
  </svg>
)

const IconMic = (props) => (
  <svg
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="1.7"
    {...props}
  >
    <path
      d="M12 15a3 3 0 003-3V6a3 3 0 10-6 0v6a3 3 0 003 3z"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
    <path
      d="M19 11a7 7 0 01-14 0M12 18v3"
      strokeLinecap="round"
    />
  </svg>
)

// ─────────────────────────────────────────────
// Voice input
// ─────────────────────────────────────────────

function useVoiceInput(onResult) {
  const [isListening, setIsListening] = useState(false)

  const [isSupported] = useState(
    () =>
      typeof window !== 'undefined' &&
      (window.SpeechRecognition || window.webkitSpeechRecognition)
  )

  const recognitionRef = useRef(null)
  const baseTextRef = useRef('')

  const start = (currentText) => {
    if (!isSupported) return

    const SpeechRecognition =
      window.SpeechRecognition || window.webkitSpeechRecognition

    const recognition = new SpeechRecognition()

    recognition.continuous = true
    recognition.interimResults = true
    recognition.lang = 'en-US'

    baseTextRef.current = currentText
      ? currentText.trim() + ' '
      : ''

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

    try {
      recognition.start()
      setIsListening(true)
    } catch {
      setIsListening(false)
    }
  }

  const stop = () => {
    try {
      recognitionRef.current?.stop()
    } catch {}

    setIsListening(false)
  }

  const toggle = (currentText) => {
    if (isListening) {
      stop()
    } else {
      start(currentText)
    }
  }

  return {
    isListening,
    isSupported,
    toggle,
  }
}

function MicButton({
  isListening,
  isSupported,
  onClick,
  className = '',
}) {
  if (!isSupported) return null

  return (
    <button
      type="button"
      onClick={onClick}
      title={isListening ? 'Stop recording' : 'Speak instead of typing'}
      className={`
        shrink-0
        p-2.5
        rounded-full
        transition-all
        ${
          isListening
            ? 'bg-red-100 text-red-600 shadow-sm'
            : 'text-slate-500 hover:text-slate-800 hover:bg-slate-100'
        }
        ${className}
      `}
    >
      <span className="relative flex items-center justify-center">
        {isListening && (
          <span className="absolute w-7 h-7 rounded-full bg-red-200 animate-ping" />
        )}

        <IconMic className="w-[18px] h-[18px] relative z-10" />
      </span>
    </button>
  )
}

// ─────────────────────────────────────────────
// App
// ─────────────────────────────────────────────

function App() {
  const [userId] = useState(getUserId)

  const [activeTab, setActiveTab] = useState('entries')

  const [conversations, setConversations] = useState([])
  const [currentConversationId, setCurrentConversationId] = useState(null)

  const [messages, setMessages] = useState([])
  const [input, setInput] = useState('')

  const [isAsking, setIsAsking] = useState(false)
  const [isLoadingConvo, setIsLoadingConvo] = useState(false)

  const [sidebarOpen, setSidebarOpen] = useState(() => {
    const saved = localStorage.getItem('mindlog_sidebar_open')

    if (saved !== null) {
      return saved === 'true'
    }

    if (
      typeof window !== 'undefined' &&
      window.innerWidth < 768
    ) {
      return false
    }

    return true
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

  // Mobile swipe refs
  const touchStartXRef = useRef(null)
  const touchStartYRef = useRef(null)

  const entryVoice = useVoiceInput(setEntryText)
  const questionVoice = useVoiceInput(setInput)

  // ─────────────────────────────────────────
  // Effects
  // ─────────────────────────────────────────

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({
      behavior: 'smooth',
      block: 'nearest',
    })
  }, [messages])

  useEffect(() => {
    fetch(API_URL).catch(() => {})
  }, [])

  useEffect(() => {
    refreshConversations()
  }, [])

  useEffect(() => {
    localStorage.setItem(
      'mindlog_sidebar_open',
      String(sidebarOpen)
    )
  }, [sidebarOpen])

  useEffect(() => {
    if (!textareaRef.current) return

    textareaRef.current.style.height = 'auto'

    textareaRef.current.style.height =
      Math.min(
        textareaRef.current.scrollHeight,
        150
      ) + 'px'
  }, [input])

  // Entry textarea auto-resize — floor/ceiling match the Reflection
  // box's empty-state height (280px mobile / 360px larger screens)
  // so both tabs render at the same overall height.
  useEffect(() => {
    if (!entryTextareaRef.current) return

    entryTextareaRef.current.style.height = 'auto'

    entryTextareaRef.current.style.height =
      Math.min(
        Math.max(entryTextareaRef.current.scrollHeight, 280),
        360
      ) + 'px'
  }, [entryText])

  // ─────────────────────────────────────────
  // Mobile swipe sidebar
  // Right swipe = open
  // Left swipe = close
  // ─────────────────────────────────────────

  useEffect(() => {
    const handleTouchStart = (e) => {
      if (window.innerWidth >= 768) return

      const touch = e.touches[0]

      touchStartXRef.current = touch.clientX
      touchStartYRef.current = touch.clientY
    }

    const handleTouchEnd = (e) => {
      if (window.innerWidth >= 768) return

      if (
        touchStartXRef.current === null ||
        touchStartYRef.current === null
      ) {
        return
      }

      const touch = e.changedTouches[0]

      const deltaX =
        touch.clientX - touchStartXRef.current

      const deltaY =
        touch.clientY - touchStartYRef.current

      touchStartXRef.current = null
      touchStartYRef.current = null

      // Don't interfere with normal vertical scrolling
      if (Math.abs(deltaY) > Math.abs(deltaX)) {
        return
      }

      // Minimum horizontal swipe distance
      if (Math.abs(deltaX) < 60) {
        return
      }

      // Swipe right → open
      if (deltaX > 0 && !sidebarOpen) {
        setSidebarOpen(true)
      }

      // Swipe left → close
      if (deltaX < 0 && sidebarOpen) {
        setSidebarOpen(false)
      }
    }

    document.addEventListener(
      'touchstart',
      handleTouchStart,
      { passive: true }
    )

    document.addEventListener(
      'touchend',
      handleTouchEnd,
      { passive: true }
    )

    return () => {
      document.removeEventListener(
        'touchstart',
        handleTouchStart
      )

      document.removeEventListener(
        'touchend',
        handleTouchEnd
      )
    }
  }, [sidebarOpen])

  // ─────────────────────────────────────────
  // API
  // ─────────────────────────────────────────

  const refreshConversations = async () => {
    try {
      const res = await axios.get(
        `${API_URL}/conversations/${userId}`
      )

      setConversations(res.data)
    } catch (err) {
      console.error(
        'Failed to load conversations',
        err
      )
    }
  }

  const startNewReflection = () => {
    setMessages([])
    setCurrentConversationId(null)
    setActiveTab('reflect')

    // On mobile close sidebar after starting reflection
    if (
      typeof window !== 'undefined' &&
      window.innerWidth < 768
    ) {
      setSidebarOpen(false)
    }
  }

  const openConversation = async (conversationId) => {
    setIsLoadingConvo(true)
    setCurrentConversationId(conversationId)
    setActiveTab('reflect')

    try {
      const res = await axios.get(
        `${API_URL}/conversations/${conversationId}/messages`
      )

      const loaded = res.data
        .filter(
          (m) =>
            m.content &&
            m.content.trim() !== ''
        )
        .map((m) => ({
          role: m.role,
          content:
            m.role === 'assistant'
              ? sanitizeAnswer(m.content)
              : m.content,
        }))

      setMessages(loaded)
    } catch (err) {
      console.error(
        'Failed to load conversation messages',
        err
      )
    } finally {
      setIsLoadingConvo(false)
    }

    if (
      typeof window !== 'undefined' &&
      window.innerWidth < 768
    ) {
      setSidebarOpen(false)
    }
  }

  const deleteConversation = async (
    conversationId,
    e
  ) => {
    e.stopPropagation()

    try {
      await axios.delete(
        `${API_URL}/conversations/${conversationId}`
      )

      if (
        conversationId === currentConversationId
      ) {
        startNewReflection()
      }

      refreshConversations()
    } catch (err) {
      console.error(
        'Failed to delete conversation',
        err
      )
    }
  }

  const ensureConversation = async (
    firstMessageText
  ) => {
    if (currentConversationId) {
      return currentConversationId
    }

    const title =
      firstMessageText.length > 40
        ? firstMessageText.slice(0, 40) + '...'
        : firstMessageText

    const res = await axios.post(
      `${API_URL}/conversations`,
      {
        user_id: userId,
        title,
      }
    )

    setCurrentConversationId(res.data.id)

    refreshConversations()

    return res.data.id
  }

  const saveMessageToDb = async (
    conversationId,
    role,
    content,
    sources
  ) => {
    try {
      await axios.post(
        `${API_URL}/messages`,
        {
          conversation_id: conversationId,
          role,
          content,
          sources: sources || [],
        }
      )
    } catch (err) {
      console.error(
        'Failed to save message',
        err
      )
    }
  }

  // ─────────────────────────────────────────
  // Save journal entry
  // ─────────────────────────────────────────

  const handleSaveEntry = async () => {
    if (!entryText.trim()) return

    if (entryVoice.isListening) {
      entryVoice.toggle(entryText)
    }

    setIsSavingEntry(true)

    try {
      const res = await axios.post(
        `${API_URL}/entries`,
        {
          content: entryText,
          mood: selectedMood,
        }
      )

      setRecentEntries((prev) => [
        {
          label: res.data.filename,
          mood: selectedMood,
        },
        ...prev,
      ].slice(0, 5))

      setEntryCount((prev) => prev + 1)

      setSaveConfirmation(
        `Saved — ${new Date().toLocaleDateString(
          undefined,
          {
            month: 'short',
            day: 'numeric',
          }
        )}`
      )

      setEntryText('')
      setSelectedMood(null)

      setTimeout(() => {
        setSaveConfirmation(null)
      }, 3500)
    } catch (err) {
      setSaveConfirmation(
        `Couldn't save: ${
          err.response?.data?.detail ||
          err.message
        }`
      )
    } finally {
      setIsSavingEntry(false)
    }
  }

  // ─────────────────────────────────────────
  // Ask AI
  // ─────────────────────────────────────────

  const handleAsk = async () => {
    if (isAskingRef.current) return
    if (!input.trim()) return

    if (questionVoice.isListening) {
      questionVoice.toggle(input)
    }

    isAskingRef.current = true

    const question = input

    setInput('')

    const conversationHistory = messages
      .filter(
        (m) =>
          m.role === 'user' ||
          m.role === 'assistant'
      )
      .map((m) => ({
        role: m.role,
        content: m.content,
      }))

    setMessages((prev) => [
      ...prev,
      {
        role: 'user',
        content: question,
      },
    ])

    setIsAsking(true)

    setMessages((prev) => [
      ...prev,
      {
        role: 'assistant',
        content: '',
      },
    ])

    const conversationId =
      await ensureConversation(question)

    saveMessageToDb(
      conversationId,
      'user',
      question,
      []
    )

    try {
      const response = await fetch(
        `${API_URL}/query/stream`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            query: question,
            n_results: 5,
            file_filter: null,
            history: conversationHistory,
          }),
        }
      )

      if (!response.ok) {
        const errData =
          await response
            .json()
            .catch(() => null)

        throw new Error(
          errData?.detail ||
            `Request failed (${response.status})`
        )
      }

      if (!response.body) {
        throw new Error(
          'Streaming response is not available.'
        )
      }

      const reader =
        response.body.getReader()

      const decoder = new TextDecoder()

      let fullText = ''
      let sources = []
      let finalAnswerText = ''

      while (true) {
        const {
          done,
          value,
        } = await reader.read()

        if (done) break

        fullText += decoder.decode(
          value,
          { stream: true }
        )

        const scoresMarkerIndex =
          fullText.indexOf(
            '__SCORES__'
          )

        let textBeforeScores =
          fullText

        if (
          scoresMarkerIndex !== -1
        ) {
          textBeforeScores =
            fullText.slice(
              0,
              scoresMarkerIndex
            )
        }

        const markerIndex =
          textBeforeScores.indexOf(
            '__SOURCES__'
          )

        let cleanText =
          textBeforeScores

        if (markerIndex !== -1) {
          cleanText =
            textBeforeScores
              .slice(
                0,
                markerIndex
              )
              .trimEnd()

          try {
            const meta =
              JSON.parse(
                textBeforeScores.slice(
                  markerIndex +
                    '__SOURCES__'.length
                )
              )

            sources =
              meta.sources || []
          } catch {}
        }

        finalAnswerText =
          sanitizeAnswer(cleanText)

        setMessages((prev) => {
          const updated = [...prev]

          updated[
            updated.length - 1
          ] = {
            ...updated[
              updated.length - 1
            ],
            role: 'assistant',
            content: finalAnswerText,
          }

          return updated
        })
      }

      const remaining =
        sanitizeAnswer(
          finalAnswerText
        )

      setMessages((prev) => {
        const updated = [...prev]

        if (updated.length > 0) {
          updated[
            updated.length - 1
          ] = {
            ...updated[
              updated.length - 1
            ],
            role: 'assistant',
            content: remaining,
          }
        }

        return updated
      })

      await saveMessageToDb(
        conversationId,
        'assistant',
        remaining,
        sources
      )

      refreshConversations()
    } catch (err) {
      setMessages((prev) => {
        const updated = [...prev]

        if (updated.length > 0) {
          updated[
            updated.length - 1
          ] = {
            role: 'assistant',
            content:
              `Something went wrong: ${err.message}`,
          }
        }

        return updated
      })
    } finally {
      setIsAsking(false)
      isAskingRef.current = false
    }
  }

  const handleKeyDown = (e) => {
    if (
      e.key === 'Enter' &&
      !e.shiftKey
    ) {
      e.preventDefault()
      handleAsk()
    }
  }

  const hasMessages =
    !isLoadingConvo &&
    messages.length > 0

  const lastMsg =
    messages[messages.length - 1]

  const showTypingIndicator =
    isAsking &&
    lastMsg?.role === 'assistant' &&
    lastMsg?.content === ''

  // ─────────────────────────────────────────
  // Render
  // ─────────────────────────────────────────

  return (
    <div
      className="
        h-dvh
        min-h-screen
        bg-gradient-to-br
        from-[#F4F8F4]
        via-[#F4F1FF]
        to-[#FFF4EA]
        flex
        font-sans
        overflow-hidden
        text-slate-800
      "
    >

      {/* Mobile backdrop */}
      {sidebarOpen && (
        <div
          onClick={() =>
            setSidebarOpen(false)
          }
          className="
            fixed
            inset-0
            bg-slate-950/45
            backdrop-blur-[2px]
            z-30
            md:hidden
          "
        />
      )}

      {/* ────────────────────────────────────
          Sidebar
      ───────────────────────────────────── */}

      <aside
        className={`
          flex
          flex-col
          h-dvh
          shrink-0
          overflow-hidden
          transition-all
          duration-300
          ease-in-out
          fixed
          inset-y-0
          left-0
          z-40
          w-[290px]
          md:sticky
          md:top-0

          ${
            sidebarOpen
              ? 'translate-x-0 md:w-[290px]'
              : '-translate-x-full md:translate-x-0 md:w-0'
          }
        `}
      >
        <div
          className="
            w-[290px]
            h-full
            flex
            flex-col
            bg-gradient-to-b
            from-[#173F35]
            via-[#1E5143]
            to-[#102E28]
            text-white
            shadow-2xl
          "
        >

          {/* Sidebar header */}
          <div
            className="
              px-5
              pt-6
              pb-5
              border-b
              border-white/10
            "
          >
            <div className="flex items-center gap-3">

              <div
                className="
                  w-11
                  h-11
                  rounded-2xl
                  bg-gradient-to-br
                  from-[#7BC6A4]
                  to-[#3D8C6C]
                  flex
                  items-center
                  justify-center
                  shadow-lg
                  shadow-black/10
                "
              >
                <IconCompass className="w-5 h-5 text-white" />
              </div>

              <div className="min-w-0">

                <h1
                  className="
                    font-display
                    text-[25px]
                    text-white
                    tracking-tight
                    leading-none
                  "
                >
                  MindLog
                </h1>

                <p
                  className="
                    text-[10px]
                    text-white/45
                    mt-1.5
                    tracking-[0.18em]
                    uppercase
                  "
                >
                  Your private space
                </p>

              </div>
            </div>

            <div
              className="
                inline-flex
                items-center
                gap-1.5
                mt-5
                px-3
                py-1.5
                rounded-full
                bg-gradient-to-r
                from-[#E4C979]/20
                to-[#FFF1A8]/10
                border
                border-[#E4C979]/25
                text-[#F5DA8A]
                text-[10px]
                font-semibold
                tracking-[0.12em]
                uppercase
              "
            >
              ✦ VIP Reflection
            </div>
          </div>

          {/* New reflection */}
          <div className="px-4 pt-4 pb-4">

            <button
              onClick={startNewReflection}
              className="
                w-full
                flex
                items-center
                justify-center
                gap-2
                bg-gradient-to-r
                from-[#63B78F]
                to-[#4A9C78]
                text-white
                rounded-2xl
                py-3
                text-sm
                font-semibold
                shadow-lg
                shadow-black/10
                hover:brightness-105
                active:scale-[0.99]
                transition-all
              "
            >
              <IconPlus className="w-4 h-4" />
              New reflection
            </button>

          </div>

          {/* Conversation title */}
          <div className="px-5 pb-3">

            <div className="flex items-center justify-between">

              <p
                className="
                  text-[10px]
                  text-white/40
                  tracking-[0.16em]
                  uppercase
                  font-semibold
                "
              >
                Your reflections
              </p>

              <span
                className="
                  text-[10px]
                  px-2
                  py-1
                  rounded-full
                  bg-white/10
                  text-white/55
                "
              >
                {conversations.length}
              </span>

            </div>

          </div>

          {/* Conversations */}
          <div
            className="
              flex-1
              min-h-0
              overflow-y-auto
              px-3
              pb-4
              space-y-1
              scrollbar-thin
            "
          >

            {conversations.length === 0 && (
              <div
                className="
                  mt-8
                  mx-2
                  p-5
                  rounded-2xl
                  bg-white/[0.05]
                  border
                  border-white/[0.07]
                  text-center
                "
              >
                <div
                  className="
                    w-9
                    h-9
                    mx-auto
                    mb-3
                    rounded-xl
                    bg-white/10
                    flex
                    items-center
                    justify-center
                  "
                >
                  <IconBook className="w-4 h-4 text-white/50" />
                </div>

                <p
                  className="
                    text-[11px]
                    text-white/35
                    leading-relaxed
                  "
                >
                  Your saved reflections
                  will appear here.
                </p>
              </div>
            )}

            {conversations.map((conv) => {

              const isActive =
                conv.id === currentConversationId

              return (
                <div
                  key={conv.id}
                  onClick={() =>
                    openConversation(conv.id)
                  }
                  className={`
                    group
                    relative
                    flex
                    items-start
                    justify-between
                    pl-4
                    pr-3
                    py-3.5
                    rounded-2xl
                    cursor-pointer
                    transition-all

                    ${
                      isActive
                        ? 'bg-white/[0.13] shadow-sm'
                        : 'hover:bg-white/[0.07]'
                    }
                  `}
                >

                  {isActive && (
                    <span
                      className="
                        absolute
                        left-0
                        top-3
                        bottom-3
                        w-1
                        rounded-full
                        bg-gradient-to-b
                        from-[#9DE0BC]
                        to-[#5DB68B]
                      "
                    />
                  )}

                  <div className="min-w-0 flex-1">

                    <p
                      className={`
                        text-[13px]
                        truncate
                        leading-snug
                        font-medium
                        ${
                          isActive
                            ? 'text-white'
                            : 'text-white/80'
                        }
                      `}
                    >
                      {conv.title}
                    </p>

                    <p
                      className="
                        text-[10px]
                        text-white/35
                        mt-1.5
                      "
                    >
                      {timeAgo(conv.created_at)}
                    </p>

                  </div>

                  <button
                    onClick={(e) =>
                      deleteConversation(
                        conv.id,
                        e
                      )
                    }
                    className="
                      opacity-0
                      group-hover:opacity-100
                      text-white/25
                      hover:text-red-300
                      ml-2
                      mt-0.5
                      transition-opacity
                      shrink-0
                      p-1
                      rounded-lg
                      hover:bg-red-400/10
                    "
                    title="Delete reflection"
                  >
                    <IconTrash className="w-3.5 h-3.5" />
                  </button>

                </div>
              )
            })}

          </div>

          {/* Sidebar footer */}
          <div
            className="
              px-5
              py-4
              border-t
              border-white/10
            "
          >
            <div className="flex items-start gap-2.5">

              <span
                className="
                  w-2
                  h-2
                  rounded-full
                  bg-[#75C99E]
                  mt-1
                  shrink-0
                  shadow-[0_0_10px_rgba(117,201,158,0.5)]
                "
              />

              <p
                className="
                  text-[10px]
                  text-white/35
                  leading-relaxed
                "
              >
                Your reflections stay grounded
                in your own words.
              </p>

            </div>
          </div>

        </div>
      </aside>

      {/* ────────────────────────────────────
          Main
      ───────────────────────────────────── */}

      <main
        className="
          flex-1
          flex
          flex-col
          h-dvh
          min-w-0
          overflow-hidden
        "
      >

        {/* Top bar */}
        <header
          className="
            relative
            flex
            items-center
            justify-between
            gap-3
            px-3
            sm:px-6
            lg:px-8
            py-3
            sm:py-4
            shrink-0
            bg-white/55
            backdrop-blur-xl
            border-b
            border-white/60
            shadow-sm
            z-20
          "
        >

          <div
            className="
              flex
              items-center
              gap-2
              min-w-0
            "
          >

            {/* ONE SIDEBAR BUTTON ONLY */}
            <button
              type="button"
              onClick={() =>
                setSidebarOpen(
                  (value) => !value
                )
              }
              className="
                text-slate-600
                hover:text-[#225344]
                p-2.5
                rounded-xl
                bg-white/80
                border
                border-white
                shadow-sm
                hover:shadow-md
                active:scale-95
                transition-all
                shrink-0
              "
              title={
                sidebarOpen
                  ? 'Close sidebar'
                  : 'Open sidebar'
              }
              aria-label={
                sidebarOpen
                  ? 'Close sidebar'
                  : 'Open sidebar'
              }
            >
              {sidebarOpen ? (
                <IconArrowLeft className="w-5 h-5" />
              ) : (
                <IconMenu className="w-5 h-5" />
              )}
            </button>

            <div
              className="
                hidden
                sm:block
                w-px
                h-7
                bg-slate-200
              "
            />

            {/* Tabs */}
            <div
              className="
                flex
                items-center
                gap-1.5
                sm:gap-2
                min-w-0
              "
            >

              <button
                onClick={() =>
                  setActiveTab('entries')
                }
                className={`
                  flex
                  items-center
                  gap-1.5
                  px-3
                  sm:px-4
                  py-2
                  rounded-xl
                  text-xs
                  font-semibold
                  transition-all
                  border

                  ${
                    activeTab === 'entries'
                      ? `
                        bg-[#E6F6ED]
                        text-[#2F7458]
                        border-[#BDE6D0]
                        shadow-sm
                      `
                      : `
                        bg-white/45
                        text-slate-500
                        border-transparent
                        hover:bg-white/80
                      `
                  }
                `}
              >
                <IconPen className="w-3.5 h-3.5" />
                <span>Entries</span>
              </button>

              <button
                onClick={() =>
                  setActiveTab('reflect')
                }
                className={`
                  flex
                  items-center
                  gap-1.5
                  px-3
                  sm:px-4
                  py-2
                  rounded-xl
                  text-xs
                  font-semibold
                  transition-all
                  border

                  ${
                    activeTab === 'reflect'
                      ? `
                        bg-[#F0EAFE]
                        text-[#72569A]
                        border-[#D9C9F4]
                        shadow-sm
                      `
                      : `
                        bg-white/45
                        text-slate-500
                        border-transparent
                        hover:bg-white/80
                      `
                  }
                `}
              >
                <IconCompass className="w-3.5 h-3.5" />
                <span>Reflection</span>
              </button>

            </div>

          </div>

          {/* Entry counter */}
          <div
            className="
              hidden
              sm:flex
              items-center
              gap-1.5
              text-[11px]
              text-slate-600
              bg-white/75
              border
              border-white
              px-3
              py-2
              rounded-full
              shadow-sm
              shrink-0
            "
          >
            <IconBook className="w-3.5 h-3.5 text-[#4F8061]" />

            <span>
              {entryCount}{' '}
              {entryCount === 1
                ? 'entry'
                : 'entries'}{' '}
              this session
            </span>
          </div>

        </header>

        {/* Content */}
        <div
          className="
            flex-1
            min-h-0
            overflow-y-auto
            overflow-x-hidden
            px-3
            sm:px-5
            lg:px-8
            py-5
            sm:py-7
            lg:py-8
          "
        >

          <div
            className="
              w-full
              max-w-3xl
              mx-auto
            "
          >

            {/* ═══════════════════════════════
                ENTRIES
            ═══════════════════════════════ */}

            {activeTab === 'entries' && (
              <section
                className="
                  bg-white/75
                  backdrop-blur-xl
                  border
                  border-white/90
                  rounded-[24px]
                  shadow-[0_15px_50px_rgba(58,65,80,0.08)]
                  overflow-hidden
                "
              >

                <div
                  className="
                    h-2
                    bg-gradient-to-r
                    from-[#72B996]
                    via-[#9A83C7]
                    to-[#E8A16C]
                  "
                />

                <div
                  className="
                    p-4
                    sm:p-7
                  "
                >

                  {/* Greeting */}
                  <div
                    className="
                      flex
                      items-start
                      gap-3
                      mb-5
                    "
                  >

                    <div
                      className="
                        w-10
                        h-10
                        rounded-2xl
                        bg-gradient-to-br
                        from-[#70B995]
                        to-[#4D8D72]
                        flex
                        items-center
                        justify-center
                        shrink-0
                        shadow-md
                      "
                    >
                      <IconCompass className="w-5 h-5 text-white" />
                    </div>

                    <div
                      className="
                        bg-gradient-to-br
                        from-[#EAF8F0]
                        to-[#F3EEFF]
                        border
                        border-white
                        rounded-2xl
                        rounded-tl-md
                        px-4
                        py-3
                        shadow-sm
                      "
                    >
                      <p
                        className="
                          text-[14px]
                          sm:text-[15px]
                          text-slate-700
                          leading-relaxed
                        "
                      >
                        Hey! How are you
                        feeling today?
                        Pick a mood, then
                        type or tap the
                        mic to speak your
                        entry 🙂
                      </p>
                    </div>

                  </div>

                  {/* Mood selection */}
                  <div
                    className="
                      pl-0
                      sm:pl-[52px]
                      mb-5
                    "
                  >

                    <p
                      className="
                        text-[11px]
                        font-semibold
                        uppercase
                        tracking-[0.12em]
                        text-slate-400
                        mb-3
                      "
                    >
                      How are you feeling?
                    </p>

                    <div
                      className="
                        flex
                        flex-wrap
                        gap-2
                      "
                    >
                      {MOODS.map((m) => {

                        const isSelected =
                          selectedMood === m.label

                        return (
                          <button
                            key={m.label}
                            onClick={() =>
                              setSelectedMood(
                                isSelected
                                  ? null
                                  : m.label
                              )
                            }
                            className="
                              flex
                              items-center
                              gap-2
                              px-3
                              py-2
                              rounded-full
                              text-xs
                              sm:text-sm
                              font-medium
                              border
                              transition-all
                              active:scale-95
                            "
                            style={{
                              backgroundColor:
                                isSelected
                                  ? m.color
                                  : m.bg,
                              color:
                                isSelected
                                  ? '#fff'
                                  : m.color,
                              borderColor:
                                isSelected
                                  ? m.color
                                  : `${m.color}22`,
                              boxShadow:
                                isSelected
                                  ? `0 5px 16px ${m.color}35`
                                  : 'none',
                            }}
                          >
                            <span
                              className="
                                w-2
                                h-2
                                rounded-full
                                shrink-0
                              "
                              style={{
                                backgroundColor:
                                  isSelected
                                    ? 'rgba(255,255,255,.9)'
                                    : m.color,
                              }}
                            />

                            {m.label}
                          </button>
                        )
                      })}
                    </div>

                  </div>

                  {/* ENTRY BOX — size now matches Reflection's box */}
                  <div className="relative">

                    <textarea
                      ref={entryTextareaRef}
                      value={entryText}
                      onChange={(e) =>
                        setEntryText(
                          e.target.value
                        )
                      }
                      placeholder="Write whatever is on your mind... This is your private space."
                      rows={8}
                      className="
                        w-full
                        resize-none
                        bg-gradient-to-br
                        from-[#FBFDFB]
                        to-[#F8F4FF]
                        border
                        border-slate-200/80
                        rounded-[20px]
                        pl-4
                        pr-14
                        py-3
                        text-[15px]
                        text-slate-700
                        placeholder:text-slate-400
                        focus:outline-none
                        focus:border-[#72B996]
                        focus:ring-4
                        focus:ring-[#72B996]/10
                        transition-all
                        leading-relaxed
                        min-h-[280px]
                        sm:min-h-[360px]
                        max-h-[280px]
                        sm:max-h-[360px]
                      "
                    />

                    <MicButton
                      isListening={
                        entryVoice.isListening
                      }
                      isSupported={
                        entryVoice.isSupported
                      }
                      onClick={() =>
                        entryVoice.toggle(
                          entryText
                        )
                      }
                      className="
                        absolute
                        right-2.5
                        bottom-2.5
                        bg-white/80
                        shadow-sm
                      "
                    />

                  </div>

                  {entryVoice.isListening && (
                    <p
                      className="
                        text-[11px]
                        text-red-500
                        mt-2
                        flex
                        items-center
                        gap-1.5
                      "
                    >
                      <span
                        className="
                          w-1.5
                          h-1.5
                          rounded-full
                          bg-red-500
                          animate-pulse
                        "
                      />

                      Listening — tap the
                      mic again when you're
                      done.
                    </p>
                  )}

                  {/* Save row */}
                  <div
                    className="
                      flex
                      flex-col
                      sm:flex-row
                      sm:items-center
                      sm:justify-between
                      gap-3
                      mt-4
                    "
                  >

                    <div
                      className="
                        text-[11px]
                        text-slate-500
                        min-h-[20px]
                        flex
                        items-center
                        gap-1.5
                      "
                    >
                      {saveConfirmation && (
                        <>
                          <IconCheck className="w-3.5 h-3.5 text-[#4F8061]" />

                          <span className="text-[#4F8061]">
                            {saveConfirmation}
                          </span>
                        </>
                      )}
                    </div>

                    <button
                      onClick={handleSaveEntry}
                      disabled={
                        isSavingEntry ||
                        !entryText.trim()
                      }
                      className="
                        w-full
                        sm:w-auto
                        flex
                        items-center
                        justify-center
                        gap-2
                        bg-gradient-to-r
                        from-[#4F9B77]
                        to-[#367B5E]
                        text-white
                        px-5
                        py-3
                        rounded-full
                        text-sm
                        font-semibold
                        disabled:opacity-30
                        hover:brightness-105
                        active:scale-[0.98]
                        transition-all
                        shadow-md
                      "
                    >
                      {isSavingEntry ? (
                        <span
                          className="
                            block
                            w-[14px]
                            h-[14px]
                            border-2
                            border-white/30
                            border-t-white
                            rounded-full
                            animate-spin
                          "
                        />
                      ) : (
                        <IconArrowUp className="w-[14px] h-[14px]" />
                      )}

                      Save entry
                    </button>

                  </div>

                  {/* Recent entries */}
                  {recentEntries.length > 0 && (
                    <div
                      className="
                        mt-6
                        pt-5
                        border-t
                        border-slate-200
                      "
                    >

                      <p
                        className="
                          text-[11px]
                          font-semibold
                          uppercase
                          tracking-[0.12em]
                          text-slate-400
                          mb-3
                        "
                      >
                        Saved this session
                      </p>

                      <div
                        className="
                          flex
                          flex-wrap
                          gap-2
                        "
                      >
                        {recentEntries.map(
                          (e, i) => {

                            const mood =
                              MOODS.find(
                                (m) =>
                                  m.label === e.mood
                              )

                            const moodColor =
                              mood?.color ||
                              '#64748B'

                            const moodBg =
                              mood?.bg ||
                              '#EEF2F7'

                            return (
                              <span
                                key={i}
                                className="
                                  flex
                                  items-center
                                  gap-1.5
                                  text-[11px]
                                  px-3
                                  py-1.5
                                  rounded-full
                                  font-medium
                                "
                                style={{
                                  backgroundColor:
                                    moodBg,
                                  color:
                                    moodColor,
                                }}
                              >

                                <span
                                  className="
                                    w-1.5
                                    h-1.5
                                    rounded-full
                                  "
                                  style={{
                                    backgroundColor:
                                      moodColor,
                                  }}
                                />

                                {e.label.replace(
                                  'Entry — ',
                                  ''
                                )}
                              </span>
                            )
                          }
                        )}
                      </div>

                    </div>
                  )}

                  <p
                    className="
                      text-[10px]
                      text-slate-400
                      text-center
                      mt-6
                    "
                  >
                    MindLog offers reflection,
                    not therapy — please reach
                    out to a professional if you
                    need support.
                  </p>

                </div>

              </section>
            )}

            {/* ═══════════════════════════════
                REFLECTION
            ═══════════════════════════════ */}

            {activeTab === 'reflect' && (
              <section
                className="
                  bg-white/75
                  backdrop-blur-xl
                  border
                  border-white/90
                  rounded-[24px]
                  shadow-[0_15px_50px_rgba(58,65,80,0.08)]
                  overflow-hidden
                  flex
                  flex-col
                "
              >

                {/* Reflection header */}
                <div
                  className="
                    px-4
                    sm:px-6
                    py-5
                    bg-gradient-to-r
                    from-[#EEF8F2]
                    via-[#F4EEFF]
                    to-[#FFF2E7]
                    border-b
                    border-white
                  "
                >

                  <div
                    className="
                      flex
                      items-center
                      gap-3
                    "
                  >

                    <div
                      className="
                        w-11
                        h-11
                        rounded-2xl
                        bg-gradient-to-br
                        from-[#8F77C5]
                        to-[#5E9C83]
                        flex
                        items-center
                        justify-center
                        shadow-md
                        shrink-0
                      "
                    >
                      <IconCompass className="w-5 h-5 text-white" />
                    </div>

                    <div className="min-w-0">

                      <p
                        className="
                          text-[10px]
                          font-semibold
                          uppercase
                          tracking-[0.16em]
                          text-[#72569A]
                        "
                      >
                        AI Reflection
                      </p>

                      <h2
                        className="
                          font-display
                          text-xl
                          sm:text-2xl
                          text-slate-800
                          leading-tight
                        "
                      >
                        Ask your journal
                        anything
                      </h2>

                    </div>

                  </div>

                </div>

                {/* Messages */}
                <div
                  className={`
                    min-h-0

                    ${
                      hasMessages
                        ? `
                          max-h-[58vh]
                          sm:max-h-[60vh]
                          overflow-y-auto
                          px-4
                          sm:px-6
                          py-5
                          space-y-4
                        `
                        : `
                          min-h-[280px]
                          sm:min-h-[360px]
                          flex
                          items-center
                          justify-center
                          px-5
                        `
                    }
                  `}
                >

                  {isLoadingConvo && (
                    <div
                      className="
                        flex
                        flex-col
                        items-center
                        gap-3
                        text-center
                      "
                    >
                      <div
                        className="
                          w-10
                          h-10
                          rounded-full
                          border-4
                          border-[#D9C9F4]
                          border-t-[#72569A]
                          animate-spin
                        "
                      />

                      <p
                        className="
                          text-xs
                          text-slate-500
                        "
                      >
                        Loading reflection…
                      </p>
                    </div>
                  )}

                  {/* EMPTY REFLECTION STATE
                      Duplicate logo removed */}
                  {!isLoadingConvo &&
                    messages.length === 0 && (
                      <div
                        className="
                          flex
                          flex-col
                          items-center
                          text-center
                          max-w-md
                        "
                      >

                        <p
                          className="
                            text-[12px]
                            text-[#72569A]
                            font-semibold
                            uppercase
                            tracking-[0.12em]
                            mb-2
                          "
                        >
                          Your private AI
                        </p>

                        <p
                          className="
                            font-display
                            text-2xl
                            sm:text-3xl
                            text-slate-800
                            mb-2
                          "
                        >
                          Ask your journal
                          anything
                        </p>

                        <p
                          className="
                            text-sm
                            text-slate-500
                            leading-relaxed
                          "
                        >
                          Ask about your
                          feelings, patterns,
                          progress, or anything
                          you've written in your
                          journal.
                        </p>

                      </div>
                    )}

                  {hasMessages &&
                    messages.map(
                      (msg, i) => (
                        <div
                          key={i}
                          className={`
                            flex
                            ${
                              msg.role === 'user'
                                ? 'justify-end'
                                : 'justify-start gap-2.5'
                            }
                          `}
                        >

                          {msg.role === 'system' ? (
                            <div
                              className="
                                text-[11px]
                                text-slate-400
                                italic
                                px-1
                              "
                            >
                              {msg.content}
                            </div>
                          ) : msg.role === 'user' ? (
                            <div
                              className="
                                max-w-[85%]
                                sm:max-w-[75%]
                                bg-gradient-to-br
                                from-[#355F52]
                                to-[#244A3E]
                                text-white
                                rounded-2xl
                                rounded-br-md
                                px-4
                                py-3
                                shadow-sm
                              "
                            >
                              <p
                                className="
                                  whitespace-pre-wrap
                                  leading-relaxed
                                  text-sm
                                "
                              >
                                {msg.content}
                              </p>
                            </div>
                          ) : (
                            msg.content !== '' && (
                              <>
                                <div
                                  className="
                                    w-8
                                    h-8
                                    rounded-xl
                                    bg-gradient-to-br
                                    from-[#8E79C5]
                                    to-[#61A283]
                                    flex
                                    items-center
                                    justify-center
                                    shrink-0
                                    mt-0.5
                                    shadow-sm
                                  "
                                >
                                  <IconCompass className="w-4 h-4 text-white" />
                                </div>

                                <div
                                  className="
                                    max-w-[85%]
                                    sm:max-w-[75%]
                                    bg-gradient-to-br
                                    from-[#F0EAFE]
                                    to-[#EAF8F1]
                                    border
                                    border-white
                                    rounded-2xl
                                    rounded-bl-md
                                    px-4
                                    py-3
                                    shadow-sm
                                  "
                                >
                                  <p
                                    className="
                                      whitespace-pre-wrap
                                      leading-relaxed
                                      text-[15px]
                                      text-slate-700
                                    "
                                  >
                                    {msg.content}
                                  </p>
                                </div>
                              </>
                            )
                          )}

                        </div>
                      )
                    )}

                  {showTypingIndicator && (
                    <div
                      className="
                        flex
                        justify-start
                        gap-2.5
                      "
                    >

                      <div
                        className="
                          w-8
                          h-8
                          rounded-xl
                          bg-gradient-to-br
                          from-[#8E79C5]
                          to-[#61A283]
                          flex
                          items-center
                          justify-center
                          shrink-0
                        "
                      >
                        <IconCompass className="w-4 h-4 text-white" />
                      </div>

                      <div
                        className="
                          flex
                          items-center
                          gap-1.5
                          bg-[#F0EAFE]
                          rounded-2xl
                          rounded-bl-md
                          px-4
                          py-3
                        "
                      >
                        <span className="w-1.5 h-1.5 rounded-full bg-[#8066A9] animate-pulse" />
                        <span className="w-1.5 h-1.5 rounded-full bg-[#8066A9] animate-pulse [animation-delay:150ms]" />
                        <span className="w-1.5 h-1.5 rounded-full bg-[#8066A9] animate-pulse [animation-delay:300ms]" />
                      </div>

                    </div>
                  )}

                  <div ref={chatEndRef} />

                </div>

                {/* Reflection chat input */}
                <div
                  className="
                    border-t
                    border-white
                    p-3
                    sm:p-4
                    bg-gradient-to-r
                    from-[#F5FAF7]
                    via-[#F8F5FF]
                    to-[#FFF8F1]
                  "
                >

                  <div
                    className="
                      flex
                      items-end
                      gap-1
                      bg-white
                      border
                      border-slate-200
                      rounded-[20px]
                      px-2
                      py-2
                      shadow-sm
                      focus-within:border-[#8E79C5]
                      focus-within:ring-4
                      focus-within:ring-[#8E79C5]/10
                      transition-all
                    "
                  >

                    <textarea
                      ref={textareaRef}
                      value={input}
                      onChange={(e) =>
                        setInput(
                          e.target.value
                        )
                      }
                      onKeyDown={handleKeyDown}
                      placeholder="Ask a question about your journal…"
                      rows={1}
                      className="
                        flex-1
                        min-w-0
                        resize-none
                        bg-transparent
                        px-2
                        py-2
                        text-sm
                        text-slate-700
                        placeholder:text-slate-400
                        focus:outline-none
                        max-h-[150px]
                        leading-relaxed
                      "
                    />

                    <MicButton
                      isListening={
                        questionVoice.isListening
                      }
                      isSupported={
                        questionVoice.isSupported
                      }
                      onClick={() =>
                        questionVoice.toggle(
                          input
                        )
                      }
                    />

                    <button
                      onClick={handleAsk}
                      disabled={
                        isAsking ||
                        !input.trim()
                      }
                      className="
                        shrink-0
                        w-10
                        h-10
                        flex
                        items-center
                        justify-center
                        bg-gradient-to-br
                        from-[#4F8061]
                        to-[#72569A]
                        text-white
                        rounded-full
                        disabled:opacity-25
                        hover:brightness-105
                        active:scale-95
                        transition-all
                        shadow-sm
                      "
                      title="Ask"
                    >
                      <IconArrowUp className="w-4 h-4" />
                    </button>

                  </div>

                  {questionVoice.isListening && (
                    <p
                      className="
                        text-[11px]
                        text-red-500
                        mt-2
                        flex
                        items-center
                        gap-1.5
                      "
                    >
                      <span
                        className="
                          w-1.5
                          h-1.5
                          rounded-full
                          bg-red-500
                          animate-pulse
                        "
                      />

                      Listening…
                    </p>
                  )}

                  <p
                    className="
                      text-[10px]
                      text-slate-400
                      text-center
                      mt-2.5
                    "
                  >
                    Answers are grounded
                    strictly in your own
                    journal entries.
                  </p>

                </div>

              </section>
            )}

            {/* Mobile counter */}
            <div
              className="
                sm:hidden
                flex
                items-center
                justify-center
                gap-1.5
                mt-4
                text-[10px]
                text-slate-400
              "
            >
              <IconBook className="w-3 h-3" />

              {entryCount}{' '}
              {entryCount === 1
                ? 'entry'
                : 'entries'}{' '}
              this session
            </div>

          </div>
        </div>

      </main>
    </div>
  )
}

export default App