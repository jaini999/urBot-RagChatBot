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
      content: '👋 Welcome to urBot Enterprise. You can chat with your existing documents or upload new ones to expand your knowledge base.',
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
      case 'connected': return 'bg-green-600'
      case 'error': return 'bg-red-600'
      default: return 'bg-yellow-600'
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
    <div className="min-h-screen gold-gradient-bg">
      {/* Animated Background Pattern */}
      <div className="absolute inset-0 opacity-5">
        <div className="absolute inset-0" style={{
          backgroundImage: `radial-gradient(circle at 25% 25%, #d4af37 2px, transparent 2px), radial-gradient(circle at 75% 75%, #d4af37 2px, transparent 2px)`,
          backgroundSize: '50px 50px'
        }}></div>
      </div>

      <div className="container mx-auto px-4 py-8 relative z-10">
        {/* Header */}
        <div className="text-center mb-8">
          <div className="inline-block p-4 glass-effect rounded-xl mb-4 w-full max-w-4xl">
            <h1 className="text-4xl font-bold gold-accent mb-2 tracking-tight">
              urBot Enterprise
            </h1>
            <p className="text-lg text-gray-300 mb-3 font-light">
              Advanced Document Intelligence with Retrieval Augmented Generation
            </p>
            
            {/* Connection Status */}
            <div className="flex justify-center gap-4 mb-2">
              <Badge variant="secondary" className={`${getStatusColor(connectionStatus.upload)} text-white px-3 py-1 rounded-full font-medium text-sm`}>
                {getStatusText(connectionStatus.upload)}
              </Badge>
              <Badge variant="secondary" className={`${getStatusColor(connectionStatus.chat)} text-white px-3 py-1 rounded-full font-medium text-sm`}>
                {getStatusText(connectionStatus.chat)}
              </Badge>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Upload Section */}
          <div className="lg:col-span-1">
            <Card className="premium-card h-fit border-2">
              <CardHeader className="text-center pb-6">
                <CardTitle className="flex items-center justify-center gap-3 text-2xl gold-accent">
                  <span className="text-3xl">📄</span>
                  Document Upload
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-6">
                <div 
                  className="border-2 border-dashed border-gray-600 rounded-xl p-8 text-center cursor-pointer hover:border-d4af37 transition-all duration-300 hover:bg-gray-900/50"
                  onClick={() => fileInputRef.current?.click()}
                >
                  <div className="text-5xl mb-4">📁</div>
                  <div className="text-gray-300 mb-2 font-medium">Drop your PDF here</div>
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
                  <div className="p-4 glass-effect rounded-lg border border-gray-600">
                    <div className="font-medium text-gray-200 mb-1">Selected file: {selectedFile.name}</div>
                    <div className="text-sm text-gray-400">
                      Size: {(selectedFile.size / 1024 / 1024).toFixed(2)} MB
                    </div>
                  </div>
                )}

                <Button 
                  onClick={handleUpload} 
                  disabled={!selectedFile || isLoading}
                  className="premium-button w-full h-12 text-lg"
                >
                  {isLoading ? (
                    <div className="flex items-center gap-3">
                      <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-black"></div>
                      Processing...
                    </div>
                  ) : (
                    'Upload Document'
                  )}
                </Button>

                {uploadStatus && (
                  <div className={`p-4 rounded-lg text-sm border ${
                    uploadStatus.type === 'success' ? 'bg-green-900/20 text-green-300 border-green-600' :
                    uploadStatus.type === 'error' ? 'bg-red-900/20 text-red-300 border-red-600' :
                    'bg-blue-900/20 text-blue-300 border-blue-600'
                  }`}>
                    {uploadStatus.message}
                  </div>
                )}
              </CardContent>
            </Card>
          </div>

          {/* Chat Section */}
          <div className="lg:col-span-2">
            <Card className="chat-container premium-card border-2">
              <CardHeader className="flex-shrink-0 pb-4 text-center">
                <CardTitle className="flex items-center justify-center gap-3 text-2xl gold-accent">
                  <span className="text-3xl">💬</span>
                  AI Chat Interface
                </CardTitle>
              </CardHeader>
              <CardContent className="h-full flex flex-col p-0">
                {/* Messages */}
                <div className="chat-messages space-y-4 p-6 mx-4 mb-4">
                  {messages.map((message) => (
                    <div
                      key={message.id}
                      className={`flex ${message.sender === 'user' ? 'justify-end' : 'justify-start'}`}
                    >
                      <div
                        className={`max-w-[70%] p-4 rounded-2xl ${
                          message.sender === 'user'
                            ? 'bg-gradient-to-r from-d4af37 to-f4e4a6 text-black font-medium'
                            : 'glass-effect text-gray-200 border border-gray-600'
                        }`}
                      >
                        <div className="text-sm leading-relaxed">{message.content}</div>
                        <div className={`text-xs mt-2 ${
                          message.sender === 'user' ? 'text-gray-700' : 'text-gray-400'
                        }`}>
                          {message.timestamp.toLocaleTimeString()}
                        </div>
                      </div>
                    </div>
                  ))}
                  <div ref={messagesEndRef} />
                </div>

                {/* Input */}
                <div className="chat-input-area flex gap-3 p-6">
                  <Input
                    value={inputMessage}
                    onChange={(e) => setInputMessage(e.target.value)}
                    onKeyPress={handleKeyPress}
                    placeholder="Ask a question about your documents..."
                    disabled={isLoading}
                    className="premium-input flex-1 h-12 text-lg rounded-xl"
                  />
                  <Button 
                    onClick={sendMessage} 
                    disabled={!inputMessage.trim() || isLoading}
                    className="premium-button h-12 px-8"
                  >
                    {isLoading ? (
                      <div className="flex items-center gap-2">
                        <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-black"></div>
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
