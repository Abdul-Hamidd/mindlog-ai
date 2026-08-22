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

  const hrs = Math.floor(mins / 60)

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
    .replace(/\n\*\*based on entries:[\s\S]\*\*\*$/i, '')
    .replace(/\*\*?\s\*Entry\s*—[^)]\*\*\)?\*\*?/gi, '')
    .trim()
}

const MOODS = [
  { label: 'Calm', emoji: '😌', color: '#6B84A0' },
  { label: 'Content', emoji: '🙂', color: '#5B7A63' },
  { label: 'Happy', emoji: '😊', color: '#4A8B7C' },
  { label: 'Grateful', emoji: '🙏', color: '#B58900' },
  { label: 'Excited', emoji: '✨', color: '#C2703D' },
  { label: 'Stressed', emoji: '😣', color: '#B4704A' },
  { label: 'Anxious', emoji: '😟', color: '#9A6B9E' },
  { label: 'Sad', emoji: '😔', color: '#7D8A99' }
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
            ? 'bg-alert/10 text-alert scale-105'
            : 'text-inkSoft hover:text-ink hover:bg-paperLine/60'
        }
        ${className}
      `}
    >
      {isListening && (
        <span className="absolute inset-0 rounded-full bg-alert/10 animate-ping" />
      )}

      <span className="relative flex items-center justify-center">
        <IconMic className="w-[18px] h-[18px]" />
      </span>
    </button>
  )
}

function App() {
  const [userId] = useState(getUserId)

  // IMPORTANT:
  // Keep internal value as "write".
  // "Entries" is only the visible label.
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

  // CHANGED:
  // Sidebar now defaults CLOSED on mobile (<768px) and OPEN on desktop,
  // so the first thing seen on mobile is the Entries phase, not the sidebar.
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

  // ADDED:
  // Real, keyboard-aware viewport height (tracks window.visualViewport)
  // so the whole app (including the chat input) resizes and stays
  // above the mobile keyboard instead of being pushed/hidden behind it.
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

  // ADDED: sidebar swipe refs
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

  // ADDED:
  // Keep focused chatbox above the mobile keyboard.
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

  // ADDED:
  // Track the real visible viewport height so the app container
  // shrinks and rises above the on-screen keyboard automatically,
  // the same way ChatGPT / Claude mobile UIs behave.
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

  // ADDED:
  // Swipe sidebar left to close.
  const handleSidebarTouchStart = (e) => {
    const touch = e.touches[0]

    sidebarTouchStartX.current =
      touch.clientX

    sidebarTouchStartY.current =
      touch.clientY
  }

  const handleSidebarTouchMove = () => {
    // Intentionally kept empty so normal sidebar scrolling
    // continues to work without interference.
  }

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

    // Only close on a clear left swipe.
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
      // Internal state remains "write"
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
      className="bg-paper flex font-sans overflow-hidden text-ink"
    >

      {/* MOBILE BACKDROP */}
      {sidebarOpen && (
        <div
          onClick={() =>
            setSidebarOpen(false)
          }
          className="fixed inset-0 bg-black/40 backdrop-blur-[2px] z-30 md:hidden"
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
          bg-ink text-paper
          flex flex-col
          shadow-2xl
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
              <div className="flex items-center gap-2">
                <div className="w-9 h-9 rounded-xl bg-accent flex items-center justify-center shadow-lg">
                  <IconCompass className="w-5 h-5 text-white" />
                </div>

                <div>
                  <h1 className="font-display text-[25px] tracking-tight leading-none">
                    MindLog
                  </h1>

                  <p className="text-[10px] text-paper/45 mt-1 uppercase tracking-[0.18em]">
                    Your private space
                  </p>
                </div>
              </div>
            </div>

            {/* VIP REFLECTION REMOVED */}
          </div>

          {/* NEW REFLECTION */}
          <div className="px-5 pb-4">
            <button
              onClick={
                startNewReflection
              }
              className="w-full flex items-center justify-center gap-2 bg-accent hover:bg-accent/90 text-white rounded-xl py-3 text-sm font-semibold shadow-lg transition-all active:scale-[0.98]"
            >
              <IconPlus className="w-4 h-4" />
              New reflection
            </button>
          </div>

          {/* CONVERSATIONS TITLE */}
          <div className="px-6 pb-2 flex items-center justify-between">
            <p className="text-[10px] uppercase tracking-[0.16em] text-paper/35 font-semibold">
              Your reflections
            </p>

            <span className="text-[10px] text-paper/35">
              {conversations.length}
            </span>
          </div>

          {/* CONVERSATIONS */}
          <div className="flex-1 overflow-y-auto px-4 pb-4">
            {conversations.length ===
              0 && (
              <div className="text-center mt-8 px-5">
                <div className="w-11 h-11 mx-auto rounded-full bg-white/5 flex items-center justify-center mb-3">
                  <IconMessage className="w-5 h-5 text-paper/25" />
                </div>

                <p className="text-xs text-paper/35 leading-relaxed">
                  Your reflections will appear here.
                </p>
              </div>
            )}

            <div className="space-y-1">
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
                        transition-all
                        ${
                          isActive
                            ? 'bg-white/10'
                            : 'hover:bg-white/[0.06]'
                        }
                      `}
                    >
                      {isActive && (
                        <span className="absolute left-0 top-3 bottom-3 w-[3px] rounded-full bg-accent" />
                      )}

                      <div
                        className={`
                          w-8 h-8 rounded-lg flex items-center
                          justify-center shrink-0
                          ${
                            isActive
                              ? 'bg-accent/20 text-accent'
                              : 'bg-white/5 text-paper/35'
                          }
                        `}
                      >
                        <IconMessage className="w-4 h-4" />
                      </div>

                      <div className="min-w-0 flex-1">
                        <p
                          className={`
                            text-[13px] truncate leading-snug
                            ${
                              isActive
                                ? 'text-paper font-medium'
                                : 'text-paper/75'
                            }
                          `}
                        >
                          {
                            conv.title
                          }
                        </p>

                        <p className="text-[10px] text-paper/30 mt-0.5">
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
                        className="opacity-0 group-hover:opacity-100 p-1.5 rounded-md text-paper/25 hover:text-alert hover:bg-alert/10 transition-all"
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
          <div className="px-5 py-4 border-t border-paper/10">
            <div className="flex items-start gap-2.5">
              <div className="mt-0.5 w-6 h-6 rounded-full bg-accent/10 flex items-center justify-center shrink-0">
                <IconHeart className="w-3.5 h-3.5 text-accent" />
              </div>

              <p className="text-[10px] text-paper/35 leading-relaxed">
                Your journal stays focused on your own words and reflections.
              </p>
            </div>
          </div>
        </div>
      </aside>

      {/* MAIN CONTENT */}
      <main className="flex-1 flex flex-col h-full min-w-0 transition-all duration-300">

        {/* TOP HEADER */}
        <header className="flex items-center justify-between gap-3 px-3 sm:px-6 lg:px-8 py-2.5 border-b border-paperLine shrink-0 bg-white/70 backdrop-blur-xl">

          <div className="flex items-center gap-2 sm:gap-4 min-w-0">

            {/* SIDEBAR TOGGLE */}
            <button
              onClick={
                toggleSidebar
              }
              className="p-2.5 rounded-xl text-inkSoft hover:text-ink hover:bg-paperLine/60 transition shrink-0"
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

            <div className="w-px h-6 bg-paperLine hidden sm:block" />

            {/* ENTRIES / REFLECT */}
            <div className="flex items-center bg-paperLine/50 rounded-full p-1 border border-paperLine/70">

              <button
                onClick={() =>
                  setActiveTab(
                    'write'
                  )
                }
                className={`
                  flex items-center gap-1.5
                  px-3 sm:px-4 py-1.5
                  rounded-full text-xs font-semibold
                  transition-all
                  ${
                    activeTab ===
                    'write'
                      ? 'bg-white text-ink shadow-sm'
                      : 'text-inkSoft hover:text-ink'
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
                  flex items-center gap-1.5
                  px-3 sm:px-4 py-1.5
                  rounded-full text-xs font-semibold
                  transition-all
                  ${
                    activeTab ===
                    'reflect'
                      ? 'bg-white text-ink shadow-sm'
                      : 'text-inkSoft hover:text-ink'
                  }
                `}
              >
                <IconCompass className="w-3.5 h-3.5" />
                Reflect
              </button>
            </div>
          </div>

          {/* ENTRY COUNT */}
          <div className="flex items-center gap-1.5 text-[10px] sm:text-[11px] text-inkSoft bg-paperLine/50 px-2.5 sm:px-3 py-1.5 rounded-full border border-paperLine/60 shrink-0">
            <IconBook className="w-3.5 h-3.5" />

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
            flex-1 min-h-0 px-3 sm:px-5 lg:px-8 py-3 sm:py-4 lg:py-5
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
              <section className="bg-white/80 border border-paperLine rounded-2xl shadow-[0_8px_35px_rgba(35,40,33,0.05)] overflow-hidden">

                <div className="p-4 sm:p-5 pb-3">
                  <div className="flex items-start gap-3">

                    <div className="w-9 h-9 rounded-xl bg-accent flex items-center justify-center shrink-0 shadow-md">
                      <IconSparkles className="w-5 h-5 text-white" />
                    </div>

                    <div>
                      <p className="text-[10px] uppercase tracking-[0.15em] font-semibold text-accent mb-1">
                        Daily reflection
                      </p>

                      <h2 className="font-display text-2xl sm:text-3xl text-ink leading-tight">
                        How are you feeling today?
                      </h2>

                      <p className="text-sm text-inkSoft mt-1.5 leading-relaxed">
                        Take a moment for yourself. There are no right or wrong words here.
                      </p>
                    </div>
                  </div>
                </div>

                {/* MOODS */}
                <div className="px-5 sm:px-7 pb-3">
                  <p className="text-xs font-semibold text-inkSoft mb-2">
                    Pick a mood
                  </p>

                  <div className="flex flex-wrap gap-2">
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
                            className="flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs sm:text-sm font-medium border transition-all active:scale-95"
                            style={{
                              backgroundColor:
                                selected
                                  ? mood.color
                                  : `${mood.color}12`,
                              color:
                                selected
                                  ? '#fff'
                                  : mood.color,
                              borderColor:
                                selected
                                  ? mood.color
                                  : `${mood.color}20`
                            }}
                          >
                            <span>
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
                <div className="px-5 sm:px-7">
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
                      className="w-full resize-none bg-paper border border-paperLine rounded-2xl pl-4 pr-14 py-3 text-[15px] text-ink placeholder:text-inkSoft/45 focus:outline-none focus:border-accent/60 focus:ring-4 focus:ring-accent/10 transition-all leading-relaxed min-h-[120px] max-h-[160px]"
                    />

                    {/* MIC */}
                    <div className="absolute right-2.5 bottom-2.5 z-10">
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
                        className="bg-white/80 border border-paperLine/70 shadow-sm hover:bg-white"
                      />
                    </div>
                  </div>

                  {entryVoice.isListening && (
                    <div className="flex items-center gap-2 text-xs text-alert mt-1.5">
                      <span className="w-2 h-2 rounded-full bg-alert animate-pulse" />
                      Listening... speak naturally
                    </div>
                  )}
                </div>

                {/* SAVE */}
                <div className="px-5 sm:px-7 py-3 flex flex-col sm:flex-row sm:items-center justify-between gap-2">

                  <div className="min-h-5">
                    {saveConfirmation && (
                      <div className="flex items-center gap-1.5 text-xs text-accent">
                        <IconCheck className="w-4 h-4" />
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
                    className="w-full sm:w-auto flex items-center justify-center gap-2 bg-ink hover:bg-accent text-paper px-6 py-2.5 rounded-xl text-sm font-semibold disabled:opacity-25 disabled:cursor-not-allowed transition-all active:scale-[0.98] shadow-sm"
                  >
                    {isSavingEntry ? (
                      <>
                        <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                        Saving...
                      </>
                    ) : (
                      <>
                        <IconArrowUp className="w-4 h-4" />
                        Save my entry
                      </>
                    )}
                  </button>
                </div>

                {/* RECENT */}
                {recentEntries.length >
                  0 && (
                  <div className="px-5 sm:px-7 pb-4 pt-1 border-t border-paperLine">

                    <p className="text-[11px] uppercase tracking-[0.12em] font-semibold text-inkSoft/60 mb-2">
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
                            '#9A9690'

                          return (
                            <span
                              key={
                                index
                              }
                              className="flex items-center gap-1.5 text-[11px] px-2.5 py-1.5 rounded-full"
                              style={{
                                backgroundColor: `${moodColor}12`,
                                color:
                                  moodColor
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

                <div className="px-5 sm:px-7 pb-4 text-center">
                  <p className="text-[10px] text-inkSoft/40 leading-relaxed">
                    🔒 Your reflection is your private space. MindLog is designed for reflection, not therapy.
                  </p>
                </div>
              </section>
            )}

            {/* ================= REFLECT ================= */}
            {activeTab ===
              'reflect' && (
              <section className="bg-white/80 border border-paperLine rounded-2xl shadow-[0_8px_35px_rgba(35,40,33,0.05)] overflow-hidden flex-1 min-h-0 flex flex-col">

                <div
                  className={
                    hasMessages
                      ? 'flex-1 min-h-0 overflow-y-auto px-4 sm:px-6 pt-4 sm:pt-5 pb-5 space-y-4'
                      : 'flex-1 min-h-0 flex items-center justify-center px-5'
                  }
                >

                  {/* LOADING */}
                  {isLoadingConvo && (
                    <div className="flex flex-col items-center justify-center text-center">
                      <div className="w-10 h-10 rounded-full border-2 border-accent/20 border-t-accent animate-spin mb-3" />

                      <p className="text-sm text-inkSoft">
                        Opening your reflection...
                      </p>
                    </div>
                  )}

                  {/* EMPTY CHAT */}
                  {!isLoadingConvo &&
                    messages.length ===
                      0 && (
                    <div className="w-full flex flex-col items-center text-center">

                      <div className="relative w-14 h-14 rounded-2xl bg-accent flex items-center justify-center shadow-lg shadow-accent/20 mb-4">
                        <IconSparkles className="w-6 h-6 text-white" />
                        <span className="absolute -right-1 -top-1 w-5 h-5 rounded-full bg-[#D8B95C] border-2 border-white" />
                      </div>

                      <p className="text-[10px] uppercase tracking-[0.15em] font-semibold text-accent mb-1.5">
                        Your personal reflection
                      </p>

                      <h2 className="font-display text-2xl sm:text-3xl text-ink mb-1.5">
                        Ask your journal anything
                      </h2>

                      <p className="text-sm text-inkSoft max-w-md leading-relaxed">
                        I can help you explore patterns, feelings, memories and thoughts from your own journal.
                      </p>

                      <div className="w-full max-w-xl mt-5">

                        <p className="text-[11px] font-semibold text-inkSoft mb-2">
                          Try asking
                        </p>

                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
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
                                  className="text-left px-4 py-2.5 rounded-xl border border-paperLine bg-paper/50 hover:bg-accent/5 hover:border-accent/30 text-xs text-inkSoft hover:text-ink transition-all"
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
                              className="text-center text-[11px] text-inkSoft italic"
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
                              <div className="max-w-[88%] sm:max-w-[75%]">

                                <div className="bg-ink text-paper rounded-2xl rounded-br-md px-4 py-3 shadow-sm">
                                  <p className="whitespace-pre-wrap leading-relaxed text-sm">
                                    {
                                      msg.content
                                    }
                                  </p>
                                </div>

                                <p className="text-[9px] text-inkSoft/35 text-right mt-1 mr-1">
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
                              className="flex justify-start gap-2.5"
                            >

                              <div className="w-8 h-8 rounded-xl bg-accent flex items-center justify-center shrink-0 mt-0.5 shadow-sm">
                                <IconSparkles className="w-4 h-4 text-white" />
                              </div>

                              <div className="max-w-[88%] sm:max-w-[78%]">

                                <div className="bg-accent/8 border border-accent/15 rounded-2xl rounded-bl-md px-4 py-3">
                                  <p className="whitespace-pre-wrap leading-relaxed text-[15px] text-ink">
                                    {
                                      msg.content
                                    }
                                  </p>
                                </div>

                                <p className="text-[9px] text-inkSoft/35 mt-1 ml-1">
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
                    <div className="flex justify-start gap-2.5">

                      <div className="w-8 h-8 rounded-xl bg-accent flex items-center justify-center shrink-0">
                        <IconSparkles className="w-4 h-4 text-white" />
                      </div>

                      <div className="flex items-center gap-1.5 bg-accent/8 border border-accent/15 rounded-2xl rounded-bl-md px-4 py-3">
                        <span className="w-1.5 h-1.5 rounded-full bg-accent animate-pulse" />
                        <span className="w-1.5 h-1.5 rounded-full bg-accent animate-pulse [animation-delay:150ms]" />
                        <span className="w-1.5 h-1.5 rounded-full bg-accent animate-pulse [animation-delay:300ms]" />
                      </div>
                    </div>
                  )}

                  <div ref={chatEndRef} />
                </div>

                {/* CHAT INPUT */}
                <div className="border-t border-paperLine p-3 sm:p-3.5 bg-paper/50 shrink-0">

                  {hasMessages && (
                    <div className="flex gap-2 overflow-x-auto pb-2 mb-1">
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
                            className="shrink-0 px-3 py-1.5 rounded-full bg-white border border-paperLine text-[10px] text-inkSoft hover:text-accent hover:border-accent/30 transition"
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
                  <div className="relative flex items-end gap-1 rounded-2xl px-2 py-3 border border-accent/20 bg-gradient-to-br from-[#F9FCF8] via-[#F1F8F2] to-[#EAF5EE] shadow-[0_5px_20px_rgba(72,117,86,0.08)] focus-within:border-accent/50 focus-within:ring-4 focus-within:ring-accent/10 transition-all">

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
                      rows={4}
                      className="flex-1 min-w-0 resize-none bg-transparent pl-4 pr-[92px] py-3 text-[15px] text-ink placeholder:text-inkSoft/45 focus:outline-none min-h-[120px] max-h-[160px] leading-relaxed"
                    />

                    {/* MIC */}
                    <div className="absolute right-[52px] bottom-[8px] z-10">
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
                        className="bg-white/70 border border-accent/10 shadow-sm hover:bg-white"
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
                      className="absolute right-2 bottom-2 shrink-0 bg-ink text-paper w-10 h-10 flex items-center justify-center rounded-xl disabled:opacity-20 hover:bg-accent transition-all active:scale-95 shadow-sm"
                      title="Ask MindLog"
                      aria-label="Send question"
                    >
                      <IconArrowUp className="w-4 h-4" />
                    </button>
                  </div>

                  {questionVoice.isListening && (
                    <div className="flex items-center justify-center gap-1.5 text-[11px] text-alert mt-1.5">
                      <span className="w-1.5 h-1.5 rounded-full bg-alert animate-pulse" />
                      Listening...
                    </div>
                  )}

                  <div className="flex items-center justify-center gap-1.5 text-[9px] sm:text-[10px] text-inkSoft/40 mt-2">
                    <IconSparkles className="w-3 h-3" />

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