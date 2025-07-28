"use client"

import type React from "react"

import { useState, useEffect, useRef, useMemo } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Upload, Send, Phone, Video, MoreVertical, Search, Moon, Sun, X, Users, User } from "lucide-react"

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
  const [darkMode, setDarkMode] = useState<boolean>(true)
  const [selectedUser, setSelectedUser] = useState<string | null>(null)
  const [availableUsers, setAvailableUsers] = useState<string[]>([])
  const messagesContainerRef = useRef<HTMLDivElement>(null)

  const [displayedMessages, setDisplayedMessages] = useState<Message[]>([])
  const [currentPage, setCurrentPage] = useState(0)
  const [messagesPerPage] = useState(1000)
  const [isLoadingMore, setIsLoadingMore] = useState(false)

  // Apply dark mode (now applies on initial load)
  useEffect(() => {
    if (darkMode) {
      document.documentElement.classList.add("dark")
    } else {
      document.documentElement.classList.remove("dark")
    }
  }, [darkMode])

  // Memoize filtered messages with updated isCurrentUser based on selectedUser
  const filteredMessages = useMemo(() => {
    if (selectedUser === null) {
      return messages // Show all messages with original isCurrentUser
    }
    
    // When a specific user is selected, show all messages but update isCurrentUser
    return messages.map(message => ({
      ...message,
      isCurrentUser: message.sender === selectedUser
    }))
  }, [selectedUser, messages])

  // Update displayed messages when view mode changes
  useEffect(() => {
    if (messages.length > 0) {
      const initialMessages = filteredMessages.slice(0, messagesPerPage)
      setDisplayedMessages(initialMessages)
      setCurrentPage(1)
    }
  }, [selectedUser, messages, messagesPerPage, filteredMessages])

  // Cycle through users (only between the two users, no "all users" option)
  const handleUserToggle = () => {
    if (availableUsers.length === 0) return

    if (selectedUser === null) {
      // Start with first user
      setSelectedUser(availableUsers[0])
    } else {
      // Find current user index and move to next
      const currentIndex = availableUsers.indexOf(selectedUser)
      const nextIndex = (currentIndex + 1) % availableUsers.length
      setSelectedUser(availableUsers[nextIndex])
    }
  }

  // Get display text for current view
  const getViewModeText = () => {
    if (selectedUser === null) {
      return ""
    }
    return ` (Viewing as ${selectedUser})`
  }

  // Get appropriate icon (always show User icon since we're always viewing as a specific user)
  const getViewModeIcon = () => {
    return <User className="w-4 h-4" />
  }

  // Get tooltip text
  const getTooltipText = () => {
    if (selectedUser === null) {
      return availableUsers.length > 0 ? `View as ${availableUsers[0]}` : "Switch user view"
    } else {
      const currentIndex = availableUsers.indexOf(selectedUser)
      const nextIndex = (currentIndex + 1) % availableUsers.length
      return `View as ${availableUsers[nextIndex]}`
    }
  }

  // Get chat title based on selected user
  const getChatTitle = () => {
    if (selectedUser === null) {
      return chatTitle
    }
    return `${selectedUser}_chat`
  }

// ...existing code...

