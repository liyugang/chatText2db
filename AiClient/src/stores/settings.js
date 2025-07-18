import { defineStore } from 'pinia'
import { ref } from 'vue'
import { mcpConfigApi, settingsApi } from '../services/api'

export const useSettingsStore = defineStore('settings', () => {
  // 主题设置
  const isDarkMode = ref(true)
  
  // API设置
  const apiKey = ref('')
  const apiEndpoint = ref('http://localhost:3000/api/v1/chat/sse')
  const apiModel = ref('gpt-3.5-turbo')
  
  // 第三方API设置
  const thirdPartyApiKey = ref('')
  const thirdPartyApiEndpoint = ref('')
  const thirdPartyApiModel = ref('deepseek-chat')
  const useThirdPartyApi = ref(false)
  
  // MCP设置
  const mcpConfigs = ref([])
  const activeMcpConfigId = ref(null)
  const isLoadingMcp = ref(false)
  const mcpError = ref(null)
  
  // 界面设置
  const fontSize = ref('normal') // small, normal, large
  const showTimestamp = ref(true)
  
  // 切换暗色/亮色模式
  function toggleDarkMode() {
    isDarkMode.value = !isDarkMode.value
    applyTheme()
  }
  
  // 应用主题
  function applyTheme() {
    // 主题切换
    document.documentElement.classList.toggle('light-theme', !isDarkMode.value)
    document.documentElement.classList.toggle('dark-theme', isDarkMode.value)
    // 字体大小切换
    document.documentElement.classList.remove('font-size-small', 'font-size-normal', 'font-size-large')
    if (fontSize.value === 'small') {
      document.documentElement.classList.add('font-size-small')
    } else if (fontSize.value === 'large') {
      document.documentElement.classList.add('font-size-large')
    } else {
      document.documentElement.classList.add('font-size-normal')
    }
  }
  
  // 更新API设置
  function updateApiSettings(settings) {
    if (settings.apiKey !== undefined) apiKey.value = settings.apiKey
    if (settings.apiEndpoint !== undefined) apiEndpoint.value = settings.apiEndpoint
    if (settings.apiModel !== undefined) apiModel.value = settings.apiModel
    if (settings.thirdPartyApiKey !== undefined) thirdPartyApiKey.value = settings.thirdPartyApiKey
    if (settings.thirdPartyApiEndpoint !== undefined) thirdPartyApiEndpoint.value = settings.thirdPartyApiEndpoint
    if (settings.thirdPartyApiModel !== undefined) thirdPartyApiModel.value = settings.thirdPartyApiModel
    if (settings.useThirdPartyApi !== undefined) useThirdPartyApi.value = settings.useThirdPartyApi
  }
  
  // 更新界面设置
  function updateInterfaceSettings(settings) {
    if (settings.fontSize !== undefined) fontSize.value = settings.fontSize
    if (settings.showTimestamp !== undefined) showTimestamp.value = settings.showTimestamp
  }
  
  // 加载MCP配置
  async function loadMcpConfigs() {
    try {
      isLoadingMcp.value = true
      mcpError.value = null
      
      const response = await mcpConfigApi.getAllConfigs()
      
      if (response.data.status == "success") {
        mcpConfigs.value = response.data.data
        // 加载激活的配置
        await loadActiveMcpConfig()
      }
    } catch (err) {
      console.error('加载MCP配置失败:', err)
      mcpError.value = '加载MCP配置失败'
    } finally {
      isLoadingMcp.value = false
    }
  }
  
  // 加载激活的MCP配置
  async function loadActiveMcpConfig() {
    try {
      const response = await mcpConfigApi.getActiveConfig()
      
      if (response.data.status == "success") {
        activeMcpConfigId.value = response.data.data.id
      } else {
        activeMcpConfigId.value = null
      }
    } catch (err) {
      console.error('加载激活的MCP配置失败:', err)
      activeMcpConfigId.value = null
    }
  }
  
  // 创建MCP配置
  async function createMcpConfig(config) {
    try {
      isLoadingMcp.value = true
      mcpError.value = null
      
      const response = await mcpConfigApi.createConfig(config)
      
      if (response.data.status == "success") {
        // 重新加载配置
        await loadMcpConfigs()
        return response.data.data
      }
      
      return null
    } catch (err) {
      console.error('创建MCP配置失败:', err)
      mcpError.value = '创建MCP配置失败'
      return null
    } finally {
      isLoadingMcp.value = false
    }
  }
  
  // 更新MCP配置
  async function updateMcpConfig(id, config) {
    try {
      isLoadingMcp.value = true
      mcpError.value = null
      
      const response = await mcpConfigApi.updateConfig(id, config)
      
      if (response.data.status == "success") {
        // 重新加载配置
        await loadMcpConfigs()
        return true
      }
      
      return false
    } catch (err) {
      console.error('更新MCP配置失败:', err)
      mcpError.value = '更新MCP配置失败'
      return false
    } finally {
      isLoadingMcp.value = false
    }
  }
  
  // 激活MCP配置
  async function activateMcpConfig(id) {
    try {
      isLoadingMcp.value = true
      mcpError.value = null
      
      const response = await mcpConfigApi.activateConfig(id)
      
      console.log(11111, response)
      if (response.data.status == "success") {
        activeMcpConfigId.value = id
        // 重新加载配置
        await loadMcpConfigs()
        // 加载激活的配置
        await loadActiveMcpConfig()
        return true
      }
      
      return false
    } catch (err) {
      console.error('激活MCP配置失败:', err)
      mcpError.value = '激活MCP配置失败'
      return false
    } finally {
      isLoadingMcp.value = false
    }
  }
  
  // 删除MCP配置
  async function deleteMcpConfig(id) {
    try {
      isLoadingMcp.value = true
      mcpError.value = null
      
      const response = await mcpConfigApi.deleteConfig(id)
      
      if (response.data.status == "success") {
        // 重新加载配置
        await loadMcpConfigs()
        return true
      }
      
      return false
    } catch (err) {
      console.error('删除MCP配置失败:', err)
      mcpError.value = '删除MCP配置失败'
      return false
    } finally {
      isLoadingMcp.value = false
    }
  }
  
  // 从服务器加载设置
  async function loadSettingsFromServer() {
    try {
      const response = await settingsApi.getSettings()
      
      if (response.data.status == "success") {
        const serverSettings = response.data.data
        
        // 更新第三方API设置
        if (serverSettings.thirdPartyApiKey !== undefined) thirdPartyApiKey.value = serverSettings.thirdPartyApiKey
        if (serverSettings.thirdPartyApiEndpoint !== undefined) thirdPartyApiEndpoint.value = serverSettings.thirdPartyApiEndpoint
        if (serverSettings.thirdPartyApiModel !== undefined) thirdPartyApiModel.value = serverSettings.thirdPartyApiModel
        if (serverSettings.useThirdPartyApi !== undefined) useThirdPartyApi.value = serverSettings.useThirdPartyApi
      }
    } catch (err) {
      console.error('从服务器加载设置失败:', err)
    }
  }
  
  // 保存设置到服务器
  async function saveSettingsToServer(settingsObj) {
    try {
      // 同步所有设置到服务器
      const serverSettings = settingsObj || {
        thirdPartyApiKey: thirdPartyApiKey.value,
        thirdPartyApiEndpoint: thirdPartyApiEndpoint.value,
        thirdPartyApiModel: thirdPartyApiModel.value,
        useThirdPartyApi: useThirdPartyApi.value,
        mcpConfigs: mcpConfigs.value
      }
      await settingsApi.updateSettings(serverSettings)
    } catch (err) {
      console.error('保存设置到服务器失败:', err)
    }
  }
  
  // 初始化设置
  async function init() {
    // 从本地存储加载设置
    const savedSettings = localStorage.getItem('chat-settings')
    if (savedSettings) {
      try {
        const parsed = JSON.parse(savedSettings)
        isDarkMode.value = parsed.isDarkMode ?? true
        apiKey.value = parsed.apiKey || ''
        apiEndpoint.value = parsed.apiEndpoint || 'http://localhost:3000/api/v1/chat/sse'
        apiModel.value = parsed.apiModel || 'gpt-3.5-turbo'
        thirdPartyApiKey.value = parsed.thirdPartyApiKey || ''
        thirdPartyApiEndpoint.value = parsed.thirdPartyApiEndpoint || ''
        thirdPartyApiModel.value = parsed.thirdPartyApiModel || 'deepseek-chat'
        useThirdPartyApi.value = parsed.useThirdPartyApi ?? false
        fontSize.value = parsed.fontSize || 'normal'
        showTimestamp.value = parsed.showTimestamp ?? true
      } catch (e) {
        console.error('解析设置失败:', e)
      }
    }
    
    applyTheme()
    
    // 从服务器加载设置
    await loadSettingsFromServer()
    
    // 加载MCP配置
    await loadMcpConfigs()
  }
  
  // 保存设置到本地存储
  function saveSettings() {
    const settings = {
      isDarkMode: isDarkMode.value,
      apiKey: apiKey.value,
      apiEndpoint: apiEndpoint.value,
      apiModel: apiModel.value,
      thirdPartyApiKey: thirdPartyApiKey.value,
      thirdPartyApiEndpoint: thirdPartyApiEndpoint.value,
      thirdPartyApiModel: thirdPartyApiModel.value,
      useThirdPartyApi: useThirdPartyApi.value,
      fontSize: fontSize.value,
      showTimestamp: showTimestamp.value,
      mcpConfigs: mcpConfigs.value // 新增：带上所有mcp-mysql配置
    }
    localStorage.setItem('chat-settings', JSON.stringify(settings))
    saveSettingsToServer(settings)
  }

  return {
    isDarkMode,
    apiKey,
    apiEndpoint,
    apiModel,
    thirdPartyApiKey,
    thirdPartyApiEndpoint,
    thirdPartyApiModel,
    useThirdPartyApi,
    fontSize,
    showTimestamp,
    mcpConfigs,
    activeMcpConfigId,
    isLoadingMcp,
    mcpError,
    toggleDarkMode,
    applyTheme,
    updateApiSettings,
    updateInterfaceSettings,
    loadMcpConfigs,
    loadActiveMcpConfig,
    createMcpConfig,
    updateMcpConfig,
    activateMcpConfig,
    deleteMcpConfig,
    loadSettingsFromServer,
    saveSettingsToServer,
    init,
    saveSettings
  }
}) 