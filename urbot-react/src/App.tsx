import { useState, useRef, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { Separator } from '@/components/ui/separator'

// Webhook URLs from your n8n workflow
const UPLOAD_WEBHOOK = "http://localhost:5678/webhook/4e1e20d4-f759-42c8-8439-87b93f43aa7c"
const CHAT_WEBHOOK = "http://localhost:5678/webhook/5e56a263-3a40-44bd-bc9d-1cfb3bc2a87d/chat"

interface Message {
  id: string
  sender: 'user' | 'bot'
  content: string
  timestamp: Date
}

interface FileInfo {
  name: string
  size: number
}

function App() {
  const [messages, setMessages] = useState<Message[]>([
    {
      id: '1',
      sender: 'bot',
      content: '👋 Welcome! You can chat with your existing documents or upload new ones to expand your knowledge base.',
      timestamp: new Date()
    }
  ])
  const [inputMessage, setInputMessage] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [selectedFile, setSelectedFile] = useState<File | null>(null)
  const [uploadStatus, setUploadStatus] = useState<{ message: string; type: 'success' | 'error' | 'info' } | null>(null)
  const [connectionStatus, setConnectionStatus] = useState({
    upload: 'checking',
    chat: 'checking'
  })
  
  const fileInputRef = useRef<HTMLInputElement>(null)
  const messagesEndRef = useRef<HTMLDivElement>(null)

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }

  useEffect(() => {
    scrollToBottom()
  }, [messages])

  useEffect(() => {
    checkConnections()
  }, [])

  const checkConnections = async () => {
    // Check upload webhook
    try {
      const formData = new FormData()
      formData.append('file', new Blob(['test'], { type: 'text/plain' }), 'test.txt')
      
      const response = await fetch(UPLOAD_WEBHOOK, { 
        method: 'POST',
        body: formData
      })
      setConnectionStatus(prev => ({
        ...prev,
        upload: response.ok ? 'connected' : 'error'
      }))
    } catch (error) {
      setConnectionStatus(prev => ({
        ...prev,
        upload: 'error'
      }))
    }

    // Check chat webhook
    try {
      const testUrl = `${CHAT_WEBHOOK}?action=sendMessage`
      const response = await fetch(testUrl, { 
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ chatInput: 'test', sessionId: 'test' })
      })
      setConnectionStatus(prev => ({
        ...prev,
        chat: (response.ok || response.status === 500) ? 'connected' : 'error'
      }))
    } catch (error) {
      setConnectionStatus(prev => ({
        ...prev,
        chat: 'error'
      }))
    }
  }

  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (file && file.type === 'application/pdf') {
      setSelectedFile(file)
      setUploadStatus({ message: 'File selected. Click upload to process.', type: 'info' })
    } else {
      setUploadStatus({ message: 'Please select a PDF file.', type: 'error' })
    }
  }

  const handleUpload = async () => {
    if (!selectedFile) return

    setIsLoading(true)
    try {
      const formData = new FormData()
      formData.append('file', selectedFile)

      const response = await fetch(UPLOAD_WEBHOOK, {
        method: 'POST',
        body: formData
      })

      if (response.ok) {
        setUploadStatus({ message: '✅ Document uploaded and processed successfully!', type: 'success' })
        addMessage('bot', '🎉 Document processed successfully! I\'m ready to answer questions about your new content.')
        setSelectedFile(null)
        if (fileInputRef.current) fileInputRef.current.value = ''
      } else {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`)
      }
    } catch (error) {
      setUploadStatus({ message: `❌ Upload failed: ${error instanceof Error ? error.message : 'Unknown error'}`, type: 'error' })
    } finally {
      setIsLoading(false)
    }
  }

  const addMessage = (sender: 'user' | 'bot', content: string) => {
    const newMessage: Message = {
      id: Date.now().toString(),
      sender,
      content,
      timestamp: new Date()
    }
    setMessages(prev => [...prev, newMessage])
  }

  const sendMessage = async () => {
    if (!inputMessage.trim() || isLoading) return

    const userMessage = inputMessage.trim()
    addMessage('user', userMessage)
    setInputMessage('')
    setIsLoading(true)

    try {
      const chatUrl = `${CHAT_WEBHOOK}?action=sendMessage`
      const response = await fetch(chatUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ 
          chatInput: userMessage,
          sessionId: 'default-session'
        })
      })

      if (response.ok) {
        const result = await response.json()
        addMessage('bot', result.output || result.answer || 'I received your message but couldn\'t generate a response.')
      } else {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`)
      }
    } catch (error) {
      addMessage('bot', `❌ Error: ${error instanceof Error ? error.message : 'Unknown error'}`)
    } finally {
      setIsLoading(false)
    }
  }

  const handleKeyPress = (event: React.KeyboardEvent) => {
    if (event.key === 'Enter' && !event.shiftKey) {
      event.preventDefault()
      sendMessage()
    }
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'connected': return 'bg-green-500'
      case 'error': return 'bg-red-500'
      default: return 'bg-yellow-500'
    }
  }

  const getStatusText = (status: string) => {
    switch (status) {
      case 'connected': return '🟢 Connected'
      case 'error': return '🔴 Error'
      default: return '🟡 Checking...'
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-600 via-purple-600 to-blue-800">
      <div className="container mx-auto px-4 py-8">
        {/* Header */}
        <div className="text-center mb-8">
          <h1 className="text-4xl font-bold text-white mb-2">🤖 urBot</h1>
          <p className="text-xl text-blue-100 mb-4">
            Chat with your documents using Retrieval Augmented Generation
          </p>
          
          {/* Connection Status */}
          <div className="flex justify-center gap-4 mb-4">
            <Badge variant="secondary" className={`${getStatusColor(connectionStatus.upload)} text-white`}>
              {getStatusText(connectionStatus.upload)}
            </Badge>
            <Badge variant="secondary" className={`${getStatusColor(connectionStatus.chat)} text-white`}>
              {getStatusText(connectionStatus.chat)}
            </Badge>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Upload Section */}
          <div className="lg:col-span-1">
            <Card className="h-fit">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  📄 Upload Document
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div 
                  className="border-2 border-dashed border-gray-300 rounded-lg p-8 text-center cursor-pointer hover:border-blue-400 transition-colors"
                  onClick={() => fileInputRef.current?.click()}
                >
                  <div className="text-4xl mb-2">📁</div>
                  <div className="text-gray-600 mb-1">Drop your PDF here</div>
                  <div className="text-sm text-gray-500">or click to browse</div>
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept=".pdf"
                    onChange={handleFileSelect}
                    className="hidden"
                  />
                </div>

                {selectedFile && (
                  <div className="p-3 bg-blue-50 rounded-lg border border-blue-200">
                    <div className="font-medium text-blue-900">Selected file: {selectedFile.name}</div>
                    <div className="text-sm text-blue-700">
                      Size: {(selectedFile.size / 1024 / 1024).toFixed(2)} MB
                    </div>
                  </div>
                )}

                <Button 
                  onClick={handleUpload} 
                  disabled={!selectedFile || isLoading}
                  className="w-full"
                >
                  {isLoading ? (
                    <div className="flex items-center gap-2">
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                      Processing...
                    </div>
                  ) : (
                    'Upload Document'
                  )}
                </Button>

                {uploadStatus && (
                  <div className={`p-3 rounded-lg text-sm ${
                    uploadStatus.type === 'success' ? 'bg-green-50 text-green-800 border border-green-200' :
                    uploadStatus.type === 'error' ? 'bg-red-50 text-red-800 border border-red-200' :
                    'bg-blue-50 text-blue-800 border border-blue-200'
                  }`}>
                    {uploadStatus.message}
                  </div>
                )}
              </CardContent>
            </Card>
          </div>

          {/* Chat Section */}
          <div className="lg:col-span-2">
            <Card className="chat-container">
              <CardHeader className="flex-shrink-0 pb-4">
                <CardTitle className="flex items-center gap-2">
                  💬 Chat Interface
                </CardTitle>
              </CardHeader>
              <CardContent className="h-full flex flex-col p-0">
                {/* Messages */}
                <div className="chat-messages space-y-4 p-4 bg-gray-50 rounded-lg mx-4 mb-4">
                  {messages.map((message) => (
                    <div
                      key={message.id}
                      className={`flex ${message.sender === 'user' ? 'justify-end' : 'justify-start'}`}
                    >
                      <div
                        className={`max-w-[70%] p-3 rounded-lg ${
                          message.sender === 'user'
                            ? 'bg-blue-600 text-white'
                            : 'bg-white text-gray-800 border border-gray-200'
                        }`}
                      >
                        <div className="text-sm break-words">{message.content}</div>
                        <div className={`text-xs mt-1 ${
                          message.sender === 'user' ? 'text-blue-100' : 'text-gray-500'
                        }`}>
                          {message.timestamp.toLocaleTimeString()}
                        </div>
                      </div>
                    </div>
                  ))}
                  <div ref={messagesEndRef} />
                </div>

                {/* Input */}
                <div className="chat-input-area flex gap-2 p-4 border-t bg-white rounded-b-lg">
                  <Input
                    value={inputMessage}
                    onChange={(e) => setInputMessage(e.target.value)}
                    onKeyPress={handleKeyPress}
                    placeholder="Ask a question about your documents..."
                    disabled={isLoading}
                    className="flex-1"
                  />
                  <Button 
                    onClick={sendMessage} 
                    disabled={!inputMessage.trim() || isLoading}
                  >
                    {isLoading ? (
                      <div className="flex items-center gap-2">
                        <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                        ...
                      </div>
                    ) : (
                      'Send'
                    )}
                  </Button>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  )
}

export default App
