/**
 * Open WebUI API Client
 * Handles all API calls to Open WebUI instance
 */

import axios, { AxiosInstance, AxiosError } from 'axios';

export interface OpenWebUIConfig {
  url: string;
  apiKey: string;
}

export class OpenWebUIClient {
  private client: AxiosInstance;
  private baseUrl: string;

  constructor(config: OpenWebUIConfig) {
    this.baseUrl = config.url.replace(/\/$/, '');
    this.client = axios.create({
      baseURL: this.baseUrl,
      timeout: 60000,
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${config.apiKey}`,
      },
    });
  }

  private async request<T>(method: string, path: string, data?: unknown): Promise<T> {
    try {
      const response = await this.client.request<T>({
        method,
        url: path,
        data,
      });
      return response.data;
    } catch (error) {
      if (error instanceof AxiosError) {
        const status = error.response?.status || 500;
        const message = error.response?.data?.detail || error.message;
        throw new Error(`Open WebUI API Error (${status}): ${message}`);
      }
      throw error;
    }
  }

  // ==========================================================================
  // User Management
  // ==========================================================================

  async getCurrentUser(): Promise<unknown> {
    return this.request('GET', '/api/v1/auths/');
  }

  async listUsers(): Promise<unknown> {
    return this.request('GET', '/api/v1/users/');
  }

  async getUser(userId: string): Promise<unknown> {
    return this.request('GET', `/api/v1/users/${userId}`);
  }

  async updateUserRole(userId: string, role: string): Promise<unknown> {
    return this.request('POST', `/api/v1/users/${userId}/update/role`, { role });
  }

  async deleteUser(userId: string): Promise<unknown> {
    return this.request('DELETE', `/api/v1/users/${userId}`);
  }

  // ==========================================================================
  // Group Management
  // ==========================================================================

  async listGroups(): Promise<unknown> {
    return this.request('GET', '/api/v1/groups/');
  }

  async createGroup(name: string, description: string = ''): Promise<unknown> {
    return this.request('POST', '/api/v1/groups/create', { name, description });
  }

  async getGroup(groupId: string): Promise<unknown> {
    return this.request('GET', `/api/v1/groups/id/${groupId}`);
  }

  async updateGroup(groupId: string, name?: string, description?: string): Promise<unknown> {
    const data: Record<string, string> = {};
    if (name !== undefined) data.name = name;
    if (description !== undefined) data.description = description;
    return this.request('POST', `/api/v1/groups/id/${groupId}/update`, data);
  }

  async addUserToGroup(groupId: string, userId: string): Promise<unknown> {
    return this.request('POST', `/api/v1/groups/id/${groupId}/users/add`, { user_id: userId });
  }

  async removeUserFromGroup(groupId: string, userId: string): Promise<unknown> {
    return this.request('POST', `/api/v1/groups/id/${groupId}/users/remove`, { user_id: userId });
  }

  async deleteGroup(groupId: string): Promise<unknown> {
    return this.request('DELETE', `/api/v1/groups/id/${groupId}`);
  }

  // ==========================================================================
  // Model Management
  // ==========================================================================

  async listModels(): Promise<unknown> {
    return this.request('GET', '/api/v1/models/');
  }

  async getModel(modelId: string): Promise<unknown> {
    return this.request('GET', `/api/v1/models/${modelId}`);
  }

  async createModel(
    id: string,
    name: string,
    baseModelId: string,
    meta?: Record<string, unknown>,
    params?: Record<string, unknown>
  ): Promise<unknown> {
    return this.request('POST', '/api/v1/models/create', {
      id,
      name,
      base_model_id: baseModelId,
      meta: meta || {},
      params: params || {},
    });
  }

  async updateModel(
    modelId: string,
    name?: string,
    meta?: Record<string, unknown>,
    params?: Record<string, unknown>
  ): Promise<unknown> {
    const data: Record<string, unknown> = {};
    if (name !== undefined) data.name = name;
    if (meta !== undefined) data.meta = meta;
    if (params !== undefined) data.params = params;
    return this.request('POST', `/api/v1/models/${modelId}/update`, data);
  }

  async deleteModel(modelId: string): Promise<unknown> {
    return this.request('DELETE', `/api/v1/models/${modelId}`);
  }

  // ==========================================================================
  // Knowledge Base Management
  // ==========================================================================

  async listKnowledge(): Promise<unknown> {
    return this.request('GET', '/api/v1/knowledge/');
  }

  async getKnowledge(knowledgeId: string): Promise<unknown> {
    return this.request('GET', `/api/v1/knowledge/${knowledgeId}`);
  }

  async createKnowledge(name: string, description: string = ''): Promise<unknown> {
    return this.request('POST', '/api/v1/knowledge/create', { name, description });
  }

  async updateKnowledge(knowledgeId: string, name?: string, description?: string): Promise<unknown> {
    const data: Record<string, string> = {};
    if (name !== undefined) data.name = name;
    if (description !== undefined) data.description = description;
    return this.request('POST', `/api/v1/knowledge/${knowledgeId}/update`, data);
  }

  async deleteKnowledge(knowledgeId: string): Promise<unknown> {
    return this.request('DELETE', `/api/v1/knowledge/${knowledgeId}`);
  }

  // ==========================================================================
  // File Management
  // ==========================================================================

  async listFiles(): Promise<unknown> {
    return this.request('GET', '/api/v1/files/');
  }

  async getFile(fileId: string): Promise<unknown> {
    return this.request('GET', `/api/v1/files/${fileId}`);
  }

  async getFileContent(fileId: string): Promise<unknown> {
    return this.request('GET', `/api/v1/files/${fileId}/data/content`);
  }

  async updateFileContent(fileId: string, content: string): Promise<unknown> {
    return this.request('POST', `/api/v1/files/${fileId}/data/content/update`, { content });
  }

  async deleteFile(fileId: string): Promise<unknown> {
    return this.request('DELETE', `/api/v1/files/${fileId}`);
  }

  // ==========================================================================
  // Chat Management
  // ==========================================================================

  async listChats(): Promise<unknown> {
    return this.request('GET', '/api/v1/chats/');
  }

  async getChat(chatId: string): Promise<unknown> {
    return this.request('GET', `/api/v1/chats/${chatId}`);
  }

  async deleteChat(chatId: string): Promise<unknown> {
    return this.request('DELETE', `/api/v1/chats/${chatId}`);
  }

  async deleteAllChats(): Promise<unknown> {
    return this.request('DELETE', '/api/v1/chats/');
  }

  async archiveChat(chatId: string): Promise<unknown> {
    return this.request('GET', `/api/v1/chats/${chatId}/archive`);
  }

  async shareChat(chatId: string): Promise<unknown> {
    return this.request('POST', `/api/v1/chats/${chatId}/share`);
  }

  async cloneChat(chatId: string): Promise<unknown> {
    return this.request('GET', `/api/v1/chats/${chatId}/clone`);
  }

  // ==========================================================================
  // Prompt Management
  // ==========================================================================

  async listPrompts(): Promise<unknown> {
    return this.request('GET', '/api/v1/prompts/');
  }

  async getPrompt(command: string): Promise<unknown> {
    return this.request('GET', `/api/v1/prompts/command/${command}`);
  }

  async createPrompt(command: string, title: string, content: string): Promise<unknown> {
    return this.request('POST', '/api/v1/prompts/create', { command, title, content });
  }

  async updatePrompt(command: string, title?: string, content?: string): Promise<unknown> {
    const data: Record<string, string> = { command: `/${command}` };
    if (title !== undefined) data.title = title;
    if (content !== undefined) data.content = content;
    return this.request('POST', `/api/v1/prompts/command/${command}/update`, data);
  }

  async deletePrompt(command: string): Promise<unknown> {
    return this.request('DELETE', `/api/v1/prompts/command/${command}/delete`);
  }

  // ==========================================================================
  // Memory Management
  // ==========================================================================

  async listMemories(): Promise<unknown> {
    return this.request('GET', '/api/v1/memories/');
  }

  async addMemory(content: string): Promise<unknown> {
    return this.request('POST', '/api/v1/memories/add', { content });
  }

  async queryMemories(content: string, k: number = 5): Promise<unknown> {
    return this.request('POST', '/api/v1/memories/query', { content, k });
  }

  async updateMemory(memoryId: string, content: string): Promise<unknown> {
    return this.request('POST', `/api/v1/memories/${memoryId}/update`, { content });
  }

  async deleteMemory(memoryId: string): Promise<unknown> {
    return this.request('DELETE', `/api/v1/memories/${memoryId}`);
  }

  async deleteAllMemories(): Promise<unknown> {
    return this.request('DELETE', '/api/v1/memories/delete/user');
  }

  // ==========================================================================
  // Tool Management
  // ==========================================================================

  async listTools(): Promise<unknown> {
    return this.request('GET', '/api/v1/tools/');
  }

  async getTool(toolId: string): Promise<unknown> {
    return this.request('GET', `/api/v1/tools/id/${toolId}`);
  }

  async createTool(id: string, name: string, content: string): Promise<unknown> {
    return this.request('POST', '/api/v1/tools/create', { id, name, content });
  }

  async updateTool(toolId: string, name?: string, content?: string): Promise<unknown> {
    const data: Record<string, string> = {};
    if (name !== undefined) data.name = name;
    if (content !== undefined) data.content = content;
    return this.request('POST', `/api/v1/tools/id/${toolId}/update`, data);
  }

  async deleteTool(toolId: string): Promise<unknown> {
    return this.request('DELETE', `/api/v1/tools/id/${toolId}`);
  }

  // ==========================================================================
  // Function Management
  // ==========================================================================

  async listFunctions(): Promise<unknown> {
    return this.request('GET', '/api/v1/functions/');
  }

  async getFunction(functionId: string): Promise<unknown> {
    return this.request('GET', `/api/v1/functions/id/${functionId}`);
  }

  async createFunction(id: string, name: string, type: string, content: string): Promise<unknown> {
    return this.request('POST', '/api/v1/functions/create', { id, name, type, content });
  }

  async updateFunction(functionId: string, name?: string, content?: string): Promise<unknown> {
    const data: Record<string, string> = {};
    if (name !== undefined) data.name = name;
    if (content !== undefined) data.content = content;
    return this.request('POST', `/api/v1/functions/id/${functionId}/update`, data);
  }

  async toggleFunction(functionId: string): Promise<unknown> {
    return this.request('POST', `/api/v1/functions/id/${functionId}/toggle`);
  }

  async deleteFunction(functionId: string): Promise<unknown> {
    return this.request('DELETE', `/api/v1/functions/id/${functionId}`);
  }

  // ==========================================================================
  // Folder Management
  // ==========================================================================

  async listFolders(): Promise<unknown> {
    return this.request('GET', '/api/v1/folders/');
  }

  async createFolder(name: string): Promise<unknown> {
    return this.request('POST', '/api/v1/folders/create', { name });
  }

  async getFolder(folderId: string): Promise<unknown> {
    return this.request('GET', `/api/v1/folders/${folderId}`);
  }

  async updateFolder(folderId: string, name: string): Promise<unknown> {
    return this.request('POST', `/api/v1/folders/${folderId}/update`, { name });
  }

  async deleteFolder(folderId: string): Promise<unknown> {
    return this.request('DELETE', `/api/v1/folders/${folderId}`);
  }

  // ==========================================================================
  // Config/Settings (Admin)
  // ==========================================================================

  async getConfig(): Promise<unknown> {
    return this.request('GET', '/api/v1/configs/');
  }

  async exportConfig(): Promise<unknown> {
    return this.request('GET', '/api/v1/configs/export');
  }

  async getBanners(): Promise<unknown> {
    return this.request('GET', '/api/v1/configs/banners');
  }

  async getModelsConfig(): Promise<unknown> {
    return this.request('GET', '/api/v1/configs/models');
  }

  async getToolServers(): Promise<unknown> {
    return this.request('GET', '/api/v1/configs/tool_servers');
  }

  // ==========================================================================
  // Notes Management
  // ==========================================================================

  async listNotes(): Promise<unknown> {
    return this.request('GET', '/api/v1/notes/');
  }

  async createNote(title: string, content: string): Promise<unknown> {
    return this.request('POST', '/api/v1/notes/create', { title, content });
  }

  async getNote(noteId: string): Promise<unknown> {
    return this.request('GET', `/api/v1/notes/${noteId}`);
  }

  async updateNote(noteId: string, title?: string, content?: string): Promise<unknown> {
    const data: Record<string, string> = {};
    if (title !== undefined) data.title = title;
    if (content !== undefined) data.content = content;
    return this.request('POST', `/api/v1/notes/${noteId}/update`, data);
  }

  async deleteNote(noteId: string): Promise<unknown> {
    return this.request('DELETE', `/api/v1/notes/${noteId}/delete`);
  }

  // ==========================================================================
  // Channels (Team Chat) Management
  // ==========================================================================

  async listChannels(): Promise<unknown> {
    return this.request('GET', '/api/v1/channels/');
  }

  async createChannel(name: string, description: string = ''): Promise<unknown> {
    return this.request('POST', '/api/v1/channels/create', { name, description });
  }

  async getChannel(channelId: string): Promise<unknown> {
    return this.request('GET', `/api/v1/channels/${channelId}`);
  }

  async updateChannel(channelId: string, name?: string, description?: string): Promise<unknown> {
    const data: Record<string, string> = {};
    if (name !== undefined) data.name = name;
    if (description !== undefined) data.description = description;
    return this.request('POST', `/api/v1/channels/${channelId}/update`, data);
  }

  async deleteChannel(channelId: string): Promise<unknown> {
    return this.request('DELETE', `/api/v1/channels/${channelId}/delete`);
  }

  async getChannelMessages(channelId: string, skip: number = 0, limit: number = 50): Promise<unknown> {
    return this.request('GET', `/api/v1/channels/${channelId}/messages?skip=${skip}&limit=${limit}`);
  }

  async postChannelMessage(channelId: string, content: string, parentId?: string): Promise<unknown> {
    const data: Record<string, string> = { content };
    if (parentId) data.parent_id = parentId;
    return this.request('POST', `/api/v1/channels/${channelId}/messages/post`, data);
  }

  async deleteChannelMessage(channelId: string, messageId: string): Promise<unknown> {
    return this.request('DELETE', `/api/v1/channels/${channelId}/messages/${messageId}/delete`);
  }
}
