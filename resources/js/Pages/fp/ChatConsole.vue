<script setup>
import { Head } from '@inertiajs/vue3';
import { onBeforeUnmount, onMounted, defineAsyncComponent, ref } from 'vue';

const FPChatWrapper = defineAsyncComponent(() => import('@/Components/FPChatWrapper.vue'));

const props = defineProps({
  healthCoaches: {
    type: Array,
    default: () => [],
  },
});

// Default to dietitian (id 333) when available, else coach id 4
const selectedCoachId = ref('');
if (props.healthCoaches?.some((c) => c.id === '333')) {
  selectedCoachId.value = '333';
} else if (props.healthCoaches?.some((c) => c.id === '4')) {
  selectedCoachId.value = '4';
}

onMounted(() => {
  document.body.style.overflow = 'hidden';
  document.body.style.height = '100vh';
  document.body.style.backgroundColor = '#fff';

  document.documentElement.style.overflow = 'hidden';
  document.documentElement.style.height = '100vh';
  document.documentElement.style.backgroundColor = '#fff';
});

onBeforeUnmount(() => {
  document.body.style.removeProperty('overflow');
  document.body.style.removeProperty('height');
  document.body.style.removeProperty('background-color');

  document.documentElement.style.removeProperty('overflow');
  document.documentElement.style.removeProperty('height');
  document.documentElement.style.removeProperty('background-color');
});
</script>

<template>
  <Head title="FP Chat" />
  <div class="chat-console-root">
    <div class="chat-toolbar">
      <label class="chat-label" for="coach-select">Health Coach</label>
      <select
        id="coach-select"
        v-model="selectedCoachId"
        class="chat-select"
      >
        <option value="" disabled>Select a health coach</option>
        <option
          v-for="coach in props.healthCoaches"
          :key="coach.id"
          :value="coach.id"
        >
          {{ coach.name }} ({{ coach.id }})
        </option>
      </select>
    </div>

    <div class="chat-panel">
      <div v-if="!selectedCoachId" class="chat-placeholder">
        Select a health coach to start the chat.
      </div>
      <FPChatWrapper
        v-else
        :user-id="selectedCoachId"
        :detail-fallback-user-id="null"
        :enable-detail-slot="false"
      />
    </div>
  </div>
</template>

<style scoped>
.chat-console-root {
  min-height: 100vh;
  height: 100vh;
  display: flex;
  flex-direction: column;
  background: #fff;
}

.chat-toolbar {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 12px 16px;
  border-bottom: 1px solid #e5e7eb;
  background: #f9fafb;
}

.chat-label {
  font-size: 14px;
  color: #374151;
  font-weight: 600;
}

.chat-select {
  min-width: 280px;
  padding: 8px 10px;
  border-radius: 8px;
  border: 1px solid #d1d5db;
  background: #fff;
  color: #111827;
}

.chat-panel {
  flex: 1;
  display: flex;
  flex-direction: column;
  min-height: 0;
  overflow: hidden;
}

/* React mounts inside this shell — must flex-grow so height: % resolves for the scaled inner wrapper */
.chat-panel :deep(.fp-chat-wrapper-container) {
  flex: 1;
  min-height: 0;
  min-width: 0;
  display: flex;
  flex-direction: column;
}

.chat-panel :deep(.fp-chat-wrapper) {
  min-height: 0;
  min-width: 0;
  overflow: hidden;
}

.chat-placeholder {
  flex: 1;
  display: flex;
  align-items: center;
  justify-content: center;
  color: #6b7280;
  font-size: 14px;
}
</style>
