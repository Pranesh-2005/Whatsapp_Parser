"use client"

import type React from "react"

import { useState, useEffect, useRef } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Upload, Send, Phone, Video, MoreVertical, Search, Moon, Sun, X } from "lucide-react"

interface Message {
  timestamp: string
  sender: string
  content: string
  isCurrentUser: boolean
}

export default function Component() {
  const [messages, setMessages] = useState<Message[]>([])
  const [chatTitle, setChatTitle] = useState<string>("WhatsApp Chat")
  const [isLoading, setIsLoading] = useState(false)
  const [searchQuery, setSearchQuery] = useState<string>("")
  const [isSearching, setIsSearching] = useState(false)
  const [searchResults, setSearchResults] = useState<number[]>([])
  const [currentSearchIndex, setCurrentSearchIndex] = useState<number>(0)
  const [darkMode, setDarkMode] = useState<boolean>(false)
  const messagesContainerRef = useRef<HTMLDivElement>(null)

  const [displayedMessages, setDisplayedMessages] = useState<Message[]>([])
  const [currentPage, setCurrentPage] = useState(0)
  const [messagesPerPage] = useState(1000) // Show 1000 messages at a time
  const [isLoadingMore, setIsLoadingMore] = useState(false)

  // Apply dark mode
  useEffect(() => {
    if (darkMode) {
      document.documentElement.classList.add("dark")
    } else {
      document.documentElement.classList.remove("dark")
    }
  }, [darkMode])

  const parseWhatsAppFile = (content: string) => {
    console.log("File content preview:", content.substring(0, 500))

    const lines = content.split("\n").filter((line) => line.trim() !== "")
    const parsedMessages: Message[] = []
    let currentUser = ""
    const senderCounts = new Map<string, number>()

    // Android format: DD/MM/YY, H:MM am/pm - Sender: Message
    const androidPattern = /^(\d{1,2}\/\d{1,2}\/\d{2,4},\s\d{1,2}:\d{2}\s(?:am|pm))\s-\s([^:]+):\s(.*)$/

    // iPhone format: [DD/MM/YY, H:MM:SS AM/PM] Sender: Message
    const iPhonePattern = /^\[(\d{1,2}\/\d{1,2}\/\d{2,4},\s\d{1,2}:\d{2}:\d{2}\s(?:AM|PM))\]\s([^:]+):\s(.*)$/

    // First pass - sample first 1000 lines to determine format and find current user
    const sampleSize = Math.min(1000, lines.length)
    let isIPhoneFormat = false

    for (let i = 0; i < sampleSize; i++) {
      const line = lines[i]

      // Try iPhone format first
      let match = line.match(iPhonePattern)
      if (match) {
        isIPhoneFormat = true
        const sender = match[2].trim()
        senderCounts.set(sender, (senderCounts.get(sender) || 0) + 1)
        continue
      }

      // Try Android format
      match = line.match(androidPattern)
      if (match) {
        const sender = match[2].trim()
        senderCounts.set(sender, (senderCounts.get(sender) || 0) + 1)
      }
    }

    console.log("Format detected:", isIPhoneFormat ? "iPhone" : "Android")
    console.log("Sender message counts:", Array.from(senderCounts.entries()))

    // Set the sender with the most messages as current user
    if (senderCounts.size > 0) {
      currentUser = Array.from(senderCounts.entries()).reduce((a, b) => (a[1] > b[1] ? a : b))[0]
    }

    console.log("Current user set to:", currentUser)

    // Second pass - parse all messages with progress tracking
    const messagePattern = isIPhoneFormat ? iPhonePattern : androidPattern
    let processedLines = 0

    for (const line of lines) {
      processedLines++

      // Show progress for large files
      if (processedLines % 5000 === 0) {
        console.log(`Processing... ${processedLines}/${lines.length} lines`)
      }

      const match = line.match(messagePattern)

      if (match) {
        const [, timestamp, sender, content] = match

        // Skip system messages and file attachments
        if (
          content.includes("(file attached)") ||
          content.includes("This message was deleted") ||
          content.includes("Missed voice call") ||
          content.includes("Missed video call") ||
          content.includes("‎sticker omitted") ||
          content.includes("‎image omitted") ||
          content.includes("‎document omitted") ||
          content.includes("‎GIF omitted") ||
          content.includes("Voice call,") ||
          content.includes("Video call,") ||
          content.includes("‎Voice call, ‎No answer") ||
          content.includes("‎Video call, ‎No answer") ||
          content.includes("‎Missed video call, ‎Tap to call back") ||
          content.includes("Messages and calls are end-to-end encrypted") ||
          content === "null" ||
          content.trim() === "" ||
          content.startsWith("‎") ||
          content.includes("• ‎") ||
          content.includes("pages ‎document omitted")
        ) {
          continue
        }

        parsedMessages.push({
          timestamp: timestamp.trim(),
          sender: sender.trim(),
          content: content.trim(),
          isCurrentUser: sender.trim() === currentUser,
        })
      } else if (line.trim() && !line.includes("Messages and calls are end-to-end encrypted")) {
        // Add as continuation of previous message if exists
        if (parsedMessages.length > 0) {
          parsedMessages[parsedMessages.length - 1].content += "\n" + line.trim()
        }
      }
    }

    console.log("Parsed messages count:", parsedMessages.length)
    return parsedMessages
  }

  const loadMoreMessages = () => {
    setIsLoadingMore(true)

    setTimeout(() => {
      const startIndex = currentPage * messagesPerPage
      const endIndex = startIndex + messagesPerPage
      const newMessages = messages.slice(startIndex, endIndex)

      setDisplayedMessages((prev) => [...prev, ...newMessages])
      setCurrentPage((prev) => prev + 1)
      setIsLoadingMore(false)
    }, 100) // Small delay to show loading state
  }

  const loadInitialMessages = () => {
    const initialMessages = messages.slice(0, messagesPerPage)
    setDisplayedMessages(initialMessages)
    setCurrentPage(1)
  }

  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (!file) return

    console.log("File selected:", file.name, "Size:", file.size)
    setIsLoading(true)

    try {
      const text = await file.text()
      console.log("File read successfully, length:", text.length)

      if (text.length === 0) {
        alert("The file appears to be empty")
        return
      }

      const parsedMessages = parseWhatsAppFile(text)

      if (parsedMessages.length === 0) {
        alert("No messages found. Please make sure this is a valid WhatsApp chat export file.")
        return
      }

      setMessages(parsedMessages)
      setChatTitle(file.name.replace(".txt", ""))

      // Load initial batch of messages
      const initialMessages = parsedMessages.slice(0, messagesPerPage)
      setDisplayedMessages(initialMessages)
      setCurrentPage(1)

      console.log(`Messages loaded: showing ${initialMessages.length} of ${parsedMessages.length} total`)
    } catch (error) {
      console.error("Error parsing file:", error)
      alert("Error reading file: " + (error as Error).message)
    } finally {
      setIsLoading(false)
    }
  }

  const formatTime = (timestamp: string) => {
    try {
      // Parse the WhatsApp timestamp format: DD/MM/YY, H:MM am/pm
      const [datePart, timePart] = timestamp.split(", ")
      const [day, month, year] = datePart.split("/")

      // Handle am/pm time format
      const timeMatch = timePart.match(/(\d{1,2}):(\d{2})\s(am|pm)/)
      if (!timeMatch) return timestamp

      const [, hour, minute, period] = timeMatch
      let hour24 = Number.parseInt(hour)

      if (period === "pm" && hour24 !== 12) {
        hour24 += 12
      } else if (period === "am" && hour24 === 12) {
        hour24 = 0
      }

      const date = new Date(
        Number.parseInt(year.length === 2 ? "20" + year : year),
        Number.parseInt(month) - 1,
        Number.parseInt(day),
        hour24,
        Number.parseInt(minute),
      )

      return date.toLocaleTimeString("en-US", {
        hour: "2-digit",
        minute: "2-digit",
        hour12: true,
      })
    } catch {
      return timestamp
    }
  }

  const getInitials = (name: string) => {
    return name
      .split(" ")
      .map((n) => n[0])
      .join("")
      .toUpperCase()
      .slice(0, 2)
  }

  const handleSearch = () => {
    if (!searchQuery.trim()) {
      setSearchResults([])
      return
    }

    const query = searchQuery.toLowerCase()
    const results = messages
      .map((message, index) => (message.content.toLowerCase().includes(query) ? index : -1))
      .filter((index) => index !== -1)

    setSearchResults(results)
    setCurrentSearchIndex(0)

    // Load messages around the first search result
    if (results.length > 0) {
      const firstResultIndex = results[0]
      const pageWithResult = Math.floor(firstResultIndex / messagesPerPage)
      const startIndex = pageWithResult * messagesPerPage
      const endIndex = Math.min(startIndex + messagesPerPage * 3, messages.length) // Load 3 pages worth

      setDisplayedMessages(messages.slice(startIndex, endIndex))
      setCurrentPage(Math.ceil(endIndex / messagesPerPage))

      setTimeout(() => {
        if (messagesContainerRef.current) {
          const messageElement = messagesContainerRef.current.querySelector(`[data-message-index="${results[0]}"]`)
          messageElement?.scrollIntoView({ behavior: "smooth", block: "center" })
        }
      }, 100)
    }
  }

  const navigateSearch = (direction: "next" | "prev") => {
    if (searchResults.length === 0) return

    const newIndex =
      direction === "next"
        ? (currentSearchIndex + 1) % searchResults.length
        : (currentSearchIndex - 1 + searchResults.length) % searchResults.length

    setCurrentSearchIndex(newIndex)

    if (messagesContainerRef.current) {
      const messageElement = messagesContainerRef.current.querySelector(
        `[data-message-index="${searchResults[newIndex]}"]`,
      )
      messageElement?.scrollIntoView({ behavior: "smooth", block: "center" })
    }
  }

  const highlightSearchTerms = (text: string) => {
    if (!searchQuery.trim()) return text

    const parts = text.split(new RegExp(`(${searchQuery})`, "gi"))
    return parts.map((part, i) =>
      part.toLowerCase() === searchQuery.toLowerCase() ? (
        <span key={i} className="bg-yellow-300 text-black px-0.5 rounded">
          {part}
        </span>
      ) : (
        part
      ),
    )
  }

  if (messages.length === 0) {
    return (
      <div className="max-w-3xl mx-auto mt-8 p-6 border rounded-lg dark:bg-gray-800 dark:border-gray-700">
        <div className="text-center space-y-4">
          <div className="w-16 h-16 mx-auto bg-green-100 dark:bg-green-900 rounded-full flex items-center justify-center">
            <Upload className="w-8 h-8 text-green-600 dark:text-green-400" />
          </div>
          <h2 className="text-xl font-semibold dark:text-white">Upload WhatsApp Chat</h2>
          <p className="text-muted-foreground text-sm dark:text-gray-300">
            Select a WhatsApp exported chat file (.txt) to view it in a chat interface
          </p>
          <div className="space-y-2">
            <Input
              type="file"
              accept=".txt"
              onChange={handleFileUpload}
              disabled={isLoading}
              className="cursor-pointer dark:bg-gray-700 dark:text-white"
            />
            {isLoading && <p className="text-sm text-muted-foreground dark:text-gray-400">Loading chat...</p>}
          </div>
          <div className="text-xs text-muted-foreground space-y-1 dark:text-gray-400">
            <p>To export a WhatsApp chat:</p>
            <p>1. Open WhatsApp chat</p>
            <p>2. Tap menu → More → Export chat</p>
            <p>3. Choose "Without Media"</p>
          </div>
          <Button variant="outline" size="sm" className="mt-4" onClick={() => setDarkMode(!darkMode)}>
            {darkMode ? <Sun className="h-4 w-4 mr-2" /> : <Moon className="h-4 w-4 mr-2" />}
            {darkMode ? "Light Mode" : "Dark Mode"}
          </Button>
        </div>
      </div>
    )
  }

  return (
    <div
      className="container mx-auto p-4 h-screen flex flex-col"
      style={{
        backgroundImage: darkMode
          ? 'url("https://i.pinimg.com/originals/85/ec/df/85ecdf1c3611ecc9b7fa85282d9526e0.jpg")'
          : 'url("https://i.pinimg.com/originals/8f/ba/cb/8fbacbd464e996966eb9d4a6b7a9c8e2.jpg")',
        backgroundSize: "cover",
        backgroundPosition: "center",
        backgroundAttachment: "fixed",
      }}
    >
      <div className="max-w-5xl w-full mx-auto rounded-lg overflow-hidden shadow-lg flex flex-col bg-white dark:bg-gray-800 border dark:border-gray-700 h-full">
        {/* Header */}
        <div className="bg-green-600 dark:bg-green-800 text-white p-3 flex items-center gap-3">
          <Avatar className="w-10 h-10">
            <AvatarImage src="/placeholder.svg" />
            <AvatarFallback className="bg-green-700 dark:bg-green-900 text-white">
              {getInitials(chatTitle)}
            </AvatarFallback>
          </Avatar>
          <div className="flex-1">
            <h3 className="font-medium text-sm">{chatTitle}</h3>
            <p className="text-xs text-gray-500 dark:text-gray-400">
              Showing {displayedMessages.length} of {messages.length} messages
            </p>
          </div>
          <div className="flex gap-1">
            <Button
              variant="ghost"
              size="icon"
              className="w-8 h-8 text-white hover:bg-green-700 dark:hover:bg-green-900"
              onClick={() => setIsSearching(!isSearching)}
            >
              <Search className="w-4 h-4" />
            </Button>
            <Button
              variant="ghost"
              size="icon"
              className="w-8 h-8 text-white hover:bg-green-700 dark:hover:bg-green-900"
              onClick={() => setDarkMode(!darkMode)}
            >
              {darkMode ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
            </Button>
            <Button
              variant="ghost"
              size="icon"
              className="w-8 h-8 text-white hover:bg-green-700 dark:hover:bg-green-900"
            >
              <Video className="w-4 h-4" />
            </Button>
            <Button
              variant="ghost"
              size="icon"
              className="w-8 h-8 text-white hover:bg-green-700 dark:hover:bg-green-900"
            >
              <Phone className="w-4 h-4" />
            </Button>
            <Button
              variant="ghost"
              size="icon"
              className="w-8 h-8 text-white hover:bg-green-700 dark:hover:bg-green-900"
            >
              <MoreVertical className="w-4 h-4" />
            </Button>
          </div>
        </div>

        {/* Search Bar */}
        {isSearching && (
          <div className="p-2 bg-white dark:bg-gray-800 border-b dark:border-gray-700 flex items-center gap-2">
            <Input
              placeholder="Search messages..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleSearch()}
              className="flex-1 dark:bg-gray-700 dark:text-white"
            />
            <Button size="sm" onClick={handleSearch} variant="secondary">
              <Search className="h-4 w-4 mr-1" /> Search
            </Button>
            {searchResults.length > 0 && (
              <div className="flex items-center gap-2">
                <span className="text-sm dark:text-gray-300">
                  {currentSearchIndex + 1}/{searchResults.length}
                </span>
                <Button size="sm" variant="outline" onClick={() => navigateSearch("prev")} className="px-2">
                  ↑
                </Button>
                <Button size="sm" variant="outline" onClick={() => navigateSearch("next")} className="px-2">
                  ↓
                </Button>
              </div>
            )}
            <Button
              size="icon"
              variant="ghost"
              onClick={() => {
                setIsSearching(false)
                setSearchQuery("")
                setSearchResults([])
              }}
            >
              <X className="h-4 w-4" />
            </Button>
          </div>
        )}

        {/* Messages */}
        <div
          ref={messagesContainerRef}
          className="flex-1 overflow-y-auto bg-gray-50 dark:bg-gray-900 p-3 space-y-2"
          style={{
            backgroundImage: darkMode
              ? 'url("https://i.pinimg.com/originals/85/ec/df/85ecdf1c3611ecc9b7fa85282d9526e0.jpg")'
              : 'url("https://i.pinimg.com/originals/8f/ba/cb/8fbacbd464e996966eb9d4a6b7a9c8e2.jpg")',
            backgroundSize: "cover",
            backgroundPosition: "center",
            opacity: "0.95",
          }}
        >
          {displayedMessages.map((message, index) => {
            const actualIndex = messages.indexOf(message)
            const isHighlighted =
              searchResults.includes(actualIndex) && searchResults[currentSearchIndex] === actualIndex

            return (
              <div
                key={actualIndex}
                className={`flex ${message.isCurrentUser ? "justify-end" : "justify-start"} mb-1`}
                data-message-index={actualIndex}
              >
                <div
                  className={`max-w-[75%] rounded-2xl px-4 py-2 ${
                    isHighlighted ? "ring-2 ring-yellow-500 ring-offset-2" : ""
                  } ${
                    message.isCurrentUser
                      ? "bg-blue-500 text-white rounded-br-md"
                      : "bg-gray-200 dark:bg-gray-700 text-black dark:text-white rounded-bl-md"
                  }`}
                >
                  {!message.isCurrentUser && (
                    <div className="text-xs font-medium text-blue-600 dark:text-blue-400 mb-1">{message.sender}</div>
                  )}
                  <div className="text-sm whitespace-pre-wrap break-words leading-relaxed">
                    {searchQuery.trim() ? highlightSearchTerms(message.content) : message.content}
                  </div>
                  <div
                    className={`text-xs mt-1 ${
                      message.isCurrentUser ? "text-blue-100" : "text-gray-500 dark:text-gray-400"
                    } text-right`}
                  >
                    {formatTime(message.timestamp)}
                  </div>
                </div>
              </div>
            )
          })}

          {/* Load More Button */}
          {displayedMessages.length < messages.length && (
            <div className="text-center py-4">
              <Button
                onClick={loadMoreMessages}
                disabled={isLoadingMore}
                variant="outline"
                className="bg-white/80 dark:bg-gray-800/80"
              >
                {isLoadingMore ? "Loading..." : `Load More (${messages.length - displayedMessages.length} remaining)`}
              </Button>
            </div>
          )}
        </div>

        {/* Input Area */}
        <div className="p-3 bg-gray-100 dark:bg-gray-800 border-t dark:border-gray-700 flex items-center gap-2">
          <Input
            placeholder="Type a message..."
            className="flex-1 rounded-full dark:bg-gray-700 dark:text-white"
            disabled
          />
          <Button
            size="icon"
            className="rounded-full bg-green-600 hover:bg-green-700 dark:bg-green-700 dark:hover:bg-green-800"
            disabled
          >
            <Send className="w-4 h-4" />
          </Button>
        </div>

        {/* Upload New File */}
        <div className="p-3 border-t bg-gray-50 dark:bg-gray-900 dark:border-gray-700 flex items-center justify-between">
          <Input
            type="file"
            accept=".txt"
            onChange={handleFileUpload}
            disabled={isLoading}
            className="text-xs max-w-xs dark:bg-gray-700 dark:text-white"
          />
          <span className="text-sm text-gray-500 dark:text-gray-400">
            {isLoading ? "Loading..." : searchResults.length > 0 ? `${searchResults.length} search results` : ""}
          </span>
        </div>
      </div>
    </div>
  )
}
