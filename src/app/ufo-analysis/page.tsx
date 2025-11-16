
'use client';

import {useState, useEffect} from 'react';
import {Button} from '@/components/ui/button';
import {Input} from '@/components/ui/input';
import {ScrollArea} from '@/components/ui/scroll-area';
import {
  Card,
  CardContent,
  CardFooter,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';

export default function UFOAnalysisPage() {
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  // Set the initial message when the component mounts
  useEffect(() => {
    setMessages([
      {
        role: 'agent',
        content:
          'System Online. I am the Ufology Scientific Analysis Agent. My purpose is to provide objective, technical analysis of potential UAP evidence. Please present your case by describing it or providing a link to the media file.',
      },
    ]);
  }, []);

  const handleSendMessage = async () => {
    if (input.trim()) {
      const newMessages = [...messages, {role: 'user', content: input}];
      setMessages(newMessages);
      setIsLoading(true);

      try {
        const response = await fetch('/api/ufo-agent', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({userMessage: input}),
        });

        const {agentResponse} = await response.json();

        setMessages(prevMessages => [
          ...prevMessages,
          {role: 'agent', content: agentResponse},
        ]);
      } catch (error) {
        console.error('Error sending message:', error);
        setMessages(prevMessages => [
          ...prevMessages,
          {
            role: 'agent',
            content:
              'An error occurred while processing your request. Please try again later.',
          },
        ]);
      } finally {
        setIsLoading(false);
      }

      setInput('');
    }
  };

  return (
    <div className="flex h-screen w-full items-center justify-center bg-gray-100 dark:bg-gray-900">
      <Card className="w-full max-w-2xl h-[700px] flex flex-col">
        <CardHeader>
          <CardTitle>UFO Analysis Agent</CardTitle>
        </CardHeader>
        <CardContent className="flex-grow overflow-hidden">
          <ScrollArea className="h-full pr-4">
            <div className="flex flex-col gap-4">
              {messages.map((message, index) => (
                <div
                  key={index}
                  className={`flex items-start gap-3 ${
                    message.role === 'user' ? 'justify-end' : ''
                  }`}
                >
                  {message.role === 'agent' && (
                    <div className="w-8 h-8 rounded-full bg-gray-700 flex items-center justify-center text-white flex-shrink-0">
                      🛸
                    </div>
                  )}
                  <div
                    className={`whitespace-pre-wrap rounded-lg p-3 text-sm ${
                      message.role === 'user'
                        ? 'bg-blue-500 text-white'
                        : 'bg-gray-200 dark:bg-gray-800'
                    }`}
                  >
                    <p>{message.content}</p>
                  </div>
                  {message.role === 'user' && (
                    <div className="w-8 h-8 rounded-full bg-gray-400 flex items-center justify-center text-white flex-shrink-0">
                      👤
                    </div>
                  )}
                </div>
              ))}
              {isLoading && (
                <div className="flex items-start gap-3">
                  <div className="w-8 h-8 rounded-full bg-gray-700 flex items-center justify-center text-white flex-shrink-0">
                    🛸
                  </div>
                  <div className="whitespace-pre-wrap rounded-lg p-3 text-sm bg-gray-200 dark:bg-gray-800">
                    <p>Analyzing...</p>
                  </div>
                </div>
              )}
            </div>
          </ScrollArea>
        </CardContent>
        <CardFooter>
          <div className="flex w-full items-center space-x-2">
            <Input
              type="text"
              placeholder="Describe the case or paste a link to the evidence..."
              value={input}
              onChange={e => setInput(e.target.value)}
              onKeyDown={e => {
                if (e.key === 'Enter' && !isLoading) {
                  handleSendMessage();
                }
              }}
              disabled={isLoading}
            />
            <Button onClick={handleSendMessage} disabled={isLoading}>
              {isLoading ? 'Sending...' : 'Send'}
            </Button>
          </div>
        </CardFooter>
      </Card>
    </div>
  );
}