const parseWhatsAppFile = (content: string) => {
  console.log("File content preview:", content.substring(0, 500))

  const lines = content.split("\n")
  const parsedMessages: Message[] = []
  let currentUser = ""
  const senderCounts = new Map<string, number>()

  // Android format: DD/MM/YY, H:MM am/pm - Sender: Message
  const androidPattern = /^(\d{1,2}\/\d{1,2}\/\d{2,4},\s\d{1,2}:\d{2}\s(?:am|pm))\s-\s([^:]+):\s(.*)$/i

  // iPhone format with brackets: [DD/MM/YY, H:MM:SS AM/PM] Sender: Message
  const iPhonePattern = /^\[(\d{1,2}\/\d{1,2}\/\d{2,4},\s\d{1,2}:\d{2}:\d{2}\s(?:AM|PM))\]\s([^:]+):\s(.*)$/i

  // Alternative iPhone format without seconds: [DD/MM/YY, H:MM AM/PM] Sender: Message
  const iPhonePatternNoSeconds = /^\[(\d{1,2}\/\d{1,2}\/\d{2,4},\s\d{1,2}:\d{2}\s(?:AM|PM))\]\s([^:]+):\s(.*)$/i

  // iPhone format for messages with just timestamp and sender (empty content)
  const iPhoneEmptyPattern = /^\[(\d{1,2}\/\d{1,2}\/\d{2,4},\s\d{1,2}:\d{2}(?::\d{2})?\s(?:AM|PM))\]\s([^:]+):$/i

  // First pass - sample first 1000 lines to determine format and find current user
  const sampleSize = Math.min(1000, lines.length)
  let isIPhoneFormat = false
  let useSecondsFormat = false

  for (let i = 0; i < sampleSize; i++) {
    const line = lines[i].trim()
    if (!line) continue

    // Try iPhone format with seconds first
    let match = line.match(iPhonePattern)
    if (match) {
      isIPhoneFormat = true
      useSecondsFormat = true
      const sender = match[2].trim()
      senderCounts.set(sender, (senderCounts.get(sender) || 0) + 1)
      continue
    }

    // Try iPhone format without seconds
    match = line.match(iPhonePatternNoSeconds)
    if (match) {
      isIPhoneFormat = true
      useSecondsFormat = false
      const sender = match[2].trim()
      senderCounts.set(sender, (senderCounts.get(sender) || 0) + 1)
      continue
    }

    // Try iPhone empty format
    match = line.match(iPhoneEmptyPattern)
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

  console.log("Format detected:", isIPhoneFormat ? `iPhone (${useSecondsFormat ? 'with seconds' : 'without seconds'})` : "Android")
  console.log("Sender message counts:", Array.from(senderCounts.entries()))

  // Set the sender with the most messages as current user
  if (senderCounts.size > 0) {
    currentUser = Array.from(senderCounts.entries()).reduce((a, b) => (a[1] > b[1] ? a : b))[0]
  }

  console.log("Current user set to:", currentUser)

  // Second pass - parse all messages with progress tracking
  const messagePattern = isIPhoneFormat 
    ? (useSecondsFormat ? iPhonePattern : iPhonePatternNoSeconds)
    : androidPattern
  const emptyPattern = isIPhoneFormat ? iPhoneEmptyPattern : null
  let processedLines = 0

  let currentMessage: {
    timestamp: string
    sender: string
    content: string
  } | null = null

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i].trim()
    if (!line) continue

    processedLines++

    // Show progress for large files
    if (processedLines % 5000 === 0) {
      console.log(`Processing... ${processedLines}/${lines.length} lines`)
    }

    // Try to match full message pattern first
    let match = line.match(messagePattern)
    
    if (match) {
      // Save previous message if exists
      if (currentMessage && currentMessage.content.trim().length > 0) {
        // Skip system messages
        if (!isSystemMessage(currentMessage.content)) {
          parsedMessages.push({
            timestamp: currentMessage.timestamp,
            sender: currentMessage.sender,
            content: currentMessage.content.trim(),
            isCurrentUser: currentMessage.sender === currentUser,
          })
        }
      }

      // Start new message
      const [, timestamp, sender, content] = match
      currentMessage = {
        timestamp: timestamp.trim(),
        sender: sender.trim(), 
        content: content.trim()
      }
    } else if (emptyPattern) {
      // Try to match empty message pattern (iPhone format with just timestamp and sender)
      match = line.match(emptyPattern)
      
      if (match) {
        // Save previous message if exists
        if (currentMessage && currentMessage.content.trim().length > 0) {
          if (!isSystemMessage(currentMessage.content)) {
            parsedMessages.push({
              timestamp: currentMessage.timestamp,
              sender: currentMessage.sender,
              content: currentMessage.content.trim(),
              isCurrentUser: currentMessage.sender === currentUser,
            })
          }
        }

        // Start new message with empty content
        const [, timestamp, sender] = match
        currentMessage = {
          timestamp: timestamp.trim(),
          sender: sender.trim(),
          content: ""
        }
      } else if (currentMessage) {
        // This is a continuation line - add to current message
        if (currentMessage.content.length > 0) {
          currentMessage.content += "\n" + line
        } else {
          currentMessage.content = line
        }
      }
    } else if (currentMessage) {
      // This is a continuation line - add to current message
      if (currentMessage.content.length > 0) {
        currentMessage.content += "\n" + line
      } else {
        currentMessage.content = line
      }
    }
  }

  // Don't forget the last message
  if (currentMessage && currentMessage.content.trim().length > 0) {
    if (!isSystemMessage(currentMessage.content)) {
      parsedMessages.push({
        timestamp: currentMessage.timestamp,
        sender: currentMessage.sender,
        content: currentMessage.content.trim(),
        isCurrentUser: currentMessage.sender === currentUser,
      })
    }
  }

  console.log("Parsed messages count:", parsedMessages.length)
  return parsedMessages
}

// Helper function to check if message is a system message
const isSystemMessage = (content: string): boolean => {
  return (
    content.includes("(file attached)") ||
    content.includes("This message was deleted") ||
    content.includes("Missed voice call") ||
    content.includes("Missed video call") ||
    content.includes("Voice call ended") ||
    content.includes("Video call ended") ||
    content.includes("Messages and calls are end-to-end encrypted") ||
    content.includes("You're now an admin") ||
    content.includes("changed the group name") ||
    content.includes("added you") ||
    content.includes("left") ||
    content.includes("joined using this group's invite link") ||
    content.includes("image omitted") ||
    content.includes("video omitted") ||
    content.includes("document omitted") ||
    content.includes("sticker omitted") ||
    content === "null" ||
    content.trim() === "" ||
    content.startsWith("‎") // Invisible character that WhatsApp uses
  )
}

