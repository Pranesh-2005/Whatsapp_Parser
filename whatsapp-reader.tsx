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

  // Apply dark mode
  useEffect(() => {
    if (darkMode) {
      document.documentElement.classList.add('dark')
    } else {
      document.documentElement.classList.remove('dark')
    }
  }, [darkMode])

  const parseWhatsAppFile = (content: string) => {
    console.log("File content preview:", content.substring(0, 500))

    const lines = content.split("\n").filter((line) => line.trim() !== "")
    const parsedMessages: Message[] = []
    let currentUser = ""
    const senders = new Set<string>()

    // Updated regex pattern to match your file format: DD/MM/YY, H:MM am/pm - Sender: Message
    const messagePattern = /^(\d{1,2}\/\d{1,2}\/\d{2,4},\s\d{1,2}:\d{2}\s(?:am|pm))\s-\s([^:]+):\s(.*)$/

    // First pass to identify all senders
    lines.forEach((line, index) => {
      if (index < 10) console.log(`Line ${index}:`, line) // Debug first 10 lines

      const match = line.match(messagePattern)
      if (match) {
        senders.add(match[2].trim())
      }
    })

    console.log("Found senders:", Array.from(senders))

    // Set the first sender as current user (Pranesh in your case)
    if (senders.size > 0) {
      currentUser = Array.from(senders)[0]
    }

    console.log("Current user set to:", currentUser)

    lines.forEach((line, index) => {
      const match = line.match(messagePattern)

      if (match) {
        const [, timestamp, sender, content] = match

        // Skip system messages and file attachments
        if (
          content.includes("(file attached)") ||
          content.includes("This message was deleted") ||
          content.includes("Missed voice call") ||
          content.includes("Missed video call") ||
          content === "null"
        ) {
          return
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
    })

    console.log("Parsed messages count:", parsedMessages.length)
    console.log("First few messages:", parsedMessages.slice(0, 3))

    return parsedMessages
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
      console.log("Messages set successfully")
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
      setSearchResults([]);
      return;
    }

    const query = searchQuery.toLowerCase();
    const results = messages
      .map((message, index) => 
        message.content.toLowerCase().includes(query) ? index : -1
      )
      .filter(index => index !== -1);

    setSearchResults(results);
    setCurrentSearchIndex(0);
    
    if (results.length > 0 && messagesContainerRef.current) {
      const messageElement = messagesContainerRef.current.querySelector(`[data-message-index="${results[0]}"]`);
      messageElement?.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }
  }

  const navigateSearch = (direction: 'next' | 'prev') => {
    if (searchResults.length === 0) return;
    
    let newIndex = direction === 'next' 
      ? (currentSearchIndex + 1) % searchResults.length
      : (currentSearchIndex - 1 + searchResults.length) % searchResults.length;
    
    setCurrentSearchIndex(newIndex);
    
    if (messagesContainerRef.current) {
      const messageElement = messagesContainerRef.current.querySelector(
        `[data-message-index="${searchResults[newIndex]}"]`
      );
      messageElement?.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }
  }

  const highlightSearchTerms = (text: string) => {
    if (!searchQuery.trim()) return text;
    
    const parts = text.split(new RegExp(`(${searchQuery})`, 'gi'));
    return parts.map((part, i) => 
      part.toLowerCase() === searchQuery.toLowerCase() 
        ? <span key={i} className="bg-yellow-300 text-black px-0.5 rounded">{part}</span> 
        : part
    );
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
          <Button 
            variant="outline" 
            size="sm" 
            className="mt-4" 
            onClick={() => setDarkMode(!darkMode)}
          >
            {darkMode ? <Sun className="h-4 w-4 mr-2" /> : <Moon className="h-4 w-4 mr-2" />}
            {darkMode ? 'Light Mode' : 'Dark Mode'}
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
        backgroundSize: 'cover',
        backgroundPosition: 'center',
        backgroundAttachment: 'fixed'
      }}
    >
      <div className="max-w-5xl w-full mx-auto rounded-lg overflow-hidden shadow-lg flex flex-col bg-white dark:bg-gray-800 border dark:border-gray-700 h-full">
        {/* Header */}
        <div className="bg-green-600 dark:bg-green-800 text-white p-3 flex items-center gap-3">
          <Avatar className="w-10 h-10">
            <AvatarImage src="/placeholder.svg" />
            <AvatarFallback className="bg-green-700 dark:bg-green-900 text-white">{getInitials(chatTitle)}</AvatarFallback>
          </Avatar>
          <div className="flex-1">
            <h3 className="font-medium text-sm">{chatTitle}</h3>
            <p className="text-xs text-green-100">{messages.length} messages</p>
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
            <Button variant="ghost" size="icon" className="w-8 h-8 text-white hover:bg-green-700 dark:hover:bg-green-900">
              <Video className="w-4 h-4" />
            </Button>
            <Button variant="ghost" size="icon" className="w-8 h-8 text-white hover:bg-green-700 dark:hover:bg-green-900">
              <Phone className="w-4 h-4" />
            </Button>
            <Button variant="ghost" size="icon" className="w-8 h-8 text-white hover:bg-green-700 dark:hover:bg-green-900">
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
              onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
              className="flex-1 dark:bg-gray-700 dark:text-white"
            />
            <Button size="sm" onClick={handleSearch} variant="secondary">
              <Search className="h-4 w-4 mr-1" /> Search
            </Button>
            {searchResults.length > 0 && (
              <div className="flex items-center gap-2">
                <span className="text-sm dark:text-gray-300">{currentSearchIndex + 1}/{searchResults.length}</span>
                <Button size="sm" variant="outline" onClick={() => navigateSearch('prev')} className="px-2">
                  ↑
                </Button>
                <Button size="sm" variant="outline" onClick={() => navigateSearch('next')} className="px-2">
                  ↓
                </Button>
              </div>
            )}
            <Button 
              size="icon" 
              variant="ghost" 
              onClick={() => {
                setIsSearching(false);
                setSearchQuery("");
                setSearchResults([]);
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
            backgroundSize: 'cover',
            backgroundPosition: 'center',
            opacity: '0.95'
          }}
        >
          {messages.map((message, index) => {
            const isHighlighted = searchResults.includes(index) && 
                                searchResults[currentSearchIndex] === index;
            
            return (
              <div 
                key={index} 
                className={`flex ${message.isCurrentUser ? "justify-end" : "justify-start"}`}
                data-message-index={index}
              >
                <div
                  className={`max-w-[80%] rounded-lg px-3 py-2 ${
                    isHighlighted ? "ring-2 ring-yellow-500 ring-offset-2" : ""
                  } ${
                    message.isCurrentUser 
                      ? "bg-green-500 dark:bg-green-600 text-white" 
                      : "bg-white dark:bg-gray-700 border shadow-sm dark:text-white"
                  }`}
                >
                  {!message.isCurrentUser && (
                    <div className={`text-xs font-medium ${message.isCurrentUser ? "text-green-100" : "text-green-600 dark:text-green-400"} mb-1`}>
                      {message.sender}
                    </div>
                  )}
                  <div className="text-sm whitespace-pre-wrap break-words">
                    {searchQuery.trim() 
                      ? highlightSearchTerms(message.content) 
                      : message.content}
                  </div>
                  <div className={`text-xs mt-1 ${message.isCurrentUser ? "text-green-100" : "text-gray-500 dark:text-gray-400"}`}>
                    {formatTime(message.timestamp)}
                  </div>
                </div>
              </div>
            )
          })}
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
