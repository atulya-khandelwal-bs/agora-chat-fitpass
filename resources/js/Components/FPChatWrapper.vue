<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, ref, useSlots, watch } from 'vue';

const props = defineProps({
  userId: {
    type: [String, Number],
    required: true,
  },
  onLogout: {
    type: Function,
    default: undefined,
  },
  detailFallbackUserId: {
    type: [String, Number],
    default: null,
  },
  enableDetailSlot: {
    type: Boolean,
    default: true,
  },
});

const slots = useSlots();
const hasDetailsSlot = computed(() => Boolean(slots.details));

const mountPoint = ref<HTMLElement | null>(null);
const userDetailsTarget = ref<Element | null>(null);
const activeConversationUserId = ref<string | null>(null);

const fallbackId = computed(() => {
  if (props.detailFallbackUserId) {
    return String(props.detailFallbackUserId);
  }
  return null;
});
const panelUserId = computed(() => activeConversationUserId.value || fallbackId.value);

let destroy: (() => void) | undefined;
let observer: MutationObserver | undefined;
let mountFPChatFn: ((element: HTMLElement, options: any) => () => void) | null = null;
const isChatLoading = ref(false);
const chatLoadError = ref(false);

// Lazy load mountFPChat only when component is mounted
onMounted(async () => {
  try {
    isChatLoading.value = true;
    const { mountFPChat } = await import('@/react/mountFPChat');
    mountFPChatFn = mountFPChat;
    isChatLoading.value = false;
    
    // Now initialize the chat if mountPoint is ready
    if (mountPoint.value && mountFPChatFn) {
      renderChat();
    }
  } catch (error) {
    console.error('Failed to load chat module:', error);
    isChatLoading.value = false;
    chatLoadError.value = true;
  }
});

const findUserDetailsTarget = () => {
  if (!mountPoint.value) {
    userDetailsTarget.value = null;
    return;
  }
  const target = mountPoint.value.querySelector('.user-details-panel-wrapper');
  if (target) {
    userDetailsTarget.value = target;
  }
};

const observeForPanelTarget = () => {
  if (!props.enableDetailSlot || !mountPoint.value) {
    return;
  }

  observer?.disconnect();
  observer = new MutationObserver(() => {
    findUserDetailsTarget();
  });
  observer.observe(mountPoint.value, { childList: true, subtree: true });
};

const renderChat = () => {
  if (!mountPoint.value || !mountFPChatFn) return;
  destroy?.();
  destroy = mountFPChatFn(mountPoint.value, {
    userId: String(props.userId),
    onLogout: props.onLogout,
    onConversationChange: (userId) => {
      activeConversationUserId.value = userId ? String(userId) : null;
    },
  });
  if (props.enableDetailSlot) {
    findUserDetailsTarget();
    observeForPanelTarget();
  }
};

// Watch for mountPoint changes after chat module is loaded
watch(mountPoint, (newValue) => {
  if (newValue && mountFPChatFn && !destroy) {
    renderChat();
  }
});

watch(
  () => props.userId,
  () => {
    if (mountPoint.value && mountFPChatFn) {
      renderChat();
    }
  },
);

onBeforeUnmount(() => {
  destroy?.();
  observer?.disconnect();
  
  // Safety net: ensure body/html styles are reset when component unmounts
  // This acts as a backup in case ChatConsole.vue cleanup doesn't run properly
  if (document.body.style.overflow === 'hidden') {
    document.body.style.removeProperty('overflow');
    document.body.style.removeProperty('height');
    document.body.style.removeProperty('background-color');
  }
  
  if (document.documentElement.style.overflow === 'hidden') {
    document.documentElement.style.removeProperty('overflow');
    document.documentElement.style.removeProperty('height');
    document.documentElement.style.removeProperty('background-color');
  }
});
</script>

<template>
  <div class="fp-chat-wrapper-container">
    <div v-if="isChatLoading" class="fp-chat-loading">
      <div class="text-muted small py-3">Loading chat...</div>
    </div>
    <div v-else-if="chatLoadError" class="fp-chat-error">
      <div class="text-danger small py-3">Failed to load chat. Please refresh the page.</div>
    </div>
    <div v-else ref="mountPoint" class="fp-chat-wrapper"></div>
    <teleport
      v-if="enableDetailSlot && userDetailsTarget && hasDetailsSlot"
      :to="userDetailsTarget"
    >
      <slot
        name="details"
        :panel-user-id="panelUserId"
        :conversation-user-id="activeConversationUserId"
      />
    </teleport>
  </div>
</template>

<style scoped>
/* ~67% browser-zoom density at 100% zoom: logical size is inflated then scaled down */
.fp-chat-wrapper-container {
  width: 100%;
  flex: 1;
  min-height: 0;
  overflow: hidden;
  display: flex;
  flex-direction: column;
}

.fp-chat-wrapper {
  --fp-ui-scale: 0.67;
  transform: scale(var(--fp-ui-scale));
  transform-origin: top left;
  width: calc(100% / var(--fp-ui-scale));
  height: calc(100% / var(--fp-ui-scale));
  flex-shrink: 0;
  background: #0b111f;
}

.fp-chat-loading {
  flex: 1;
  min-height: 0;
  width: 100%;
  display: flex;
  align-items: center;
  justify-content: center;
  background: #0b111f;
  color: #fff;
}

.fp-chat-error {
  flex: 1;
  min-height: 0;
  width: 100%;
  display: flex;
  align-items: center;
  justify-content: center;
  background: #0b111f;
  color: #fff;
}
</style>
