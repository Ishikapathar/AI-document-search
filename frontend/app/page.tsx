'use client';

import type React from 'react';

import { useToast } from '@/hooks/use-toast';
import { useRef, useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Paperclip, ArrowUp, Loader2 } from 'lucide-react';
import { ExamplePrompts } from '@/components/example-prompts';
import { ChatMessage } from '@/components/chat-message';
import { FilePreview } from '@/components/file-preview';
import { client } from '@/lib/langgraph-client';
import {
  AgentState,
  documentType,
  PDFDocument,
  RetrieveDocumentsNodeUpdates,
} from '@/types/graphTypes';
import { Card, CardContent } from '@/components/ui/card';
export default function Home() {
  const { toast } = useToast(); // Add this hook
  const [messages, setMessages] = useState<
    Array<{
      role: 'user' | 'assistant';
      content: string;
      sources?: PDFDocument[];
    }>
  >([]);
  const [input, setInput] = useState('');
  const [files, setFiles] = useState<File[]>([]);
  const [isUploading, setIsUploading] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [threadId, setThreadId] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const abortControllerRef = useRef<AbortController | null>(null); // Track the AbortController
  const messagesEndRef = useRef<HTMLDivElement>(null); // Add this ref
  const lastRetrievedDocsRef = useRef<PDFDocument[]>([]); // useRef to store the last retrieved documents

  useEffect(() => {
    // Create a thread when the component mounts
    const initThread = async () => {
      // Skip if we already have a thread
      if (threadId) return;

      try {
        const thread = await client.createThread();

        setThreadId(thread.thread_id);
      } catch (error) {
        console.error('Error creating thread:', error);
        toast({
          title: 'Error',
          description:
            'Error creating thread. Please make sure you have set the LANGGRAPH_API_URL environment variable correctly. ' +
            error,
          variant: 'destructive',
        });
      }
    };
    initThread();
  }, []);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim() || !threadId || isLoading) return;

    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }

    const userMessage = input.trim();
    setMessages((prev) => [
      ...prev,
      { role: 'user', content: userMessage, sources: undefined }, // Clear sources for new user message
      { role: 'assistant', content: '', sources: undefined }, // Clear sources for new assistant message
    ]);
    setInput('');
    setIsLoading(true);

    const abortController = new AbortController();
    abortControllerRef.current = abortController;

    lastRetrievedDocsRef.current = []; // Clear the last retrieved documents

    try {
      const response = await fetch('/api/chat', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          message: userMessage,
          threadId,
        }),
        signal: abortController.signal,
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const reader = response.body?.getReader();
      if (!reader) throw new Error('No reader available');

      const decoder = new TextDecoder();

      let streamDone = false;
      while (!streamDone) {
        const { done, value } = await reader.read();
        if (done) {
          streamDone = true;
          break;
        }

        const chunkStr = decoder.decode(value);
        const lines = chunkStr.split('\n').filter(Boolean);

        for (const line of lines) {
          if (!line.startsWith('data: ')) continue;

          const sseString = line.slice('data: '.length);
          let sseEvent: any;
          try {
            sseEvent = JSON.parse(sseString);
          } catch (err) {
            console.error('Error parsing SSE line:', err, line);
            continue;
          }

          const { event, data } = sseEvent;

          if (event === 'messages/partial') {
            if (Array.isArray(data)) {
              const lastObj = data[data.length - 1];
              if (lastObj?.type === 'ai') {
                const partialContent = lastObj.content ?? '';

                // Only display if content is a string message
                if (
                  typeof partialContent === 'string' &&
                  !partialContent.startsWith('{')
                ) {
                  setMessages((prev) => {
                    const newArr = [...prev];
                    if (
                      newArr.length > 0 &&
                      newArr[newArr.length - 1].role === 'assistant'
                    ) {
                      newArr[newArr.length - 1].content = partialContent;
                      newArr[newArr.length - 1].sources =
                        lastRetrievedDocsRef.current;
                    }

                    return newArr;
                  });
                }
              }
            }
          } else if (event === 'updates' && data) {
            if (
              data &&
              typeof data === 'object' &&
              'retrieveDocuments' in data &&
              data.retrieveDocuments &&
              Array.isArray(data.retrieveDocuments.documents)
            ) {
              const retrievedDocs = (data as RetrieveDocumentsNodeUpdates)
                .retrieveDocuments.documents as PDFDocument[];

              // // Handle documents here
              lastRetrievedDocsRef.current = retrievedDocs;
              console.log('Retrieved documents:', retrievedDocs);
            } else {
              // Clear the last retrieved documents if it's a direct answer
              lastRetrievedDocsRef.current = [];
            }
          } else {
            console.log('Unknown SSE event:', event, data);
          }
        }
      }
    } catch (error) {
      console.error('Error sending message:', error);
      toast({
        title: 'Error',
        description:
          'Failed to send message. Please try again.\n' +
          (error instanceof Error ? error.message : 'Unknown error'),
        variant: 'destructive',
      });
      setMessages((prev) => {
        const newArr = [...prev];
        newArr[newArr.length - 1].content =
          'Sorry, there was an error processing your message.';
        return newArr;
      });
    } finally {
      setIsLoading(false);
      abortControllerRef.current = null;
    }
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFiles = Array.from(e.target.files || []);
    if (selectedFiles.length === 0) return;

    const nonPdfFiles = selectedFiles.filter(
      (file) => file.type !== 'application/pdf',
    );
    if (nonPdfFiles.length > 0) {
      toast({
        title: 'Invalid file type',
        description: 'Please upload PDF files only',
        variant: 'destructive',
      });
      return;
    }

    setIsUploading(true);
    try {
      const formData = new FormData();
      selectedFiles.forEach((file) => {
        formData.append('files', file);
      });

      const response = await fetch('/api/ingest', {
        method: 'POST',
        body: formData,
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Failed to upload files');
      }

      setFiles(selectedFiles);
      setMessages([]);
      // Create a new thread for this PDF
      const newThread = await client.createThread();
      setThreadId(newThread.thread_id);
      toast({
        title: 'Success',
        description: `${selectedFiles.length} file${selectedFiles.length > 1 ? 's' : ''} uploaded successfully. New conversation started!`,
        variant: 'default',
      });
    } catch (error) {
      console.error('Error uploading files:', error);
      toast({
        title: 'Upload failed',
        description:
          'Failed to upload files. Please try again.\n' +
          (error instanceof Error ? error.message : 'Unknown error'),
        variant: 'destructive',
      });
    } finally {
      setIsUploading(false);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  const handleRemoveFile = (fileToRemove: File) => {
    setFiles(files.filter((file) => file !== fileToRemove));
    toast({
      title: 'File removed',
      description: `${fileToRemove.name} has been removed`,
      variant: 'default',
    });
  };

  const handleClearAllFiles = () => {
    setFiles([]);
    setMessages([]);
    setInput('');
    // Create a new thread for fresh context
    const initNewThread = async () => {
      try {
        const thread = await client.createThread();
        setThreadId(thread.thread_id);
      } catch (error) {
        console.error('Error creating new thread:', error);
      }
    };
    initNewThread();
    toast({
      title: 'Files cleared',
      description: 'All files and conversation cleared. Ready for new PDF!',
      variant: 'default',
    });
  };

  return (
    <main className="flex min-h-screen flex-col items-center bg-gradient-to-br from-blue-950 via-blue-900 to-slate-900">
      <div className="w-full max-w-5xl mx-auto p-4 md:p-8">
        {/* Header */}
        <div className="text-center py-6 mb-4 flex justify-between items-center">
          <div className="flex-1">
            <h1 className="text-3xl md:text-4xl font-bold text-white mb-2">
              AI Document Search
            </h1>
            <p className="text-sm text-blue-200 max-w-2xl mx-auto">
              Powered by LangChain & LangGraph
            </p>
          </div>
          {messages.length > 0 && (
            <Button
              onClick={() => {
                setMessages([]);
                setInput('');
                setFiles([]);
                const initNewThread = async () => {
                  try {
                    const thread = await client.createThread();
                    setThreadId(thread.thread_id);
                  } catch (error) {
                    console.error('Error creating new thread:', error);
                  }
                };
                initNewThread();
                toast({
                  title: 'New conversation started',
                  description: 'All messages and files cleared',
                  variant: 'default',
                });
              }}
              className="bg-blue-600 hover:bg-blue-700 text-white text-sm"
            >
              New Conversation
            </Button>
          )}
        </div>

        {messages.length === 0 ? (
          <>
            <div className="flex-1 flex items-center justify-center min-h-[400px]">
              <Card className="max-w-2xl mx-auto shadow-2xl border-blue-800 bg-blue-900/40 backdrop-blur">
                <CardContent className="p-8">
                  <div className="text-center space-y-6">
                    <div className="w-16 h-16 mx-auto bg-gradient-to-br from-blue-500 to-blue-600 rounded-2xl flex items-center justify-center shadow-lg">
                      <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z" />
                      </svg>
                    </div>
                    <div>
                      <h2 className="text-xl font-bold mb-3 text-white">What I Can Do For You</h2>
                      <div className="text-left space-y-2 text-white/90">
                        <div className="flex items-start gap-2">
                          <span className="text-blue-400 mt-1">📄</span>
                          <p className="text-sm">Upload and analyze PDF documents instantly</p>
                        </div>
                        <div className="flex items-start gap-2">
                          <span className="text-blue-400 mt-1">💬</span>
                          <p className="text-sm">Ask questions about your document content</p>
                        </div>
                        <div className="flex items-start gap-2">
                          <span className="text-blue-400 mt-1">🎯</span>
                          <p className="text-sm">Get AI-powered answers with source citations</p>
                        </div>
                        <div className="flex items-start gap-2">
                          <span className="text-blue-400 mt-1">🔍</span>
                          <p className="text-sm">Search and extract information quickly</p>
                        </div>
                      </div>
                    </div>
                    <div className="pt-4 border-t border-blue-700">
                      <p className="text-xs text-blue-300">
                        Example template for{' '}
                        <a
                          href="https://www.oreilly.com/library/view/learning-langchain/9781098167271/"
                          className="text-blue-400 hover:text-blue-300 underline font-medium"
                          target="_blank"
                          rel="noopener noreferrer"
                        >
                          Learning LangChain (O'Reilly)
                        </a>
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
            <div className="mt-8">
              <ExamplePrompts onPromptSelect={setInput} />
            </div>
          </>
        ) : (
          <div className="w-full space-y-4 mb-32 max-h-[calc(100vh-300px)] overflow-y-auto pr-2">
            {messages.map((message, i) => (
              <ChatMessage 
                key={i} 
                message={message}
                onEdit={message.role === 'user' ? (newContent: string) => {
                  const updatedMessages = [...messages];
                  updatedMessages[i].content = newContent;
                  setMessages(updatedMessages);
                } : undefined}
              />
            ))}
            <div ref={messagesEndRef} />
          </div>
        )}
      </div>

      {/* Enhanced Input Area */}
      <div className="fixed bottom-0 left-0 right-0 p-4 bg-gradient-to-t from-blue-950 via-blue-950 to-transparent backdrop-blur-sm border-t border-blue-800">
        <div className="max-w-5xl mx-auto space-y-4">
          {files.length > 0 && (
            <div className="space-y-2">
              <div className="flex justify-between items-center">
                <p className="text-sm text-blue-300">Uploaded files:</p>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={handleClearAllFiles}
                  className="text-xs text-red-400 hover:text-red-300 hover:bg-red-900/20"
                >
                  Clear All
                </Button>
              </div>
              <div className="grid grid-cols-3 gap-2 animate-in slide-in-from-bottom">
                {files.map((file, index) => (
                  <FilePreview
                    key={`${file.name}-${index}`}
                    file={file}
                    onRemove={() => handleRemoveFile(file)}
                  />
                ))}
              </div>
            </div>
          )}

          <form onSubmit={handleSubmit} className="relative">
            <div className="flex gap-2 border-2 border-blue-700 rounded-2xl overflow-hidden bg-blue-900/50 shadow-lg hover:shadow-xl transition-shadow">
              <input
                type="file"
                ref={fileInputRef}
                onChange={handleFileUpload}
                accept=".pdf"
                multiple
                className="hidden"
              />
              <Button
                type="button"
                variant="ghost"
                size="icon"
                className="rounded-none h-14 hover:bg-blue-800 transition-colors text-white"
                onClick={() => fileInputRef.current?.click()}
                disabled={isUploading}
                title="Upload PDF"
              >
                {isUploading ? (
                  <Loader2 className="h-5 w-5 animate-spin text-blue-400" />
                ) : (
                  <Paperclip className="h-5 w-5 text-blue-200" />
                )}
              </Button>
              <Input
                value={input}
                onChange={(e) => setInput(e.target.value)}
                placeholder={
                  isUploading ? 'Uploading PDF...' : 'Ask me anything about your documents...'
                }
                className="border-0 focus-visible:ring-0 focus-visible:ring-offset-0 h-14 bg-transparent text-base text-white placeholder:text-blue-300"
                disabled={isUploading || isLoading}
              />
              <Button
                type="submit"
                size="icon"
                className="rounded-none h-14 w-14 bg-blue-600 hover:bg-blue-700 transition-all"
                disabled={
                  !input.trim() || isUploading || isLoading
                }
                title="Send message"
              >
                {isLoading ? (
                  <Loader2 className="h-5 w-5 animate-spin" />
                ) : (
                  <ArrowUp className="h-5 w-5" />
                )}
              </Button>
            </div>
          </form>
        </div>
      </div>
    </main>
  );
}
