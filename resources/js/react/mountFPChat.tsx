import React from 'react';
import ReactDOM from 'react-dom/client';
import FPChatApp from '@/fp/fp-chat/FPChatApp';

type MountOptions = {
  userId: string;
  onLogout?: () => void;
  onConversationChange?: (userId: string | null) => void;
};

export const mountFPChat = (element: HTMLElement, options: MountOptions) => {
  const root = ReactDOM.createRoot(element);

  root.render(
    <FPChatApp
      userId={options.userId}
      onLogout={options.onLogout}
      onConversationChange={options.onConversationChange}
    />
  );

  return () => {
    root.unmount();
  };
};
