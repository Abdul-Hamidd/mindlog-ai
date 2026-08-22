import { useEffect, useRef, useState } from 'react'

import axios from 'axios'

const API_URL = 'https://mindlog-backend.fastapicloud.dev'

function getUserId() {
  let userId = localStorage.getItem('mindlog_user_id')

  if (!userId) {
    try {
      userId = crypto.randomUUID()
    } catch {
      userId =
        Date.now().toString(36) +
        Math.random().toString(36).slice(2)
    }

    localStorage.setItem('mindlog_user_id', userId)
  }

  return userId
}

function timeAgo(dateStr) {
  if (!dateStr) return ''

  const diff = Date.now() - new Date(dateStr).getTime()
  const mins = Math.floor(diff / 60000)

  if (mins < 1) return 'Just now'
  if (mins < 60) return `${mins}m ago`

  const hrs = Math.floor(mins / 24)

  if (hrs < 24) return `${hrs}h ago`

  const days = Math.floor(hrs / 24)

  if (days < 7) return `${days}d ago`

  return new Date(dateStr).toLocaleDateString(undefined, {
    month: 'short',
    day: 'numeric'
  })
}

function sanitizeAnswer(text) {
  if (!text) return text

  return text
    .replace(/\n\*\*based on entries:[\s\S]*$/i, '')
    .replace(/\*\*?\s*Entry\s*—[^)]*\*\*\)?\*\*?/gi, '')
    .trim()
}

const MOODS = [
  { label: 'Calm', emoji: '😌', color: '#0EA5E9' },
  { label: 'Content', emoji: '🙂', color: '#10B981' },
  { label: 'Happy', emoji: '😊', color: '#F59E0B' },
  { label: 'Grateful', emoji: '🙏', color: '#8B5CF6' },
  { label: 'Excited', emoji: '✨', color: '#EC4899' },
  { label: 'Stressed', emoji: '😣', color: '#EF4444' },
  { label: 'Anxious', emoji: '😟', color: '#F97316' },
  { label: 'Sad', emoji: '😔', color: '#64748B' }
]

const IconMenu = (props) => (
  <svg
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="1.8"
    {...props}
  >
    <path
      d="M3 6h18M3 12h18M3 18h18"
      strokeLinecap="round"
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
    <path
      d="M12 5v14M5 12h14"
      strokeLinecap="round"
    />
  </svg>
)

const IconTrash = (props) => (
  <svg
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="1.7"
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
    strokeWidth="1.7"
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
    strokeWidth="1.7"
    {...props}
  >
    <path
      d="M12 20h9"
      strokeLinecap="round"
    />
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
    strokeWidth="1.7"
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
    />
  </svg>
)

