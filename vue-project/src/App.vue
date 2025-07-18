<script setup>
import { computed, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { useChatStore } from './stores/chat'
import { useSettingsStore } from './stores/settings'

const router = useRouter()
const chatStore = useChatStore()
const settingsStore = useSettingsStore()

const latestChatId = computed(() => {
  if (chatStore.conversations.length > 0) {
    return chatStore.conversations[0].id
  }
  return null
})

function goHome() {
  router.push('/')
}

onMounted(() => {
  // 初始化设置
  settingsStore.init()
})
</script>

<template>
  <div class="app-container">
    <header class="app-header glass-effect">
      <div class="logo" @click="goHome">
        <span class="logo-icon">🤖</span>
        <span class="logo-text">AI聊天助手</span>
      </div>
      <nav class="main-nav">
        <router-link to="/" class="nav-link">首页</router-link>
        <router-link :to="{ name: 'Chat', params: { id: latestChatId } }" class="nav-link">聊天</router-link>
        <router-link to="/settings" class="nav-link">设置</router-link>
      </nav>
    </header>
    
    <main class="app-main">
      <router-view />
    </main>
    
    <!-- 背景装饰元素 -->
    <div class="bg-decoration bg-circle-1"></div>
    <div class="bg-decoration bg-circle-2"></div>
    <div class="bg-decoration bg-circle-3"></div>
  </div>
</template>

<style>
/* 全局样式 */
html, body {
  height: 100%;
  margin: 0;
  padding: 0;
  overflow: hidden;
}

#app {
  height: 100%;
}

/* 亮色主题变量 */
.light-theme {
  --bg-main: #f5f5f502;
  --bg-panel: rgba(255, 255, 255, 0.7);
  --bg-glass: rgba(255, 255, 255, 0.5);
  --bg-glass-hover: rgba(255, 255, 255, 0.7);
  --bg-highlight: #e4d3ff;
  
  --text-primary: #333333;
  --text-secondary: #666666;
  --text-accent: #333333;
  --text-dimmed: #888888;
  
  --border-color: rgba(0, 0, 0, 0.1);
  --card-bg: var(--bg-glass);
  --card-hover-bg: var(--bg-glass-hover);
  --glass-border: 1px solid rgba(255, 255, 255, 0.3);
}

/* 应用容器 */
.app-container {
  display: flex;
  flex-direction: column;
  height: 100%;
  background-color: var(--bg-main);
  color: var(--text-primary);
  position: relative;
  overflow: hidden;
  z-index: 1;
}

/* 背景装饰 */
.bg-decoration {
  position: absolute;
  border-radius: 50%;
  filter: blur(60px);
  z-index: -1;
  opacity: 0.5;
}

.bg-circle-1 {
  width: 300px;
  height: 300px;
  background-color: var(--accent-blue);
  top: -100px;
  right: -100px;
  animation: float 20s ease-in-out infinite;
}

.bg-circle-2 {
  width: 400px;
  height: 400px;
  background-color: var(--accent-purple);
  bottom: -150px;
  left: -150px;
  animation: float 25s ease-in-out infinite reverse;
}

.bg-circle-3 {
  width: 200px;
  height: 200px;
  background-color: var(--accent-pink);
  top: 40%;
  right: 30%;
  animation: float 15s ease-in-out infinite;
}

@keyframes float {
  0% {
    transform: translate(0, 0);
  }
  50% {
    transform: translate(30px, 20px);
  }
  100% {
    transform: translate(0, 0);
  }
}

/* 头部样式 */
.app-header {
  background-color: var(--bg-panel);
  border-bottom: var(--glass-border);
  padding: 0 24px;
  height: 60px;
  display: flex;
  align-items: center;
  justify-content: space-between;
  position: relative;
  z-index: 10;
}

.logo {
  display: flex;
  align-items: center;
  cursor: pointer;
}

.logo-icon {
  font-size: 24px;
  margin-right: 8px;
}

.logo-text {
  font-weight: var(--font-weight-heading);
  font-size: 18px;
}

.main-nav {
  display: flex;
  gap: 20px;
}

.nav-link {
  color: var(--text-primary);
  text-decoration: none;
  font-weight: var(--font-weight-subheading);
  padding: 6px 0;
  position: relative;
  transition: all 0.3s ease;
}

.nav-link:hover {
  color: var(--accent-blue);
}

.nav-link.router-link-active {
  color: var(--accent-blue);
}

.nav-link.router-link-active:after {
  content: '';
  position: absolute;
  bottom: 0;
  left: 0;
  width: 100%;
  height: 2px;
  background-color: var(--accent-blue);
}

/* 主内容区域 */
.app-main {
  flex: 1;
  overflow: auto;
  position: relative;
  z-index: 2;
}

/* 响应式设计 */
@media (max-width: 768px) {
  .app-header {
    padding: 0 16px;
  }
  
  .logo-text {
    display: none;
  }
  
  .main-nav {
    gap: 12px;
  }
  
  .bg-decoration {
    opacity: 0.3;
  }
}
</style>
