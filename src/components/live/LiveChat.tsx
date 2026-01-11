import { useState, useEffect, useRef } from 'react';
import { Send, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { api } from '@/lib/api';
import { useAuth } from '@/contexts/AuthContext';
import { getSocket } from '@/lib/socket';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import type { Socket } from 'socket.io-client';

interface ChatMessage {
  id: string;
  message: string;
  timestamp: string;
  user: {
    id: string;
    username: string;
    displayName?: string;
    avatar?: string;
  } | null;
}

interface LiveChatProps {
  streamId: string;
  chatEnabled?: boolean;
  className?: string;
}

export function LiveChat({ streamId, chatEnabled = true, className }: LiveChatProps) {
  const { user } = useAuth();
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [sending, setSending] = useState(false);
  const [loading, setLoading] = useState(true);
  const [connected, setConnected] = useState(false);
  const scrollAreaRef = useRef<HTMLDivElement>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const socketRef = useRef<Socket | null>(null);

  // Initialize WebSocket connection
  useEffect(() => {
    if (!chatEnabled) {
      setLoading(false);
      return;
    }

    // Get token from localStorage
    const token = localStorage.getItem('accessToken');
    const socket = getSocket(token || undefined);
    socketRef.current = socket;

    // Join stream room
    socket.emit('join-stream', { streamId });

    socket.on('joined-stream', () => {
      setConnected(true);
      setLoading(false);
      console.log('Joined stream chat:', streamId);
    });

    // Listen for new messages
    socket.on('new-message', (messageData: ChatMessage) => {
      setMessages(prev => {
        // Avoid duplicates
        if (prev.some(msg => msg.id === messageData.id)) {
          return prev;
        }
        return [...prev, messageData];
      });
    });

    // Listen for errors
    socket.on('error', (error: { message: string }) => {
      console.error('Socket error:', error);
      toast.error(error.message || 'Connection error');
      setLoading(false);
    });

    // Fetch initial messages
    const fetchInitialMessages = async () => {
      try {
        const response = await api.live.getChat(streamId, 50);
        if (response.success && response.data) {
          setMessages((response.data as any).messages || []);
        }
      } catch (error) {
        console.error('Error fetching initial messages:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchInitialMessages();

    // Cleanup on unmount
    return () => {
      if (socketRef.current) {
        socketRef.current.emit('leave-stream', { streamId });
        socketRef.current.off('joined-stream');
        socketRef.current.off('new-message');
        socketRef.current.off('error');
      }
    };
  }, [streamId, chatEnabled]);

  // Auto-scroll to bottom when new messages arrive
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const sendMessage = async () => {
    if (!newMessage.trim() || !user) {
      if (!user) {
        toast.error('Please sign in to send messages');
      }
      return;
    }

    if (newMessage.length > 500) {
      toast.error('Message is too long (max 500 characters)');
      return;
    }

    if (!socketRef.current || !connected) {
      toast.error('Not connected to chat');
      return;
    }

    try {
      setSending(true);
      
      // Send message via WebSocket
      socketRef.current.emit('send-message', {
        streamId,
        message: newMessage.trim(),
      });

      // Optimistically add message (will be confirmed by server)
      // The server will broadcast it back, so we'll see it in the new-message event
      setNewMessage('');
      
      // Scroll to bottom
      setTimeout(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
      }, 100);
    } catch (error: any) {
      console.error('Error sending message:', error);
      toast.error(error.message || 'Failed to send message');
    } finally {
      setSending(false);
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  if (!chatEnabled) {
    return (
      <div className={cn("p-4 text-center text-muted-foreground", className)}>
        Chat is disabled for this stream
      </div>
    );
  }

  return (
    <div className={cn("flex flex-col h-full", className)}>
      <ScrollArea className="flex-1 p-4" ref={scrollAreaRef}>
        {loading ? (
          <div className="flex items-center justify-center py-8">
            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
          </div>
        ) : messages.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground text-sm">
            No messages yet. Be the first to chat!
          </div>
        ) : (
          <div className="space-y-3">
            {messages.map((msg) => (
              <div key={msg.id} className="flex items-start gap-2 group">
                <Avatar className="h-8 w-8 flex-shrink-0">
                  <AvatarImage src={msg.user?.avatar} />
                  <AvatarFallback className="text-xs">
                    {msg.user?.displayName?.[0] || msg.user?.username?.[0] || '?'}
                  </AvatarFallback>
                </Avatar>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-sm font-medium">
                      {msg.user?.displayName || msg.user?.username || 'Anonymous'}
                    </span>
                    <span className="text-xs text-muted-foreground">
                      {new Date(msg.timestamp).toLocaleTimeString([], { 
                        hour: '2-digit', 
                        minute: '2-digit' 
                      })}
                    </span>
                  </div>
                  <p className="text-sm break-words">{msg.message}</p>
                </div>
              </div>
            ))}
            <div ref={messagesEndRef} />
          </div>
        )}
      </ScrollArea>

      {user ? (
        <div className="p-4 border-t">
          <div className="flex gap-2">
            <Input
              value={newMessage}
              onChange={(e) => setNewMessage(e.target.value)}
              onKeyPress={handleKeyPress}
              placeholder={connected ? "Type a message..." : "Connecting..."}
              maxLength={500}
              disabled={sending || !connected}
              className="flex-1"
            />
            <Button
              onClick={sendMessage}
              disabled={!newMessage.trim() || sending || !connected}
              size="icon"
            >
              {sending ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Send className="h-4 w-4" />
              )}
            </Button>
          </div>
          <p className="text-xs text-muted-foreground mt-1">
            {connected ? 'Press Enter to send' : 'Connecting to chat...'}
          </p>
        </div>
      ) : (
        <div className="p-4 border-t text-center">
          <p className="text-sm text-muted-foreground">
            <a href="/login" className="text-primary hover:underline">
              Sign in
            </a> to join the chat
          </p>
        </div>
      )}
    </div>
  );
}
