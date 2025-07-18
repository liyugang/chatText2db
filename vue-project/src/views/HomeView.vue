<template>
  <div class="home-container">
    <div class="welcome-section">
      <h1>AI聊天助手</h1>
      <p class="subtitle">基于先进的人工智能模型，为您提供智能对话服务</p>
      
      <div class="action-buttons">
        <button class="primary-button" @click="startNewChat">开始新对话</button>
        <button class="secondary-button" @click="goToSettings">设置</button>
      </div>
    </div>
    
    <div class="features-section">
      <div class="feature-card">
        <div class="feature-icon">🚀</div>
        <h3>高效对话</h3>
        <p>快速响应，智能理解您的需求</p>
      </div>
      
      <div class="feature-card">
        <div class="feature-icon">💡</div>
        <h3>知识丰富</h3>
        <p>拥有广泛的知识库，回答各类问题</p>
      </div>
      
      <div class="feature-card">
        <div class="feature-icon">🔒</div>
        <h3>安全可靠</h3>
        <p>保护您的隐私，数据安全有保障</p>
      </div>
      
      <div class="feature-card">
        <div class="feature-icon">🎨</div>
        <h3>个性化体验</h3>
        <p>根据您的喜好定制对话体验</p>
      </div>
    </div>
  </div>
</template>

<script setup>
import { useRouter } from 'vue-router'
import { useChatStore } from '../stores/chat'

const router = useRouter()
const chatStore = useChatStore()

function startNewChat() {
  const newChatId = chatStore.createConversation()
  router.push({ name: 'Chat', params: { id: newChatId } })
}

function goToSettings() {
  router.push({ name: 'Settings' })
}
</script>

<style scoped>
.home-container {
  max-width: 1000px;
  margin: 0 auto;
  padding: var(--padding);
  display: flex;
  flex-direction: column;
  gap: 60px;
}

.welcome-section {
  text-align: center;
  padding: 60px 0;
  position: relative;
  z-index: 2;
}

h1 {
  font-size: 48px;
  margin-bottom: 16px;
  font-weight: var(--font-weight-heading);
  text-shadow: 0 2px 10px rgba(0, 0, 0, 0.1);
}

.subtitle {
  font-size: 18px;
  color: var(--text-secondary);
  margin-bottom: 40px;
}

.action-buttons {
  display: flex;
  justify-content: center;
  gap: 16px;
}

.primary-button {
  background-color: var(--accent-blue);
  color: var(--text-primary);
  padding: 12px 24px;
  font-size: 16px;
  border: var(--glass-border);
  border-radius: var(--border-radius-glass);
  backdrop-filter: blur(var(--glass-blur));
  -webkit-backdrop-filter: blur(var(--glass-blur));
  transition: all 0.3s ease;
}

.primary-button:hover {
  transform: translateY(-5px);
  box-shadow: 0 10px 20px rgba(0, 0, 0, 0.15);
}

.secondary-button {
  background-color: rgba(255, 255, 255, 0.1);
  color: var(--text-primary);
  padding: 12px 24px;
  font-size: 16px;
  border: var(--glass-border);
  border-radius: var(--border-radius-glass);
  backdrop-filter: blur(var(--glass-blur));
  -webkit-backdrop-filter: blur(var(--glass-blur));
  transition: all 0.3s ease;
}

.secondary-button:hover {
  transform: translateY(-5px);
  box-shadow: 0 10px 20px rgba(0, 0, 0, 0.15);
}

.features-section {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(220px, 1fr));
  gap: 24px;
  position: relative;
  z-index: 2;
}

.feature-card {
  background-color: var(--bg-glass);
  border: var(--glass-border);
  padding: 24px;
  text-align: center;
  transition: all 0.3s ease;
  border-radius: var(--border-radius-glass);
  backdrop-filter: blur(var(--glass-blur));
  -webkit-backdrop-filter: blur(var(--glass-blur));
}

.feature-card:hover {
  background-color: var(--bg-glass-hover);
  transform: translateY(-10px);
  box-shadow: 0 15px 30px rgba(0, 0, 0, 0.1);
}

.feature-icon {
  font-size: 36px;
  margin-bottom: 16px;
}

.feature-card h3 {
  margin-bottom: 8px;
  font-weight: var(--font-weight-subheading);
}

.feature-card p {
  color: var(--text-secondary);
  font-size: 14px;
}

@media (max-width: 768px) {
  .home-container {
    gap: 40px;
  }
  
  .welcome-section {
    padding: 40px 0;
  }
  
  h1 {
    font-size: 36px;
  }
  
  .subtitle {
    font-size: 16px;
  }
  
  .features-section {
    grid-template-columns: 1fr;
  }
}
</style> 