import { Copy, Edit2, Check, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { useState } from 'react';
import { PDFDocument } from '@/types/graphTypes';
import { Input } from '@/components/ui/input';
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from '@/components/ui/accordion';

interface ChatMessageProps {
  message: {
    role: 'user' | 'assistant';
    content: string;
    sources?: PDFDocument[];
  };
  onEdit?: (newContent: string) => void;
}

export function ChatMessage({ message, onEdit }: ChatMessageProps) {
  const isUser = message.role === 'user';
  const [copied, setCopied] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [editedContent, setEditedContent] = useState(message.content);
  const isLoading = message.role === 'assistant' && message.content === '';

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(message.content);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error('Failed to copy text:', err);
    }
  };

  const handleSaveEdit = () => {
    if (onEdit && editedContent.trim()) {
      onEdit(editedContent);
      setIsEditing(false);
    }
  };

  const handleCancelEdit = () => {
    setEditedContent(message.content);
    setIsEditing(false);
  };

  const showSources =
    message.role === 'assistant' &&
    message.sources &&
    message.sources.length > 0;

  return (
    <div className={`flex ${isUser ? 'justify-end' : 'justify-start'}`}>
      <div
        className={`max-w-[85%] ${isUser ? 'bg-black text-white' : 'bg-muted'} rounded-2xl px-4 py-2`}
      >
        {isLoading ? (
          <div className="flex space-x-1 h-6 items-center">
            <div className="w-1.5 h-1.5 bg-current rounded-full animate-[loading_1s_ease-in-out_infinite]" />
            <div className="w-1.5 h-1.5 bg-current rounded-full animate-[loading_1s_ease-in-out_0.2s_infinite]" />
            <div className="w-1.5 h-1.5 bg-current rounded-full animate-[loading_1s_ease-in-out_0.4s_infinite]" />
          </div>
        ) : (
          <>
            {isEditing ? (
              <div className="space-y-2">
                <Input
                  value={editedContent}
                  onChange={(e) => setEditedContent(e.target.value)}
                  className="w-full bg-white text-black"
                  autoFocus
                />
                <div className="flex gap-2">
                  <Button
                    size="sm"
                    onClick={handleSaveEdit}
                    className="h-8"
                  >
                    <Check className="h-4 w-4 mr-1" />
                    Save
                  </Button>
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={handleCancelEdit}
                    className="h-8"
                  >
                    <X className="h-4 w-4 mr-1" />
                    Cancel
                  </Button>
                </div>
              </div>
            ) : (
              <>
                <p className="whitespace-pre-wrap">{message.content}</p>
                <div className="flex gap-2 mt-2">
                  {isUser && onEdit && (
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8"
                      onClick={() => setIsEditing(true)}
                      title="Edit message"
                    >
                      <Edit2 className="h-4 w-4" />
                    </Button>
                  )}
                  {!isUser && (
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8"
                      onClick={handleCopy}
                      title={copied ? 'Copied!' : 'Copy to clipboard'}
                    >
                      <Copy
                        className={`h-4 w-4 ${copied ? 'text-green-500' : ''}`}
                      />
                    </Button>
                  )}
                </div>
              </>
            )}
            {showSources && message.sources && (
              <Accordion type="single" collapsible className="w-full mt-2">
                <AccordionItem value="sources" className="border-b-0">
                  <AccordionTrigger className="text-sm py-2 justify-start gap-2 hover:no-underline">
                    View Sources ({message.sources.length})
                  </AccordionTrigger>
                  <AccordionContent>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                      {message.sources?.map((source, index) => (
                        <Card
                          key={index}
                          className="bg-background/50 transition-all duration-200 hover:bg-background hover:shadow-md hover:scale-[1.02] cursor-pointer"
                        >
                          <CardContent className="p-3">
                            <p className="text-sm font-medium truncate">
                              {source.metadata?.source ||
                                source.metadata?.filename ||
                                'N/A'}
                            </p>
                            <p className="text-sm text-muted-foreground">
                              Page {source.metadata?.loc?.pageNumber || 'N/A'}
                            </p>
                          </CardContent>
                        </Card>
                      ))}
                    </div>
                  </AccordionContent>
                </AccordionItem>
              </Accordion>
            )}
          </>
        )}
      </div>
    </div>
  );
}
