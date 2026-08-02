import React, { useState, useRef, useEffect } from 'react';
import { Send, X, Paperclip, Image as ImageIcon, Smile } from 'lucide-react';
import { ChatMessage, User } from '../types';

interface ChatBoxProps {
  messages: ChatMessage[];
  currentUser: User;
  typingUsers: string[];
  isOpen: boolean;
  onClose: () => void;
  onSendMessage: (text: string, fileAttachment?: any) => void;
  onSendTypingStatus: (isTyping: boolean) => void;
}

const QUICK_EMOJIS = ['👍', '❤️', '🔥', '🎉', '😂', '👏'];

export const ChatBox: React.FC<ChatBoxProps> = ({
  messages,
  currentUser,
  typingUsers,
  isOpen,
  onClose,
  onSendMessage,
  onSendTypingStatus,
}) => {
  const [inputText, setInputText] = useState('');
  const [fileAttachment, setFileAttachment] = useState<{ name: string; type: 'image' | 'file'; url: string } | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const typingTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Auto scroll to bottom on new messages
  useEffect(() => {
    if (isOpen) {
      messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages, isOpen]);

  if (!isOpen) return null;

  const handleTextChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    setInputText(val);

    onSendTypingStatus(true);
    if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
    typingTimeoutRef.current = setTimeout(() => {
      onSendTypingStatus(false);
    }, 1500);
  };

  const handleSend = (e: React.FormEvent) => {
    e.preventDefault();
    if (!inputText.trim() && !fileAttachment) return;

    onSendMessage(inputText.trim(), fileAttachment || undefined);
    setInputText('');
    setFileAttachment(null);
    onSendTypingStatus(false);
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      const url = event.target?.result as string;
      const isImage = file.type.startsWith('image/');
      setFileAttachment({
        name: file.name,
        type: isImage ? 'image' : 'file',
        url,
      });
    };
    reader.readAsDataURL(file);
  };

  return (
    <div id="chat-drawer-panel" className="absolute inset-0 md:relative md:inset-auto w-full md:w-96 bg-white border-l border-gray-200 flex flex-col h-full z-40 shrink-0 shadow-xl">
      {/* Header */}
      <div className="p-4 border-b border-gray-200 flex items-center justify-between bg-white">
        <div>
          <h2 className="font-bold text-gray-900 text-sm">Room Chat</h2>
          <p className="text-xs text-gray-500">Synced in real-time</p>
        </div>
        <button
          onClick={onClose}
          id="close-chat-btn"
          className="p-1.5 rounded-lg hover:bg-gray-100 text-gray-400 hover:text-gray-600 transition-colors"
        >
          <X className="w-4 h-4" />
        </button>
      </div>

      {/* Message List */}
      <div className="flex-1 p-4 overflow-y-auto space-y-3">
        {messages.map((msg) => {
          if (msg.isSystem) {
            return (
              <div key={msg.id} className="text-center my-2">
                <span className="text-[11px] font-medium bg-gray-100 text-gray-500 px-3 py-1 rounded-full border border-gray-200 inline-block">
                  {msg.text}
                </span>
              </div>
            );
          }

          const isSelf = msg.senderId === currentUser.id;

          return (
            <div
              key={msg.id}
              className={`flex flex-col ${isSelf ? 'items-end' : 'items-start'}`}
            >
              <div className="flex items-center gap-1.5 mb-1 text-[11px] text-gray-500 font-medium">
                <span className="font-bold text-gray-700">
                  {msg.senderName}
                </span>
                <span>•</span>
                <span>{new Date(msg.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
              </div>

              <div
                className={`max-w-[85%] rounded-2xl px-4 py-2.5 text-sm shadow-sm ${
                  isSelf
                    ? 'bg-indigo-600 text-white rounded-tr-none'
                    : 'bg-gray-100 text-gray-800 rounded-tl-none border border-gray-200'
                }`}
              >
                {msg.text && <p className="leading-relaxed break-words">{msg.text}</p>}

                {msg.fileAttachment && (
                  <div className="mt-2">
                    {msg.fileAttachment.type === 'image' ? (
                      <img
                        src={msg.fileAttachment.url}
                        alt={msg.fileAttachment.name}
                        className="max-w-full rounded-xl max-h-48 object-cover border border-gray-200"
                      />
                    ) : (
                      <a
                        href={msg.fileAttachment.url}
                        download={msg.fileAttachment.name}
                        className="flex items-center gap-2 bg-black/10 p-2 rounded-lg text-xs underline font-mono"
                      >
                        <Paperclip className="w-3.5 h-3.5" />
                        <span className="truncate">{msg.fileAttachment.name}</span>
                      </a>
                    )}
                  </div>
                )}
              </div>
            </div>
          );
        })}
        <div ref={messagesEndRef} />
      </div>

      {/* Typing Status Indicator */}
      {typingUsers.length > 0 && (
        <div className="px-4 py-1.5 text-xs text-indigo-600 italic bg-indigo-50 border-t border-indigo-100 font-medium">
          {typingUsers.join(', ')} {typingUsers.length === 1 ? 'is' : 'are'} typing...
        </div>
      )}

      {/* Attachment Preview */}
      {fileAttachment && (
        <div className="p-2.5 px-4 bg-gray-50 border-t border-gray-200 flex items-center justify-between text-xs">
          <div className="flex items-center gap-2 text-indigo-600 truncate font-medium">
            {fileAttachment.type === 'image' ? <ImageIcon className="w-4 h-4 shrink-0" /> : <Paperclip className="w-4 h-4 shrink-0" />}
            <span className="truncate">{fileAttachment.name}</span>
          </div>
          <button onClick={() => setFileAttachment(null)} className="text-gray-400 hover:text-gray-600">
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      )}

      {/* Quick Emoji Bar */}
      <div className="px-3 py-1.5 bg-gray-50 border-t border-gray-200 flex items-center justify-around">
        {QUICK_EMOJIS.map((emoji) => (
          <button
            key={emoji}
            type="button"
            onClick={() => setInputText((prev) => prev + emoji)}
            className="text-lg hover:scale-125 transition-transform p-1 rounded-lg hover:bg-gray-200"
          >
            {emoji}
          </button>
        ))}
      </div>

      {/* Message Input Form */}
      <form onSubmit={handleSend} className="p-3 bg-white border-t border-gray-200 flex items-center gap-2">
        <input
          type="file"
          ref={fileInputRef}
          onChange={handleFileUpload}
          className="hidden"
          accept="image/*,application/pdf,text/plain"
        />

        <button
          type="button"
          onClick={() => fileInputRef.current?.click()}
          id="chat-attach-btn"
          className="p-2.5 rounded-full bg-gray-100 hover:bg-gray-200 text-gray-600 transition-colors border border-gray-200"
          title="Attach Image or File"
        >
          <Paperclip className="w-4 h-4" />
        </button>

        <input
          type="text"
          id="chat-input-field"
          value={inputText}
          onChange={handleTextChange}
          placeholder="Type a message..."
          className="flex-1 bg-gray-50 border border-gray-200 rounded-full px-4 py-2 text-sm text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-indigo-500"
        />

        <button
          type="submit"
          id="chat-send-btn"
          className="p-2.5 rounded-full bg-indigo-600 hover:bg-indigo-700 text-white transition-all shadow-sm disabled:opacity-40"
          disabled={!inputText.trim() && !fileAttachment}
        >
          <Send className="w-4 h-4" />
        </button>
      </form>
    </div>
  );
};
