/**
 * Application Configuration
 *
 * For production, use environment variables to override these values.
 * Create a .env file in the root directory with:
 *
 * Required:
 * - VITE_AGORA_APP_KEY=your_chat_app_key (for Agora Chat SDK)
 * - VITE_RTC_APP_ID=your_rtc_app_id (for Agora RTC SDK - separate from Chat App Key)
 * - VITE_BACKEND_API_URL=your_backend_api_url (base URL only, no routes)
 */

interface Config {
  agora: {
    appKey: string;
    rtcAppId: string;
  };
  api: {
    backend: string;
    generateToken: string;
    generatePresignUrl: string;
    registerUserEndpoint: string;
    fetchCoaches: string;
    fetchConversations: string;
    fetchMessages: string;
    summary: string;
    latestSummary: string;
    generateChatSummary: string;
    getChatSummaries: string;
    customMessage: string;
    getDietitianToken: string;
    updateTextMessage: string;
  };
  defaults: {
    avatar: string;
    userAvatar: string;
  };
  token: {
    expireInSecs: number;
  };
  upload: {
    expiresInMinutes: number;
  };
  chat: {
    pageSize: number;
    // Multi-session support: true = allow multiple browsers, false = single session only
    allowMultipleSessions: boolean;
  };
  rtcToken: {
    apiUrl: string;
  };
}

const DEFAULTS = {
  agoraAppKey: '611360328#1609888',
  rtcAppId: "8600b5dce7f14f72bd115bf93ff09ffd",
  backendApiUrl: "https://services.fitpass.dev",
};

const config: Config = {
  // Agora Chat Configuration
  agora: {
    // Chat App Key (for Agora Chat SDK)
    appKey: (import.meta.env.VITE_AGORA_APP_KEY as string) || DEFAULTS.agoraAppKey,

    // RTC App ID (for Agora RTC SDK - separate from Chat App Key)
    rtcAppId: (import.meta.env.VITE_RTC_APP_ID as string) || DEFAULTS.rtcAppId,
  },

  // API Endpoints
  api: {
    // Backend API base URL
    backend:
      (import.meta.env.VITE_BACKEND_API_URL as string) ||
      DEFAULTS.backendApiUrl,

    // Specific API endpoints (constructed from base URL)
    get generateToken(): string {
      return `${this.backend}/api/chat/generate-token`;
    },

    get generatePresignUrl(): string {
      return `${this.backend}/api/s3/generate-presign-url`;
    },

    get registerUserEndpoint(): string {
      return `${this.backend}/api/chat/register-user`;
    },

    get fetchCoaches(): string {
      // return `${this.backend}/api/fetch-coaches;
      return `${this.backend}/api/demo/fetch-coaches`;
    },

    get fetchConversations(): string {
      return `${this.backend}/api/chat/fetch-conversations`;
      // return `${this.backend}/api/fetch-conversations`;
    },

    get fetchMessages(): string {
      return `${this.backend}/api/chat/fetch-messages`;
    },

    get summary(): string {
      return `${this.backend}/api/v1/summary`;
    },
    get latestSummary(): string {
      return `${this.backend}/api/v1/summaries/latest`;
    },
    get generateChatSummary(): string {
      return `${this.backend}/api/chat/generate-chat-summary`;
    },
    get getChatSummaries(): string {
      return `${this.backend}/api/chat/get-chat-summaries`;
    },

    get customMessage(): string {
      return `${this.backend}/api/chat/send-custom-message-to-group`;
    },

    get getDietitianToken(): string {
      return `${this.backend}/api/chat/getDietitianToken`;
    },

    get updateTextMessage(): string {
      return `${this.backend}/api/chat/update-text-message`;
    },
  },

  // Default Images/Avatars
  defaults: {
    avatar:
      "https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=40&h=40&fit=crop&crop=face",
    userAvatar:
      "https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=40&h=40&fit=crop&crop=face",
  },

  // Token Configuration
  token: {
    expireInSecs: 3600, // 1 hour
  },

  // S3 Upload Configuration
  upload: {
    expiresInMinutes: 15,
  },

  // Chat Configuration
  chat: {
    pageSize: 50, // Number of messages to fetch per page
    // Multi-session support: true = allow multiple browsers, false = single session only
    // Set to true for development (allows same user logged in from multiple browsers)
    // Set to false for production (single session - new login kicks out previous)
    allowMultipleSessions: true, // Change to false for production
  },

  // RTC Token API (constructed from backend base URL)
  rtcToken: {
    get apiUrl(): string {
      return `${config.api.backend}/api/rtc/generate-token`;
    },
  },
};

export default config;