const IconMic = (props) => (
  <svg
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="1.8"
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

const IconSparkles = (props) => (
  <svg
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="1.7"
    {...props}
  >
    <path
      d="M12 3l1.5 5.5L19 10l-5.5 1.5L12 17l-1.5-5.5L5 10l5.5-1.5L12 3z"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
    <path
      d="M19 16l.7 2.3L22 19l-2.3.7L19 22l-.7-2.3L16 19l2.3-.7L19 16z"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
  </svg>
)

const IconHeart = (props) => (
  <svg
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="1.7"
    {...props}
  >
    <path
      d="M20.8 8.8c0 5.5-8.8 11.2-8.8 11.2S3.2 14.3 3.2 8.8A4.7 4.7 0 0112 6.2a4.7 4.7 0 018.8 2.6z"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
  </svg>
)

const IconMessage = (props) => (
  <svg
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="1.7"
    {...props}
  >
    <path
      d="M20 11.5a7.5 7.5 0 01-7.5 7.5H8l-4 2 1.5-4A7.5 7.5 0 1120 11.5z"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
  </svg>
)

function useVoiceInput(onResult) {
  const [isListening, setIsListening] = useState(false)

  const isSupported =
    typeof window !== 'undefined' &&
    Boolean(
      window.SpeechRecognition ||
        window.webkitSpeechRecognition
    )

  const recognitionRef = useRef(null)
  const baseTextRef = useRef('')

  const start = (currentText) => {
    if (!isSupported) return

    const SpeechRecognition =
      window.SpeechRecognition ||
      window.webkitSpeechRecognition

    const recognition =
      new SpeechRecognition()

    recognition.continuous = true
    recognition.interimResults = true

    recognition.lang =
      navigator.language?.toLowerCase().startsWith('ur')
        ? 'ur-PK'
        : 'en-US'

    baseTextRef.current = currentText?.trim()
      ? `${currentText.trim()} `
      : ''

    recognition.onresult = (event) => {
      let transcript = ''

      for (
        let i = 0;
        i < event.results.length;
        i++
      ) {
        transcript +=
          event.results[i][0].transcript
      }

      onResult(
        baseTextRef.current + transcript
      )
    }

    recognition.onerror = () =>
      setIsListening(false)

    recognition.onend = () =>
      setIsListening(false)

    recognitionRef.current =
      recognition

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
    toggle
  }
}

function MicButton({
  isListening,
  isSupported,
  onClick,
  className = ''
}) {
  if (!isSupported) return null

  return (
    <button
      type="button"
      onClick={onClick}
      title={
        isListening
          ? 'Stop recording'
          : 'Speak'
      }
      aria-label={
        isListening
          ? 'Stop recording'
          : 'Start voice input'
      }
      className={`
        relative shrink-0
        w-9 h-9
        flex items-center justify-center
        rounded-full
        transition-all duration-200
        ${
          isListening
            ? 'bg-red-500/20 text-red-600 scale-105'
            : 'text-slate-500 hover:text-slate-800 hover:bg-slate-200/60'
        }
        ${className}
      `}
    >
      {isListening && (
        <span className="absolute inset-0 rounded-full bg-red-500/20 animate-ping" />
      )}

      <span className="relative flex items-center justify-center">
        <IconMic className="w-[18px] h-[18px]" />
      </span>
    </button>
  )
}

function App() {
  const [userId] = useState(getUserId)

  const [activeTab, setActiveTab] =
    useState('write')

  const [conversations, setConversations] =
    useState([])

  const [
    currentConversationId,
    setCurrentConversationId
  ] = useState(null)

  const [messages, setMessages] =
    useState([])

  const [input, setInput] =
    useState('')

  const [isAsking, setIsAsking] =
    useState(false)

  const [
    isLoadingConvo,
    setIsLoadingConvo
  ] = useState(false)

  const [sidebarOpen, setSidebarOpen] =
    useState(() => {
      if (typeof window !== 'undefined') {
        return window.innerWidth >= 768
      }
      return true
    })

  const [entryText, setEntryText] =
    useState('')

  const [selectedMood, setSelectedMood] =
    useState(null)

  const [
    isSavingEntry,
    setIsSavingEntry
  ] = useState(false)

  const [
    saveConfirmation,
    setSaveConfirmation
  ] = useState(null)

  const [recentEntries, setRecentEntries] =
    useState([])

  const [entryCount, setEntryCount] =
    useState(0)

  const [appHeight, setAppHeight] =
    useState(
      typeof window !== 'undefined'
        ? window.innerHeight
        : 800
    )

  const chatEndRef = useRef(null)
  const textareaRef = useRef(null)
  const entryTextareaRef =
    useRef(null)

  const isAskingRef = useRef(false)

  const sidebarTouchStartX =
    useRef(null)

  const sidebarTouchStartY =
    useRef(null)

  const entryVoice =
    useVoiceInput(setEntryText)

  const questionVoice =
    useVoiceInput(setInput)

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({
      behavior: 'smooth'
    })
  }, [messages])

  useEffect(() => {
    fetch(API_URL).catch(() => {})
    refreshConversations()
  }, [])

  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height =
        'auto'

      textareaRef.current.style.height =
        Math.min(
          textareaRef.current
            .scrollHeight,
          160
        ) + 'px'
    }
  }, [input])

  useEffect(() => {
    if (entryTextareaRef.current) {
      entryTextareaRef.current.style.height =
        'auto'

      entryTextareaRef.current.style.height =
        Math.min(
          entryTextareaRef.current
            .scrollHeight,
          160
        ) + 'px'
    }
  }, [entryText])

  useEffect(() => {
    const keepInputVisible = () => {
      const activeElement =
        document.activeElement

      const isChatInput =
        activeElement ===
          textareaRef.current ||
        activeElement ===
          entryTextareaRef.current

      if (!isChatInput) return

      setTimeout(() => {
        activeElement.scrollIntoView({
          behavior: 'smooth',
          block: 'center'
        })
      }, 80)
    }

    const handleViewportResize = () => {
      keepInputVisible()
    }

    const handleFocusIn = (event) => {
      if (
        event.target === textareaRef.current ||
        event.target ===
          entryTextareaRef.current
      ) {
        setTimeout(() => {
          event.target.scrollIntoView({
            behavior: 'smooth',
            block: 'center'
          })
        }, 100)
      }
    }

    window.addEventListener(
      'focusin',
      handleFocusIn
    )

    if (window.visualViewport) {
      window.visualViewport.addEventListener(
        'resize',
        handleViewportResize
      )

      window.visualViewport.addEventListener(
        'scroll',
        handleViewportResize
      )
    }

    window.addEventListener(
      'resize',
      handleViewportResize
    )

    return () => {
      window.removeEventListener(
        'focusin',
        handleFocusIn
      )

      window.removeEventListener(
        'resize',
        handleViewportResize
      )

      if (window.visualViewport) {
        window.visualViewport.removeEventListener(
          'resize',
          handleViewportResize
        )

        window.visualViewport.removeEventListener(
          'scroll',
          handleViewportResize
        )
      }
    }
  }, [])

  useEffect(() => {
    const updateAppHeight = () => {
      const vh =
        window.visualViewport?.height ||
        window.innerHeight

      setAppHeight(vh)
    }

    updateAppHeight()

    window.addEventListener(
      'resize',
      updateAppHeight
    )

    if (window.visualViewport) {
      window.visualViewport.addEventListener(
        'resize',
        updateAppHeight
      )

      window.visualViewport.addEventListener(
        'scroll',
        updateAppHeight
      )
    }

    return () => {
      window.removeEventListener(
        'resize',
        updateAppHeight
      )

      if (window.visualViewport) {
        window.visualViewport.removeEventListener(
          'resize',
          updateAppHeight
        )

        window.visualViewport.removeEventListener(
          'scroll',
          updateAppHeight
        )
      }
    }
  }, [])

  const toggleSidebar = () => {
    setSidebarOpen(
      (prev) => !prev
    )
  }

  const closeSidebarOnMobile = () => {
    if (
      window.innerWidth < 768
    ) {
      setSidebarOpen(false)
    }
  }

  const handleSidebarTouchStart = (e) => {
    const touch = e.touches[0]

    sidebarTouchStartX.current =
      touch.clientX

    sidebarTouchStartY.current =
      touch.clientY
  }

  const handleSidebarTouchMove = () => {}

  const handleSidebarTouchEnd = (e) => {
    if (
      sidebarTouchStartX.current === null ||
      sidebarTouchStartY.current === null
    ) {
      return
    }

    const touch =
      e.changedTouches[0]

    const deltaX =
      touch.clientX -
      sidebarTouchStartX.current

    const deltaY =
      touch.clientY -
      sidebarTouchStartY.current

    sidebarTouchStartX.current =
      null

    sidebarTouchStartY.current =
      null

    if (
      deltaX < -60 &&
      Math.abs(deltaX) >
        Math.abs(deltaY)
    ) {
      setSidebarOpen(false)
    }
  }

  const refreshConversations =
    async () => {
      try {
        const res =
          await axios.get(
            `${API_URL}/conversations/${userId}`
          )

        setConversations(
          res.data || []
        )
      } catch (err) {
        console.error(
          'Failed to load conversations',
          err
        )
      }
    }

  const startNewReflection =
    () => {
      setMessages([])
      setCurrentConversationId(null)
      setInput('')
      setActiveTab('write')
      closeSidebarOnMobile()
    }

  const openConversation =
    async (conversationId) => {
      setIsLoadingConvo(true)

      setCurrentConversationId(
        conversationId
      )

      setActiveTab('reflect')

      try {
        const res =
          await axios.get(
            `${API_URL}/conversations/${conversationId}/messages`
          )

        const loaded =
          (res.data || [])
            .filter(
              (m) =>
                m.content &&
                m.content.trim() !==
                  ''
            )
            .map((m) => ({
              role: m.role,
              content:
                m.role ===
                'assistant'
                  ? sanitizeAnswer(
                      m.content
                    )
                  : m.content
            }))

        setMessages(loaded)
      } catch (err) {
        console.error(
          'Failed to load conversation messages',
          err
        )
      } finally {
        setIsLoadingConvo(false)
        closeSidebarOnMobile()
      }
    }

  const deleteConversation =
    async (
      conversationId,
      e
    ) => {
      e.stopPropagation()

      try {
        await axios.delete(
          `${API_URL}/conversations/${conversationId}`
        )

        if (
          conversationId ===
          currentConversationId
        ) {
          setMessages([])
          setCurrentConversationId(
            null
          )
        }

        await refreshConversations()
      } catch (err) {
        console.error(
          'Failed to delete conversation',
          err
        )
      }
    }

  const ensureConversation =
    async (
      firstMessageText
    ) => {
      if (currentConversationId) {
        return currentConversationId
      }

      const cleanTitle =
        firstMessageText.trim()

      const title =
        cleanTitle.length > 42
          ? cleanTitle.slice(
              0,
              42
            ) + '...'
          : cleanTitle

      const res =
        await axios.post(
          `${API_URL}/conversations`,
          {
            user_id: userId,
            title
          }
        )

      setCurrentConversationId(
        res.data.id
      )

      await refreshConversations()

      return res.data.id
    }

  const saveMessageToDb =
    async (
      conversationId,
      role,
      content,
      sources = []
    ) => {
      try {
        await axios.post(
          `${API_URL}/messages`,
          {
            conversation_id:
              conversationId,
            role,
            content,
            sources
          }
        )
      } catch (err) {
        console.error(
          'Failed to save message',
          err
        )
      }
    }

  const handleSaveEntry =
    async () => {
      if (!entryText.trim())
        return

      if (
        entryVoice.isListening
      ) {
        entryVoice.toggle(
          entryText
        )
      }

      setIsSavingEntry(true)
      setSaveConfirmation(null)

      try {
        const res =
          await axios.post(
            `${API_URL}/entries`,
            {
              content:
                entryText.trim(),
              mood: selectedMood
            }
          )

        setRecentEntries(
          (prev) =>
            [
              {
                label:
                  res.data
                    .filename,
                mood:
                  selectedMood
              },
              ...prev
            ].slice(0, 5)
        )

        setEntryCount(
          (prev) => prev + 1
        )

        setSaveConfirmation(
          `Saved • ${new Date().toLocaleDateString(
            undefined,
            {
              month: 'short',
              day: 'numeric'
            }
          )}`
        )

        setEntryText('')
        setSelectedMood(null)

        setTimeout(
          () =>
            setSaveConfirmation(
              null
            ),
          3500
        )
      } catch (err) {
        setSaveConfirmation(
          `Couldn't save: ${
            err.response?.data
              ?.detail ||
            err.message
          }`
        )
      } finally {
        setIsSavingEntry(false)
      }
    }

  const handleAsk =
    async () => {
      if (
        isAskingRef.current ||
        !input.trim()
      ) {
        return
      }

      if (
        questionVoice.isListening
      ) {
        questionVoice.toggle(
          input
        )
      }

      isAskingRef.current = true

      const question =
        input.trim()

      setInput('')

      setActiveTab('reflect')

      const conversationHistory =
        messages
          .filter(
            (m) =>
              m.role === 'user' ||
              m.role ===
                'assistant'
          )
          .map((m) => ({
            role: m.role,
            content: m.content
          }))

      setMessages(
        (prev) => [
          ...prev,
          {
            role: 'user',
            content: question
          },
          {
            role: 'assistant',
            content: ''
          }
        ]
      )

      setIsAsking(true)

      try {
        const conversationId =
          await ensureConversation(
            question
          )

        await saveMessageToDb(
          conversationId,
          'user',
          question,
          []
        )

        const response =
          await fetch(
            `${API_URL}/query/stream`,
            {
              method: 'POST',
              headers: {
                'Content-Type':
                  'application/json'
              },
              body: JSON.stringify(
                {
                  query: question,
                  n_results: 5,
                  file_filter: null,
                  history:
                    conversationHistory
                }
              )
            }
          )

        if (!response.ok) {
          const errData =
            await response
              .json()
              .catch(
                () => null
              )

          throw new Error(
            errData?.detail ||
              `Request failed (${response.status})`
          )
        }

        if (!response.body) {
          throw new Error(
            'No response stream received.'
          )
        }

        const reader =
          response.body.getReader()

        const decoder =
          new TextDecoder()

        let fullText = ''
        let sources = []
        let finalAnswerText =
          ''

        while (true) {
          const {
            done,
            value
          } =
            await reader.read()

          if (done) break

          fullText +=
            decoder.decode(
              value,
              {
                stream: true
              }
            )

          const scoresMarkerIndex =
            fullText.indexOf(
              '__SCORES__'
            )

          const textBeforeScores =
            scoresMarkerIndex !==
            -1
              ? fullText.slice(
                  0,
                  scoresMarkerIndex
                )
              : fullText

          const markerIndex =
            textBeforeScores.indexOf(
              '__SOURCES__'
            )

          let cleanText =
            textBeforeScores

          if (
            markerIndex !== -1
          ) {
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
                      '__SOURCES__'
                        .length
                  )
                )

              sources =
                meta.sources || []
            } catch {}
          }

          finalAnswerText =
            sanitizeAnswer(
              cleanText
            )

          setMessages(
            (prev) => {
              const updated = [
                ...prev
              ]

              updated[
                updated.length -
                  1
              ] = {
                role: 'assistant',
                content:
                  finalAnswerText
              }

              return updated
            }
          )
        }

        await saveMessageToDb(
          conversationId,
          'assistant',
          finalAnswerText,
          sources
        )

        await refreshConversations()
      } catch (err) {
        console.error(err)

        setMessages(
          (prev) => {
            const updated = [
              ...prev
            ]

            updated[
              updated.length -
                1
            ] = {
              role: 'assistant',
              content:
                `I'm sorry, something went wrong. ${
                  err.message ||
                  'Please try again.'
                }`
            }

            return updated
          }
        )
      } finally {
        setIsAsking(false)

        isAskingRef.current =
          false
      }
    }

  const handleKeyDown = (
    e
  ) => {
    if (
      e.key === 'Enter' &&
      !e.shiftKey
    ) {
      e.preventDefault()
      handleAsk()
    }
  }

  const quickQuestions = [
    'How have I been feeling lately?',
    'What makes me happy?',
    'What have I been working on?',
    'What patterns do you notice?',
    'What should I reflect on today?'
  ]

  const askQuickQuestion =
    (question) => {
      setInput(question)
      setActiveTab('reflect')

      setTimeout(
        () =>
          textareaRef.current?.focus(),
        50
      )
    }

  const hasMessages =
    !isLoadingConvo &&
    messages.length > 0

  const lastMsg =
    messages[
      messages.length - 1
    ]

  const showTypingIndicator =
    isAsking &&
    lastMsg?.role ===
      'assistant' &&
    lastMsg?.content === ''

  return (
    <div
      style={{
        height: appHeight
          ? `${appHeight}px`
          : '100vh'
      }}
      className="bg-gradient-to-br from-indigo-50 via-purple-50 to-pink-50 flex font-sans overflow-hidden text-slate-800"
    >

      {/* MOBILE BACKDROP */}
      {sidebarOpen && (
        <div
          onClick={() =>
            setSidebarOpen(false)
          }
          className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm z-30 md:hidden"
        />
      )}

      {/* SIDEBAR */}
      <aside
        onTouchStart={
          handleSidebarTouchStart
        }
        onTouchMove={
          handleSidebarTouchMove
        }
        onTouchEnd={
          handleSidebarTouchEnd
        }
        className={`
          fixed inset-y-0 left-0 z-40
          w-[290px]
          bg-slate-900 text-slate-100
          flex flex-col
          shadow-2xl border-r border-slate-800
          overflow-hidden
          transition-all duration-300 ease-in-out
          md:sticky md:top-0 md:h-screen
          md:shadow-none
          ${
            sidebarOpen
              ? 'translate-x-0 md:w-[290px]'
              : '-translate-x-full md:translate-x-0 md:w-0'
          }
        `}
      >
        <div className="w-[290px] min-w-[290px] h-full flex flex-col">

          {/* SIDEBAR HEADER */}
          <div className="px-6 pt-6 pb-4">
            <div className="flex items-center">
              <div className="flex items-center gap-2.5">
                <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-indigo-500 via-purple-500 to-pink-500 flex items-center justify-center shadow-lg shadow-indigo-500/30">
                  <IconCompass className="w-5 h-5 text-white" />
                </div>

                <div>
                  <h1 className="font-bold text-2xl tracking-tight leading-none bg-gradient-to-r from-indigo-200 via-pink-200 to-white bg-clip-text text-transparent">
                    MindLog
                  </h1>

                  <p className="text-[10px] text-indigo-300/60 mt-1 uppercase tracking-[0.2em] font-semibold">
                    UK Modern Suite
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* NEW REFLECTION */}
          <div className="px-5 pb-4">
            <button
              onClick={
                startNewReflection
              }
              className="w-full flex items-center justify-center gap-2 bg-gradient-to-r from-indigo-600 via-purple-600 to-pink-600 hover:from-indigo-500 hover:to-pink-500 text-white rounded-xl py-3 text-sm font-bold shadow-lg shadow-indigo-500/25 transition-all transform active:scale-[0.98]"
            >
              <IconPlus className="w-4 h-4 stroke-[2.5]" />
              New reflection
            </button>
          </div>

          {/* CONVERSATIONS TITLE */}
          <div className="px-6 pb-2 flex items-center justify-between">
            <p className="text-[10px] uppercase tracking-[0.18em] text-slate-400 font-bold">
              Your reflections
            </p>

            <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-slate-800 text-indigo-300">
              {conversations.length}
            </span>
          </div>

          {/* CONVERSATIONS */}
          <div className="flex-1 overflow-y-auto px-4 pb-4 space-y-1">
            {conversations.length ===
              0 && (
              <div className="text-center mt-8 px-5">
                <div className="w-12 h-12 mx-auto rounded-2xl bg-slate-800/80 flex items-center justify-center mb-3 text-indigo-400">
                  <IconMessage className="w-6 h-6" />
                </div>

                <p className="text-xs text-slate-400 leading-relaxed">
                  Your reflections will appear here.
                </p>
              </div>
            )}

            <div className="space-y-1.5">
              {conversations.map(
                (conv) => {
                  const isActive =
                    conv.id ===
                    currentConversationId

                  return (
                    <div
                      key={
                        conv.id
                      }
                      onClick={() =>
                        openConversation(
                          conv.id
                        )
                      }
                      className={`
                        group relative flex items-center gap-3
                        px-3.5 py-2.5 rounded-xl cursor-pointer
                        transition-all duration-200
                        ${
                          isActive
                            ? 'bg-gradient-to-r from-indigo-900/60 to-purple-900/40 text-white border border-indigo-500/30'
                            : 'hover:bg-slate-800/60 text-slate-300'
                        }
                      `}
                    >
                      {isActive && (
                        <span className="absolute left-0 top-2 bottom-2 w-1 rounded-r-full bg-gradient-to-b from-indigo-400 to-pink-500" />
                      )}

                      <div
                        className={`
                          w-8 h-8 rounded-lg flex items-center
                          justify-center shrink-0
                          ${
                            isActive
                              ? 'bg-gradient-to-br from-indigo-500 to-pink-500 text-white shadow-md'
                              : 'bg-slate-800 text-slate-400'
                          }
                        `}
                      >
                        <IconMessage className="w-4 h-4" />
                      </div>

                      <div className="min-w-0 flex-1">
                        <p
                          className={`
                            text-[13px] truncate leading-snug font-medium
                            ${
                              isActive
                                ? 'text-white font-semibold'
                                : 'text-slate-300'
                            }
                          `}
                        >
                          {
                            conv.title
                          }
                        </p>

                        <p className="text-[10px] text-slate-500 mt-0.5">
                          {timeAgo(
                            conv.created_at
                          )}
                        </p>
                      </div>

                      <button
                        onClick={(
                          e
                        ) =>
                          deleteConversation(
                            conv.id,
                            e
                          )
                        }
                        className="opacity-0 group-hover:opacity-100 p-1.5 rounded-lg text-slate-400 hover:text-red-400 hover:bg-red-500/10 transition-all"
                        title="Delete reflection"
                      >
                        <IconTrash className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  )
                }
              )}
            </div>
          </div>

          {/* SIDEBAR FOOTER */}
          <div className="px-5 py-4 border-t border-slate-800/80 bg-slate-950/40">
            <div className="flex items-start gap-3">
              <div className="mt-0.5 w-7 h-7 rounded-xl bg-gradient-to-tr from-pink-500 to-rose-500 flex items-center justify-center shrink-0 shadow-md">
                <IconHeart className="w-4 h-4 text-white" />
              </div>

              <p className="text-[11px] text-slate-400 leading-relaxed">
                Your journal stays focused on your own words and reflections.
              </p>
            </div>
          </div>
        </div>
      </aside>

      {/* MAIN CONTENT */}
      <main className="flex-1 flex flex-col h-full min-w-0 transition-all duration-300">

        {/* TOP HEADER */}
        <header className="flex items-center justify-between gap-3 px-4 sm:px-6 lg:px-8 py-3 border-b border-indigo-100/80 shrink-0 bg-white/80 backdrop-blur-xl shadow-sm">

          <div className="flex items-center gap-3 sm:gap-4 min-w-0">

            {/* SIDEBAR TOGGLE */}
            <button
              onClick={
                toggleSidebar
              }
              className="p-2 rounded-xl text-slate-600 hover:text-indigo-600 hover:bg-indigo-50 transition shrink-0"
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
              <IconMenu className="w-5 h-5" />
            </button>

            <div className="w-px h-6 bg-slate-200 hidden sm:block" />

            {/* ENTRIES / REFLECT */}
            <div className="flex items-center bg-slate-100 p-1 rounded-xl border border-slate-200/80 shadow-inner">

              <button
                onClick={() =>
                  setActiveTab(
                    'write'
                  )
                }
                className={`
                  flex items-center gap-2
                  px-4 py-1.5
                  rounded-lg text-xs font-bold
                  transition-all duration-200
                  ${
                    activeTab ===
                    'write'
                      ? 'bg-gradient-to-r from-indigo-600 to-purple-600 text-white shadow-md'
                      : 'text-slate-600 hover:text-slate-900'
                  }
                `}
              >
                <IconPen className="w-3.5 h-3.5" />
                Entries
              </button>

              <button
                onClick={() =>
                  setActiveTab(
                    'reflect'
                  )
                }
                className={`
                  flex items-center gap-2
                  px-4 py-1.5
                  rounded-lg text-xs font-bold
                  transition-all duration-200
                  ${
                    activeTab ===
                    'reflect'
                      ? 'bg-gradient-to-r from-purple-600 to-pink-600 text-white shadow-md'
                      : 'text-slate-600 hover:text-slate-900'
                  }
                `}
              >
                <IconCompass className="w-3.5 h-3.5" />
                Reflect
              </button>
            </div>
          </div>

          {/* ENTRY COUNT */}
          <div className="flex items-center gap-2 text-xs font-bold text-indigo-700 bg-indigo-50 border border-indigo-200/60 px-3 py-1.5 rounded-xl shadow-sm shrink-0">
            <IconBook className="w-4 h-4 text-indigo-600" />

            <span>
              {entryCount}{' '}
              {entryCount === 1
                ? 'entry'
                : 'entries'}
            </span>
          </div>
        </header>

        {/* PAGE */}
        <div
          className={`
            flex-1 min-h-0 px-3 sm:px-6 lg:px-8 py-3 sm:py-5
            ${
              activeTab === 'reflect'
                ? 'flex flex-col overflow-hidden'
                : 'overflow-y-auto'
            }
          `}
        >
          <div
            className={`
              w-full max-w-3xl mx-auto
              ${
                activeTab === 'reflect'
                  ? 'flex-1 min-h-0 flex flex-col'
                  : ''
              }
            `}
          >

            {/* ================= ENTRIES ================= */}
            {activeTab ===
              'write' && (
              <section className="bg-white/90 backdrop-blur-md border border-indigo-100 rounded-3xl shadow-xl shadow-indigo-500/5 overflow-hidden transition-all my-auto">

                <div className="p-5 sm:p-7 pb-3">
                  <div className="flex items-start gap-4">

                    <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-indigo-500 via-purple-500 to-pink-500 flex items-center justify-center shrink-0 shadow-lg shadow-indigo-500/25">
                      <IconSparkles className="w-6 h-6 text-white" />
                    </div>

                    <div>
                      <p className="text-[11px] uppercase tracking-[0.2em] font-bold text-indigo-600 mb-1">
                        Daily reflection
                      </p>

                      <h2 className="font-bold text-2xl sm:text-3xl text-slate-900 tracking-tight leading-tight">
                        How are you feeling today?
                      </h2>

                      <p className="text-sm text-slate-500 mt-1 leading-relaxed font-medium">
                        Take a moment for yourself. There are no right or wrong words here.
                      </p>
                    </div>
                  </div>
                </div>

                {/* MOODS */}
                <div className="px-5 sm:px-7 pb-4">
                  <p className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-2.5">
                    Pick a mood
                  </p>

                  <div className="flex flex-wrap gap-2.5">
                    {MOODS.map(
                      (mood) => {
                        const selected =
                          selectedMood ===
                          mood.label

                        return (
                          <button
                            key={
                              mood.label
                            }
                            onClick={() =>
                              setSelectedMood(
                                selected
                                  ? null
                                  : mood.label
                              )
                            }
                            className="flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs sm:text-sm font-bold border transition-all duration-200 active:scale-95 shadow-sm"
                            style={{
                              backgroundColor:
                                selected
                                  ? mood.color
                                  : `${mood.color}15`,
                              color:
                                selected
                                  ? '#fff'
                                  : mood.color,
                              borderColor:
                                selected
                                  ? mood.color
                                  : `${mood.color}30`
                            }}
                          >
                            <span className="text-base">
                              {
                                mood.emoji
                              }
                            </span>

                            {
                              mood.label
                            }
                          </button>
                        )
                      }
                    )}
                  </div>
                </div>

                {/* ENTRY INPUT */}
                <div className="px-5 sm:px-7 mt-2">
                  <div className="relative">

                    <textarea
                      ref={
                        entryTextareaRef
                      }
                      value={entryText}
                      onChange={(
                        e
                      ) =>
                        setEntryText(
                          e.target.value
                        )
                      }
                      placeholder="Write whatever is on your mind..."
                      rows={4}
                      className="w-full resize-y bg-slate-50/80 border-2 border-indigo-100 rounded-2xl pl-4 pr-14 py-3.5 text-[15px] text-slate-800 placeholder:text-slate-400 focus:outline-none focus:border-indigo-500 focus:bg-white focus:ring-4 focus:ring-indigo-500/10 transition-all leading-relaxed min-h-[110px] max-h-[220px] shadow-inner font-medium"
                    />

                    {/* MIC */}
                    <div className="absolute right-3 bottom-3 z-10">
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
                        className="bg-white border border-slate-200 shadow-md hover:bg-slate-50 text-indigo-600"
                      />
                    </div>
                  </div>

                  {entryVoice.isListening && (
                    <div className="flex items-center gap-2 text-xs font-semibold text-red-500 mt-2">
                      <span className="w-2.5 h-2.5 rounded-full bg-red-500 animate-pulse" />
                      Listening... speak naturally
                    </div>
                  )}
                </div>

                {/* SAVE */}
                <div className="px-5 sm:px-7 py-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3">

                  <div className="min-h-5">
                    {saveConfirmation && (
                      <div className="flex items-center gap-2 text-xs font-bold text-emerald-600 bg-emerald-50 px-3 py-1.5 rounded-lg border border-emerald-200">
                        <IconCheck className="w-4 h-4 stroke-[3]" />
                        {
                          saveConfirmation
                        }
                      </div>
                    )}
                  </div>

                  <button
                    onClick={
                      handleSaveEntry
                    }
                    disabled={
                      isSavingEntry ||
                      !entryText.trim()
                    }
                    className="w-full sm:w-auto flex items-center justify-center gap-2 bg-gradient-to-r from-indigo-600 via-purple-600 to-pink-600 hover:from-indigo-500 hover:to-pink-500 text-white px-7 py-3 rounded-xl text-sm font-bold disabled:opacity-40 disabled:cursor-not-allowed transition-all active:scale-[0.98] shadow-lg shadow-indigo-500/25"
                  >
                    {isSavingEntry ? (
                      <>
                        <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                        Saving...
                      </>
                    ) : (
                      <>
                        <IconArrowUp className="w-4 h-4 stroke-[2.5]" />
                        Save my entry
                      </>
                    )}
                  </button>
                </div>

                {/* RECENT */}
                {recentEntries.length >
                  0 && (
                  <div className="px-5 sm:px-7 pb-4 pt-2 border-t border-slate-100">

                    <p className="text-[11px] uppercase tracking-wider font-bold text-slate-400 mb-2">
                      Saved recently
                    </p>

                    <div className="flex flex-wrap gap-2">
                      {recentEntries.map(
                        (
                          entry,
                          index
                        ) => {
                          const mood =
                            MOODS.find(
                              (m) =>
                                m.label ===
                                entry.mood
                            )

                          const moodColor =
                            mood?.color ||
                            '#6366F1'

                          return (
                            <span
                              key={
                                index
                              }
                              className="flex items-center gap-1.5 text-xs font-bold px-3 py-1.5 rounded-xl border shadow-sm"
                              style={{
                                backgroundColor: `${moodColor}15`,
                                color: moodColor,
                                borderColor: `${moodColor}30`
                              }}
                            >
                              <span>
                                {mood?.emoji ||
                                  '📝'}
                              </span>

                              {entry.label?.replace(
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

                <div className="px-5 sm:px-7 pb-5 text-center bg-slate-50/50 pt-3 border-t border-slate-100">
                  <p className="text-[11px] font-medium text-slate-400 leading-relaxed">
                    🔒 Your reflection is your private space. MindLog is designed for reflection, not therapy.
                  </p>
                </div>
              </section>
            )}

            {/* ================= REFLECT ================= */}
            {activeTab ===
              'reflect' && (
              <section className="bg-white/90 backdrop-blur-md border border-indigo-100 rounded-3xl shadow-xl shadow-indigo-500/5 overflow-hidden flex-1 min-h-0 flex flex-col">

                <div
                  className={
                    hasMessages
                      ? 'flex-1 min-h-0 overflow-y-auto px-4 sm:px-6 pt-5 pb-5 space-y-5'
                      : 'flex-1 min-h-0 flex items-center justify-center px-5'
                  }
                >

                  {/* LOADING */}
                  {isLoadingConvo && (
                    <div className="flex flex-col items-center justify-center text-center">
                      <div className="w-12 h-12 rounded-full border-4 border-indigo-200 border-t-indigo-600 animate-spin mb-3 shadow-md" />

                      <p className="text-sm font-semibold text-slate-600">
                        Opening your reflection...
                      </p>
                    </div>
                  )}

                  {/* EMPTY CHAT */}
                  {!isLoadingConvo &&
                    messages.length ===
                      0 && (
                    <div className="w-full flex flex-col items-center text-center py-4">

                      <div className="relative w-16 h-16 rounded-3xl bg-gradient-to-tr from-indigo-500 via-purple-500 to-pink-500 flex items-center justify-center shadow-xl shadow-indigo-500/30 mb-4">
                        <IconSparkles className="w-8 h-8 text-white" />
                        <span className="absolute -right-1 -top-1 w-5 h-5 rounded-full bg-amber-400 border-2 border-white shadow-sm" />
                      </div>

                      <p className="text-[11px] uppercase tracking-[0.2em] font-bold text-indigo-600 mb-1.5">
                        Your personal reflection
                      </p>

                      <h2 className="font-bold text-2xl sm:text-3xl text-slate-900 mb-2 tracking-tight">
                        Ask your journal anything
                      </h2>

                      <p className="text-sm font-medium text-slate-500 max-w-md leading-relaxed">
                        I can help you explore patterns, feelings, memories and thoughts from your own journal.
                      </p>

                      <div className="w-full max-w-xl mt-6">

                        <p className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-3">
                          Try asking
                        </p>

                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                          {quickQuestions
                            .slice(
                              0,
                              4
                            )
                            .map(
                              (
                                question
                              ) => (
                                <button
                                  key={
                                    question
                                  }
                                  onClick={() =>
                                    askQuickQuestion(
                                      question
                                    )
                                  }
                                  className="text-left px-4 py-3 rounded-2xl border border-indigo-100 bg-gradient-to-r from-slate-50 to-indigo-50/30 hover:from-indigo-500 hover:to-pink-500 hover:text-white text-xs font-bold text-slate-700 transition-all duration-200 shadow-sm hover:shadow-md hover:border-transparent active:scale-[0.98]"
                                >
                                  {
                                    question
                                  }
                                </button>
                              )
                            )}
                        </div>
                      </div>
                    </div>
                  )}

                  {/* MESSAGES */}
                  {hasMessages &&
                    messages.map(
                      (
                        msg,
                        index
                      ) => {

                        if (
                          msg.role ===
                          'system'
                        ) {
                          return (
                            <div
                              key={
                                index
                              }
                              className="text-center text-xs font-semibold text-slate-400 italic bg-slate-100/60 py-2.5 px-4 rounded-xl border border-slate-200/50"
                            >
                              {
                                msg.content
                              }
                            </div>
                          )
                        }

                        if (
                          msg.role ===
                          'user'
                        ) {
                          return (
                            <div
                              key={
                                index
                              }
                              className="flex justify-end"
                            >
                              <div className="max-w-[88%] sm:max-w-[78%]">

                                <div className="bg-gradient-to-r from-indigo-600 via-purple-600 to-pink-600 text-white rounded-2xl rounded-br-none px-5 py-3.5 shadow-lg shadow-indigo-500/20">
                                  <p className="whitespace-pre-wrap leading-relaxed text-sm font-semibold">
                                    {
                                      msg.content
                                    }
                                  </p>
                                </div>

                                <p className="text-[10px] font-bold text-slate-400 text-right mt-1.5 mr-1 uppercase tracking-wider">
                                  You
                                </p>
                              </div>
                            </div>
                          )
                        }

                        if (
                          msg.role ===
                            'assistant' &&
                          msg.content !==
                            ''
                        ) {
                          return (
                            <div
                              key={
                                index
                              }
                              className="flex justify-start gap-3"
                            >

                              <div className="w-9 h-9 rounded-2xl bg-gradient-to-tr from-indigo-500 via-purple-500 to-pink-500 flex items-center justify-center shrink-0 mt-0.5 shadow-lg shadow-indigo-500/25">
                                <IconSparkles className="w-5 h-5 text-white" />
                              </div>

                              <div className="max-w-[88%] sm:max-w-[80%]">

                                <div className="bg-indigo-50/90 border-2 border-indigo-200/80 text-indigo-950 rounded-2xl rounded-bl-none px-5 py-4 shadow-sm">
                                  <p className="whitespace-pre-wrap leading-relaxed text-[15px] font-bold">
                                    {
                                      msg.content
                                    }
                                  </p>
                                </div>

                                <p className="text-[10px] font-bold text-indigo-600 mt-1.5 ml-1 uppercase tracking-wider">
                                  MindLog AI
                                </p>
                              </div>
                            </div>
                          )
                        }

                        return null
                      }
                    )}

                  {/* TYPING */}
                  {showTypingIndicator && (
                    <div className="flex justify-start gap-3">

                      <div className="w-9 h-9 rounded-2xl bg-gradient-to-tr from-indigo-500 via-purple-500 to-pink-500 flex items-center justify-center shrink-0 shadow-lg shadow-indigo-500/25">
                        <IconSparkles className="w-5 h-5 text-white" />
                      </div>

                      <div className="flex items-center gap-2 bg-indigo-50/90 border-2 border-indigo-200/80 rounded-2xl rounded-bl-none px-5 py-4 shadow-sm">
                        <span className="w-2 h-2 rounded-full bg-indigo-600 animate-bounce" />
                        <span className="w-2 h-2 rounded-full bg-purple-600 animate-bounce [animation-delay:150ms]" />
                        <span className="w-2 h-2 rounded-full bg-pink-600 animate-bounce [animation-delay:300ms]" />
                      </div>
                    </div>
                  )}

                  <div ref={chatEndRef} />
                </div>

                {/* CHAT INPUT */}
                <div className="border-t border-indigo-100 p-3.5 sm:p-4 bg-slate-50/80 shrink-0">

                  {hasMessages && (
                    <div className="flex gap-2 overflow-x-auto pb-2.5 mb-1.5 scrollbar-none">
                      {quickQuestions.map(
                        (question) => (
                          <button
                            key={
                              question
                            }
                            onClick={() =>
                              askQuickQuestion(
                                question
                              )
                            }
                            className="shrink-0 px-3.5 py-1.5 rounded-xl bg-white border border-indigo-100 text-xs font-bold text-slate-600 hover:text-indigo-600 hover:border-indigo-300 transition-all shadow-sm"
                          >
                            {
                              question
                            }
                          </button>
                        )
                      )}
                    </div>
                  )}

                  {/* CHATBOX */}
                  <div className="relative flex items-end gap-2 rounded-2xl px-2 py-2 border-2 border-indigo-100 bg-white shadow-lg shadow-indigo-500/5 focus-within:border-indigo-500 focus-within:ring-4 focus-within:ring-indigo-500/10 transition-all">

                    <textarea
                      ref={
                        textareaRef
                      }
                      value={input}
                      onChange={(
                        e
                      ) =>
                        setInput(
                          e.target.value
                        )
                      }
                      onKeyDown={
                        handleKeyDown
                      }
                      placeholder="Ask something about your journal..."
                      rows={2}
                      className="flex-1 min-w-0 resize-y bg-transparent pl-3 pr-[96px] py-2 text-[15px] font-semibold text-slate-800 placeholder:text-slate-400 focus:outline-none min-h-[50px] max-h-[160px] leading-relaxed"
                    />

                    {/* MIC */}
                    <div className="absolute right-[56px] bottom-[10px] z-10">
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
                        className="bg-slate-100 border border-slate-200 shadow-sm hover:bg-slate-200 text-indigo-600"
                      />
                    </div>

                    {/* SEND BUTTON */}
                    <button
                      onClick={
                        handleAsk
                      }
                      disabled={
                        isAsking ||
                        !input.trim()
                      }
                      className="absolute right-2 bottom-2 shrink-0 bg-gradient-to-r from-indigo-600 via-purple-600 to-pink-600 text-white w-10 h-10 flex items-center justify-center rounded-xl disabled:opacity-30 hover:opacity-90 transition-all active:scale-95 shadow-md shadow-indigo-500/30"
                      title="Ask MindLog"
                      aria-label="Send question"
                    >
                      <IconArrowUp className="w-5 h-5 stroke-[2.5]" />
                    </button>
                  </div>

                  {questionVoice.isListening && (
                    <div className="flex items-center justify-center gap-2 text-xs font-semibold text-red-500 mt-2">
                      <span className="w-2 h-2 rounded-full bg-red-500 animate-pulse" />
                      Listening...
                    </div>
                  )}

                  <div className="flex items-center justify-center gap-1.5 text-[11px] font-semibold text-slate-400 mt-2.5">
                    <IconSparkles className="w-3.5 h-3.5 text-indigo-500" />

                    <span>
                      Answers are based on your own journal entries
                    </span>
                  </div>
                </div>
              </section>
            )}
          </div>
        </div>
      </main>
    </div>
  )
}

export default App