// ...existing code...

  const loadMoreMessages = () => {
    setIsLoadingMore(true)

    setTimeout(() => {
      const startIndex = currentPage * messagesPerPage
      const endIndex = startIndex + messagesPerPage
      const newMessages = filteredMessages.slice(startIndex, endIndex)

      setDisplayedMessages((prev) => [...prev, ...newMessages])
      setCurrentPage((prev) => prev + 1)
      setIsLoadingMore(false)
    }, 100) // Small delay to show loading state
  }

  const loadInitialMessages = () => {
    const initialMessages = filteredMessages.slice(0, messagesPerPage)
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

      // Extract unique users and set first user as default view
      const uniqueUsers = Array.from(new Set(parsedMessages.map(msg => msg.sender)))
      setAvailableUsers(uniqueUsers)
      
      // Start by viewing as "Pranesh" if available, otherwise first user
      const defaultUser = uniqueUsers.includes("Pranesh") ? "Pranesh" : uniqueUsers[0]
      setSelectedUser(defaultUser)

      console.log(`Messages loaded: ${parsedMessages.length} total`)
      console.log("Available users:", uniqueUsers)
      console.log("Default viewing as:", defaultUser)
    } catch (error) {
      console.error("Error parsing file:", error)
      alert("Error reading file: " + (error as Error).message)
    } finally {
      setIsLoading(false)
    }
  }

  const formatTime = (timestamp: string) => {
    try {
      // Parse the WhatsApp timestamp format: DD/MM/YY, H:MM am/pm or [DD/MM/YY, H:MM:SS AM/PM]
      let datePart, timePart
      
      if (timestamp.includes("[") && timestamp.includes("]")) {
        // iPhone format: [DD/MM/YY, H:MM:SS AM/PM]
        const cleanTimestamp = timestamp.replace(/[\[\]]/g, "")
        ;[datePart, timePart] = cleanTimestamp.split(", ")
      } else {
        // Android format: DD/MM/YY, H:MM am/pm
        ;[datePart, timePart] = timestamp.split(", ")
      }
      
      const [day, month, year] = datePart.split("/")

      // Handle both am/pm and AM/PM formats, with or without seconds
      const timeMatch = timePart.match(/(\d{1,2}):(\d{2})(?::(\d{2}))?\s(am|pm|AM|PM)/)
      if (!timeMatch) return timestamp

      const [, hour, minute, , period] = timeMatch
      let hour24 = Number.parseInt(hour)

      if (period.toLowerCase() === "pm" && hour24 !== 12) {
        hour24 += 12
      } else if (period.toLowerCase() === "am" && hour24 === 12) {
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
    const results = filteredMessages
      .map((message, index) => (message.content.toLowerCase().includes(query) ? index : -1))
      .filter((index) => index !== -1)

    setSearchResults(results)
    setCurrentSearchIndex(0)

    // Load messages around the first search result
    if (results.length > 0) {
      const firstResultIndex = results[0]
      const pageWithResult = Math.floor(firstResultIndex / messagesPerPage)
      const startIndex = pageWithResult * messagesPerPage
      const endIndex = Math.min(startIndex + messagesPerPage * 3, filteredMessages.length) // Load 3 pages worth

      setDisplayedMessages(filteredMessages.slice(startIndex, endIndex))
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
              {getInitials(getChatTitle())}
            </AvatarFallback>
          </Avatar>
          <div className="flex-1">
            <h3 className="font-medium text-sm">{getChatTitle()}</h3>
            <p className="text-xs text-gray-500 dark:text-gray-400">
              Showing {displayedMessages.length} of {filteredMessages.length} messages
              {getViewModeText()}
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
              onClick={handleUserToggle}
              title={getTooltipText()}
            >
              {getViewModeIcon()}
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
            const actualIndex = filteredMessages.indexOf(message)
            const isHighlighted =
              searchResults.includes(actualIndex) && searchResults[currentSearchIndex] === actualIndex

            return (
              <div
                key={`${message.timestamp}-${message.sender}-${index}`}
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
                  style={{ 
                    fontFamily: '"Segoe UI Emoji", "Apple Color Emoji", "Noto Color Emoji", "Twemoji Mozilla", system-ui, sans-serif',
                    fontSize: '14px',
                    lineHeight: '1.4',
                    wordBreak: 'break-word',
                    overflowWrap: 'break-word'
                  }}
                >
                  {!message.isCurrentUser && (
                    <div className="text-xs font-medium text-blue-600 dark:text-blue-400 mb-1">{message.sender}</div>
                  )}
                  <div 
                    className="text-sm whitespace-pre-wrap break-words leading-relaxed"
                    style={{ 
                      unicodeBidi: 'plaintext',
                      direction: 'ltr',
                      textRendering: 'optimizeLegibility',
                      fontFeatureSettings: '"liga" 1, "calt" 1'
                    }}
                  >
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
          {displayedMessages.length < filteredMessages.length && (
            <div className="text-center py-4">
              <Button
                onClick={loadMoreMessages}
                disabled={isLoadingMore}
                variant="outline"
                className="bg-white/80 dark:bg-gray-800/80"
              >
                {isLoadingMore ? "Loading..." : `Load More (${filteredMessages.length - displayedMessages.length} remaining)`}
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